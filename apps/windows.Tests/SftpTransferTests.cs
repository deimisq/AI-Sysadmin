using System.Diagnostics;
using System.IO;
using System.Security.Cryptography;
using System.Text.Json;
using AiSysadminDesktop;
using Renci.SshNet;
using Xunit;

public sealed class SftpTransferTests
{
    [SshLabFact]
    public async Task RealSftpTransfersRoundTripWithoutOverwritingAndCleanCancelledFiles()
    {
        var password = Guid.NewGuid().ToString("N");
        var start = new ProcessStartInfo(Environment.GetEnvironmentVariable("AI_AGENT_SSH_LAB_PYTHON")!) {
            RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false, CreateNoWindow = true };
        start.ArgumentList.Add(Path.Combine(AppContext.BaseDirectory, "fixtures", "ssh_lab.py"));
        start.ArgumentList.Add(password);
        using var process = Process.Start(start)!;
        var folder = Path.Combine(Path.GetTempPath(), "aisys-transfer-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(folder);
        try
        {
            using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            using var ready = JsonDocument.Parse((await process.StandardOutput.ReadLineAsync(deadline.Token))!);
            using var client = new SftpClient("127.0.0.1", ready.RootElement.GetProperty("port").GetInt32(), "lab", password);
            var key = Convert.FromBase64String(ready.RootElement.GetProperty("host_key").GetString()!);
            client.HostKeyReceived += (_, e) => e.CanTrust = CryptographicOperations.FixedTimeEquals(key, e.HostKey);
            client.ConnectionInfo.Timeout = TimeSpan.FromSeconds(5);
            client.OperationTimeout = TimeSpan.FromSeconds(5);
            client.Connect();
            var bytes = RandomNumberGenerator.GetBytes(256000);
            var source = Path.Combine(folder, "literal ; $ upload.bin");
            File.WriteAllBytes(source, bytes);
            long progress = 0;
            SftpFileTransfer.Upload(client, source, "/folder with spaces", deadline.Token, (done, total) => {
                Assert.InRange(done, progress, total); progress = done;
            });
            Assert.Equal(bytes.Length, progress);
            var remote = "/folder with spaces/literal ; $ upload.bin";
            var destination = Path.Combine(folder, "download.bin");
            SftpFileTransfer.Download(client, remote, destination, false, deadline.Token, (_, _) => { });
            Assert.Equal(bytes, File.ReadAllBytes(destination));
            Assert.Throws<IOException>(() => SftpFileTransfer.Upload(client, source, "/folder with spaces", deadline.Token, (_, _) => { }));

            // Cancellation preserves a chosen destination, and does not commit an incomplete new download.
            File.WriteAllText(destination, "keep existing");
            using (var cancel = new CancellationTokenSource())
            {
                Assert.ThrowsAny<OperationCanceledException>(() => SftpFileTransfer.Download(client, remote, destination, true,
                    cancel.Token, (done, _) => { if (done > 0) cancel.Cancel(); }));
            }
            Assert.Equal("keep existing", File.ReadAllText(destination));
            Assert.Empty(Directory.GetFiles(folder, ".aisys-*.part"));

            var cancelledSource = Path.Combine(folder, "cancelled.bin");
            File.WriteAllBytes(cancelledSource, bytes);
            using (var cancel = new CancellationTokenSource())
            {
                Assert.ThrowsAny<OperationCanceledException>(() => SftpFileTransfer.Upload(client, cancelledSource, "/", cancel.Token,
                    (done, _) => { if (done > 0) cancel.Cancel(); }));
            }
            Assert.False(client.Exists("/cancelled.bin"));
            Assert.DoesNotContain(client.ListDirectory("/"), entry => entry.Name.StartsWith(".aisys-"));

            // A destination created by another actor while bytes are uploading must be preserved.
            var raced = Path.Combine(folder, "race.bin");
            File.WriteAllBytes(raced, bytes);
            var introduced = false;
            Assert.Throws<IOException>(() => SftpFileTransfer.Upload(client, raced, "/", deadline.Token, (done, _) => {
                if (done > 0 && !introduced) { introduced = true; client.WriteAllText("/race.bin", "other writer"); }
            }));
            Assert.Equal("other writer", client.ReadAllText("/race.bin"));
            Assert.DoesNotContain(client.ListDirectory("/"), entry => entry.Name.StartsWith(".aisys-"));

            // No-overwrite download preserves an existing local file. Empty files still commit successfully.
            Assert.Throws<IOException>(() => SftpFileTransfer.Download(client, remote, destination, false, deadline.Token, (_, _) => { }));
            Assert.Equal("keep existing", File.ReadAllText(destination));
            var empty = Path.Combine(folder, "empty.bin");
            File.WriteAllBytes(empty, []);
            SftpFileTransfer.Upload(client, empty, "/", deadline.Token, (_, _) => { });
            SftpFileTransfer.Download(client, "/empty.bin", destination, true, deadline.Token, (_, _) => { });
            Assert.Empty(File.ReadAllBytes(destination));
            Assert.Throws<IOException>(() => SftpFileTransfer.Download(client, "/folder with spaces", destination, true, deadline.Token, (_, _) => { }));
        }
        finally
        {
            if (!process.HasExited) process.Kill(true);
            await process.WaitForExitAsync();
            Directory.Delete(folder, true);
        }
    }

    [Fact]
    public async Task JobIsExclusiveBoundToSessionAndRetainsItsCancelledResult()
    {
        var job = new SftpTransferJob();
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var finished = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var state = job.Start("one", "upload", async (token, report) => {
            report(0, 100);
            entered.SetResult();
            try { await Task.Delay(Timeout.Infinite, token); }
            finally { finished.SetResult(); }
        });
        await entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.Null(job.Get("another"));
        Assert.Throws<InvalidOperationException>(() => job.Start("two", "download", (_, _) => Task.CompletedTask));
        job.Cancel("another", state.id);
        job.Cancel("one", "wrong-id");
        Assert.Equal("transferring", job.Get("one")!.status);
        job.Cancel("one", state.id);
        await finished.Task.WaitAsync(TimeSpan.FromSeconds(5));
        for (var i = 0; i < 100 && job.Get("one")!.status != "cancelled"; i++) await Task.Delay(10);
        Assert.Equal("cancelled", job.Get("one")!.status);
        Assert.Equal(state.id, job.Get("one")!.id);
    }

    [Theory]
    [InlineData("../file")]
    [InlineData("..")]
    [InlineData("C:\\file")]
    [InlineData("bad\0name")]
    public void RejectsNamesThatAreNotASingleRemoteFile(string name) => Assert.Throws<ArgumentException>(() => SftpFileTransfer.Join("/", name));

    [Fact]
    public async Task CompletedCommitIsNotReportedAsCancelledAndFailedJobsReleaseTheirSlot()
    {
        var job = new SftpTransferJob();
        job.Start("one", "upload", (_, _) => {
            job.Cancel("one");
            return Task.CompletedTask; // A completed rename cannot be rolled back by a late cancellation.
        });
        for (var i = 0; i < 500 && job.Get("one")!.status != "completed"; i++) await Task.Delay(10);
        Assert.Equal("completed", job.Get("one")!.status);
        job.Start("two", "upload", (_, _) => throw new IOException("synthetic failure"));
        for (var i = 0; i < 500 && job.Get("two")!.status != "failed"; i++) await Task.Delay(10);
        Assert.Equal("failed", job.Get("two")!.status);
        Assert.Equal("synthetic failure", job.Get("two")!.error);
        job.Start("three", "download", (_, _) => Task.CompletedTask);
    }
}
