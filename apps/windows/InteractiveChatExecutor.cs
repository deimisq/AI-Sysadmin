using System.Collections.Concurrent;
using System.Text;
using System.Text.RegularExpressions;
namespace AiSysadminDesktop;
/// <summary>Sends approved text unchanged to the PTY. Prompt return is not an exit code.</summary>
public sealed class InteractiveChatExecutor
{
    private sealed class Terminal {
        public readonly StringBuilder Recent = new();
        public readonly Decoder Decoder = Encoding.UTF8.GetDecoder();
        public Pending? Pending;
    }
    private sealed class Pending(string command, string prompt, string prefix) {
        public readonly string Command = command, Prompt = prompt, Prefix = prefix;
        public readonly StringBuilder Output = new();
        public bool Truncated;
        public bool Interrupted;
        public int Version;
        public readonly TaskCompletionSource<LocalTaskAgent.Observation> Completion = new(TaskCreationOptions.RunContinuationsAsynchronously);
    }
    private readonly ConcurrentDictionary<string, Terminal> _terminals = new();
    private static string Plain(string text) => Regex.Replace(text, @"\x1B(?:\][^\x07]*(?:\x07)|\[[0-?]*[ -/]*[@-~])", "", RegexOptions.None, TimeSpan.FromMilliseconds(100));
    private static string LastLine(string text) => text.Replace("\r", "").Split('\n')[^1];
    private static void AppendBounded(StringBuilder target, string text) {
        target.Append(text);
        if (target.Length > 24000) target.Remove(0, target.Length - 24000);
    }
    private static LocalTaskAgent.Observation Snapshot(Pending pending, string status) => new(pending.Command, pending.Output.ToString(), null, status, pending.Truncated);
    public void Observe(string session, byte[] bytes) {
        var terminal = _terminals.GetOrAdd(session, _ => new());
        lock (terminal) {
            var characters = new char[Encoding.UTF8.GetMaxCharCount(bytes.Length)];
            var count = terminal.Decoder.GetChars(bytes, 0, bytes.Length, characters, 0);
            var text = new string(characters, 0, count);
            AppendBounded(terminal.Recent, text);
            if (terminal.Pending is not { } pending) return;
            pending.Truncated |= pending.Output.Length + text.Length > 24000;
            AppendBounded(pending.Output, text);
            var last = LastLine(Plain(pending.Output.ToString()));
            var version = ++pending.Version;
            var returned = last == pending.Prompt || (pending.Prefix.Length > 0 && last.StartsWith(pending.Prefix, StringComparison.Ordinal) && Regex.IsMatch(last[pending.Prefix.Length..], @"^[^#$%]*[#$%] ?$"));
            if (returned) _ = ConfirmPromptAsync(terminal, pending, version);
        }
    }
    private static async Task ConfirmPromptAsync(Terminal terminal, Pending pending, int version) {
        await Task.Delay(250);
        lock (terminal) if (terminal.Pending == pending && pending.Version == version)
            pending.Completion.TrySetResult(Snapshot(pending, pending.Interrupted ? "interrupted" : "prompt_returned"));
    }
    public void Close(string session) {
        if (_terminals.TryRemove(session, out var terminal)) lock (terminal) {
            if (terminal.Pending is { } pending) pending.Completion.TrySetResult(Snapshot(pending, "disconnected"));
        }
    }
    public void MarkInterrupted(string session) {
        if (_terminals.TryGetValue(session, out var terminal)) lock (terminal) {
            if (terminal.Pending is { } pending) pending.Interrupted = true;
        }
    }
    public async Task<LocalTaskAgent.Observation> ExecuteAsync(string session, string command, Action<string> write, CancellationToken token) {
        if (!_terminals.TryGetValue(session, out var terminal)) throw new InvalidOperationException("Esperá a que aparezca el prompt de la terminal.");
        Pending pending;
        lock (terminal) {
            token.ThrowIfCancellationRequested();
            if (terminal.Pending != null) throw new InvalidOperationException("La terminal ya tiene un comando del agente en curso.");
            var prompt = LastLine(Plain(terminal.Recent.ToString()));
            if (!Regex.IsMatch(prompt, @"[#$%] ?$") || prompt.Length > 300) throw new InvalidOperationException("La terminal no muestra un prompt listo. Finalizá la interacción actual antes de ejecutar desde el chat.");
            var colon = prompt.IndexOf(':');
            var prefix = colon > 0 && prompt[..colon].Contains('@') ? prompt[..(colon + 1)] : "";
            pending = new(command, prompt, prefix); terminal.Pending = pending;
        }
        try {
            write(command + "\n");
            try { return await pending.Completion.Task.WaitAsync(token); }
            catch (OperationCanceledException) {
                try { write("\x03"); } catch { }
                await Task.Delay(300);
                lock (terminal) return Snapshot(pending, "interrupted");
            }
        } finally { lock (terminal) terminal.Pending = null; }
    }
}
