using System.Text.Json;

namespace AiSysadminDesktop;

public sealed partial class LocalConnectionStore
{
    private sealed record TemporaryTarget(Connection Target, string Session, string Fingerprint, List<AiTurn> History);
    private readonly object _temporaryGate = new();
    private readonly Dictionary<int, TemporaryTarget> _temporaryTargets = new();

    public string RegisterTemporaryTarget(int id, string session, string address, int port, string username, string protocol = "ssh")
    {
        if (id >= 0 || !Guid.TryParse(session, out _) || string.IsNullOrWhiteSpace(address) || port is < 1 or > 65535 || protocol is not ("ssh" or "rdp"))
            throw new ArgumentException("Destino temporal inválido.");
        lock (_temporaryGate) {
            if (_temporaryTargets.ContainsKey(id)) throw new InvalidOperationException("La conexión temporal ya tiene una sesión. Cerrala antes de reconectar.");
            var target = new Connection { Id = id, Hostname = address, IpAddress = address, SshPort = port, RdpPort = port, SshUsername = username, ConnectionProtocol = protocol };
            var fingerprint = Guid.NewGuid().ToString("N"); // Unique per authenticated session, never derived from secrets.
            _temporaryTargets.Add(id, new(target, session, fingerprint, new()));
            return fingerprint;
        }
    }

    public void CloseTemporaryTarget(int id, string session)
    {
        lock (_temporaryGate)
            if (_temporaryTargets.TryGetValue(id, out var target) && target.Session == session) _temporaryTargets.Remove(id);
    }

    private TemporaryTarget Temporary(int id) => _temporaryTargets.TryGetValue(id, out var target) ? target : throw new InvalidOperationException("La conexión temporal está cerrada o todavía no se autenticó.");

    private object TemporaryHistory(int id, bool clear)
    {
        lock (_temporaryGate) {
            if (!_temporaryTargets.TryGetValue(id, out var target)) return clear ? new { deleted = true } : Array.Empty<AiTurn>();
            if (!clear) return target.History.ToArray();
            target.History.Clear();
            target.Target.HistoryEpoch = checked(target.Target.HistoryEpoch + 1);
            return new { deleted = true };
        }
    }

    private AiInvocation PrepareTemporary(Inventory inventory, int id, string query, AiEvidence? evidence, ExpectedAiTarget? expected)
    {
        lock (_temporaryGate) {
            var temporary = Temporary(id);
            var target = temporary.Target;
            if (expected != null && (expected.Address != target.IpAddress || expected.Protocol != target.ConnectionProtocol || expected.Port != (target.ConnectionProtocol == "rdp" ? target.RdpPort : target.SshPort)))
                throw new InvalidOperationException("El destino temporal no coincide con la sesión autenticada.");
            var conversation = temporary.History.TakeLast(10).Select(turn => new { turn.CreatedAt, turn.Query, turn.Analysis }).ToArray();
            var context = JsonSerializer.Serialize(new { server = new { target.Hostname, target.IpAddress, target.ConnectionProtocol }, query, evidence, conversation }, Json);
            return new(inventory.Ai.BaseUrl, inventory.Ai.Model, inventory.Ai.ApiKey, context, id, temporary.Fingerprint, target.HistoryEpoch, target.Hostname, target.IpAddress, query, evidence, AiProviders.Infer(inventory.Ai.Provider, inventory.Ai.BaseUrl), inventory.Ai.Username, inventory.Ai.Organization, inventory.Ai.Project, inventory.Ai.Workspace);
        }
    }

    private bool SaveTemporaryTurn(AiInvocation invocation, string analysis, string? command)
    {
        lock (_temporaryGate) {
            if (!_temporaryTargets.TryGetValue(invocation.ServerId, out var target) || target.Fingerprint != invocation.Fingerprint || target.Target.HistoryEpoch != invocation.HistoryEpoch) return false;
            target.History.Add(new AiTurn(Guid.NewGuid().ToString(), invocation.ServerId, invocation.Hostname, invocation.Address, DateTimeOffset.UtcNow,
                invocation.BaseUrl, invocation.Model, invocation.Query, invocation.Evidence, analysis, command, invocation.Fingerprint));
            if (target.History.Count > 20) target.History.RemoveRange(0, target.History.Count - 20);
            return true;
        }
    }
}
