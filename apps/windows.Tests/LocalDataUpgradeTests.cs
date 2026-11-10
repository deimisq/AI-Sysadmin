using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using AiSysadminDesktop;
using Xunit;

public sealed class LocalDataUpgradeTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "AiDataUpgrade", Guid.NewGuid().ToString("N"));
    private string InventoryPath => Path.Combine(_directory, "connections.dat");
    private LocalConnectionStore Store => new(InventoryPath);
    private static JsonElement Body(object value) => JsonSerializer.SerializeToElement(value);
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("AiSysadmin.LocalConnections.v1");
    private void Setup()
    {
        Store.Handle("POST", "/servers/", Body(new { hostname = "Synthetic", ip_address = "192.0.2.10", ssh_username = "test", ssh_password = "synthetic-ssh" }));
        Store.Handle("PUT", "/ai/settings", Body(new { provider = "openai", model = "synthetic-model", api_key = "synthetic-key", organization = "org-test", project = "project-test", consent_accepted = true }));
    }
    private JsonNode Read() => JsonNode.Parse(ProtectedData.Unprotect(File.ReadAllBytes(InventoryPath), Entropy, DataProtectionScope.CurrentUser))!;
    private void Write(JsonNode node) => File.WriteAllBytes(InventoryPath, ProtectedData.Protect(Encoding.UTF8.GetBytes(node.ToJsonString()), Entropy, DataProtectionScope.CurrentUser));
    [Fact]
    public void VersionThreeUpgradePreservesKeyAccountsInventoryHistoryPermissionsAndUnknownFields()
    {
        Setup();
        Store.Handle("PUT", "/workspace/context-policy", Body(new { max_characters = 8000 }));
        var invocation = Store.PrepareAiInvocation(1, "Synthetic question");
        Store.SaveAiTurn(invocation, "Synthetic answer", null);
        Store.SetAiExecutionGrant(invocation.Fingerprint, true);
        var legacy = Read(); legacy["version"] = 3; legacy["future_setting"] = "preserve"; legacy["ai"]!["future_ai_option"] = "preserve-ai"; Write(legacy);
        // A new instance represents starting the next installed application version.
        var updated = new LocalConnectionStore(InventoryPath);
        updated.Handle("PUT", "/servers/1", Body(new { description = "Updated notes" }));
        var current = updated.PrepareAiInvocation(1, "Follow up");
        Assert.Equal("synthetic-key", current.ApiKey); Assert.Equal("org-test", current.Organization); Assert.Equal("project-test", current.Project);
        Assert.Contains("Synthetic answer", current.Context); Assert.True(updated.HasAiExecutionGrant(invocation.Fingerprint)); Assert.Equal(8000, updated.GetContextLimit());
        Assert.Equal("synthetic-ssh", updated.Handle("GET", "/servers/1/credentials", default).GetProperty("ssh_password").GetString());
        var saved = Read(); Assert.Equal(4, saved["version"]!.GetValue<int>()); Assert.Equal("preserve", saved["future_setting"]!.GetValue<string>()); Assert.Equal("preserve-ai", saved["ai"]!["future_ai_option"]!.GetValue<string>());
        Assert.DoesNotContain("synthetic-key", updated.Handle("GET", "/ai/settings", default).GetRawText());
    }
    [Fact]
    public void PauseAndRestartPreserveKeyAndCanReenableWithoutTypingItAgain()
    {
        Setup();
        var metadata = Store.Handle("POST", "/ai/settings/pause", Body(new { }));
        Assert.True(metadata.GetProperty("has_api_key").GetBoolean()); Assert.False(metadata.GetProperty("consent_accepted").GetBoolean());
        Assert.Throws<InvalidOperationException>(() => Store.PrepareAiInvocation(1, "Not authorized"));
        Store.Handle("PUT", "/ai/settings", Body(new { provider = "openai", model = "synthetic-model", consent_accepted = true }));
        Assert.Equal("synthetic-key", Store.PrepareAiInvocation(1, "Authorized again").ApiKey);
        Assert.Equal("org-test", Store.PrepareAiInvocation(1, "Account kept").Organization);
        Assert.Equal("project-test", Store.PrepareAiInvocation(1, "Project kept").Project);
    }
    [Fact]
    public void UnsupportedFutureSchemaIsNeverRewritten()
    {
        Setup(); var node = Read(); node["version"] = 999; Write(node); var bytes = File.ReadAllBytes(InventoryPath);
        Assert.Throws<InvalidDataException>(() => Store.Handle("POST", "/ai/settings/pause", Body(new { })));
        Assert.Equal(bytes, File.ReadAllBytes(InventoryPath));
    }
    public void Dispose() { if (Directory.Exists(_directory)) Directory.Delete(_directory, true); }
}
