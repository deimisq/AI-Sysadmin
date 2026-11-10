using System.Text;
using AiSysadminDesktop;
using Xunit;
public sealed class InteractiveChatExecutorTests
{
    private static void Data(InteractiveChatExecutor executor, string text) => executor.Observe("session", Encoding.UTF8.GetBytes(text));
    private static InteractiveChatExecutor Ready() { var executor = new InteractiveChatExecutor(); Data(executor, "Welcome\r\nroot@host:~# "); return executor; }
    [Fact] public async Task WritesTheExactApprovedCommandWithoutEvalOrPrintfAndSupportsDirectoryChanges() {
        var executor = Ready(); var writes = new List<string>();
        var command = "cd /tmp && printf '%s' \"a'b\"";
        var task = executor.ExecuteAsync("session", command, writes.Add, CancellationToken.None);
        Assert.Equal(command + "\n", Assert.Single(writes));
        foreach (var part in Encoding.UTF8.GetBytes("observación\r\nroot@host:/tmp# ")) executor.Observe("session", new[] { part });
        var result = await task.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.Equal("prompt_returned", result.Status); Assert.Null(result.ExitCode); Assert.Contains("observación", result.Output);
    }
    [Fact] public async Task LongOutputDoesNotSendAnAutomaticInterrupt() {
        var executor = Ready(); var writes = new List<string>();
        var task = executor.ExecuteAsync("session", "apt upgrade -y", writes.Add, CancellationToken.None);
        Data(executor, new string('x', 30000) + "\r\nWaiting for headers");
        Assert.False(task.IsCompleted); Assert.Single(writes);
        Data(executor, "\r\nDone\r\nroot@host:~# ");
        var result = await task.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.True(result.Truncated); Assert.Equal("prompt_returned", result.Status); Assert.Single(writes);
    }
    [Fact] public async Task ExplicitStopReturnsPartialOutputForTheChatInsteadOfThrowing() {
        var executor = Ready(); var writes = new List<string>(); using var cancellation = new CancellationTokenSource();
        var task = executor.ExecuteAsync("session", "apt update", writes.Add, cancellation.Token);
        Data(executor, "Hit: repository\r\nWaiting for headers"); cancellation.Cancel();
        var result = await task.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.Equal("interrupted", result.Status); Assert.Contains("Waiting for headers", result.Output); Assert.Equal("\x03", writes[^1]);
    }
    [Fact] public async Task ManualControlCAndDisconnectRemainExplicitUnsuccessfulStates() {
        var executor = Ready();
        var task = executor.ExecuteAsync("session", "apt update", _ => {}, CancellationToken.None);
        executor.MarkInterrupted("session"); Data(executor, "^C\r\nroot@host:~# ");
        Assert.Equal("interrupted", (await task).Status);
        task = executor.ExecuteAsync("session", "sleep 60", _ => {}, CancellationToken.None);
        executor.Close("session"); Assert.Equal("disconnected", (await task).Status);
    }
    [Fact] public async Task BusyTerminalDoesNotReceiveACommand() {
        var executor = Ready(); Data(executor, "apt update\r\nWaiting for headers");
        await Assert.ThrowsAsync<InvalidOperationException>(() => executor.ExecuteAsync("session", "id", _ => throw new Exception("Must not write"), CancellationToken.None));
    }
}
