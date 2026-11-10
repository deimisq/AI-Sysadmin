using System.Text.Json;
using AiSysadminDesktop;
using Xunit;

public sealed class ChatCommandTests : IDisposable
{
    private readonly string _path = Path.Combine(Path.GetTempPath(), "ChatCommandTests", Guid.NewGuid().ToString("N"));
    private static JsonElement Body(object value) => JsonSerializer.SerializeToElement(value);
    private LocalConnectionStore Store => new(Path.Combine(_path, "inventory.dat"));
    private void Setup()
    {
        Store.Handle("POST", "/servers/", Body(new { hostname = "Test", ip_address = "192.0.2.10" }));
        Store.Handle("PUT", "/ai/settings", Body(new { provider = "openai", model = "fake", api_key = "synthetic", consent_accepted = true }));
    }
    [Fact]
    public async Task ExactProposalRunsOnceAndAutomaticModeRequiresPermission()
    {
        Setup(); var store = Store; var calls = 0;
        var service = new ChatCommandService(store, (_, _, _) => true, (_, command, _) => {
            calls++; Assert.Equal("df -h", command); return Task.FromResult(new LocalTaskAgent.Observation(command, "observed", 0));
        });
        string Register() => service.Register(store.PrepareAiInvocation(1, "Inspect"), "session", "df -h")!;
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExecuteAsync(Body(new { proposal_id = Register(), scope = "auto" })));
        Assert.Equal(0, calls);
        var proposal = Register();
        await service.ExecuteAsync(Body(new { proposal_id = proposal, scope = "once", command = "UNTRUSTED OVERRIDE" }));
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExecuteAsync(Body(new { proposal_id = proposal, scope = "once" })));
        Assert.Equal(1, calls); Assert.Equal("ask", service.Permission(1, "session"));
    }
    [Theory]
    [InlineData("session")]
    [InlineData("always")]
    public async Task GrantsAreScopedAndRevocable(string scope)
    {
        Setup(); var store = Store;
        var service = new ChatCommandService(store, (_, _, _) => true, (_, command, _) => Task.FromResult(new LocalTaskAgent.Observation(command, "ok", 0)));
        var proposal = service.Register(store.PrepareAiInvocation(1, "Inspect"), "session", "id");
        await service.ExecuteAsync(Body(new { proposal_id = proposal, scope }));
        Assert.Equal(scope, service.Permission(1, "session"));
        Assert.Equal(scope == "always" ? "always" : "ask", service.Permission(1, "another-session"));
        var restarted = new ChatCommandService(Store, (_, _, _) => true, (_, _, _) => throw new Exception());
        Assert.Equal(scope == "always" ? "always" : "ask", restarted.Permission(1, "session"));
        service.Revoke(1, "session"); Assert.Equal("ask", service.Permission(1, "session"));
    }
    [Fact]
    public async Task ClearingTheChatInvalidatesItsPendingCommandProposals()
    {
        Setup(); var store = Store;
        var service = new ChatCommandService(store, (_, _, _) => true, (_, _, _) => throw new Exception("Must not execute an old proposal"));
        var proposal = service.Register(store.PrepareAiInvocation(1, "Inspect"), "session", "id");
        store.Handle("DELETE", "/servers/1/history", default);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExecuteAsync(Body(new { proposal_id = proposal, scope = "once" })));
        Assert.Empty(store.Handle("GET", "/servers/1/history", default).EnumerateArray());
    }

    [Fact]
    public async Task ChangedTargetAndRevokedConsentPreventExecution()
    {
        Setup(); var store = Store;
        var service = new ChatCommandService(store, (_, _, _) => true, (_, _, _) => throw new Exception("Must never execute"));
        var proposal = service.Register(store.PrepareAiInvocation(1, "Inspect"), "session", "id");
        store.Handle("PUT", "/servers/1", Body(new { ssh_port = 2222 }));
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExecuteAsync(Body(new { proposal_id = proposal, scope = "once" })));
        proposal = service.Register(store.PrepareAiInvocation(1, "Inspect"), "session", "id");
        store.Handle("DELETE", "/ai/settings", default);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExecuteAsync(Body(new { proposal_id = proposal, scope = "once" })));
    }
    public void Dispose() { if (Directory.Exists(_path)) Directory.Delete(_path, true); }
}
