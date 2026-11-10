using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using AiSysadminDesktop;
using Xunit;

public sealed class LocalAiCompanionTests : IDisposable
{
    private readonly string _directory=Path.Combine(Path.GetTempPath(),"AiSysadminCompanionTests",Guid.NewGuid().ToString("N"));
    private LocalConnectionStore Store=>new(Path.Combine(_directory,"inventory.dat"));
    private static JsonElement Body(object value)=>JsonSerializer.SerializeToElement(value);
    private void Setup()
    {
        Store.Handle("POST","/servers/",Body(new{hostname="Host A",ip_address="192.0.2.10"}));
        Store.Handle("PUT","/ai/settings",Body(new{base_url="https://provider.example/v1",model="test-model",api_key="synthetic-key",consent_accepted=true}));
    }
    private sealed class Handler(Func<HttpRequestMessage,Task<HttpResponseMessage>> callback):HttpMessageHandler
    {
        public int Calls;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken token){Calls++;return callback(request);}
    }
    [Fact]
    public async Task TerminalStaysLocalUntilTheTechnicianAsksForHelp()
    {
        Setup();using var journal=new TerminalContextStore(Path.Combine(_directory,"terminal"));
        var target=Store.GetLocalSshTarget(1);var session=Guid.NewGuid().ToString();
        journal.Register(session,1,target.Fingerprint);journal.Append(session,Encoding.UTF8.GetBytes("$ systemctl status example\nFailed: connection refused\n"));
        var handler=new Handler(async request=>{
            using var payload=JsonDocument.Parse(await request.Content!.ReadAsStringAsync());
            using var context=JsonDocument.Parse(payload.RootElement.GetProperty("messages")[1].GetProperty("content").GetString()!);
            Assert.Contains("connection refused",context.RootElement.GetProperty("terminal_context").GetProperty("Transcript").GetString());
            return new HttpResponseMessage(HttpStatusCode.OK){Content=new StringContent("{\"choices\":[{\"message\":{\"content\":\"Suggested next investigation\"}}]}")};
        });
        using var service=new LocalAiService(Store,handler,(id,fingerprint,hint)=>journal.ReadAsync(id,fingerprint,hint));
        Assert.Equal(0,handler.Calls);
        await service.DiagnoseAsync(Body(new{server_id=1,problem_description="¿Por qué falló lo último?",terminal_session_id=session}));
        Assert.Equal(1,handler.Calls);
    }
    [Fact]
    public async Task ConversationUsesExplicitNonExecutingModeAndParsesFencedCommandSuggestions()
    {
        Setup();
        var handler = new Handler(async request => {
            using var payload = JsonDocument.Parse(await request.Content!.ReadAsStringAsync());
            var instruction = payload.RootElement.GetProperty("messages")[2].GetProperty("content").GetString();
            Assert.Contains("modo Conversar", instruction);
            Assert.Contains("Nunca anuncies", instruction);
            var content = "```json\n" + JsonSerializer.Serialize(new { analysis = "Propuesta para revisar el disco", proposed_command = "df -h" }) + "\n```";
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new { choices = new[] { new { message = new { content } } } })) };
        });
        using var service = new LocalAiService(Store, handler);
        var result = await service.DiagnoseAsync(Body(new { server_id = 1, problem_description = "Revisá el estado del sistema" }));
        Assert.Equal("Propuesta para revisar el disco", result.GetProperty("analysis").GetProperty("analysis").GetString());
        Assert.Equal("df -h", result.GetProperty("analysis").GetProperty("proposed_command").GetString());
        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public async Task MarkdownCommandBecomesANativeProposalAndExecutesOnlyAfterApproval()
    {
        Setup(); var store = Store; var executions = 0;
        var commands = new ChatCommandService(store, (session, id, _) => session == "test-session" && id == 1,
            (_, command, _) => { executions++; Assert.Equal("uptime && free -h && df -h", command); return Task.FromResult(new LocalTaskAgent.Observation(command, "observed output", 0)); });
        var handler = new Handler(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) {
            Content = new StringContent(JsonSerializer.Serialize(new { choices = new[] { new { message = new {
                content = "Para revisar el estado general:\n```bash\nuptime && free -h && df -h\n```\n### Propósito y efecto\nCarga, memoria y discos."
            } } } }))
        }));
        using var service = new LocalAiService(store, handler) { RegisterCommand = commands.Register };
        var response = await service.DiagnoseAsync(Body(new { server_id = 1, problem_description = "puedes revisar el estado del sistema?", terminal_session_id = "test-session" }));
        Assert.Equal(0, executions);
        Assert.Equal("uptime && free -h && df -h", response.GetProperty("analysis").GetProperty("proposed_command").GetString());
        var proposal = response.GetProperty("proposal_id").GetString(); Assert.False(string.IsNullOrEmpty(proposal));
        var result = await commands.ExecuteAsync(Body(new { proposal_id = proposal, scope = "once" }));
        Assert.Equal(1, executions); Assert.Equal("observed output", result.Output);
    }

    [Fact]
    public async Task CurrentHealthQuestionIsLastAndCommandResultsRemainDistinctFromConversation()
    {
        Setup(); var store = Store;
        store.SaveAiTurn(store.PrepareAiInvocation(1, "Actualizá los índices"), "apt update terminó con salida 0", "apt update");
        store.SaveAiTurn(store.PrepareAiInvocation(1, "Actualizá los índices"), "200 paquetes pueden actualizarse", "apt update", "result");
        var handler = new Handler(async request => {
            using var json = JsonDocument.Parse(await request.Content!.ReadAsStringAsync());
            var messages = json.RootElement.GetProperty("messages").EnumerateArray().ToArray();
            Assert.Equal("user", messages[^1].GetProperty("role").GetString());
            Assert.Equal("¿Qué tal está de salud el servidor?", messages[^1].GetProperty("content").GetString());
            Assert.Contains(messages, message => message.GetProperty("role").GetString() == "assistant" && message.GetProperty("content").GetString()!.Contains("apt update terminó"));
            Assert.Contains(messages, message => message.GetProperty("role").GetString() == "user" && message.GetProperty("content").GetString()!.Contains("native_execution_record"));
            using var context = JsonDocument.Parse(messages[1].GetProperty("content").GetString()!);
            Assert.False(context.RootElement.GetProperty("context").TryGetProperty("conversation", out _));
            Assert.False(context.RootElement.GetProperty("context").TryGetProperty("query", out _));
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new { choices = new[] { new { message = new { content = "Faltan datos de carga, memoria y servicios para evaluar su salud." } } } })) };
        });
        using var service = new LocalAiService(store, handler);
        await service.DiagnoseAsync(Body(new { server_id = 1, problem_description = "¿Qué tal está de salud el servidor?" }));
    }

    [Fact]
    public async Task SameConversationSupportsTopicChangesHistoricalQuestionsAndLatestManualCommand()
    {
        Setup(); var store = Store;
        const string transcript = "$ apt update\n200 packages can be upgraded\n$ systemctl status example\nfailed: connection refused\n$ uptime\nload average: 0.20\n";
        var questions = new[] { "¿Qué pasó con el servicio antes del uptime?", "Ahora explicame cómo funcionan los backups, sin ejecutar nada", "¿Qué fue lo último que ejecuté?" };
        var calls = 0;
        var handler = new Handler(async request => {
            using var document = JsonDocument.Parse(await request.Content!.ReadAsStringAsync());
            var messages = document.RootElement.GetProperty("messages").EnumerateArray().ToArray();
            Assert.Equal(questions[calls], messages[^1].GetProperty("content").GetString());
            using var current = JsonDocument.Parse(messages[^2].GetProperty("content").GetString()!);
            Assert.Equal("technician_new_message", current.RootElement.GetProperty("current_request").GetProperty("origin").GetString());
            Assert.False(current.RootElement.GetProperty("current_request").GetProperty("continue_previous_objective").GetBoolean());
            using var context = JsonDocument.Parse(messages[1].GetProperty("content").GetString()!);
            Assert.Equal(transcript, context.RootElement.GetProperty("terminal_context").GetProperty("Transcript").GetString());
            Assert.Contains("NO supongas", messages[^3].GetProperty("content").GetString());
            if (calls > 0) Assert.Contains(messages, message => message.GetProperty("role").GetString() == "user" && message.GetProperty("content").GetString() == questions[calls - 1]);
            calls++;
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new { choices = new[] { new { message = new { content = "{\"analysis\":\"Respuesta contextual\",\"proposed_command\":null}" } } } })) };
        });
        using var service = new LocalAiService(store, handler, (_, _, _) => Task.FromResult(new TerminalContextStore.Snapshot("session", transcript, DateTimeOffset.UtcNow, transcript.Length, false)));
        foreach (var question in questions) await service.DiagnoseAsync(Body(new { server_id = 1, problem_description = question, terminal_session_id = "session" }));
        Assert.Equal(3, calls);
    }

    [Fact]
    public async Task MissingOrIncompleteCaptureDoesNotProduceAPartialCloudRequest()
    {
        Setup();var handler=new Handler(_=>throw new Exception("No HTTP allowed"));
        using var service=new LocalAiService(Store,handler,(_,_,_)=>throw new IOException("Terminal capture incomplete"));
        await Assert.ThrowsAsync<IOException>(()=>service.DiagnoseAsync(Body(new{server_id=1,problem_description="Help"})));
        Assert.Equal(0,handler.Calls);
    }
    [Fact]
    public void RecentConversationIsNotReusedForAnotherPort()
    {
        Setup();Store.SaveAiTurn(Store.PrepareAiInvocation(1,"Earlier question"),"Earlier answer",null);
        Assert.Contains("Earlier answer",Store.PrepareAiInvocation(1,"Follow up").Context);
        Store.Handle("PUT","/servers/1",Body(new{ssh_port=2222}));
        Assert.DoesNotContain("Earlier answer",Store.PrepareAiInvocation(1,"New destination").Context);
    }
    [Fact]
    public async Task PartialWindowIsMarkedInTheRequestAndReturnedToTheTechnician()
    {
        Setup(); using var journal=new TerminalContextStore(Path.Combine(_directory,"terminal"));
        var target=Store.GetLocalSshTarget(1); var session=Guid.NewGuid().ToString(); journal.Register(session,1,target.Fingerprint);
        journal.Append(session,Encoding.UTF8.GetBytes("BEGINNING-MUST-NOT-BE-SENT"+new string('x',8000)+"latest output"));
        var handler=new Handler(async request=>{
            var payload=await request.Content!.ReadAsStringAsync(); Assert.DoesNotContain("BEGINNING-MUST-NOT-BE-SENT",payload);
            using var json=JsonDocument.Parse(payload);
            Assert.Contains("PARCIAL",json.RootElement.GetProperty("messages")[2].GetProperty("content").GetString());
            using var context=JsonDocument.Parse(json.RootElement.GetProperty("messages")[1].GetProperty("content").GetString()!);
            Assert.True(context.RootElement.GetProperty("terminal_context").GetProperty("Truncated").GetBoolean());
            return new HttpResponseMessage(HttpStatusCode.OK){Content=new StringContent("{\"choices\":[{\"message\":{\"content\":\"Analysis with partial context\"}}]}")};
        });
        using var service=new LocalAiService(Store,handler,(id,fingerprint,hint)=>journal.ReadAsync(id,fingerprint,hint,4000));
        var result=await service.DiagnoseAsync(Body(new{server_id=1,problem_description="Help",terminal_session_id=session}));
        Assert.True(result.GetProperty("context_truncated").GetBoolean()); Assert.Equal(4000,result.GetProperty("context_characters").GetInt32());
        Assert.Contains("Contexto de terminal parcial",result.GetProperty("analysis").GetProperty("analysis").GetString());
    }
    public void Dispose(){if(Directory.Exists(_directory))Directory.Delete(_directory,true);}
}
