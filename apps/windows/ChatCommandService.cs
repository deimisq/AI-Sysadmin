using System.Text.Json;

namespace AiSysadminDesktop;

/// <summary>Native, one-use proposals. The renderer cannot replace the approved command.</summary>
public sealed class ChatCommandService
{
    private sealed record Proposal(int ServerId, string Fingerprint, string Session, string Command, DateTimeOffset CreatedAt, int HistoryEpoch, string Objective);
    private readonly object _sync = new();
    private readonly Dictionary<string, Proposal> _proposals = new();
    private readonly HashSet<string> _sessions = new();
    private readonly LocalConnectionStore _store;
    private readonly Func<string, int, string, bool> _connected;
    private readonly Func<string, string, CancellationToken, Task<LocalTaskAgent.Observation>> _execute;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private CancellationTokenSource? _cancellation;
    public bool IsExecuting => _gate.CurrentCount == 0;
    public void Cancel() { lock (_sync) _cancellation?.Cancel(); }
    public void InvalidateProposals(int serverId, string? session)
    {
        lock (_sync) foreach (var id in _proposals.Where(item => item.Value.ServerId == serverId && (session == null || item.Value.Session == session)).Select(item => item.Key).ToArray()) _proposals.Remove(id);
    }
    public ChatCommandService(LocalConnectionStore store, Func<string, int, string, bool> connected,
        Func<string, string, CancellationToken, Task<LocalTaskAgent.Observation>> execute)
    { _store = store; _connected = connected; _execute = execute; }
    public string? Register(LocalConnectionStore.AiInvocation invocation, string? session, string? command)
    {
        if (session == null || string.IsNullOrWhiteSpace(command) || command.Length > 4000 || !_connected(session, invocation.ServerId, invocation.Fingerprint)) return null;
        lock (_sync) {
            foreach (var old in _proposals.Where(item => item.Value.Session == session).Select(item => item.Key).ToArray()) _proposals.Remove(old);
            if (_proposals.Count >= 100) _proposals.Clear();
            var id = Guid.NewGuid().ToString("N");
            _proposals[id] = new(invocation.ServerId, invocation.Fingerprint, session, command, DateTimeOffset.UtcNow, invocation.HistoryEpoch, invocation.Query); return id;
        }
    }
    public string Permission(int serverId, string session)
    {
        var target = _store.GetLocalSshTarget(serverId);
        if (!_connected(session, serverId, target.Fingerprint)) return "ask";
        if (serverId > 0 && _store.HasAiExecutionGrant(target.Fingerprint)) return "always";
        lock (_sync) return _sessions.Contains(session + ":" + target.Fingerprint) ? "session" : "ask";
    }
    public void Revoke(int serverId, string session)
    {
        var target = _store.GetLocalSshTarget(serverId);
        _store.SetAiExecutionGrant(target.Fingerprint, false);
        lock (_sync) { _sessions.Remove(session + ":" + target.Fingerprint); _proposals.Clear(); }
    }
    public async Task<LocalTaskAgent.Observation> ExecuteAsync(JsonElement body)
    {
        if (!await _gate.WaitAsync(0)) throw new InvalidOperationException("Ya hay un comando del chat en ejecución.");
        try {
            Proposal proposal;
            lock (_sync) {
                var id = body.GetProperty("proposal_id").GetString() ?? "";
                if (!_proposals.Remove(id, out proposal!)) throw new InvalidOperationException("La propuesta venció o ya fue procesada. Pedí una nueva.");
            }
            var invocation = _store.PrepareAiInvocation(proposal.ServerId, proposal.Objective);
            if (DateTimeOffset.UtcNow - proposal.CreatedAt > TimeSpan.FromMinutes(10) || invocation.HistoryEpoch != proposal.HistoryEpoch || invocation.Fingerprint != proposal.Fingerprint || !_connected(proposal.Session, proposal.ServerId, proposal.Fingerprint))
                throw new InvalidOperationException("La sesión o el destino cambió. No se ejecutó el comando.");
            var scope = body.GetProperty("scope").GetString();
            if (scope is not ("once" or "session" or "always" or "auto")) throw new ArgumentException("Permiso inválido.");
            if (scope == "auto" && Permission(proposal.ServerId, proposal.Session) == "ask") throw new InvalidOperationException("Este comando requiere tu autorización.");
            if (scope == "always" && proposal.ServerId < 0) throw new InvalidOperationException("Las conexiones temporales solo admiten permiso de sesión.");
            // Write the exact approved command before execution. Failed storage blocks execution.
            if (!_store.SaveAiTurn(invocation, "Comando autorizado desde el chat", proposal.Command, "command")) throw new InvalidOperationException("No se pudo guardar la autorización.");
            if (scope == "always") _store.SetAiExecutionGrant(proposal.Fingerprint, true);
            if (scope == "session") lock (_sync) _sessions.Add(proposal.Session + ":" + proposal.Fingerprint);
            using var timeout = new CancellationTokenSource();
            lock (_sync) _cancellation = timeout;
            var result = await _execute(proposal.Session, proposal.Command, timeout.Token);
            _store.SaveAiTurn(invocation, "Resultado observado de " + proposal.Command + " (estado " + result.Status + ", salida " + (result.ExitCode?.ToString() ?? "no disponible") + (result.Truncated ? ", captura parcial" : "") + "):\n" + result.Output, proposal.Command, "result");
            return result;
        } finally { lock (_sync) _cancellation = null; _gate.Release(); }
    }
}
