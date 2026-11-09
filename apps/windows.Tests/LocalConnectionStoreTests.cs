using System.IO;
using System.Text;
using System.Text.Json;
using AiSysadminDesktop;
using Xunit;

public sealed class LocalConnectionStoreTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "AiSysadminLocalTests", Guid.NewGuid().ToString("N"));
    private string StorePath => Path.Combine(_directory, "connections.dat");
    private LocalConnectionStore Store => new(StorePath);
    private static JsonElement Body(object value) => JsonSerializer.SerializeToElement(value);
    private static object Sample(string name = "Test host") => new {
        hostname = name, ip_address = "192.0.2.10", ssh_username = "technician",
        ssh_password = "synthetic-password-123", ssh_key_path = "synthetic-private-key",
        connection_protocol = "ssh", ssh_port = 2222,
    };

    [Fact]
    public void CredentialsAreProtectedOnDiskAndAbsentFromMetadata()
    {
        var created = Store.Handle("POST", "/servers/", Body(Sample()));
        Assert.Equal(1, created.GetProperty("id").GetInt32());
        Assert.False(created.TryGetProperty("ssh_password", out _));
        var list = Store.Handle("GET", "/servers/", default);
        Assert.False(list[0].TryGetProperty("ssh_key_path", out _));
        var disk = Encoding.UTF8.GetString(File.ReadAllBytes(StorePath));
        Assert.DoesNotContain("synthetic-password", disk);
        Assert.DoesNotContain("Test host", disk);
        var credentials = Store.Handle("GET", "/servers/1/credentials", default);
        Assert.Equal("synthetic-password-123", credentials.GetProperty("ssh_password").GetString());
        Assert.Equal(2222, credentials.GetProperty("ssh_port").GetInt32());
    }

    [Fact]
    public void UpdatePreservesOmittedCredentialsAndDeleteNeverReusesIds()
    {
        Store.Handle("POST", "/servers/", Body(Sample()));
        Store.Handle("PUT", "/servers/1", Body(new { hostname = "Renamed", connection_protocol = "rdp", rdp_port = 3390 }));
        var credentials = Store.Handle("GET", "/servers/1/credentials", default);
        Assert.Equal("synthetic-password-123", credentials.GetProperty("ssh_password").GetString());
        Assert.Equal(3390, credentials.GetProperty("rdp_port").GetInt32());
        Assert.True(File.Exists(StorePath + ".bak"));
        Assert.DoesNotContain("synthetic-password", Encoding.UTF8.GetString(File.ReadAllBytes(StorePath + ".bak")));
        Store.Handle("DELETE", "/servers/1", default);
        Assert.Empty(Store.Handle("GET", "/servers/", default).EnumerateArray());
        var created = Store.Handle("POST", "/servers/", Body(Sample("Another")));
        Assert.Equal(2, created.GetProperty("id").GetInt32());
    }

    [Fact]
    public void CorruptionIsReportedWithoutReplacingTheFile()
    {
        Store.Handle("POST", "/servers/", Body(Sample()));
        var corrupted = File.ReadAllBytes(StorePath);
        corrupted[^1] ^= 0xff;
        File.WriteAllBytes(StorePath, corrupted);
        Assert.Throws<InvalidDataException>(() => Store.Handle("POST", "/servers/", Body(Sample())));
        Assert.Equal(corrupted, File.ReadAllBytes(StorePath));
    }

    [Theory]
    [InlineData(0, "ssh")]
    [InlineData(65536, "ssh")]
    [InlineData(22, "invalid")]
    public void InvalidConnectionsDoNotOverwriteExistingInventory(int port, string protocol)
    {
        Store.Handle("POST", "/servers/", Body(Sample()));
        var original = File.ReadAllBytes(StorePath);
        Assert.Throws<ArgumentException>(() => Store.Handle("PUT", "/servers/1", Body(new { ssh_port = port, connection_protocol = protocol })));
        Assert.Equal(original, File.ReadAllBytes(StorePath));
    }

    [Fact]
    public async Task ConcurrentInstancesDoNotLoseUpdates()
    {
        await Task.WhenAll(Enumerable.Range(0, 8).Select(index => Task.Run(() => Store.Handle("POST", "/servers/", Body(Sample("Host " + index))))));
        var list = Store.Handle("GET", "/servers/", default);
        Assert.Equal(8, list.GetArrayLength());
        Assert.Equal(8, list.EnumerateArray().Select(s => s.GetProperty("id").GetInt32()).Distinct().Count());
    }

    [Fact]
    public void UnsupportedEnterpriseAndAiOperationsFailLocally()
    {
        Assert.Throws<NotSupportedException>(() => Store.Handle("POST", "/agent/diagnose", Body(new { server_id = 1 })));
        Assert.Throws<NotSupportedException>(() => Store.Handle("GET", "/organizations/", default));
        Assert.False(File.Exists(StorePath));
    }

    public void Dispose()
    {
        if (Directory.Exists(_directory)) Directory.Delete(_directory, true);
    }
}
