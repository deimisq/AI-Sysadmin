using System.IO;
using System.Text;
using Renci.SshNet;

namespace AiSysadminDesktop;

public static class TaskSshExecutor
{
    public static async Task<LocalTaskAgent.Observation> ExecuteAsync(SshClient client, string text, CancellationToken cancellation)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellation);
        timeout.CancelAfter(TimeSpan.FromSeconds(20));
        using var command = client.CreateCommand(text);
        command.CommandTimeout = TimeSpan.FromSeconds(20);
        var execution = command.ExecuteAsync(timeout.Token);
        using (command.CreateInputStream()) { } // No interactive prompts or password input.
        var bytes = 0;
        async Task<string> Read(Stream stream)
        {
            using var output = new MemoryStream(); var buffer = new byte[2048]; int count;
            while ((count = await stream.ReadAsync(buffer, timeout.Token)) > 0)
            {
                if (Interlocked.Add(ref bytes, count) > 16000) { timeout.Cancel(); throw new InvalidOperationException("Salida SSH superior a 16000 bytes; resultado incompleto."); }
                output.Write(buffer, 0, count);
            }
            return Encoding.UTF8.GetString(output.ToArray());
        }
        var stdout = Read(command.OutputStream); var stderr = Read(command.ExtendedOutputStream);
        try { await Task.WhenAll(execution, stdout, stderr); }
        catch { timeout.Cancel(); try { await execution; } catch { } throw; }
        return new(text, await stdout + "\n[stderr]\n" + await stderr, command.ExitStatus);
    }
}
