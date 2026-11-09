using System.IO;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Security.Cryptography;
using AiSysadminDesktop;
using Xunit;

public sealed class LocalAiHistoryTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "AiSysadminHistoryTests", Guid.NewGuid().ToString("N"));
    private string StorePath => Path.Combine(_directory, "inventory.dat");
    private LocalConnectionStore Store => new(StorePath);
    private static JsonElement Body(object value) => JsonSerializer.SerializeToElement(value);
    private void Setup()
    {
        Store.Handle("POST", "/servers/", Body(new {hostname="Host A", ip_address="192.0.2.10"}));
        Store.Handle("POST", "/servers/", Body(new {hostname="Host B", ip_address="192.0.2.20"}));
        Store.Handle("PUT", "/ai/settings", Body(new {base_url="https://provider.example/v1",model="test-model",api_key="synthetic-key",consent_accepted=true}));
    }
    [Fact]
    public void CompanionIncludesRecentConversationButDoesNotRepeatOldAttachments()
    {
        Setup();
        var evidence = new LocalConnectionStore.AiEvidence("synthetic evidence text", "manual", DateTimeOffset.UtcNow);
        Assert.Throws<ArgumentException>(() => Store.PrepareAiInvocation(1, "Question", evidence));
        var first = Store.PrepareAiInvocation(1, "Question", evidence, true);
        Assert.Contains("synthetic evidence text", first.Context);
        Assert.True(Store.SaveAiTurn(first, "Earlier analysis", "df -h /"));
        var next = Store.PrepareAiInvocation(1, "New question");
        Assert.DoesNotContain("synthetic evidence text", next.Context);
        Assert.Contains("Earlier analysis", next.Context);
        Assert.DoesNotContain("Host B", next.Context);
    }
    [Fact]
    public void HistoryIsEncryptedScopedAndReloadedFromDisk()
    {
        Setup();
        Store.SaveAiTurn(Store.PrepareAiInvocation(1, "Question"), "Synthetic stored analysis", "df -h /");
        Assert.Equal(1, Store.Handle("GET", "/servers/1/history", default).GetArrayLength());
        Assert.Empty(Store.Handle("GET", "/servers/2/history", default).EnumerateArray());
        Assert.DoesNotContain("Synthetic stored analysis", Encoding.UTF8.GetString(File.ReadAllBytes(StorePath)));
    }
    [Fact]
    public void ClearingHistoryPreventsAnInFlightResponseFromResurrectingIt()
    {
        Setup();
        var pending = Store.PrepareAiInvocation(1, "Pending question");
        Store.Handle("DELETE", "/servers/1/history", default);
        Assert.False(Store.SaveAiTurn(pending, "Late response", null));
        Assert.Empty(Store.Handle("GET", "/servers/1/history", default).EnumerateArray());
    }
    [Fact]
    public void TargetChangesOrDeletionDoNotAttachOldResponses()
    {
        Setup();
        var pending = Store.PrepareAiInvocation(1, "Pending question");
        Store.Handle("PUT", "/servers/1", Body(new {ip_address="192.0.2.99"}));
        Assert.False(Store.SaveAiTurn(pending, "Late response", null));
        var next = Store.PrepareAiInvocation(1, "Next question");
        Store.Handle("DELETE", "/servers/1", default);
        Assert.False(Store.SaveAiTurn(next, "Another response", null));
    }
    [Fact]
    public void RetentionKeepsOnlyTheLatestTwentyTurnsPerServer()
    {
        Setup();
        for (var i=0; i<23; i++) Store.SaveAiTurn(Store.PrepareAiInvocation(1, "Question " + i), "Response " + i, null);
        var turns = Store.Handle("GET", "/servers/1/history", default);
        Assert.Equal(20, turns.GetArrayLength());
        Assert.Equal("Question 3", turns[0].GetProperty("query").GetString());
    }
    [Theory]
    [InlineData("unsupported", 1)]
    [InlineData("manual", 12001)]
    public void InvalidEvidenceIsRejected(string source, int length)
    {
        Setup();
        Assert.Throws<ArgumentException>(() => Store.PrepareAiInvocation(1, "Question", new(new string('x', length), source, DateTimeOffset.UtcNow), true));
    }

    [Fact]
    public void PreviousConsentScopeRequiresReacceptanceWithoutLosingTheStoredKey()
    {
        Setup();
        var entropy = Encoding.UTF8.GetBytes("AiSysadmin.LocalConnections.v1");
        var plain = ProtectedData.Unprotect(File.ReadAllBytes(StorePath), entropy, DataProtectionScope.CurrentUser);
        var data = JsonNode.Parse(plain)!;
        data["ai"]!["consent_version"] = "selected-server-v1";
        File.WriteAllBytes(StorePath, ProtectedData.Protect(Encoding.UTF8.GetBytes(data.ToJsonString()), entropy, DataProtectionScope.CurrentUser));
        CryptographicOperations.ZeroMemory(plain);
        Assert.False(Store.Handle("GET", "/ai/settings", default).GetProperty("consent_accepted").GetBoolean());
        Assert.Throws<InvalidOperationException>(() => Store.PrepareAiInvocation(1, "Question"));
        Store.Handle("PUT", "/ai/settings", Body(new {base_url="https://provider.example/v1",model="test-model",consent_accepted=true}));
        Assert.Equal("synthetic-key", Store.PrepareAiInvocation(1,"Question").ApiKey);
    }

    [Fact]
    public void LegacyInventoryMigratesOnWriteWithoutDiscardingConnections()
    {
        Setup();
        var entropy = Encoding.UTF8.GetBytes("AiSysadmin.LocalConnections.v1");
        var plain = ProtectedData.Unprotect(File.ReadAllBytes(StorePath), entropy, DataProtectionScope.CurrentUser);
        var data = JsonNode.Parse(plain)!; data["version"] = 1; data.AsObject().Remove("ai_history");
        File.WriteAllBytes(StorePath, ProtectedData.Protect(Encoding.UTF8.GetBytes(data.ToJsonString()), entropy, DataProtectionScope.CurrentUser));
        CryptographicOperations.ZeroMemory(plain);
        Assert.Equal(2, Store.Handle("GET", "/servers/", default).GetArrayLength());
        Assert.Empty(Store.Handle("GET", "/servers/1/history", default).EnumerateArray());
        Store.Handle("PUT", "/servers/1", Body(new {hostname="Renamed legacy host"}));
        var migrated = ProtectedData.Unprotect(File.ReadAllBytes(StorePath), entropy, DataProtectionScope.CurrentUser);
        using var document = JsonDocument.Parse(migrated);
        Assert.Equal(3, document.RootElement.GetProperty("version").GetInt32());
        Assert.Equal(2, document.RootElement.GetProperty("servers").GetArrayLength());
        CryptographicOperations.ZeroMemory(migrated);
    }
    public void Dispose() { if (Directory.Exists(_directory)) Directory.Delete(_directory, true); }
}
