using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using AiSysadminDesktop;
using Xunit;

public sealed class TemporaryAiTests
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "AiSysadminTemporaryTests", Guid.NewGuid().ToString("N"));
    private static JsonElement Body(object value) => JsonSerializer.SerializeToElement(value);
    private LocalConnectionStore CreateStore(bool consent = true)
    {
        var store = new LocalConnectionStore(Path.Combine(_directory, "inventory.dat"));
        if (consent) store.Handle("PUT", "/ai/settings", Body(new { base_url = "https://provider.example/v1", model = "synthetic", api_key = "synthetic-key", consent_accepted = true }));
        return store;
    }

    [Fact]
    public void TemporaryHistoryNeverEntersInventoryAndIsNotRecoveredByAnotherInstance()
    {
        var store = CreateStore();
        var before = File.ReadAllBytes(Path.Combine(_directory, "inventory.dat"));
        var session = Guid.NewGuid().ToString();
        store.RegisterTemporaryTarget(-1, session, "192.0.2.10", 2222, "example-user");
        var invocation = store.PrepareAiInvocation(-1, "inspect");
        Assert.True(store.SaveAiTurn(invocation, "temporary answer", null));
        Assert.Contains("temporary answer", store.PrepareAiInvocation(-1, "follow up").Context);
        Assert.Empty(store.Handle("GET", "/servers/", default).EnumerateArray());
        Assert.Equal(before, File.ReadAllBytes(Path.Combine(_directory, "inventory.dat")));
        var other = new LocalConnectionStore(Path.Combine(_directory, "inventory.dat"));
        Assert.Throws<InvalidOperationException>(() => other.PrepareAiInvocation(-1, "help"));
    }

    [Fact]
    public void ReconnectAndLateCloseOrResponseCannotReuseOldConversation()
    {
        var store = CreateStore();
        var oldSession = Guid.NewGuid().ToString();
        var nextSession = Guid.NewGuid().ToString();
        var oldFingerprint = store.RegisterTemporaryTarget(-1, oldSession, "192.0.2.10", 22, "user");
        var previous = store.PrepareAiInvocation(-1, "old question");
        store.CloseTemporaryTarget(-1, oldSession);
        var nextFingerprint = store.RegisterTemporaryTarget(-1, nextSession, "192.0.2.20", 22, "user");
        Assert.NotEqual(oldFingerprint, nextFingerprint);
        store.CloseTemporaryTarget(-1, oldSession);
        Assert.False(store.SaveAiTurn(previous, "late response", null));
        var current = store.PrepareAiInvocation(-1, "new question");
        Assert.Equal(nextFingerprint, current.Fingerprint);
        Assert.DoesNotContain("old question", current.Context);
        Assert.DoesNotContain("late response", current.Context);
        Assert.Throws<InvalidOperationException>(() => store.PrepareAiInvocation(-1, "help", expectedTarget: new("192.0.2.10", "ssh", 22)));
    }

    [Fact]
    public void ConsentEvidenceAndHistoryDeletionRemainEnforced()
    {
        var store = CreateStore(false);
        store.RegisterTemporaryTarget(-1, Guid.NewGuid().ToString(), "192.0.2.10", 22, "user");
        Assert.Throws<InvalidOperationException>(() => store.PrepareAiInvocation(-1, "help"));
        store = CreateStore();
        store.RegisterTemporaryTarget(-1, Guid.NewGuid().ToString(), "192.0.2.10", 22, "user");
        Assert.Throws<ArgumentException>(() => store.PrepareAiInvocation(-1, "help", new("unreviewed", "manual", DateTimeOffset.UtcNow)));
        var inFlight = store.PrepareAiInvocation(-1, "question");
        store.Handle("DELETE", "/servers/-1/history", default);
        Assert.False(store.SaveAiTurn(inFlight, "late answer", null));
        store.Handle("DELETE", "/ai/settings", default);
        Assert.Throws<InvalidOperationException>(() => store.PrepareAiInvocation(-1, "help"));
    }

    private sealed class Handler(Func<HttpRequestMessage, Task<HttpResponseMessage>> send) : HttpMessageHandler
    {
        public int Calls;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token) { Calls++; return send(request); }
    }

    [Fact]
    public async Task ExplicitRequestIncludesOnlyTheBoundTerminalAndExcludesOtherTargetsAndProviderKey()
    {
        var store = CreateStore();
        using var journal = new TerminalContextStore(Path.Combine(_directory, "terminal"));
        var session = Guid.NewGuid().ToString();
        var other = Guid.NewGuid().ToString();
        var fingerprint = store.RegisterTemporaryTarget(-1, session, "192.0.2.10", 22, "user");
        var otherFingerprint = store.RegisterTemporaryTarget(-2, other, "192.0.2.20", 22, "user");
        journal.Register(session, -1, fingerprint); journal.Append(session, Encoding.UTF8.GetBytes("SELECTED-OUTPUT"));
        journal.Register(other, -2, otherFingerprint); journal.Append(other, Encoding.UTF8.GetBytes("OTHER-CUSTOMER-OUTPUT"));
        var handler = new Handler(async request => {
            var payload = await request.Content!.ReadAsStringAsync();
            Assert.Contains("SELECTED-OUTPUT", payload);
            Assert.DoesNotContain("OTHER-CUSTOMER-OUTPUT", payload);
            Assert.DoesNotContain("192.0.2.20", payload);
            Assert.DoesNotContain("synthetic-key", payload);
            return new(HttpStatusCode.OK) { Content = new StringContent("{\"choices\":[{\"message\":{\"content\":\"Analysis\"}}]}") };
        });
        using var service = new LocalAiService(store, handler, (id, key, hint) => journal.ReadAsync(id, key, hint));
        Assert.Equal(0, handler.Calls);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DiagnoseAsync(Body(new { server_id = -1, problem_description = "help", terminal_session_id = other })));
        Assert.Equal(0, handler.Calls);
        var result = await service.DiagnoseAsync(Body(new { server_id = -1, problem_description = "help", terminal_session_id = session }));
        Assert.True(result.GetProperty("history_saved").GetBoolean());
        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public async Task ClosingTemporaryTargetWhileModelDecidesPreventsCommandExecution()
    {
        var store = CreateStore();
        var session = Guid.NewGuid().ToString();
        store.RegisterTemporaryTarget(-1, session, "192.0.2.10", 22, "user");
        var commands = 0;
        using var agent = new LocalTaskAgent(store, (_, _, _) => true,
            (_, _, _) => { commands++; return Task.FromResult(new LocalTaskAgent.Observation("id", "user", 0)); },
            (_, _, _) => Task.FromResult(new TerminalContextStore.Snapshot(session, "context", DateTimeOffset.UtcNow, 7, false)),
            Path.Combine(_directory, "tasks"), (_, _, _) => {
                store.CloseTemporaryTarget(-1, session);
                return Task.FromResult(new LocalTaskAgent.Decision("execute", "inspect", "id"));
            });
        var request = Body(new { task_id = Guid.NewGuid().ToString("N"), server_id = -1, session_id = session, objective = "inspect", authorized = true, expected_target = new { address = "192.0.2.10", protocol = "ssh", port = 22 } });
        agent.Start(request);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(8));
        while (agent.Status()!.Status == "running") await Task.Delay(10, timeout.Token);
        Assert.Equal("failed", agent.Status()!.Status);
        Assert.Equal(0, commands);
    }

    [Fact]
    public void RdpContextDoesNotAuthorizeSshExecutionOrExposeCredentials()
    {
        var store = CreateStore();
        store.RegisterTemporaryTarget(-1, Guid.NewGuid().ToString(), "192.0.2.10", 3389, "Administrator", "rdp");
        var invocation = store.PrepareAiInvocation(-1, "How do I inspect Windows services?");
        Assert.Contains("rdp", invocation.Context);
        Assert.DoesNotContain("Administrator", invocation.Context);
        Assert.Throws<InvalidOperationException>(() => store.GetLocalSshTarget(-1));
    }
}
