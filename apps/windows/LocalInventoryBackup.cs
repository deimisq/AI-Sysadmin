using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace AiSysadminDesktop;

public sealed partial class LocalConnectionStore
{
    public sealed record ConnectionFolder(string Id, string Name, [property: JsonPropertyName("parentId")] string? ParentId);
    public sealed class FolderLayout
    {
        public List<ConnectionFolder> Folders { get; set; } = new();
        public Dictionary<string,string> Assignments { get; set; } = new();
    }
    private sealed record PortableInventory(int Version, DateTimeOffset CreatedAt, List<Connection> Servers, FolderLayout Folders);
    public sealed record RestoreReceipt(string Hash, int Imported, int Folders);
    private const int MaxBackupBytes = 8 * 1024 * 1024;
    private const int BackupIterations = 600000;
    private static readonly byte[] BackupHeader = Encoding.ASCII.GetBytes("AISYSB01");
    private static void ValidateFolders(FolderLayout layout, HashSet<int> serverIds)
    {
        if (layout.Folders == null || layout.Assignments == null || layout.Folders.Count > 2000 || layout.Assignments.Count > 10000) throw new ArgumentException("Carpetas inválidas o demasiado grandes.");
        var ids = new HashSet<string>();
        foreach (var folder in layout.Folders)
        {
            if (folder == null || string.IsNullOrWhiteSpace(folder.Id) || folder.Id.Length > 100 || string.IsNullOrWhiteSpace(folder.Name) || folder.Name.Length > 100 || folder.Name.Contains('\0') || (folder.ParentId != null && !ids.Contains(folder.ParentId)) || !ids.Add(folder.Id))
                throw new ArgumentException("La organización de carpetas contiene referencias inválidas o ciclos.");
        }
        foreach (var pair in layout.Assignments)
            if (!int.TryParse(pair.Key,out var id) || !serverIds.Contains(id) || !ids.Contains(pair.Value)) throw new ArgumentException("Asignación de carpeta inválida.");
    }
    private static void Password(string password)
    {
        if (password.Length is < 12 or > 1024) throw new ArgumentException("La contraseña de la copia debe tener entre 12 y 1024 caracteres.");
    }
    public string ExportBackup(string password, bool includeKeyFiles = false) => WithInventory(data =>
    {
        Password(password);
        // The native folder migration must finish before promising a complete inventory copy.
        if (data.Folders == null) throw new InvalidOperationException("Abrí el inventario para migrar las carpetas antes de crear una copia.");
        ValidateFolders(data.Folders,data.Servers.Select(s => s.Id).ToHashSet());
        var servers = JsonSerializer.Deserialize<List<Connection>>(JsonSerializer.SerializeToUtf8Bytes(data.Servers,Json),Json)!;
        if (includeKeyFiles) foreach (var server in servers) {
            if (string.IsNullOrWhiteSpace(server.SshKeyPath) || server.SshKeyPath.Contains("-----BEGIN")) continue;
            var file = new FileInfo(server.SshKeyPath);
            if (!file.Exists || file.Length > 128 * 1024) throw new InvalidOperationException($"No se pudo incluir la clave SSH de {server.Hostname}. Revisá el archivo o desmarcá incluir archivos de claves.");
            var key = File.ReadAllText(file.FullName);
            if (!key.Contains("-----BEGIN") || !key.Contains("PRIVATE KEY-----")) throw new InvalidOperationException($"El archivo de clave SSH de {server.Hostname} no tiene un formato privado portable reconocido.");
            server.SshKeyPath = key;
        }
        var plain = JsonSerializer.SerializeToUtf8Bytes(new PortableInventory(1,DateTimeOffset.UtcNow,servers,data.Folders),Json);
        try
        {
            if (plain.Length > MaxBackupBytes) throw new InvalidOperationException("El inventario supera el límite de 8 MiB.");
            var salt = RandomNumberGenerator.GetBytes(16); var nonce = RandomNumberGenerator.GetBytes(12);
            var key = Rfc2898DeriveBytes.Pbkdf2(password,salt,BackupIterations,HashAlgorithmName.SHA256,32);
            try
            {
                var result = new byte[8 + 16 + 12 + 16 + plain.Length];
                BackupHeader.CopyTo(result,0); salt.CopyTo(result,8); nonce.CopyTo(result,24);
                using var aes = new AesGcm(key,16);
                aes.Encrypt(nonce,plain,result.AsSpan(52),result.AsSpan(36,16),result.AsSpan(0,36));
                return Convert.ToBase64String(result);
            }
            finally { CryptographicOperations.ZeroMemory(key); }
        }
        finally { CryptographicOperations.ZeroMemory(plain); }
    });
    private static (PortableInventory Data, string Hash) ReadBackup(string encoded,string password)
    {
        Password(password);
        if (encoded.Length > (MaxBackupBytes + 52) * 4 / 3 + 4) throw new ArgumentException("Copia demasiado grande.");
        byte[] bytes;
        try { bytes = Convert.FromBase64String(encoded); } catch (FormatException) { throw new ArgumentException("Archivo de copia inválido."); }
        if (bytes.Length < 53 || bytes.Length > MaxBackupBytes + 52 || !bytes.AsSpan(0,8).SequenceEqual(BackupHeader)) throw new ArgumentException("Formato o versión de copia no admitidos.");
        var key = Rfc2898DeriveBytes.Pbkdf2(password,bytes.AsSpan(8,16),BackupIterations,HashAlgorithmName.SHA256,32);
        var plain = new byte[bytes.Length - 52];
        try
        {
            using var aes = new AesGcm(key,16);
            aes.Decrypt(bytes.AsSpan(24,12),bytes.AsSpan(52),bytes.AsSpan(36,16),plain,bytes.AsSpan(0,36));
            var backup = JsonSerializer.Deserialize<PortableInventory>(plain,Json) ?? throw new ArgumentException("Contenido de copia inválido.");
            if (backup.Version != 1 || backup.Servers == null || backup.Folders == null || backup.Servers.Count > 10000 || backup.Servers.Any(s => s == null || s.Id <= 0) || backup.Servers.Select(s => s.Id).Distinct().Count() != backup.Servers.Count)
                throw new ArgumentException("Contenido de copia inválido o versión no admitida.");
            foreach (var server in backup.Servers)
            {
                // Reuse the normal connection validation; importing never bypasses field bounds.
                Update(server,JsonSerializer.SerializeToElement(server,Json));
            }
            ValidateFolders(backup.Folders,backup.Servers.Select(s => s.Id).ToHashSet());
            return (backup,Convert.ToHexString(SHA256.HashData(bytes)));
        }
        catch (CryptographicException) { throw new ArgumentException("Contraseña incorrecta o copia alterada. No se modificó el inventario."); }
        catch (JsonException) { throw new ArgumentException("Contenido de copia inválido. No se modificó el inventario."); }
        finally { CryptographicOperations.ZeroMemory(key); CryptographicOperations.ZeroMemory(plain); }
    }
    public JsonElement PreviewBackup(string encoded,string password)
    {
        var (backup,hash) = ReadBackup(encoded,password);
        return JsonSerializer.SerializeToElement(new { hash, created_at = backup.CreatedAt, connections = backup.Servers.Count, folders = backup.Folders.Folders.Count,
            external_key_files = backup.Servers.Count(s => s.SshKeyPath.Length > 0 && !s.SshKeyPath.Contains("-----BEGIN")),
            servers = backup.Servers.Select(s => new { s.Hostname,s.IpAddress,s.ConnectionProtocol }) },Json);
    }
    public JsonElement ImportBackup(string encoded,string password,string expectedHash,bool confirmed,string operationId)
    {
        if (!confirmed) throw new InvalidOperationException("Revisá la copia y confirmá que querés agregar sus conexiones.");
        if (!Guid.TryParse(operationId,out _)) throw new ArgumentException("Identificador de restauración inválido.");
        var (backup,hash) = ReadBackup(encoded,password);
        if (hash != expectedHash) throw new InvalidOperationException("La copia cambió desde la revisión. Volvé a validarla.");
        return WithInventory(data =>
        {
            if (data.Restores.TryGetValue(operationId,out var receipt))
            {
                if (receipt.Hash != hash) throw new InvalidOperationException("Ese identificador corresponde a otra copia.");
                return JsonSerializer.SerializeToElement(new { imported = receipt.Imported, folders = receipt.Folders, already_applied = true },Json);
            }
            if (data.Folders == null) throw new InvalidOperationException("Abrí el inventario para migrar las carpetas antes de restaurar.");
            if (data.Servers.Count + backup.Servers.Count > 10000) throw new InvalidOperationException("Se supera el límite de 10000 conexiones.");
            var ids = new Dictionary<int,int>(); var folderIds = backup.Folders.Folders.ToDictionary(f => f.Id,_ => Guid.NewGuid().ToString("N"));
            foreach (var server in backup.Servers)
            {
                ids[server.Id] = data.NextId; server.Id = data.NextId; data.NextId = checked(data.NextId + 1); server.HistoryEpoch = 0; data.Servers.Add(server);
            }
            data.Folders ??= new FolderLayout();
            data.Folders.Folders.AddRange(backup.Folders.Folders.Select(f => new ConnectionFolder(folderIds[f.Id],f.Name,f.ParentId == null ? null : folderIds[f.ParentId])));
            foreach (var pair in backup.Folders.Assignments) data.Folders.Assignments[ids[int.Parse(pair.Key)].ToString()] = folderIds[pair.Value];
            ValidateFolders(data.Folders,data.Servers.Select(s => s.Id).ToHashSet());
            data.FolderRevision = checked(data.FolderRevision + 1);
            data.Restores[operationId] = new(hash,backup.Servers.Count,backup.Folders.Folders.Count);
            if (data.Restores.Count > 100) data.Restores.Remove(data.Restores.Keys.First());
            Save(data);
            return JsonSerializer.SerializeToElement(new { imported = backup.Servers.Count, folders = backup.Folders.Folders.Count },Json);
        });
    }
}
