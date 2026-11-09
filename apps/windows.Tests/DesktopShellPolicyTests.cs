using System.IO;
using AiSysadminDesktop;
using Xunit;

public sealed class DesktopShellPolicyTests : IDisposable
{
    private readonly string _path=Path.Combine(Path.GetTempPath(),"AiDesktopShellTests",Guid.NewGuid().ToString("N"));
    [Fact] public void ProductionOpensAnExplicitFileAndNeverTheMappedDirectory()
    {
        Directory.CreateDirectory(_path); File.WriteAllText(Path.Combine(_path,"index.html"),"synthetic entry");
        Assert.Equal("https://appassets.local/index.html",DesktopShellPolicy.EntryPoint(_path,null).AbsoluteUri);
    }
    [Fact] public void MissingBundleFailsLocallyInsteadOfNavigatingToAnErrorPage()
    {
        Assert.Throws<FileNotFoundException>(()=>DesktopShellPolicy.EntryPoint(_path,null));
    }
    [Theory]
    [InlineData("https://external.example")]
    [InlineData("file:///C:/example/index.html")]
    [InlineData("http://localhost.external.example")]
    [InlineData("http://user:password@localhost:5173")]
    public void DevelopmentOverridesCannotTargetExternalOrCredentialedPages(string url)
    {
        Assert.Throws<ArgumentException>(()=>DesktopShellPolicy.EntryPoint(_path,url));
    }
    [Fact] public void NavigationStaysWithinTheExactTrustedOrigin()
    {
        Assert.True(DesktopShellPolicy.IsInternal("https://appassets.local/index.html#/settings",DesktopShellPolicy.Origin));
        Assert.False(DesktopShellPolicy.IsInternal("https://appassets.local.external.example",DesktopShellPolicy.Origin));
        Assert.False(DesktopShellPolicy.IsInternal("https://user@appassets.local/index.html",DesktopShellPolicy.Origin));
        Assert.Equal("http://127.0.0.1:5173/",DesktopShellPolicy.EntryPoint(_path,"http://127.0.0.1:5173/").AbsoluteUri);
    }
    public void Dispose(){if(Directory.Exists(_path))Directory.Delete(_path,true);}
}
