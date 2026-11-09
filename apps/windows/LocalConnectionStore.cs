using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace AiSysadminDesktop;

/// <summary>Per-Windows-user inventory. The complete file, including metadata, is DPAPI protected.</summary>
public sealed partial class LocalConnectionStore
{
    private readonly string _path;
    private static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("AiSysadmin.LocalConnections.v1");
    public LocalConnectionStore(string? path = null) => _path = Path.GetFullPath(path ?? Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AiSysadmin", "connections.v1.dat"));

    private sealed class Inventory
    {
        public int Version { get; set; } = 3;
        public int NextId { get; set; } = 1;
        public List<Connection> Servers { get; set; } = new();
        public AiConfiguration Ai { get; set; } = new();
        public List<AiTurn> AiHistory { get; set; } = new();
        public FolderLayout? Folders { get; set; }
        public int FolderRevision { get; set; }
        public int ContextMaxCharacters { get; set; }
        public Dictionary<string, RestoreReceipt> Restores { get; set; } = new();
    }
    public sealed class AiConfiguration
    {
        public string Provider { get; set; } = "";
        public string Username { get; set; } = "opencode";
        public string Organization { get; set; } = "";
        public string Project { get; set; } = "";
        public string Workspace { get; set; } = "";
        public string BaseUrl { get; set; } = "";
        public string Model { get; set; } = "";
        public string ApiKey { get; set; } = "";
        public string ConsentVersion { get; set; } = "";
        public DateTimeOffset? AcceptedAt { get; set; }
    }
    public const string AiConsentVersion = "terminal-companion-v3";
    private static object AiMetadata(AiConfiguration ai) => new {
        ai.BaseUrl, ai.Model, ai.Username, ai.Organization, ai.Project, ai.Workspace, provider = AiProviders.Infer(ai.Provider, ai.BaseUrl), has_api_key = ai.ApiKey.Length > 0,
        consent_accepted = ai.ConsentVersion == AiConsentVersion, ai.AcceptedAt,
    };
    public sealed class Connection
    {
        public int Id { get; set; }
        public string Hostname { get; set; } = "";
        public string IpAddress { get; set; } = "";
        public string Description { get; set; } = "";
        public string OsInfo { get; set; } = "";
        public string ConnectionProtocol { get; set; } = "ssh";
        public int SshPort { get; set; } = 22;
        public int RdpPort { get; set; } = 3389;
        public string SshUsername { get; set; } = "";
        public string SshPassword { get; set; } = "";
        public string SshKeyPath { get; set; } = "";
        public int HistoryEpoch { get; set; }
    }
    public sealed record AiEvidence(string Content, string Source, DateTimeOffset CapturedAt);
    public sealed record AiTurn(string Id, int ServerId, string Hostname, string Address, DateTimeOffset CreatedAt,
        string Provider, string Model, string Query, AiEvidence? Evidence, string Analysis, string? Command, string? TargetIdentity = null);
    private static object Metadata(Connection item) => new {
        item.Id, item.Hostname, item.IpAddress, item.Description, item.OsInfo,
        item.ConnectionProtocol, item.SshPort, item.RdpPort, item.SshUsername,
        created_by = 0, organization_id = (int?)null,
    };

    private T WithInventory<T>(Func<Inventory, T> action)
    {
        // A named mutex also serializes separate app instances for the same inventory.
        var mutexId = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(_path.ToUpperInvariant())));
        using var mutex = new Mutex(false, @"Local\AiSysadminInventory-" + mutexId);
        bool locked;
        try { locked = mutex.WaitOne(TimeSpan.FromSeconds(5)); }
        catch (AbandonedMutexException) { locked = true; }
        if (!locked) throw new IOException("El inventario local está ocupado. Intentá nuevamente.");
        try
        {
            return action(Load());
        }
        finally { mutex.ReleaseMutex(); }
    }

    public JsonElement Handle(string method, string endpoint, JsonElement body) => WithInventory(data =>
    {
            var parts = endpoint.Trim('/').Split('/');
            object result;
            if (endpoint == "/workspace/context-policy" && method == "GET") result = new { max_characters = data.ContextMaxCharacters };
            else if (endpoint == "/workspace/context-policy" && method == "PUT")
            {
                var limit = body.GetProperty("max_characters").GetInt32();
                if (limit != 0 && limit is < 4000 or > 240000) throw new ArgumentException("La ventana debe tener entre 4000 y 240000 caracteres, o 0 para contexto completo.");
                data.ContextMaxCharacters = limit; Save(data); result = new { max_characters = limit };
            }
            else if (endpoint == "/workspace/folders" && method == "GET") result = new { migrated = data.Folders != null, layout = data.Folders ?? new FolderLayout(), revision = data.FolderRevision };
            else if (endpoint == "/workspace/folders" && method == "PUT")
            {
                if (body.GetProperty("revision").GetInt32() != data.FolderRevision) throw new InvalidOperationException("Las carpetas cambiaron. Actualizá el inventario antes de reintentar.");
                var layout = JsonSerializer.Deserialize<FolderLayout>(body.GetProperty("layout"), Json) ?? throw new ArgumentException("Carpetas inválidas.");
                ValidateFolders(layout, data.Servers.Select(s => s.Id).ToHashSet());
                data.Folders = layout; data.FolderRevision = checked(data.FolderRevision + 1); Save(data);
                result = new { migrated = true, layout, revision = data.FolderRevision };
            }
            else if (endpoint == "/ai/providers" && method == "GET") result = AiProviders.Catalog;
            else if (endpoint == "/ai/settings" && method == "GET") result = AiMetadata(data.Ai);
            else if (endpoint == "/ai/settings" && method == "DELETE")
            { data.Ai = new AiConfiguration(); Save(data); result = AiMetadata(data.Ai); }
            else if (endpoint == "/ai/settings" && method == "PUT")
            {
                string Read(string field) => body.GetProperty(field).GetString() ?? "";
                var provider = body.TryGetProperty("provider", out var selectedProvider) ? selectedProvider.GetString() ?? "" : "";
                var preset = provider.Length > 0 && provider != "custom" ? AiProviders.Get(provider) : null;
                var baseUrl = preset?.Local == true ? AiProviders.NormalizeEndpoint(provider, body.TryGetProperty("base_url", out var address) ? address.GetString() : null) : preset?.BaseUrl ?? Read("base_url").Trim().TrimEnd('/');
                string Option(string field, string fallback = "") {
                    var value = body.TryGetProperty(field, out var option) ? (option.GetString() ?? "").Trim() : fallback;
                    if (value.Length > 200 || value.Any(char.IsControl)) throw new ArgumentException("Una opción del proveedor no es válida.");
                    return value;
                }
                var username = provider == "opencode" ? Option("username", "opencode") : "opencode";
                if (provider == "opencode" && (username.Length == 0 || username.Contains(':'))) throw new ArgumentException("Indicá un usuario de OpenCode válido, sin dos puntos.");
                if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var uri) || (uri.Scheme != "https" && preset?.Local != true) || uri.UserInfo.Length > 0 || uri.Query.Length > 0 || uri.Fragment.Length > 0 || baseUrl.Length > 2048)
                    throw new ArgumentException("La URL del proveedor debe usar HTTPS, sin usuario, parámetros ni fragmentos.");
                var model = Read("model").Trim();
                if (model.Length is < 1 or > 200) throw new ArgumentException("Indicá el identificador del modelo.");
                var apiKey = body.TryGetProperty("api_key", out var key) ? key.GetString() ?? "" : "";
                if (apiKey.Length == 0 && data.Ai.BaseUrl == baseUrl && data.Ai.Username == username && AiProviders.Infer(data.Ai.Provider, data.Ai.BaseUrl) == AiProviders.Infer(provider, baseUrl)) apiKey = data.Ai.ApiKey;
                if ((apiKey.Length == 0 && preset?.Local != true) || apiKey.Length > 8192 || apiKey.Contains('\r') || apiKey.Contains('\n')) throw new ArgumentException("Indicá una clave API válida para este proveedor.");
                if (provider == "opencode" && (model.IndexOf('/') < 1 || model.EndsWith('/'))) throw new ArgumentException("Seleccioná un modelo configurado en OpenCode.");
                if (preset?.Local == true) AiProviders.ValidateCredentials(baseUrl, apiKey);
                if (!body.TryGetProperty("consent_accepted", out var accepted) || accepted.ValueKind != JsonValueKind.True)
                    throw new ArgumentException("Aceptá el aviso de envío de contexto antes de habilitar la IA.");
                data.Ai = new AiConfiguration { Provider = provider, BaseUrl = baseUrl, Model = model, ApiKey = apiKey, Username = username,
                    Organization = provider == "openai" ? Option("organization") : "", Project = provider == "openai" ? Option("project") : "",
                    Workspace = provider == "claude" ? Option("workspace") : "", ConsentVersion = AiConsentVersion, AcceptedAt = DateTimeOffset.UtcNow };
                Save(data); result = AiMetadata(data.Ai);
            }
            else if (method == "GET" && endpoint == "/auth/me")
                result = new { id = 0, username = Environment.UserName, full_name = Environment.UserName, email = "", role = "local", is_active = true, is_superuser = false, organization_id = (int?)null };
            else if (method == "GET" && parts[0] == "groups" && parts.Length == 1)
                result = Array.Empty<object>();
            else if (parts[0] == "servers" && parts.Length == 1 && method == "GET")
                result = data.Servers.Select(Metadata).ToArray();
            else if (parts[0] == "servers" && parts.Length == 1 && method == "POST")
            {
                var item = new Connection { Id = data.NextId };
                Update(item, body);
                data.NextId = checked(data.NextId + 1);
                data.Servers.Add(item);
                Save(data);
                result = Metadata(item);
            }
            else if (parts[0] == "servers" && parts.Length >= 2 && int.TryParse(parts[1], out var id))
            {
                if (id < 0 && parts.Length == 3 && parts[2] == "history" && method is "GET" or "DELETE")
                    return JsonSerializer.SerializeToElement(TemporaryHistory(id, method == "DELETE"), Json);
                var item = data.Servers.SingleOrDefault(s => s.Id == id) ?? throw new InvalidOperationException("Conexión local no encontrada.");
                if (parts.Length == 3 && parts[2] == "credentials" && method == "GET")
                    result = new { item.IpAddress, item.SshUsername, item.SshPassword, item.SshKeyPath, item.SshPort, item.RdpPort };
                else if (parts.Length == 3 && parts[2] == "history" && method == "GET")
                    result = data.AiHistory.Where(turn => turn.ServerId == id).ToArray();
                else if (parts.Length == 3 && parts[2] == "history" && method == "DELETE")
                { data.AiHistory.RemoveAll(turn => turn.ServerId == id); item.HistoryEpoch = checked(item.HistoryEpoch + 1); Save(data); result = new { deleted = true }; }
                else if (parts.Length == 2 && method == "GET") result = Metadata(item);
                else if (parts.Length == 2 && method == "PUT") { Update(item, body); Save(data); result = Metadata(item); }
                else if (parts.Length == 2 && method == "DELETE") { data.Servers.Remove(item); data.Folders?.Assignments.Remove(id.ToString()); data.FolderRevision = checked(data.FolderRevision + 1); data.AiHistory.RemoveAll(turn => turn.ServerId == id); Save(data); result = new { deleted = true }; }
                else throw Unsupported();
            }
            else throw Unsupported();
            return JsonSerializer.SerializeToElement(result, Json);
    });

    public sealed record AiInvocation(string BaseUrl, string Model, string ApiKey, string Context, int ServerId,
        string Fingerprint, int HistoryEpoch, string Hostname, string Address, string Query, AiEvidence? Evidence, string Provider = "",
        string Username = "opencode", string Organization = "", string Project = "", string Workspace = "");
    public sealed record ExpectedAiTarget(string Address, string Protocol, int Port);
    private static string Fingerprint(Connection server) => Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(new {
        server.Id, server.Hostname, server.IpAddress, server.ConnectionProtocol, server.SshPort, server.RdpPort, server.SshUsername, server.SshPassword, server.SshKeyPath,
    })));
    private static string ContextIdentity(Connection server) => Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(new {
        server.Id, server.Hostname, server.IpAddress, server.ConnectionProtocol, server.SshPort, server.RdpPort, server.SshUsername,
    })));
    public AiInvocation PrepareAiInvocation(int serverId, string query, AiEvidence? evidence = null, bool evidenceReviewed = false, ExpectedAiTarget? expectedTarget = null) => WithInventory(data =>
    {
        if (data.Ai.ConsentVersion != AiConsentVersion || (data.Ai.ApiKey.Length == 0 && !AiProviders.IsLocal(AiProviders.Infer(data.Ai.Provider, data.Ai.BaseUrl))))
            throw new InvalidOperationException("Configurá el proveedor y aceptá el envío de contexto en Ajustes → IA.");
        if (string.IsNullOrWhiteSpace(query) || query.Length > 16000) throw new ArgumentException("La consulta debe tener entre 1 y 16000 caracteres.");
        if (evidence != null && (!evidenceReviewed || evidence.Content.Length is < 1 or > 12000 || evidence.Source is not ("manual" or "terminal-selection" or "diagnostic")))
            throw new ArgumentException("Revisá la evidencia seleccionada; el límite es de 12000 caracteres.");
        if (serverId < 0) return PrepareTemporary(data, serverId, query, evidence, expectedTarget);
        var server = data.Servers.SingleOrDefault(s => s.Id == serverId) ?? throw new InvalidOperationException("Conexión no encontrada.");
        if (expectedTarget != null && (expectedTarget.Address != server.IpAddress || expectedTarget.Protocol != server.ConnectionProtocol || expectedTarget.Port != (server.ConnectionProtocol == "rdp" ? server.RdpPort : server.SshPort)))
            throw new InvalidOperationException("La conexión cambió desde que abriste la sesión. Cerrá la pestaña y volvé a abrirla antes de compartir contexto.");
        if (evidence != null && (!evidenceReviewed || evidence.Content.Length is < 1 or > 12000 || evidence.Source is not ("manual" or "terminal-selection" or "diagnostic")))
            throw new ArgumentException("Revisá la evidencia seleccionada; el límite es de 12000 caracteres.");
        // Deliberately exclude credentials, descriptions and every other server.
        var identity = ContextIdentity(server);
        var conversation = data.AiHistory.Where(turn => turn.ServerId == server.Id && turn.TargetIdentity == identity)
            .TakeLast(10).Select(turn => new { turn.CreatedAt, turn.Query, turn.Analysis }).ToArray();
        var context = JsonSerializer.Serialize(new { server = new { server.Hostname, server.IpAddress, server.OsInfo, server.ConnectionProtocol }, query, evidence, conversation }, Json);
        return new AiInvocation(data.Ai.BaseUrl, data.Ai.Model, data.Ai.ApiKey, context, serverId, Fingerprint(server), server.HistoryEpoch, server.Hostname, server.IpAddress, query, evidence, AiProviders.Infer(data.Ai.Provider, data.Ai.BaseUrl), data.Ai.Username, data.Ai.Organization, data.Ai.Project, data.Ai.Workspace);
    });

    public bool SaveAiTurn(AiInvocation invocation, string analysis, string? command) => WithInventory(data =>
    {
        if (analysis.Length > 24000 || command?.Length > 4000) return false;
        if (invocation.ServerId < 0) return SaveTemporaryTurn(invocation, analysis, command);
        var server = data.Servers.SingleOrDefault(s => s.Id == invocation.ServerId);
        if (server == null || Fingerprint(server) != invocation.Fingerprint || server.HistoryEpoch != invocation.HistoryEpoch) return false;
        if (analysis.Length > 24000 || command?.Length > 4000) return false;
        data.AiHistory.Add(new AiTurn(Guid.NewGuid().ToString(), server.Id, invocation.Hostname, invocation.Address,
            DateTimeOffset.UtcNow, invocation.BaseUrl, invocation.Model, invocation.Query, invocation.Evidence, analysis, command, ContextIdentity(server)));
        var expired = data.AiHistory.Where(turn => turn.ServerId == server.Id).Reverse().Skip(20).Select(turn => turn.Id).ToHashSet();
        data.AiHistory.RemoveAll(turn => expired.Contains(turn.Id));
        if (data.AiHistory.Count > 100) data.AiHistory.RemoveRange(0, data.AiHistory.Count - 100);
        Save(data);
        return true;
    });

    public sealed record LocalSshTarget(int ServerId, string Hostname, string Host, int Port, string Username, string Password, string PrivateKey, string Fingerprint);
    public int? GetContextLimit() => WithInventory<int?>(data => data.ContextMaxCharacters == 0 ? null : data.ContextMaxCharacters is >= 4000 and <= 240000 ? data.ContextMaxCharacters : throw new InvalidDataException("Configuración de contexto inválida."));
    public string GetAiDiscoverySecret(string provider, string address, string username) => WithInventory(data =>
        AiProviders.Infer(data.Ai.Provider, data.Ai.BaseUrl) == provider && data.Ai.BaseUrl == address &&
        (provider != "opencode" || data.Ai.Username == username) ? data.Ai.ApiKey : "");
    public LocalSshTarget GetLocalSshTarget(int serverId) => WithInventory(data =>
    {
        if (serverId < 0) {
            lock (_temporaryGate) {
                var temporary = Temporary(serverId);
                var target = temporary.Target;
                if (target.ConnectionProtocol != "ssh") throw new InvalidOperationException("Las tareas requieren una sesión SSH.");
                return new LocalSshTarget(serverId, target.Hostname, target.IpAddress, target.SshPort, target.SshUsername, "", "", temporary.Fingerprint);
            }
        }
        var server = data.Servers.SingleOrDefault(s => s.Id == serverId) ?? throw new InvalidOperationException("Conexión no encontrada.");
        if (server.ConnectionProtocol != "ssh") throw new InvalidOperationException("La consulta requiere una conexión SSH local.");
        return new LocalSshTarget(server.Id, server.Hostname, server.IpAddress, server.SshPort, server.SshUsername, server.SshPassword, server.SshKeyPath, Fingerprint(server));
    });

    private static Exception Unsupported() => new NotSupportedException("Esta función todavía no está disponible en el espacio local. No se enviaron datos al servidor.");
    private Inventory Load()
    {
        if (!File.Exists(_path)) return new Inventory();
        byte[]? plain = null;
        try
        {
            plain = ProtectedData.Unprotect(File.ReadAllBytes(_path), Entropy, DataProtectionScope.CurrentUser);
            var data = JsonSerializer.Deserialize<Inventory>(plain, Json) ?? throw new InvalidDataException();
            if (data.Version is not (1 or 2 or 3) || data.NextId < 1 || data.Servers == null || data.AiHistory == null || data.Ai == null || data.Servers.Any(s => s.Id <= 0 || s.Id >= data.NextId) || data.Servers.Select(s => s.Id).Distinct().Count() != data.Servers.Count)
                throw new InvalidDataException();
            if (data.Restores == null || data.FolderRevision < 0) throw new InvalidDataException();
            if (data.Folders != null) ValidateFolders(data.Folders,data.Servers.Select(s => s.Id).ToHashSet());
            return data;
        }
        catch (Exception ex) when (ex is CryptographicException or JsonException or InvalidDataException or ArgumentException)
        { throw new InvalidDataException("No se pudo abrir el inventario protegido. No se modificó el archivo. Usá la misma cuenta de Windows o restaurá una copia válida."); }
        finally { if (plain != null) CryptographicOperations.ZeroMemory(plain); }
    }
    private void Save(Inventory data)
    {
        data.Version = 3;
        Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
        var plain = JsonSerializer.SerializeToUtf8Bytes(data, Json);
        var temporary = _path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            var encrypted = ProtectedData.Protect(plain, Entropy, DataProtectionScope.CurrentUser);
            using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            { stream.Write(encrypted); stream.Flush(true); }
            if (File.Exists(_path)) File.Replace(temporary, _path, _path + ".bak");
            else File.Move(temporary, _path);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(plain);
            if (File.Exists(temporary)) File.Delete(temporary);
        }
    }
    private static void Update(Connection item, JsonElement body)
    {
        if (body.ValueKind != JsonValueKind.Object) throw new ArgumentException("Datos de conexión inválidos.");
        string Text(string field, string current, int max = 512)
        {
            if (!body.TryGetProperty(field, out var value)) return current;
            if (value.ValueKind != JsonValueKind.String) throw new ArgumentException("Campo de conexión inválido.");
            var text = value.GetString() ?? "";
            if (text.Length > max || text.Contains('\0')) throw new ArgumentException("Campo de conexión demasiado largo o inválido.");
            return text;
        }
        int Port(string field, int current) => !body.TryGetProperty(field, out var value) ? current
            : value.TryGetInt32(out var port) && port is >= 1 and <= 65535 ? port : throw new ArgumentException("Puerto inválido.");
        item.Hostname = Text("hostname", item.Hostname).Trim();
        item.IpAddress = Text("ip_address", item.IpAddress).Trim();
        if (item.Hostname.Length == 0 || item.IpAddress.Length == 0 || item.IpAddress.Any(char.IsWhiteSpace) || item.IpAddress.IndexOfAny(new[] { '/', '\\', '@' }) >= 0)
            throw new ArgumentException("Indicá un nombre y una dirección de servidor válidos.");
        item.Description = Text("description", item.Description, 4096);
        item.OsInfo = Text("os_info", item.OsInfo);
        item.ConnectionProtocol = Text("connection_protocol", item.ConnectionProtocol);
        if (item.ConnectionProtocol is not ("ssh" or "rdp")) throw new ArgumentException("Protocolo inválido.");
        item.SshPort = Port("ssh_port", item.SshPort);
        item.RdpPort = Port("rdp_port", item.RdpPort);
        item.SshUsername = Text("ssh_username", item.SshUsername);
        item.SshPassword = Text("ssh_password", item.SshPassword, 16384);
        item.SshKeyPath = Text("ssh_key_path", item.SshKeyPath, 131072);
    }
}
