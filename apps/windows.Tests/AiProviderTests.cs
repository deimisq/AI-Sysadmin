using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using AiSysadminDesktop;
using Xunit;

public sealed class AiProviderTests : IDisposable
{
    private readonly string _directory = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "AiProviderTests", Guid.NewGuid().ToString("N"));
    private LocalConnectionStore Store => new(System.IO.Path.Combine(_directory, "inventory.dat"));
    private static JsonElement Body(object body) => JsonSerializer.SerializeToElement(body);
    private sealed class Handler(Func<HttpRequestMessage, Task<HttpResponseMessage>> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token) => respond(request);
    }
    private static HttpResponseMessage Response(object body) => new(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(body)) };
    private LocalConnectionStore.AiInvocation Configure(string provider, string model, string? key = null)
    {
        Store.Handle("POST", "/servers/", Body(new { hostname = "Test host", ip_address = "192.0.2.10" }));
        Store.Handle("PUT", "/ai/settings", Body(new { provider, model, api_key = key, consent_accepted = true }));
        return Store.PrepareAiInvocation(1, "Test question");
    }

    [Theory]
    [InlineData("openai", "https://api.openai.com/v1")]
    [InlineData("gemini", "https://generativelanguage.googleapis.com/v1beta/openai")]
    [InlineData("claude", "https://api.anthropic.com/v1")]
    [InlineData("deepseek", "https://api.deepseek.com")]
    public void PresetsResolveTheirOwnAddressAndDoNotAcceptOverrides(string provider, string expected)
    {
        Store.Handle("POST", "/servers/", Body(new { hostname = "Test", ip_address = "192.0.2.10" }));
        Store.Handle("PUT", "/ai/settings", Body(new { provider, model = "test-model", base_url = "https://other.invalid", api_key = "synthetic", consent_accepted = true }));
        var invocation = Store.PrepareAiInvocation(1, "Question");
        Assert.Equal(expected, invocation.BaseUrl); Assert.Equal(provider, invocation.Provider);
        Assert.DoesNotContain("synthetic", Store.Handle("GET", "/ai/settings", default).GetRawText());
    }

    [Fact]
    public void LocalProvidersDoNotRequireAnApiKeyOrInheritACloudKey()
    {
        Configure("openai", "test", "synthetic-cloud-key");
        Store.Handle("PUT", "/ai/settings", Body(new { provider = "ollama", model = "installed:model", consent_accepted = true }));
        Assert.Equal("", Store.PrepareAiInvocation(1, "Question").ApiKey);
        Assert.Throws<ArgumentException>(() => Store.Handle("PUT", "/ai/settings", Body(new { provider = "gemini", model = "test", consent_accepted = true })));
        Store.Handle("PUT", "/ai/settings", Body(new { provider = "opencode", model = "ollama/installed", consent_accepted = true }));
        Assert.Equal("opencode", Store.PrepareAiInvocation(1, "Question").Provider);
    }

    [Theory]
    [InlineData("openai")]
    [InlineData("gemini")]
    [InlineData("deepseek")]
    [InlineData("ollama")]
    public async Task ChatTransportsUseTheSelectedEndpointAndOllamaHasNoAuthorization(string provider)
    {
        var invocation = Configure(provider, "test-model", provider == "ollama" ? null : "synthetic-key");
        using var client = new HttpClient(new Handler(async request => {
            Assert.Equal(invocation.BaseUrl + "/chat/completions", request.RequestUri!.AbsoluteUri);
            if (provider == "ollama") Assert.Null(request.Headers.Authorization);
            else Assert.Equal("synthetic-key", request.Headers.Authorization!.Parameter);
            using var document = JsonDocument.Parse(await request.Content!.ReadAsStringAsync());
            Assert.Equal("test-model", document.RootElement.GetProperty("model").GetString());
            return Response(new { choices = new[] { new { message = new { content = "reply" } } } });
        }));
        Assert.Equal("reply", await AiProviderTransport.CompleteAsync(client, invocation, [new("user", "Question")], CancellationToken.None));
    }

    [Fact]
    public async Task ClaudeUsesItsNativeMessagesApi()
    {
        var invocation = Configure("claude", "test-claude", "synthetic-key");
        using var client = new HttpClient(new Handler(async request => {
            Assert.Equal("https://api.anthropic.com/v1/messages", request.RequestUri!.AbsoluteUri);
            Assert.Equal("synthetic-key", request.Headers.GetValues("x-api-key").Single());
            Assert.Null(request.Headers.Authorization);
            using var document = JsonDocument.Parse(await request.Content!.ReadAsStringAsync());
            Assert.Equal("Instructions", document.RootElement.GetProperty("system").GetString());
            Assert.Equal(1, document.RootElement.GetProperty("messages").GetArrayLength());
            return Response(new { content = new[] { new { type = "text", text = "Claude reply" } } });
        }));
        Assert.Equal("Claude reply", await AiProviderTransport.CompleteAsync(client, invocation, [new("system", "Instructions"), new("user", "Question")], CancellationToken.None));
    }

    [Fact]
    public async Task OpenCodeUsesAnIsolatedSessionAndCleansUpOnlyThatSession()
    {
        var invocation = Configure("opencode", "ollama/installed", "synthetic-password");
        var paths = new List<string>();
        using var client = new HttpClient(new Handler(async request => {
            var path = request.RequestUri!.AbsolutePath; paths.Add(path);
            Assert.Equal("Basic", request.Headers.Authorization!.Scheme);
            Assert.Equal("opencode:synthetic-password", Encoding.UTF8.GetString(Convert.FromBase64String(request.Headers.Authorization.Parameter!)));
            if (path == "/session") {
                using var document = JsonDocument.Parse(await request.Content!.ReadAsStringAsync());
                var permissions = document.RootElement.GetProperty("permission");
                Assert.Equal("deny", permissions[0].GetProperty("action").GetString());
                return Response(new { id = "our-session", permission = permissions.Clone() });
            }
            if (path.EndsWith("/message")) {
                using var document = JsonDocument.Parse(await request.Content!.ReadAsStringAsync());
                Assert.Equal("ollama", document.RootElement.GetProperty("model").GetProperty("providerID").GetString());
                Assert.Equal("plan", document.RootElement.GetProperty("agent").GetString());
                return Response(new { info = new { }, parts = new[] { new { type = "text", text = "Local agent reply" } } });
            }
            Assert.Equal(HttpMethod.Delete, request.Method);
            return Response(true);
        }));
        Assert.Equal("Local agent reply", await AiProviderTransport.CompleteAsync(client, invocation, [new("user", "Question")], CancellationToken.None));
        Assert.Equal(new[] { "/session", "/session/our-session/message", "/session/our-session" }, paths);
    }

    [Fact]
    public async Task LocalDiscoveryListsOnlyInstalledOllamaModels()
    {
        using var handler = new Handler(request => {
            Assert.Equal("http://127.0.0.1:11434/api/tags", request.RequestUri!.AbsoluteUri);
            Assert.Null(request.Headers.Authorization);
            return Task.FromResult(Response(new { models = new[] { new { name = "installed:8b", remote_host = "" }, new { name = "remote:cloud", remote_host = "https://example.invalid" } } }));
        });
        var models = await AiProviderTransport.DiscoverAsync("ollama", handler: handler);
        Assert.Equal(1, models.GetProperty("models").GetArrayLength());
        Assert.Equal("installed:8b", models.GetProperty("models")[0].GetProperty("id").GetString());
    }

    [Fact]
    public async Task OpenCodeWithoutConfirmedPermissionsNeverReceivesThePrompt()
    {
        var invocation = Configure("opencode", "ollama/installed");
        var paths = new List<string>();
        using var client = new HttpClient(new Handler(request => {
            var path = request.RequestUri!.AbsolutePath; paths.Add(path);
            return Task.FromResult(path == "/session" ? Response(new { id = "our-session" }) : Response(true));
        }));
        await Assert.ThrowsAsync<InvalidOperationException>(() => AiProviderTransport.CompleteAsync(client, invocation, [new("user", "Synthetic context")], CancellationToken.None));
        Assert.DoesNotContain(paths, path => path.EndsWith("/message"));
        Assert.Contains("/session/our-session/abort", paths);
    }

    [Fact]
    public async Task OpenCodeDiscoveryOnlyListsConnectedProviders()
    {
        using var handler = new Handler(request => Task.FromResult(Response(new {
            connected = new[] { "ollama" },
            all = new[] {
                new { id = "ollama", name = "Ollama", models = new Dictionary<string, object> { ["installed"] = new { name = "Installed model" } } },
                new { id = "unconfigured", name = "Other", models = new Dictionary<string, object> { ["missing"] = new { name = "Unavailable model" } } },
            },
        })));
        var models = await AiProviderTransport.DiscoverAsync("opencode", handler: handler);
        Assert.Equal(1, models.GetProperty("models").GetArrayLength());
        Assert.Equal("ollama/installed", models.GetProperty("models")[0].GetProperty("id").GetString());
    }

    [Theory]
    [InlineData("http://localhost:11434", "http://localhost:11434/v1")]
    [InlineData("http://192.0.2.20:11500/api/", "http://192.0.2.20:11500/v1")]
    [InlineData("https://example.invalid/ollama/v1/", "https://example.invalid/ollama/v1")]
    [InlineData("http://[::1]:11434/api", "http://[::1]:11434/v1")]
    public void OllamaAcceptsServerNativeAndCompatibleUrls(string input, string expected) =>
        Assert.Equal(expected, AiProviders.NormalizeEndpoint("ollama", input));

    [Theory]
    [InlineData("file:///tmp/model")]
    [InlineData("https://user:password@example.invalid")]
    [InlineData("https://example.invalid?key=secret")]
    [InlineData("https://example.invalid#fragment")]
    public void ServiceAddressCannotContainEmbeddedCredentialsOrQuery(string input) =>
        Assert.Throws<ArgumentException>(() => AiProviders.NormalizeEndpoint("ollama", input));

    [Fact]
    public async Task DiscoveryAndChatUseTheConfiguredOllamaServerAndProxyToken()
    {
        Store.Handle("POST", "/servers/", Body(new { hostname = "Test", ip_address = "192.0.2.10" }));
        Store.Handle("PUT", "/ai/settings", Body(new { provider = "ollama", base_url = "https://example.invalid/local-ai/api", model = "installed", api_key = "synthetic-proxy-token", consent_accepted = true }));
        var invocation = Store.PrepareAiInvocation(1, "Question");
        Assert.Equal("https://example.invalid/local-ai/v1", invocation.BaseUrl);
        Assert.Equal("", Store.GetAiDiscoverySecret("ollama", "https://other.invalid/v1", "opencode"));
        using var discovery = new Handler(request => {
            Assert.Equal("https://example.invalid/local-ai/api/tags", request.RequestUri!.AbsoluteUri);
            Assert.Equal("synthetic-proxy-token", request.Headers.Authorization!.Parameter);
            return Task.FromResult(Response(new { models = new[] { new { name = "installed" } } }));
        });
        await AiProviderTransport.DiscoverAsync("ollama", invocation.ApiKey, discovery, invocation.BaseUrl);
        using var client = new HttpClient(new Handler(request => {
            Assert.Equal("https://example.invalid/local-ai/v1/chat/completions", request.RequestUri!.AbsoluteUri);
            Assert.Equal("synthetic-proxy-token", request.Headers.Authorization!.Parameter);
            return Task.FromResult(Response(new { choices = new[] { new { message = new { content = "reply" } } } }));
        }));
        await AiProviderTransport.CompleteAsync(client, invocation, [new("user", "Synthetic")], CancellationToken.None);
        Store.Handle("PUT", "/ai/settings", Body(new { provider = "ollama", base_url = "https://other.invalid", model = "installed", consent_accepted = true }));
        Assert.Equal("", Store.PrepareAiInvocation(1, "Question").ApiKey);
    }

    [Fact]
    public async Task OpenCodeUsesTheConfiguredUsernameForDiscovery()
    {
        using var handler = new Handler(request => {
            Assert.Equal("https://example.invalid/code/provider", request.RequestUri!.AbsoluteUri);
            Assert.Equal("custom-user:synthetic", Encoding.UTF8.GetString(Convert.FromBase64String(request.Headers.Authorization!.Parameter!)));
            return Task.FromResult(Response(new { connected = Array.Empty<string>(), all = Array.Empty<object>() }));
        });
        await AiProviderTransport.DiscoverAsync("opencode", "synthetic", handler, "https://example.invalid/code", "custom-user");
    }

    [Theory]
    [InlineData("openai", "OpenAI-Project", "proj-synthetic")]
    [InlineData("claude", "anthropic-workspace-id", "wrkspc-synthetic")]
    public async Task OptionalAccountFieldsAreSentOnlyToTheirProvider(string provider, string header, string value)
    {
        Configure(provider, "model", "synthetic");
        Store.Handle("PUT", "/ai/settings", Body(new { provider, model = "model", project = "proj-synthetic", workspace = "wrkspc-synthetic", consent_accepted = true }));
        using var client = new HttpClient(new Handler(request => {
            Assert.Equal(value, request.Headers.GetValues(header).Single());
            if (provider == "claude") Assert.False(request.Headers.Contains("OpenAI-Project"));
            return Task.FromResult(provider == "claude" ? Response(new { content = new[] { new { type = "text", text = "reply" } } }) : Response(new { choices = new[] { new { message = new { content = "reply" } } } }));
        }));
        await AiProviderTransport.CompleteAsync(client, Store.PrepareAiInvocation(1, "Question"), [new("user", "Synthetic")], CancellationToken.None);
    }

    public void Dispose() { if (System.IO.Directory.Exists(_directory)) System.IO.Directory.Delete(_directory, true); }
}
