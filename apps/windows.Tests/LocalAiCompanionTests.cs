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
