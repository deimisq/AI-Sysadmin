using System.Collections.Concurrent;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;

namespace AiSysadminDesktop;

/// <summary>Encrypted, append-only terminal output journal. Never captures non-echoed keystrokes.</summary>
public sealed class TerminalContextStore : IDisposable
{
    public sealed record Snapshot(string? SessionId, string Transcript, DateTimeOffset? StartedAt, long Bytes, bool Closed,
        bool Truncated = false, int TotalCharacters = 0, int IncludedCharacters = 0);
    public sealed record Journal(string Id, int? ServerId, DateTimeOffset? StartedAt, long Bytes, bool Active, string Status);
    private sealed record Header(string SessionId, int ServerId, string Fingerprint, DateTimeOffset StartedAt);
    private sealed record Work(string SessionId, byte[]? Data, byte Kind, TaskCompletionSource? Completion = null);
    private sealed class State(Header header) { public Header Header = header; public string? Error; public bool Closed; public bool Deleted; public FileStream? Lease; }
    private readonly ConcurrentDictionary<string, State> _sessions = new();
    private readonly string _directory;
    private readonly object _disk = new();
    private readonly Channel<Work> _queue = Channel.CreateBounded<Work>(new BoundedChannelOptions(128) { SingleReader = true, FullMode = BoundedChannelFullMode.Wait });
    private readonly Task _writer;
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("AiSysadmin.TerminalContext.v1");
    public TerminalContextStore(string? directory = null)
    {
        _directory = directory ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AiSysadmin", "TerminalContext");
        _writer = Task.Run(WriteLoop);
    }
    private string FilePath(string session) => Path.Combine(_directory, Guid.Parse(session).ToString("N") + ".terminal");
    public void Register(string sessionId, int serverId, string fingerprint)
    {
        if (!Guid.TryParse(sessionId,out _)) throw new ArgumentException("Identificador de sesión inválido.");
        var header = new Header(sessionId, serverId, fingerprint, DateTimeOffset.UtcNow);
        var state = new State(header); _sessions[sessionId] = state;
        try
        {
            lock (_disk)
            {
                Directory.CreateDirectory(_directory);
                if (Directory.EnumerateFiles(_directory, "*.terminal").Sum(file => new FileInfo(file).Length) >= 256L * 1024 * 1024)
                    throw new IOException();
                state.Lease = new FileStream(FilePath(sessionId)+".lock",FileMode.OpenOrCreate,FileAccess.ReadWrite,FileShare.None);
                WriteFrame(sessionId, 0, JsonSerializer.SerializeToUtf8Bytes(header));
            }
        }
        catch { state.Error = "No se pudo iniciar el registro local de terminal. Revisá el almacenamiento antes de pedir ayuda contextual."; }
    }
    public void Append(string sessionId, ReadOnlySpan<byte> output)
    {
        if (!_sessions.TryGetValue(sessionId, out var state) || state.Closed || state.Error != null || output.Length == 0) return;
        if (!_queue.Writer.TryWrite(new(sessionId, output.ToArray(), 1)))
            state.Error = "El registro no pudo seguir el ritmo de la terminal. No se enviará un contexto incompleto como si estuviera completo.";
    }
    public void Close(string sessionId)
    {
        if (!_sessions.TryGetValue(sessionId, out var state) || state.Closed) return;
        state.Closed = true;
        if (!_queue.Writer.TryWrite(new(sessionId, null, 2))) state.Error = "No se pudo cerrar el registro de terminal correctamente.";
    }
    private async Task WriteLoop()
    {
        await foreach (var work in _queue.Reader.ReadAllAsync())
        {
            if (work.Completion != null) { work.Completion.TrySetResult(); continue; }
            try
            {
                if (_sessions.TryGetValue(work.SessionId, out var state))
                    lock (_disk) { if (state.Error == null) WriteFrame(work.SessionId, work.Kind, work.Data ?? Array.Empty<byte>()); }
            }
            catch { if (_sessions.TryGetValue(work.SessionId, out var state)) state.Error = "No se pudo guardar el contexto de terminal. No se enviará un registro incompleto."; }
            finally
            {
                if (work.Data != null) CryptographicOperations.ZeroMemory(work.Data);
                if (work.Kind == 2 && _sessions.TryGetValue(work.SessionId,out var ended)) { ended.Lease?.Dispose(); ended.Lease = null; }
            }
        }
    }
    private void WriteFrame(string sessionId, byte kind, byte[] data)
    {
        var plain = new byte[data.Length + 1]; plain[0] = kind; data.CopyTo(plain, 1);
        try
        {
            var encrypted = ProtectedData.Protect(plain, Entropy, DataProtectionScope.CurrentUser);
            using var stream = new FileStream(FilePath(sessionId), FileMode.Append, FileAccess.Write, FileShare.Read);
            if (stream.Length + encrypted.Length > 32L * 1024 * 1024) throw new IOException();
            stream.Write(BitConverter.GetBytes(encrypted.Length)); stream.Write(encrypted); stream.Flush();
        }
        finally { CryptographicOperations.ZeroMemory(plain); }
    }
    private static byte[] ReadFrame(Stream stream)
    {
        var size = new byte[4]; stream.ReadExactly(size);
        var length = BitConverter.ToInt32(size);
        if (length is < 1 or > 65536) throw new InvalidDataException("Registro de terminal inválido.");
        var data = new byte[length]; stream.ReadExactly(data);
        return ProtectedData.Unprotect(data, Entropy, DataProtectionScope.CurrentUser);
    }
    public async Task<Snapshot> ReadAsync(int serverId, string fingerprint, string? sessionId = null, int? maxCharacters = null)
    {
        if (maxCharacters != null && maxCharacters is < 4000 or > 240000) throw new ArgumentException("Ventana de contexto inválida.");
        var known = sessionId != null && _sessions.TryGetValue(sessionId, out var explicitSession) ? explicitSession
            : _sessions.Values.Where(item => !item.Deleted && item.Header.ServerId == serverId && item.Header.Fingerprint == fingerprint).OrderByDescending(item => item.Header.StartedAt).FirstOrDefault();
        if (known != null && (known.Header.ServerId != serverId || known.Header.Fingerprint != fingerprint)) throw new InvalidOperationException("El registro no corresponde a este destino.");
        if (known?.Error != null) throw new InvalidOperationException(known.Error);
        var barrier = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        await _queue.Writer.WriteAsync(new("", null, 3, barrier), timeout.Token);
        await barrier.Task.WaitAsync(timeout.Token);
        lock (_disk)
        {
            Header? chosen = null; string? path = null;
            if (!Directory.Exists(_directory)) return new(null, "", null, 0, true);
            foreach (var file in Directory.EnumerateFiles(_directory, "*.terminal"))
            {
                using var stream = File.OpenRead(file);
                var frame = ReadFrame(stream);
                Header? header;
                try { if (frame[0] != 0) throw new InvalidDataException(); header = JsonSerializer.Deserialize<Header>(frame.AsSpan(1)); }
                finally { CryptographicOperations.ZeroMemory(frame); }
                if (header == null || header.ServerId != serverId || header.Fingerprint != fingerprint || (sessionId != null && header.SessionId != sessionId)) continue;
                if (chosen == null || header.StartedAt > chosen.StartedAt) { chosen = header; path = file; }
            }
            if (chosen == null || path == null)
            {
                if (sessionId != null) throw new InvalidOperationException("No se encontró el registro de esta sesión para este destino.");
                return new(null, "", null, 0, true);
            }
            if (_sessions.TryGetValue(chosen.SessionId, out var active) && active.Error != null) throw new InvalidOperationException(active.Error);
            using var input = File.OpenRead(path); var first = ReadFrame(input); CryptographicOperations.ZeroMemory(first);
            using var output = new MemoryStream(); bool closed = false;
            while (input.Position < input.Length)
            {
                var frame = ReadFrame(input);
                try { if (frame[0] == 1) output.Write(frame, 1, frame.Length - 1); else if (frame[0] == 2) closed = true; else throw new InvalidDataException(); }
                finally { CryptographicOperations.ZeroMemory(frame); }
            }
            if (active == null && !closed) throw new InvalidOperationException("El registro de una sesión anterior quedó interrumpido. No se enviará como contexto completo.");
            var bytes = output.ToArray();
            try
            {
                var text = Encoding.UTF8.GetString(bytes);
                if (maxCharacters == null && text.Length > 240000) throw new InvalidOperationException("El contexto completo supera 240000 caracteres. Podés configurar una ventana de contexto reciente en Ajustes. No se envió un recorte sin tu configuración.");
                var total = text.Length;
                if (maxCharacters != null && total > maxCharacters)
                {
                    var start = total - maxCharacters.Value;
                    if (char.IsLowSurrogate(text[start]) && start > 0 && char.IsHighSurrogate(text[start - 1])) start++;
                    text = text[start..];
                }
                return new(chosen.SessionId, text, chosen.StartedAt, bytes.Length, closed, text.Length < total, total, text.Length);
            }
            finally { CryptographicOperations.ZeroMemory(bytes); }
        }
    }
    private async Task FlushAsync()
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        var barrier = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        await _queue.Writer.WriteAsync(new("",null,3,barrier),timeout.Token);
        await barrier.Task.WaitAsync(timeout.Token);
    }
    public async Task<Journal[]> ListAsync()
    {
        await FlushAsync();
        lock (_disk)
        {
            if (!Directory.Exists(_directory)) return Array.Empty<Journal>();
            return Directory.EnumerateFiles(_directory,"*.terminal").Select(file => {
                var id = Path.GetFileNameWithoutExtension(file);
                var bytes = new FileInfo(file).Length;
                if (!Guid.TryParseExact(id,"N",out var guid)) return new Journal(id,null,null,bytes,true,"Nombre no reconocido; no se puede borrar desde la aplicación.");
                var state = _sessions.Values.FirstOrDefault(item => Guid.Parse(item.Header.SessionId) == guid);
                var active = state != null && !state.Closed || IsLeased(file);
                try
                {
                    using var input = File.OpenRead(file); var frame = ReadFrame(input);
                    Header? header;
                    try { if (frame[0] != 0) throw new InvalidDataException(); header = JsonSerializer.Deserialize<Header>(frame.AsSpan(1)); }
                    finally { CryptographicOperations.ZeroMemory(frame); }
                    if (header == null || Guid.Parse(header.SessionId) != guid) throw new InvalidDataException();
                    return new Journal(id,header.ServerId,header.StartedAt,bytes,active,state?.Error ?? (active ? "Sesión abierta" : "Sesión finalizada o interrumpida; contenido sin verificar"));
                }
                catch (Exception ex) when (ex is IOException or CryptographicException or JsonException or ArgumentException or UnauthorizedAccessException)
                { return new Journal(id,null,null,bytes,active,"No se pudo leer el encabezado del registro"); }
            }).OrderByDescending(item => item.StartedAt).ToArray();
        }
    }
    private static bool IsLeased(string file)
    {
        try { using var lease = new FileStream(file+".lock",FileMode.OpenOrCreate,FileAccess.ReadWrite,FileShare.None); return false; }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { return true; }
    }
    public async Task DeleteAsync(string id)
    {
        if (!Guid.TryParseExact(id,"N",out var guid)) throw new ArgumentException("Identificador de registro inválido.");
        await FlushAsync();
        lock (_disk)
        {
            var state = _sessions.Values.FirstOrDefault(item => Guid.Parse(item.Header.SessionId) == guid);
            if (state != null && !state.Closed) throw new InvalidOperationException("Cerrá la sesión SSH antes de borrar su registro.");
            var path = Path.Combine(_directory,guid.ToString("N") + ".terminal");
            if (!File.Exists(path)) return;
            FileStream lease;
            try { lease = new FileStream(path+".lock",FileMode.OpenOrCreate,FileAccess.ReadWrite,FileShare.None); }
            catch (IOException) { throw new InvalidOperationException("El registro está en uso por otra instancia. Cerrá la sesión antes de borrarlo."); }
            using (lease)
            {
            File.Delete(path);
            // Keep a tombstone so an explicit stale session never falls back to another journal.
            if (state != null) { state.Deleted = true; state.Error = "El registro de esta sesión fue eliminado por el técnico."; }
            }
        }
    }
    public void Dispose()
    {
        foreach (var session in _sessions.Keys) Close(session);
        _queue.Writer.TryComplete();
        _writer.Wait(TimeSpan.FromSeconds(3));
    }
}
