using System.IO;
using System.Text;
using AiSysadminDesktop;
using Xunit;

public sealed class TerminalContextManagementTests : IDisposable
{
    private readonly string _path = Path.Combine(Path.GetTempPath(),"AiContextManagement",Guid.NewGuid().ToString("N"));
    [Fact] public async Task RecentWindowIsExplicitAndDoesNotAlterTheFullLocalJournal()
    {
        using var store=new TerminalContextStore(_path); var id=Guid.NewGuid().ToString(); store.Register(id,1,"target");
        var text="beginning: "+new string('x',8000)+" last output"; store.Append(id,Encoding.UTF8.GetBytes(text));
        var recent=await store.ReadAsync(1,"target",id,4000);
        Assert.True(recent.Truncated); Assert.Equal(text.Length,recent.TotalCharacters); Assert.Equal(4000,recent.IncludedCharacters); Assert.EndsWith("last output",recent.Transcript);
        Assert.Equal(text,(await store.ReadAsync(1,"target",id)).Transcript);
    }
    [Fact] public async Task OversizedSessionsWorkWithConfiguredWindowButStillFailInFullMode()
    {
        using var store=new TerminalContextStore(_path); var id=Guid.NewGuid().ToString(); store.Register(id,1,"target");
        for(var i=0;i<31;i++) store.Append(id,Encoding.UTF8.GetBytes(new string('x',8000)));
        await Assert.ThrowsAsync<InvalidOperationException>(()=>store.ReadAsync(1,"target",id));
        var window=await store.ReadAsync(1,"target",id,8000); Assert.True(window.Truncated); Assert.Equal(248000,window.TotalCharacters);
    }
    [Fact] public async Task WindowDoesNotSplitUnicodeSurrogatePair()
    {
        using var store=new TerminalContextStore(_path); var id=Guid.NewGuid().ToString(); store.Register(id,1,"target");
        store.Append(id,Encoding.UTF8.GetBytes("prefix😀"+new string('x',3999)));
        var window=await store.ReadAsync(1,"target",id,4000); Assert.Equal(3999,window.IncludedCharacters); Assert.DoesNotContain('\ufffd',window.Transcript);
    }
    [Fact] public async Task CannotDeleteActiveSessionsButClosedSessionsCanBeDeletedAndNeverResurrect()
    {
        using var store=new TerminalContextStore(_path); var id=Guid.NewGuid().ToString(); var key=Guid.Parse(id).ToString("N"); store.Register(id,1,"target"); store.Append(id,Encoding.UTF8.GetBytes("private output"));
        var list=await store.ListAsync(); Assert.Single(list); Assert.True(list[0].Active); Assert.True(list[0].Bytes>0);
        await Assert.ThrowsAsync<InvalidOperationException>(()=>store.DeleteAsync(key));
        store.Close(id); await store.DeleteAsync(key); Assert.Empty(await store.ListAsync());
        store.Append(id,Encoding.UTF8.GetBytes("late output")); Assert.Empty(await store.ListAsync());
        await Assert.ThrowsAsync<InvalidOperationException>(()=>store.ReadAsync(1,"target",id));
    }
    [Fact] public async Task RestartedAndCorruptJournalsCanBeInspectedAndRemovedWithoutReadingTheirTranscript()
    {
        var id=Guid.NewGuid().ToString();
        using(var store=new TerminalContextStore(_path)) {store.Register(id,1,"target");store.Append(id,Encoding.UTF8.GetBytes("output"));}
        var file=Directory.GetFiles(_path,"*.terminal")[0]; File.WriteAllBytes(file,new byte[]{1,2,3});
        using var reopened=new TerminalContextStore(_path); var list=await reopened.ListAsync(); Assert.Single(list); Assert.False(list[0].Active); Assert.Null(list[0].ServerId);
        await reopened.DeleteAsync(list[0].Id); Assert.Empty(await reopened.ListAsync());
        await Assert.ThrowsAsync<ArgumentException>(()=>reopened.DeleteAsync("../outside"));
    }
    [Fact] public void ContextPreferenceIsProtectedPersistentAndBounded()
    {
        var path=Path.Combine(_path,"inventory.dat"); var store=new LocalConnectionStore(path);
        Assert.Null(store.GetContextLimit());
        store.Handle("PUT","/workspace/context-policy",System.Text.Json.JsonSerializer.SerializeToElement(new {max_characters=8000}));
        Assert.Equal(8000,new LocalConnectionStore(path).GetContextLimit());
        Assert.Throws<ArgumentException>(()=>store.Handle("PUT","/workspace/context-policy",System.Text.Json.JsonSerializer.SerializeToElement(new {max_characters=3999})));
        Assert.Equal(8000,store.GetContextLimit());
    }
    [Fact] public async Task AnotherStoreCannotDeleteAnOpenSession()
    {
        using var owner=new TerminalContextStore(_path); using var other=new TerminalContextStore(_path);
        var id=Guid.NewGuid().ToString(); owner.Register(id,1,"target"); owner.Append(id,Encoding.UTF8.GetBytes("output"));
        var journals=await other.ListAsync(); Assert.True(journals[0].Active);
        await Assert.ThrowsAsync<InvalidOperationException>(()=>other.DeleteAsync(journals[0].Id));
        owner.Close(id); await owner.ListAsync(); await other.DeleteAsync(journals[0].Id); Assert.Empty(await other.ListAsync());
    }
    public void Dispose(){if(Directory.Exists(_path)) Directory.Delete(_path,true);}
}
