using AiSysadminDesktop;
using Xunit;

namespace AiSysadmin.Tests;

public class RdpSessionSetTests
{
    [Fact]
    public void SwitchingKeepsBothResourcesAndClosingInactiveDoesNotHideActive()
    {
        var sessions = new RdpSessionSet<object>();
        var first = new object(); var second = new object();
        sessions.Add("first", first); sessions.Add("second", second);
        Assert.True(sessions.Activate("first"));
        Assert.True(sessions.Activate("second"));
        Assert.True(sessions.TryGet("first", out var retained));
        Assert.Same(first, retained);
        sessions.Hide("first");
        Assert.Equal("second", sessions.ActiveId);
        Assert.Same(first, sessions.Remove("first"));
        Assert.Equal("second", sessions.ActiveId);
        Assert.True(sessions.TryGet("second", out retained));
        Assert.Same(second, retained);
    }

    [Fact]
    public void LateCleanupCannotCloseAReplacementSession()
    {
        var sessions = new RdpSessionSet<object>();
        sessions.Add("old-attempt", new object());
        sessions.Remove("old-attempt");
        var replacement = new object();
        sessions.Add("new-attempt", replacement);
        sessions.Activate("new-attempt");
        Assert.Null(sessions.Remove("old-attempt"));
        sessions.Hide("old-attempt");
        Assert.False(sessions.Activate("old-attempt"));
        Assert.Equal("new-attempt", sessions.ActiveId);
        Assert.True(sessions.TryGet("new-attempt", out var retained));
        Assert.Same(replacement, retained);
    }

    [Fact]
    public void DuplicateIdentifiersCannotReplaceResourcesAndActiveCloseOnlyClearsSelection()
    {
        var sessions = new RdpSessionSet<object>();
        var original = new object();
        sessions.Add("first", original); sessions.Add("second", new object());
        Assert.Throws<ArgumentException>(() => sessions.Add("first", new object()));
        sessions.Activate("first");
        Assert.Same(original, sessions.Remove("first"));
        Assert.Null(sessions.ActiveId);
        Assert.Single(sessions.Ids);
        Assert.True(sessions.TryGet("second", out _));
    }
}
