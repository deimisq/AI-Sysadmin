using System.IO;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AiSysadminDesktop;
using Xunit;

public sealed class AppUpdateTests : IDisposable
{
    private readonly string _directory=Path.Combine(Path.GetTempPath(),"AiUpdateTests",Guid.NewGuid().ToString("N"));
    private sealed class Handler(Func<HttpRequestMessage,HttpResponseMessage> callback) : HttpMessageHandler {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken token) => Task.FromResult(callback(request));
    }
    private static JsonElement State(AppUpdates updates) => JsonSerializer.SerializeToElement(updates.Status());
    private static HttpResponseMessage Releases(string digest,bool prerelease=false) => new(HttpStatusCode.OK) { Content=new StringContent(JsonSerializer.Serialize(new[] { new { tag_name="windows-0.11.999",draft=false,prerelease,body="Test notes",assets=new[] {new { id=123,name="AI-Sysadmin-Agent-0.11.999-win-x64-setup.exe",size=7,digest="sha256:"+digest }}} })) };
    [Theory]
    [InlineData("0.11.12","0.11.9",true)]
    [InlineData("0.11.1","0.10.0-preview.40",true)]
    [InlineData("0.11.9","0.11.12",false)]
    [InlineData("0.11.12","0.11.12",false)]
    [InlineData("0.11.12.ci.1","0.11.0",false)]
    [InlineData("../../evil","0.11.0",false)]
    public void ComparesNumericVersionsWithoutDowngrades(string candidate,string current,bool expected) => Assert.Equal(expected,AppUpdates.IsNewer(candidate,current));
    [Fact] public async Task CheckDoesNotDownloadAndDownloadRequiresMatchingHash()
    {
        var bytes=Encoding.ASCII.GetBytes("fixture"); var hash=Convert.ToHexString(SHA256.HashData(bytes)); var calls=0;
        using var updates=new AppUpdates(new Handler(request => {
            calls++;
            if(request.RequestUri!.AbsolutePath.EndsWith("/releases")) return Releases(hash);
            Assert.EndsWith("/releases/assets/123",request.RequestUri.AbsolutePath);
            return new(HttpStatusCode.OK) {Content=new ByteArrayContent(bytes)};
        }),_directory);
        await updates.CheckAsync(); Assert.Equal(1,calls); Assert.Equal("available",State(updates).GetProperty("state").GetString());
        Assert.False(Directory.Exists(_directory));
        await updates.DownloadAsync(); Assert.Equal(2,calls); Assert.Equal("downloaded",State(updates).GetProperty("state").GetString());
        var file=Assert.Single(Directory.GetFiles(_directory,"*.exe")); File.WriteAllText(file,"tampered");
        // Development/portable instance must never install over the registered user app.
        await Assert.ThrowsAsync<InvalidOperationException>(()=>updates.InstallAsync());
        Assert.Equal("error",State(updates).GetProperty("state").GetString());
    }
    [Fact] public async Task RejectsCorruptDownloadWithoutKeepingAnExecutable()
    {
        using var updates=new AppUpdates(new Handler(request => request.RequestUri!.AbsolutePath.EndsWith("/releases") ? Releases(new string('0',64)) : new(HttpStatusCode.OK) {Content=new ByteArrayContent(Encoding.ASCII.GetBytes("fixture"))}),_directory);
        await updates.CheckAsync(); await Assert.ThrowsAsync<InvalidOperationException>(()=>updates.DownloadAsync());
        Assert.Empty(Directory.GetFiles(_directory,"*.exe"));
    }
    [Fact] public async Task PreparingInstallationDoesNotExecuteInstallerOrReplaceFiles()
    {
        var bytes=Encoding.ASCII.GetBytes("fixture");
        var root=Path.Combine(_directory,"synthetic-installed");
        using var updates=new AppUpdates(new Handler(request=>request.RequestUri!.AbsolutePath.EndsWith("/releases") ? Releases(Convert.ToHexString(SHA256.HashData(bytes))) : new(HttpStatusCode.OK){Content=new ByteArrayContent(bytes)}),_directory,()=>root);
        await updates.CheckAsync(); await updates.DownloadAsync(); await updates.InstallAsync();
        Assert.Equal("restart",State(updates).GetProperty("state").GetString());
        Assert.False(Directory.Exists(root));
        // This is deliberately not an executable: preparation must not launch it.
        Assert.Single(Directory.GetFiles(_directory,"*.exe"));
        File.WriteAllText(Directory.GetFiles(_directory,"*.exe")[0],"tampered");
        Assert.Throws<InvalidOperationException>(()=>updates.Restart());
    }
    [Fact] public void InstallationRecognitionSupportsFlatAndLegacyButRejectsOtherLocations()
    {
        var root=Path.Combine(_directory,"installed");
        Assert.Equal(root,AppUpdates.ResolveInstallRoot(root,root));
        Assert.Equal(root,AppUpdates.ResolveInstallRoot(root,Path.Combine(root,"versions","0.11.46")));
        Assert.Null(AppUpdates.ResolveInstallRoot(root,Path.Combine(_directory,"installed-other")));
        Assert.Null(AppUpdates.ResolveInstallRoot(root,Path.Combine(_directory,"portable")));
    }
    [Fact] public async Task PrivateTokenIsProtectedAndNeverForwardedToAssetStorage()
    {
        var bytes=Encoding.ASCII.GetBytes("fixture");
        using var updates=new AppUpdates(new Handler(request => {
            if(request.RequestUri!.Host=="api.github.com") {
                Assert.Equal("synthetic-github-token",request.Headers.Authorization?.Parameter);
                if(request.RequestUri.AbsolutePath.EndsWith("/releases")) return Releases(Convert.ToHexString(SHA256.HashData(bytes)));
                var redirect=new HttpResponseMessage(HttpStatusCode.Redirect); redirect.Headers.Location=new Uri("https://release-assets.githubusercontent.com/test"); return redirect;
            }
            Assert.Null(request.Headers.Authorization); return new(HttpStatusCode.OK) {Content=new ByteArrayContent(bytes)};
        }),_directory);
        updates.SaveToken("synthetic-github-token");
        Assert.DoesNotContain("synthetic-github-token",Encoding.UTF8.GetString(File.ReadAllBytes(Path.Combine(_directory,"github-token.dat"))));
        await updates.CheckAsync(); await updates.DownloadAsync();
        updates.SaveToken(""); Assert.False(State(updates).GetProperty("has_token").GetBoolean());
    }
    [Fact] public async Task IgnoresPrereleasesAndBlocksUntrustedRedirects()
    {
        using var previews=new AppUpdates(new Handler(_=>Releases(new string('0',64),true)),_directory);
        await previews.CheckAsync(); Assert.Equal("current",State(previews).GetProperty("state").GetString());
        using var updates=new AppUpdates(new Handler(_=> {var response=new HttpResponseMessage(HttpStatusCode.Redirect); response.Headers.Location=new Uri("https://evil.example/download"); return response;}),_directory);
        await Assert.ThrowsAsync<InvalidOperationException>(()=>updates.CheckAsync());
    }
    public void Dispose() {if(Directory.Exists(_directory)) Directory.Delete(_directory,true);}
}
