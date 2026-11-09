using System.IO;
using System.Text;
using System.Text.Json;
using AiSysadminDesktop;
using Xunit;

public sealed class LocalTaskAgentTests : IDisposable
{
    private readonly string _path = Path.Combine(Path.GetTempPath(), "AiTaskTests", Guid.NewGuid().ToString("N"));
    private LocalConnectionStore Store => new(Path.Combine(_path, "inventory.dat"));
    private static JsonElement Json(object value) => JsonSerializer.SerializeToElement(value);
    private JsonElement StartBody(bool authorized = true) => Json(new { task_id = Guid.NewGuid().ToString("N"), server_id = 1, session_id = "session", objective = "Fix the example service", authorized, expected_target = new { address = "192.0.2.10", protocol = "ssh", port = 22 } });
    private LocalTaskAgent Agent(Func<LocalConnectionStore.AiInvocation,string,CancellationToken,Task<LocalTaskAgent.Decision>> decide,
        Func<string,string,CancellationToken,Task<LocalTaskAgent.Observation>>? execute = null, Func<string,int,string,bool>? connected = null)
    {
        Store.Handle("POST", "/servers/", Json(new { hostname = "Example", ip_address = "192.0.2.10" }));
        Store.Handle("PUT", "/ai/settings", Json(new { base_url = "https://example.test/v1", model = "synthetic", api_key = "vault-secret", consent_accepted = true }));
        return new(Store, connected ?? ((_,_,_) => true), execute ?? ((_,command,_) => Task.FromResult(new LocalTaskAgent.Observation(command,"verified example output",0))),
            (_,_,_) => Task.FromResult(new TerminalContextStore.Snapshot("session", "$ previous output", DateTimeOffset.UtcNow, 17, false)), Path.Combine(_path,"tasks"), decide);
    }
    private static async Task<LocalTaskAgent.View> Finished(LocalTaskAgent agent)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(8));
        while (agent.Status()!.Status == "running") await Task.Delay(10,timeout.Token);
        return agent.Status()!;
    }
    [Fact] public async Task ExecutesObservesAndVerifiesWithoutSendingVaultCredentials()
    {
        int calls = 0;
        using var agent = Agent((invocation,context,_) => {
            Assert.DoesNotContain("vault-secret", context);
            if (++calls == 1) return Task.FromResult(new LocalTaskAgent.Decision("execute", "Inspect service", "systemctl status example"));
            Assert.Contains("verified example output", context);
            return Task.FromResult(new LocalTaskAgent.Decision("complete", "Verified from command output"));
        });
        agent.Start(StartBody()); var result = await Finished(agent);
        Assert.Equal("completed", result.Status); Assert.Equal(2, calls);
        Assert.DoesNotContain("systemctl", Encoding.UTF8.GetString(File.ReadAllBytes(Directory.GetFiles(Path.Combine(_path,"tasks"),"*.task")[0])));
    }
    [Fact] public void RequiresAuthorizationAndBoundSession()
    {
        using var agent = Agent((_,_,_) => throw new Exception("must not call model"), connected: (_,_,_) => false);
        Assert.Throws<InvalidOperationException>(() => agent.Start(StartBody(false)));
        Assert.Throws<InvalidOperationException>(() => agent.Start(StartBody()));
    }
    [Fact] public async Task TargetMutationAfterModelResponsePreventsExecution()
    {
        int commands = 0;
        using var agent = Agent((_,_,_) => {
            Store.Handle("PUT","/servers/1",Json(new { ssh_port = 2222 }));
            return Task.FromResult(new LocalTaskAgent.Decision("execute","Inspect","id"));
        }, (_,command,_) => { commands++; return Task.FromResult(new LocalTaskAgent.Observation(command,"",0)); });
        agent.Start(StartBody()); Assert.Equal("failed",(await Finished(agent)).Status); Assert.Equal(0,commands);
    }
    [Fact] public async Task CommandLimitStopsAnUnendingModelLoop()
    {
        int commands = 0;
        using var agent = Agent((_,_,_) => Task.FromResult(new LocalTaskAgent.Decision("execute","Inspect","id")),
            (_,command,_) => { commands++; return Task.FromResult(new LocalTaskAgent.Observation(command,"ok",0)); });
        agent.Start(StartBody()); Assert.Equal("limited",(await Finished(agent)).Status); Assert.Equal(10,commands);
    }
    [Fact] public async Task CancellationDoesNotRetryOrStartDuplicateTasks()
    {
        var entered = new TaskCompletionSource();
        using var agent = Agent(async (_,_,token) => { entered.SetResult(); await Task.Delay(Timeout.Infinite,token); return new("execute","Never","id"); });
        var first = agent.Start(StartBody()); await entered.Task;
        Assert.Equal(first.Id, agent.Start(StartBody()).Id);
        agent.Cancel(first.Id); Assert.Equal("cancelled",(await Finished(agent)).Status);
    }
    [Fact] public async Task CannotClaimCompletionWithoutSuccessfulObservation()
    {
        using var agent = Agent((_,_,_) => Task.FromResult(new LocalTaskAgent.Decision("complete","Claim without evidence")));
        agent.Start(StartBody()); Assert.Equal("blocked",(await Finished(agent)).Status);
    }
    [Fact] public async Task RevokingCloudConsentBeforeExecutionStopsTheCommand()
    {
        int commands = 0;
        using var agent = Agent((_,_,_) => {
            Store.Handle("DELETE","/ai/settings",default);
            return Task.FromResult(new LocalTaskAgent.Decision("execute","Inspect","id"));
        }, (_,command,_) => { commands++; return Task.FromResult(new LocalTaskAgent.Observation(command,"",0)); });
        agent.Start(StartBody()); Assert.Equal("failed",(await Finished(agent)).Status); Assert.Equal(0,commands);
    }
    [Fact] public async Task FailedCommandIsObservedButCannotBeMarkedComplete()
    {
        int steps = 0;
        using var agent = Agent((_,_,_) => Task.FromResult(++steps == 1 ? new LocalTaskAgent.Decision("execute","Inspect","id") : new LocalTaskAgent.Decision("complete","Claim")),
            (_,command,_) => Task.FromResult(new LocalTaskAgent.Observation(command,"permission denied",1)));
        agent.Start(StartBody()); Assert.Equal("blocked",(await Finished(agent)).Status);
    }
    [Fact] public async Task RepeatedCompletedRequestDoesNotExecuteAgainAndAuditRecovers()
    {
        int calls = 0;
        var body = StartBody();
        using (var agent = Agent((_,_,_) => { calls++; return Task.FromResult(new LocalTaskAgent.Decision("blocked","Need more information")); }))
        {
            agent.Start(body); var result = await Finished(agent);
            Assert.Equal(result.Id,agent.Start(body).Id); Assert.Equal(1,calls);
        }
        using var recovered = new LocalTaskAgent(Store, (_,_,_) => true, (_,_,_) => throw new Exception("No execution on recovery"),
            (_,_,_) => throw new Exception("No cloud on recovery"),Path.Combine(_path,"tasks"));
        Assert.Equal("blocked",recovered.Status()!.Status);
    }
    [Fact] public async Task InvalidDecisionNeverExecutesACommand()
    {
        using var agent = Agent((_,_,_) => Task.FromResult(new LocalTaskAgent.Decision("unknown","Invalid","id")), (_,_,_) => throw new Exception("No execution"));
        agent.Start(StartBody()); Assert.Equal("failed",(await Finished(agent)).Status);
        Assert.DoesNotContain(agent.Status()!.Events,e => e.Kind == "command");
    }
    private sealed class Handler(Func<HttpRequestMessage,Task<HttpResponseMessage>> callback) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken token) => callback(request);
    }
    [Fact] public async Task ProductionTransportParsesStepJsonAndSendsOnlyContextWithBearerAuthorization()
    {
        using (var setup = Agent((_,_,_) => throw new Exception("Setup only"))) { }
        int calls = 0;
        var handler = new Handler(async request => {
            Assert.Equal("https://example.test/v1/chat/completions", request.RequestUri!.ToString());
            Assert.Equal("Bearer", request.Headers.Authorization!.Scheme);
            var payload = await request.Content!.ReadAsStringAsync();
            Assert.DoesNotContain("vault-secret",payload);
            Assert.Contains("remaining_commands",payload);
            var decision = ++calls == 1 ? new LocalTaskAgent.Decision("execute","Read example","inspect-example") : new LocalTaskAgent.Decision("complete","Verified example");
            return new(System.Net.HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new { choices = new[] { new { message = new { content = JsonSerializer.Serialize(decision) } } } })) };
        });
        using var agent = new LocalTaskAgent(Store,(_,_,_) => true,(_,command,_) => Task.FromResult(new LocalTaskAgent.Observation(command,"observed",0)),
            (_,_,_) => Task.FromResult(new TerminalContextStore.Snapshot("session","echo",DateTimeOffset.UtcNow,4,false)),Path.Combine(_path,"tasks"),handler:handler);
        agent.Start(StartBody()); Assert.Equal("completed",(await Finished(agent)).Status); Assert.Equal(2,calls);
    }
    [Fact] public void InterruptedAuditRecoversWithoutAutomaticExecution()
    {
        Directory.CreateDirectory(Path.Combine(_path,"tasks"));
        var view = new LocalTaskAgent.View(Guid.NewGuid().ToString("N"),1,"Example","Task interrupted after command","running",new[] { new LocalTaskAgent.Event(DateTimeOffset.UtcNow,"command","$ inspect-example") });
        File.WriteAllBytes(Path.Combine(_path,"tasks",view.Id+".task"),System.Security.Cryptography.ProtectedData.Protect(JsonSerializer.SerializeToUtf8Bytes(view),null,System.Security.Cryptography.DataProtectionScope.CurrentUser));
        using var agent = new LocalTaskAgent(Store,(_,_,_) => throw new Exception("No connection on recovery"),(_,_,_) => throw new Exception("No execution"),(_,_,_) => throw new Exception("No cloud"),Path.Combine(_path,"tasks"));
        Assert.Equal("interrupted",agent.Status()!.Status); Assert.Contains(agent.Status()!.Events,e => e.Kind == "command");
    }
    public void Dispose() { if (Directory.Exists(_path)) Directory.Delete(_path,true); }
}
