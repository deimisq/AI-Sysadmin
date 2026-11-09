using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using AiSysadminDesktop;
using Xunit;

public sealed class LocalAiTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "AiSysadminAiTests", Guid.NewGuid().ToString("N"));
    private LocalConnectionStore Store => new(Path.Combine(_directory, "inventory.dat"));
    private static JsonElement Body(object value) => JsonSerializer.SerializeToElement(value);
    private void Setup()
    {
        Store.Handle("POST", "/servers/", Body(new { hostname = "Selected host", ip_address = "192.0.2.10", ssh_password = "infrastructure-password", ssh_key_path = "infrastructure-private-key", description = "private notes" }));
        Store.Handle("POST", "/servers/", Body(new { hostname = "Unrelated customer", ip_address = "192.0.2.20" }));
    }
    private JsonElement Settings(string url = "https://provider.example/v1", bool consent = true) => Body(new { base_url = url, model = "test-model", api_key = "synthetic-provider-key", consent_accepted = consent });
    private static JsonElement Query => Body(new { server_id = 1, problem_description = "Investigate disk space" });
    private sealed class Handler(Func<HttpRequestMessage, Task<HttpResponseMessage>> callback) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) { Calls++; return callback(request); }
    }

    [Theory]
    [InlineData("http://provider.example/v1", true)]
    [InlineData("https://user:password@provider.example/v1", true)]
    [InlineData("https://provider.example/v1?token=secret", true)]
    [InlineData("https://provider.example/v1", false)]
    public void ConfigurationRejectsUnsafeUrlsAndMissingConsent(string url, bool consent)
    {
        Assert.Throws<ArgumentException>(() => Store.Handle("PUT", "/ai/settings", Settings(url, consent)));
        Assert.False(File.Exists(Path.Combine(_directory, "inventory.dat")));
    }

    [Fact]
    public async Task MissingOrRevokedConsentPreventsAllHttpRequests()
    {
        Setup();
        var handler = new Handler(_ => throw new Exception("Network must not be called"));
        using var service = new LocalAiService(Store, handler);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DiagnoseAsync(Query));
        Store.Handle("PUT", "/ai/settings", Settings());
        Store.Handle("DELETE", "/ai/settings", default);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DiagnoseAsync(Query));
        Assert.Equal(0, handler.Calls);
    }

    [Fact]
    public async Task SendsOnlySelectedMetadataAndUserQueryWithKeyInHeader()
    {
        Setup();
        Store.Handle("PUT", "/ai/settings", Settings());
        var metadata = Store.Handle("GET", "/ai/settings", default);
        Assert.True(metadata.GetProperty("consent_accepted").GetBoolean());
        Assert.False(metadata.TryGetProperty("api_key", out _));
        var disk = Encoding.UTF8.GetString(File.ReadAllBytes(Path.Combine(_directory, "inventory.dat")));
        Assert.DoesNotContain("synthetic-provider-key", disk);
        var handler = new Handler(async request => {
            Assert.Equal("https://provider.example/v1/chat/completions", request.RequestUri!.ToString());
            Assert.Equal("synthetic-provider-key", request.Headers.Authorization!.Parameter);
            var payload = await request.Content!.ReadAsStringAsync();
            Assert.Contains("Selected host", payload);
            Assert.DoesNotContain("Unrelated customer", payload);
            Assert.DoesNotContain("infrastructure-password", payload);
            Assert.DoesNotContain("infrastructure-private-key", payload);
            Assert.DoesNotContain("private notes", payload);
            Assert.DoesNotContain("synthetic-provider-key", payload);
            var content = JsonSerializer.Serialize(new { analysis = "Suggested investigation", proposed_command = "df -h /" });
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new { choices = new[] { new { message = new { content } } } })) };
        });
        using var service = new LocalAiService(Store, handler);
        var result = await service.DiagnoseAsync(Query);
        Assert.Equal("df -h /", result.GetProperty("analysis").GetProperty("proposed_command").GetString());
        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public async Task RedirectsAndProviderErrorsAreNotRetriedOrEchoed()
    {
        Setup(); Store.Handle("PUT", "/ai/settings", Settings());
        var handler = new Handler(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.TemporaryRedirect) { Content = new StringContent("sensitive provider diagnostic"), Headers = { Location = new Uri("https://other.example") } }));
        using var service = new LocalAiService(Store, handler);
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => service.DiagnoseAsync(Query));
        Assert.DoesNotContain("sensitive", exception.Message);
        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public void ChangingProviderCannotReuseThePreviousApiKey()
    {
        Store.Handle("PUT", "/ai/settings", Settings());
        Assert.Throws<ArgumentException>(() => Store.Handle("PUT", "/ai/settings", Body(new { base_url = "https://different.example/v1", model = "test-model", consent_accepted = true })));
    }

    [Fact]
    public async Task SelectedEvidenceIsNotSentUntilReviewed()
    {
        Setup(); Store.Handle("PUT", "/ai/settings", Settings());
        var handler = new Handler(async request => {
            using var payload = JsonDocument.Parse(await request.Content!.ReadAsStringAsync());
            using var context = JsonDocument.Parse(payload.RootElement.GetProperty("messages")[1].GetProperty("content").GetString()!);
            Assert.Equal("selected diagnostic evidence", context.RootElement.GetProperty("context").GetProperty("evidence").GetProperty("content").GetString());
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"choices\":[{\"message\":{\"content\":\"Evidence analyzed\"}}]}") };
        });
        using var service = new LocalAiService(Store, handler);
        var evidence = new {content="selected diagnostic evidence",source="diagnostic",captured_at=DateTimeOffset.UtcNow};
        await Assert.ThrowsAsync<ArgumentException>(() => service.DiagnoseAsync(Body(new {server_id=1,problem_description="Investigate",evidence,evidence_reviewed=false})));
        Assert.Equal(0, handler.Calls);
        var response = await service.DiagnoseAsync(Body(new {server_id=1,problem_description="Investigate",evidence,evidence_reviewed=true}));
        Assert.True(response.GetProperty("history_saved").GetBoolean());
        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public async Task ChangedTargetIsRejectedBeforeSendingContext()
    {
        Setup(); Store.Handle("PUT", "/ai/settings", Settings());
        Store.Handle("PUT", "/servers/1", Body(new {ip_address="192.0.2.99"}));
        var handler = new Handler(_ => throw new Exception("No HTTP request expected"));
        using var service = new LocalAiService(Store, handler);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DiagnoseAsync(Body(new {server_id=1,problem_description="Investigate",expected_target=new {address="192.0.2.10",protocol="ssh",port=22}})));
        Assert.Equal(0, handler.Calls);
    }

    [Fact]
    public async Task ConcurrentQueriesDoNotMultiplyProviderUsage()
    {
        Setup(); Store.Handle("PUT", "/ai/settings", Settings());
        var started = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var handler = new Handler(async _ => {
            started.SetResult(); await release.Task;
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"choices\":[{\"message\":{\"content\":\"Example analysis\"}}]}") };
        });
        using var service = new LocalAiService(Store, handler);
        var first = service.DiagnoseAsync(Query);
        await started.Task;
        try { await Assert.ThrowsAsync<InvalidOperationException>(() => service.DiagnoseAsync(Query)); }
        finally { release.TrySetResult(); }
        await first;
        Assert.Equal(1, handler.Calls);
    }

    public void Dispose() { if (Directory.Exists(_directory)) Directory.Delete(_directory, true); }
}
