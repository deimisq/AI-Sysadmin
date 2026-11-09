using System.Diagnostics;
using System.IO;
using System.Security.Cryptography;
using System.Text.Json;
using AiSysadminDesktop;
using Renci.SshNet;
using Xunit;

public sealed class SshLabFactAttribute : FactAttribute
{
    public SshLabFactAttribute() { if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("AI_AGENT_SSH_LAB_PYTHON"))) Skip = "Set AI_AGENT_SSH_LAB_PYTHON to a Python interpreter with asyncssh for loopback integration tests."; }
}

public sealed class TaskSshIntegrationTests
{
    [SshLabFact]
    public async Task RealSshTransportReadsExitStatusAndBothOutputStreamsAndStopsExcessOrCancellation()
    {
        var password = Guid.NewGuid().ToString("N");
        var start = new ProcessStartInfo(Environment.GetEnvironmentVariable("AI_AGENT_SSH_LAB_PYTHON")!) { RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false, CreateNoWindow = true };
        start.ArgumentList.Add(Path.Combine(AppContext.BaseDirectory,"fixtures","ssh_lab.py")); start.ArgumentList.Add(password);
        using var process = Process.Start(start)!;
        try
        {
            using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(20));
            var line = await process.StandardOutput.ReadLineAsync(deadline.Token);
            Assert.NotNull(line);
            using var ready = JsonDocument.Parse(line!);
            using var client = new SshClient("127.0.0.1",ready.RootElement.GetProperty("port").GetInt32(),"lab",password);
            var key = Convert.FromBase64String(ready.RootElement.GetProperty("host_key").GetString()!);
            client.HostKeyReceived += (_,e) => e.CanTrust = CryptographicOperations.FixedTimeEquals(key,e.HostKey);
            client.ConnectionInfo.Timeout = TimeSpan.FromSeconds(5); client.Connect();
            using (var sftp = new SftpClient(client.ConnectionInfo))
            {
                sftp.HostKeyReceived += (_,e) => e.CanTrust = CryptographicOperations.FixedTimeEquals(key,e.HostKey);
                sftp.OperationTimeout = TimeSpan.FromSeconds(5);
                sftp.Connect();
                var listing = LocalSftpBrowser.List(sftp, ".");
                Assert.Equal("/", listing.path);
                Assert.Contains(listing.entries, e => e.name == "folder with spaces" && e.is_dir);
                Assert.Contains(listing.entries, e => e.name == "literal ; $ file.txt" && e.size == 14 && !e.is_dir);
                Assert.Empty(LocalSftpBrowser.List(sftp, "/folder with spaces").entries);
                Assert.ThrowsAny<Exception>(() => LocalSftpBrowser.List(sftp, "/missing"));
                Assert.Throws<ArgumentException>(() => LocalSftpBrowser.List(sftp, "bad\0path"));
                Assert.True(client.IsConnected);
            }
            var result = await TaskSshExecutor.ExecuteAsync(client,"inspect-example",deadline.Token);
            Assert.Equal(0,result.ExitCode); Assert.Contains("example: running",result.Output); Assert.Contains("synthetic warning",result.Output);
            var failure = await TaskSshExecutor.ExecuteAsync(client,"unknown",deadline.Token);
            Assert.Equal(7,failure.ExitCode);
            await Assert.ThrowsAnyAsync<Exception>(() => TaskSshExecutor.ExecuteAsync(client,"too-much-output",deadline.Token));
            using var cancel = new CancellationTokenSource(TimeSpan.FromMilliseconds(300));
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => TaskSshExecutor.ExecuteAsync(client,"wait-example",cancel.Token));
        }
        finally { if (!process.HasExited) process.Kill(true); await process.WaitForExitAsync(); }
    }
}
