using System.IO;
using AiSysadminDesktop;
using Xunit;

public sealed class WindowPresentationStoreTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "AiWindowPresentationTests", Guid.NewGuid().ToString("N"));
    private string PathName => Path.Combine(_root, "presentation.json");

    [Fact] public void RoundTripRetainsNormalBoundsAndMaximizedPreference()
    {
        var expected = new WindowPresentationStore.Presentation(1, 1370, 820, true);
        Assert.True(new WindowPresentationStore(PathName).Save(expected));
        Assert.Equal(expected, new WindowPresentationStore(PathName).Load());
        Assert.Single(Directory.GetFiles(_root));
    }

    [Fact] public void SmallerScreenClampsSavedSizeWhileRespectingMinimums()
    {
        var fitted = WindowPresentationStore.Fit(new(1, 3840, 2160, true), 1280, 900, 980, 620);
        Assert.Equal(1280, fitted.Width);
        Assert.Equal(900, fitted.Height);
        Assert.True(fitted.Maximized);
        var tiny = WindowPresentationStore.Fit(new(1, 400, 200, false), 1280, 900, 980, 620);
        Assert.Equal(980, tiny.Width);
        Assert.Equal(620, tiny.Height);
    }

    [Theory]
    [InlineData("{broken")]
    [InlineData("null")]
    [InlineData("{\"Version\":2,\"Width\":1200,\"Height\":800}")]
    [InlineData("{\"Version\":1,\"Width\":-1,\"Height\":800}")]
    public void InvalidSavedDataDoesNotPreventStartup(string json)
    {
        Directory.CreateDirectory(_root); File.WriteAllText(PathName, json);
        Assert.Null(new WindowPresentationStore(PathName).Load());
    }

    [Fact] public void MissingDataAndWriteFailuresDoNotPreventUsingTheApp()
    {
        var store = new WindowPresentationStore(PathName);
        Assert.Null(store.Load());
        Directory.CreateDirectory(PathName);
        Assert.False(store.Save(new(1, 1200, 800, false)));
        Assert.Empty(Directory.GetFiles(_root));
        Assert.False(store.Save(new(1, double.NaN, 800, false)));
    }

    public void Dispose() { if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true); }
}
