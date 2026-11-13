using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace AiSysadminDesktop;

public sealed class AppUpdates : IDisposable
{
    public const string Repository = "deimisq/AI-Sysadmin";
    public static string CurrentVersion => typeof(AppUpdates).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()!.InformationalVersion.Split('+')[0];
    private readonly string _directory;
    private readonly HttpClient _http;
    private readonly Func<string?> _installRoot;
    private readonly SemaphoreSlim _gate = new(1,1);
    private readonly object _sync = new();
    private string _state = "idle", _error = "", _version = "", _notes = "", _digest = "", _file = "";
    private long _asset, _size, _received;
    private string? _restart;
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("AiSysadmin.GitHubUpdates.v1");
    public AppUpdates(HttpMessageHandler? handler = null, string? directory = null, Func<string?>? installRoot = null) {
        _installRoot = installRoot ?? InstallRoot;
        _directory = directory ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"AiSysadmin","Updates");
        _http = new HttpClient(handler ?? new HttpClientHandler { AllowAutoRedirect=false }) { Timeout=TimeSpan.FromMinutes(15) };
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("AI-Sysadmin-Updater/1.0");
    }
    public static Version? StableVersion(string text) => Regex.IsMatch(text,@"^\d+\.\d+\.\d+$") && Version.TryParse(text,out var version) ? version : null;
    public static bool IsNewer(string candidate,string current) {
        var next=StableVersion(candidate);
        var previous=StableVersion(current.Split('-')[0]);
        return next != null && previous != null && next > previous;
    }
    private string TokenPath => Path.Combine(_directory,"github-token.dat");
    private string Token() {
        if(!File.Exists(TokenPath)) return "";
        var plain=ProtectedData.Unprotect(File.ReadAllBytes(TokenPath),Entropy,DataProtectionScope.CurrentUser);
        try { return Encoding.UTF8.GetString(plain); } finally { CryptographicOperations.ZeroMemory(plain); }
    }
    public bool IsInstalling { get { lock(_sync) return _state=="installing"; } }
    public void SaveToken(string token) {
        if (token.Length > 8192 || token.Any(char.IsWhiteSpace) || token.Any(char.IsControl)) throw new ArgumentException(UserLanguage.Text("Token de GitHub inválido."));
        Directory.CreateDirectory(_directory);
        if (token.Length == 0) { if(File.Exists(TokenPath)) File.Delete(TokenPath); return; }
        var plain=Encoding.UTF8.GetBytes(token);
        try { File.WriteAllBytes(TokenPath,ProtectedData.Protect(plain,Entropy,DataProtectionScope.CurrentUser)); }
        finally { CryptographicOperations.ZeroMemory(plain); }
    }
    public object Status() { lock(_sync) return new { current_version=CurrentVersion, repository=Repository, state=_state, error=_error, version=_version, notes=_notes, received=_received, size=_size, has_token=File.Exists(TokenPath), installed=_installRoot()!=null }; }
    private void State(string state,string error="") { lock(_sync) { _state=state; _error=error; } }
    private async Task<HttpResponseMessage> RequestAsync(string url,bool asset=false) {
        var target=new Uri(url); var authenticated=true;
        for(var count=0;count<4;count++) {
            using var request=new HttpRequestMessage(HttpMethod.Get,target);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue(asset ? "application/octet-stream" : "application/vnd.github+json"));
            if(authenticated) { var token=Token(); if(token.Length>0) request.Headers.Authorization=new AuthenticationHeaderValue("Bearer",token); }
            var response=await _http.SendAsync(request,HttpCompletionOption.ResponseHeadersRead);
            if(response.StatusCode is HttpStatusCode.Redirect or HttpStatusCode.MovedPermanently or HttpStatusCode.TemporaryRedirect or HttpStatusCode.PermanentRedirect) {
                var location=response.Headers.Location; response.Dispose();
                if(location==null || !location.IsAbsoluteUri || location.Scheme!="https" || location.UserInfo.Length>0 || !(location.Host.EndsWith(".githubusercontent.com",StringComparison.OrdinalIgnoreCase))) throw new InvalidOperationException(UserLanguage.Text("Redirección de descarga no autorizada."));
                target=location; authenticated=false; continue;
            }
            if(!response.IsSuccessStatusCode) {
                var code=(int)response.StatusCode; response.Dispose();
                throw new InvalidOperationException(code is 401 or 403 or 404 ? $"GitHub devolvió HTTP {code}. El repositorio es privado: configurá un token con acceso a AI-Sysadmin y permiso Contents: read; revisá también su vigencia o el límite de solicitudes." : $"GitHub devolvió HTTP {code}. Probá nuevamente más tarde.");
            }
            return response;
        }
        throw new InvalidOperationException(UserLanguage.Text("Demasiadas redirecciones de GitHub."));
    }
    private static async Task<byte[]> Bounded(HttpResponseMessage response,int limit) {
        await using var input=await response.Content.ReadAsStreamAsync(); using var output=new MemoryStream();
        var buffer=new byte[8192]; int count;
        while((count=await input.ReadAsync(buffer))>0) { if(output.Length+count>limit) throw new InvalidOperationException(UserLanguage.Text("Respuesta de GitHub demasiado grande.")); output.Write(buffer,0,count); }
        return output.ToArray();
    }
    public async Task CheckAsync() {
        if(!await _gate.WaitAsync(0)) throw new InvalidOperationException(UserLanguage.Text("Ya hay una actualización en curso."));
        try {
            if(_state is "downloaded" or "restart") return;
            State("checking");
            using var response=await RequestAsync($"https://api.github.com/repos/{Repository}/releases?per_page=30");
            using var document=JsonDocument.Parse(await Bounded(response,2*1024*1024));
            var releases=document.RootElement.EnumerateArray().Where(r=>!r.GetProperty("draft").GetBoolean() && !r.GetProperty("prerelease").GetBoolean())
                .Select(r=> (Release:r, Version:StableVersion(r.GetProperty("tag_name").GetString()!.Replace("windows-","",StringComparison.Ordinal))))
                .Where(r=>r.Version!=null).OrderByDescending(r=>r.Version).ToArray();
            foreach(var release in releases) {
                var version=release.Version!.ToString(); if(!IsNewer(version,CurrentVersion)) break;
                var name=$"AI-Sysadmin-Agent-{version}-win-x64-setup.exe";
                var assets=release.Release.GetProperty("assets").EnumerateArray().Where(a=>a.GetProperty("name").GetString()==name).ToArray();
                if(assets.Length!=1) continue;
                var asset=assets[0];
                var digest=asset.TryGetProperty("digest",out var hash) ? hash.GetString() ?? "" : "";
                if(!Regex.IsMatch(digest,@"^sha256:[a-fA-F0-9]{64}$")) continue;
                var size=asset.GetProperty("size").GetInt64(); if(size<1 || size>512L*1024*1024) continue;
                lock(_sync) { _version=version; _asset=asset.GetProperty("id").GetInt64(); _digest=digest[7..]; _size=size; _received=0; _notes=release.Release.GetProperty("body").GetString() ?? ""; }
                State("available"); return;
            }
            State("current");
        } catch(Exception error) { State("error",error.Message); throw; }
        finally { _gate.Release(); }
    }
    public async Task DownloadAsync() {
        if(!await _gate.WaitAsync(0)) throw new InvalidOperationException(UserLanguage.Text("Ya hay una actualización en curso."));
        try {
            if(_state!="available") throw new InvalidOperationException(UserLanguage.Text("Buscá una actualización antes de descargar."));
            State("downloading"); Directory.CreateDirectory(_directory);
            _file=Path.Combine(_directory,$"AI-Sysadmin-{_version}-{Guid.NewGuid():N}.exe");
            using var response=await RequestAsync($"https://api.github.com/repos/{Repository}/releases/assets/{_asset}",true);
            await using(var input=await response.Content.ReadAsStreamAsync())
            await using(var output=new FileStream(_file,FileMode.CreateNew,FileAccess.Write,FileShare.None)) {
                var buffer=new byte[65536]; int count; long total=0;
                while((count=await input.ReadAsync(buffer))>0) { total+=count; if(total>_size) throw new InvalidOperationException(UserLanguage.Text("El tamaño de la descarga no coincide.")); await output.WriteAsync(buffer.AsMemory(0,count)); lock(_sync) _received=total; }
                if(total!=_size) throw new InvalidOperationException(UserLanguage.Text("Descarga incompleta."));
            }
            VerifyFile(); State("downloaded");
        } catch(Exception error) { if(File.Exists(_file)) File.Delete(_file); State("error",error.Message); throw; }
        finally { _gate.Release(); }
    }
    private void VerifyFile() {
        using var stream=File.OpenRead(_file);
        if(!Convert.ToHexString(SHA256.HashData(stream)).Equals(_digest,StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException(UserLanguage.Text("El hash de la actualización no coincide. No se ejecutó el archivo."));
    }
    public static string? InstallRoot() {
        using var key=Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\{4DFF87E7-6939-4591-910C-8BA873B15B32}_is1");
        var root=key?.GetValue("InstallLocation") as string;
        if(string.IsNullOrWhiteSpace(root)) return null;
        return ResolveInstallRoot(root, AppContext.BaseDirectory);
    }
    public static string? ResolveInstallRoot(string root, string executableDirectory) {
        root=Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar);
        var current=Path.GetFullPath(executableDirectory).TrimEnd(Path.DirectorySeparatorChar);
        return current.Equals(root,StringComparison.OrdinalIgnoreCase) || current.StartsWith(Path.Combine(root,"versions")+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase) ? root : null;
    }
    public async Task InstallAsync() {
        if(!await _gate.WaitAsync(0)) throw new InvalidOperationException(UserLanguage.Text("Ya hay una actualización en curso."));
        try {
            if(_state!="downloaded") throw new InvalidOperationException("Primero descargá y verificá la actualización.");
            var root=_installRoot() ?? throw new InvalidOperationException("La actualización integrada requiere la app instalada. Esta instancia es portable o de desarrollo.");
            VerifyFile(); State("installing");
            // The installed files are replaced only after the separate restart approval.
            _restart=Path.Combine(root,"AiSysadmin.exe");
            State("restart");
        } catch(Exception error) { State("error",error.Message); throw; }
        finally { _gate.Release(); }
    }
    public void Restart() {
        if(_state!="restart" || _restart==null) throw new InvalidOperationException("No hay actualización lista para reiniciar.");
        VerifyFile();
        var script=UpdateRestartScript.Create(Environment.ProcessId, _file, Path.GetDirectoryName(_restart)!, _digest, _size,
            Path.Combine(_directory,"install.log"), UserLanguage.Text("No se pudo aplicar la actualización. Revisá el registro de instalación."));
        var helper=new ProcessStartInfo("powershell.exe") { UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden };
        foreach(var argument in new[] {"-NoProfile","-NonInteractive","-EncodedCommand",Convert.ToBase64String(Encoding.Unicode.GetBytes(script))}) helper.ArgumentList.Add(argument);
        using var started=Process.Start(helper) ?? throw new InvalidOperationException("No se pudo iniciar el actualizador.");
    }
    public void Dispose() { _http.Dispose(); }
}
