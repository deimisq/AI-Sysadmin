using System.IO;
using System.Text;
using System.Security.Cryptography;
using AiSysadminDesktop;
using Xunit;

public sealed class TerminalContextTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "AiSysadminTerminalTests", Guid.NewGuid().ToString("N"));
    [Fact]
    public async Task OutputIsEncryptedOrderedAndUtf8SurvivesChunkBoundaries()
    {
        using var store = new TerminalContextStore(_directory);
        var session = Guid.NewGuid().ToString(); store.Register(session, 1, "target-a");
        var bytes = Encoding.UTF8.GetBytes("$ echo diagnóstico\r\ndiagnóstico\r\n");
        foreach (var value in bytes) store.Append(session, new[] {value});
        var result = await store.ReadAsync(1, "target-a", session);
        Assert.Equal(Encoding.UTF8.GetString(bytes), result.Transcript);
        Assert.DoesNotContain("diagnóstico", Encoding.UTF8.GetString(File.ReadAllBytes(Directory.GetFiles(_directory,"*.terminal")[0])));
        Assert.Equal(bytes.Length, result.Bytes);
    }
    [Fact]
    public async Task ClosedSessionsRemainAvailableAfterRestart()
    {
        var session = Guid.NewGuid().ToString();
        using (var store = new TerminalContextStore(_directory))
        { store.Register(session, 1, "target-a"); store.Append(session, Encoding.UTF8.GetBytes("persistent terminal output")); store.Close(session); }
        using var reopened = new TerminalContextStore(_directory);
        var result = await reopened.ReadAsync(1, "target-a");
        Assert.Equal("persistent terminal output", result.Transcript); Assert.True(result.Closed);
        Assert.Empty((await reopened.ReadAsync(2,"target-b")).Transcript);
    }
    [Fact]
    public async Task ServerAndConnectionIdentityCannotBeMixed()
    {
        using var store = new TerminalContextStore(_directory);
        var session = Guid.NewGuid().ToString(); store.Register(session, 1, "target-a");
        store.Append(session, Encoding.UTF8.GetBytes("private context A"));
        Assert.Empty((await store.ReadAsync(2,"target-b")).Transcript);
        await Assert.ThrowsAsync<InvalidOperationException>(()=>store.ReadAsync(2,"target-b",session));
        await Assert.ThrowsAsync<InvalidOperationException>(()=>store.ReadAsync(1,"changed-target",session));
    }
    [Fact]
    public async Task OversizedContextIsNotSilentlyTruncated()
    {
        using var store = new TerminalContextStore(_directory);
        var session=Guid.NewGuid().ToString(); store.Register(session,1,"target-a");
        for(var i=0;i<31;i++) store.Append(session,Encoding.UTF8.GetBytes(new string('x',8000)));
        await Assert.ThrowsAsync<InvalidOperationException>(()=>store.ReadAsync(1,"target-a",session));
    }
    [Fact]
    public async Task CorruptedTranscriptCannotBeSentAsValidContext()
    {
        using(var store=new TerminalContextStore(_directory))
        { var session=Guid.NewGuid().ToString();store.Register(session,1,"target-a");store.Append(session,Encoding.UTF8.GetBytes("output")); }
        var file=Directory.GetFiles(_directory,"*.terminal")[0];var bytes=File.ReadAllBytes(file);bytes[^1]^=0xff;File.WriteAllBytes(file,bytes);
        using var reopened=new TerminalContextStore(_directory);
        await Assert.ThrowsAsync<CryptographicException>(()=>reopened.ReadAsync(1,"target-a"));
    }
    public void Dispose(){if(Directory.Exists(_directory))Directory.Delete(_directory,true);}
}
