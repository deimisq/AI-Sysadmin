using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using AiSysadminDesktop;
using Xunit;

[assembly: CollectionBehavior(DisableTestParallelization = true)]

public class ApiProxyTests : IDisposable
{
    private readonly HttpListener _backend = new();
    private readonly ApiProxyServer _proxy;
    private readonly HttpClient _client = new() { Timeout = TimeSpan.FromSeconds(5) };
    private readonly string? _originalBackend = Environment.GetEnvironmentVariable("AI_AGENT_BACKEND_URL");
    private int _requests;
    private readonly string _url;

    public ApiProxyTests()
    {
        int backendPort = FreePort(), proxyPort = FreePort();
        _backend.Prefixes.Add($"http://localhost:{backendPort}/");
        _backend.Start();
        Environment.SetEnvironmentVariable("AI_AGENT_BACKEND_URL", $"http://localhost:{backendPort}");
        _proxy = new ApiProxyServer();
        _proxy.Start(proxyPort);
        _url = $"http://localhost:{proxyPort}";
        _ = ServeAsync();
    }

    private static int FreePort()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        int port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }

    private async Task ServeAsync()
    {
        while (_backend.IsListening)
        {
            HttpListenerContext context;
            try { context = await _backend.GetContextAsync(); }
            catch (HttpListenerException) { break; }
            catch (ObjectDisposedException) { break; }
            Interlocked.Increment(ref _requests);
            using var reader = new StreamReader(context.Request.InputStream);
            string body = await reader.ReadToEndAsync();
            switch (context.Request.Url!.AbsolutePath)
            {
                case "/api/redirect":
                    context.Response.StatusCode = 307;
                    context.Response.RedirectLocation = "/api/result";
                    break;
                case "/api/external":
                    context.Response.StatusCode = 307;
                    context.Response.RedirectLocation = "http://localhost:1/credential-leak";
                    break;
                case "/api/loop":
                    context.Response.StatusCode = 307;
                    context.Response.RedirectLocation = "/api/loop";
                    break;
                default:
                    context.Response.ContentType = "application/json";
                    byte[] result = JsonSerializer.SerializeToUtf8Bytes(new { method = context.Request.HttpMethod, body, authorization = context.Request.Headers["Authorization"] });
                    await context.Response.OutputStream.WriteAsync(result);
                    break;
            }
            context.Response.Close();
        }
    }

    [Fact]
    public async Task SameOriginRedirectPreservesBodyAndAuthorization()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, _url + "/api/redirect");
        request.Content = new StringContent("{\"command\":\"test\"}", Encoding.UTF8, "application/json");
        request.Headers.Add("Authorization", "Bearer test-token");
        using var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var data = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("POST", data.RootElement.GetProperty("method").GetString());
        Assert.Equal("{\"command\":\"test\"}", data.RootElement.GetProperty("body").GetString());
        Assert.Equal("Bearer test-token", data.RootElement.GetProperty("authorization").GetString());
        Assert.Equal(2, _requests);
    }

    [Theory]
    [InlineData("external")]
    [InlineData("loop")]
    public async Task UnsafeRedirectsReturnValidJson(string path)
    {
        using var response = await _client.GetAsync(_url + "/api/" + path);
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        using var data = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(data.RootElement.TryGetProperty("detail", out _));
        if (path == "external") Assert.Equal(1, _requests);
    }

    [Fact]
    public async Task ForeignBrowserOriginsCannotUseProxy()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, _url + "/api/result");
        request.Headers.Add("Origin", "https://untrusted.example");
        using var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(0, _requests);
    }

    [Fact]
    public async Task DesktopOriginReceivesSpecificCorsHeader()
    {
        using var request = new HttpRequestMessage(HttpMethod.Options, _url + "/api/result");
        request.Headers.Add("Origin", "https://appassets.local");
        using var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("https://appassets.local", response.Headers.GetValues("Access-Control-Allow-Origin").Single());
        Assert.Equal(0, _requests);
    }

    [Fact]
    public void OccupiedPortFailsInsteadOfUsingAnotherProcess()
    {
        var second = new ApiProxyServer();
        try { Assert.Throws<InvalidOperationException>(() => second.Start(new Uri(_url).Port)); }
        finally { second.Stop(); }
    }

    [Fact]
    public void RemoteBackendRequiresHttps()
    {
        Environment.SetEnvironmentVariable("AI_AGENT_BACKEND_URL", "http://remote.example");
        Assert.Throws<ArgumentException>(() => new ApiProxyServer());
    }

    public void Dispose()
    {
        _proxy.Stop();
        _backend.Close();
        _client.Dispose();
        Environment.SetEnvironmentVariable("AI_AGENT_BACKEND_URL", _originalBackend);
    }
}
