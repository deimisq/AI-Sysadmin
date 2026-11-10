using System.Text.Json;
using System.Windows;

namespace AiSysadminDesktop;

public partial class MainWindow
{
    private PreferencesWindow? _preferencesWindow;
    private bool _preferencesEnterprise;

    private void OpenPreferences(bool enterprise, string section)
    {
        if (_preferencesWindow != null && (_preferencesEnterprise != enterprise || _preferencesWindow.HasFailed))
            _preferencesWindow.Destroy();
        if (_preferencesWindow != null)
        {
            _preferencesWindow.NavigateTo(section);
            if (_preferencesWindow.WindowState == WindowState.Minimized) _preferencesWindow.WindowState = WindowState.Normal;
            _preferencesWindow.Show();
            _preferencesWindow.Activate(); return;
        }
        _preferencesEnterprise = enterprise;
        _preferencesWindow = new PreferencesWindow(this, MainWebView.CoreWebView2.Environment, enterprise, section,
            HandlePreferencesAsync, NotifyPreferencesChange);
        _preferencesWindow.Closed += (_, _) => _preferencesWindow = null;
        _preferencesWindow.Show();
    }

    private async void NotifyPreferencesChange(string name)
    {
        if (_closing) return;
        try { await MainWebView.CoreWebView2.ExecuteScriptAsync("window.dispatchEvent(new Event(" + JsonSerializer.Serialize(name) + "));"); }
        catch { /* The next mounted main UI reads the protected configuration again. */ }
    }

    private Task<JsonElement> HandlePreferencesAsync(string type, JsonElement payload) => Task.Run(async () => {
        if (!PreferencesPolicy.Allows(type, payload)) throw new InvalidOperationException("Operación de configuración no permitida.");
        if (type == "LOCAL_AI_MODELS") return await DiscoverAiModelsAsync(payload);
        if (type == "LOCAL_REQUEST")
            return _localConnections.Handle(payload.GetProperty("method").GetString()!, payload.GetProperty("endpoint").GetString()!, payload.TryGetProperty("body", out var body) ? body : default);
        if (type is "LOCAL_CONTEXT_LIST" or "LOCAL_CONTEXT_DELETE")
        {
            if (type == "LOCAL_CONTEXT_DELETE")
            {
                if (!payload.TryGetProperty("confirmed", out var confirmed) || confirmed.ValueKind != JsonValueKind.True) throw new InvalidOperationException("Confirma el borrado del registro local.");
                await _terminalContexts.DeleteAsync(payload.GetProperty("id").GetString()!);
            }
            return JsonSerializer.SerializeToElement(await _terminalContexts.ListAsync());
        }
        var password = payload.GetProperty("password").GetString() ?? "";
        if (type == "LOCAL_BACKUP_EXPORT") return JsonSerializer.SerializeToElement(new { data = _localConnections.ExportBackup(password, payload.TryGetProperty("include_key_files", out var includeKeys) && includeKeys.ValueKind == JsonValueKind.True) });
        var data = payload.GetProperty("data").GetString() ?? "";
        if (type == "LOCAL_BACKUP_PREVIEW") return _localConnections.PreviewBackup(data, password);
        return _localConnections.ImportBackup(data, password, payload.GetProperty("hash").GetString() ?? "",
            payload.TryGetProperty("confirmed", out var confirm) && confirm.ValueKind == JsonValueKind.True, payload.GetProperty("operation_id").GetString() ?? "");
    });

    private Task<JsonElement> DiscoverAiModelsAsync(JsonElement payload)
    {
        var provider = payload.GetProperty("provider").GetString() ?? "";
        var password = payload.TryGetProperty("password", out var secret) ? secret.GetString() ?? "" : "";
        var endpoint = AiProviders.IsLocal(provider) ? AiProviders.NormalizeEndpoint(provider, payload.TryGetProperty("base_url", out var address) ? address.GetString() : null) : AiProviders.Get(provider).BaseUrl;
        var username = payload.TryGetProperty("username", out var user) ? user.GetString() ?? "opencode" : "opencode";
        if (username.Length > 200 || username.Contains(':') || username.Any(char.IsControl)) throw new ArgumentException("El usuario del servicio no es válido.");
        if (password.Length == 0) password = _localConnections.GetAiDiscoverySecret(provider, endpoint, username);
        string Option(string name) => payload.TryGetProperty(name, out var value) ? value.GetString() ?? "" : "";
        return AiProviderTransport.DiscoverAsync(provider, password, baseUrl: endpoint, username: username,
            organization: Option("organization"), project: Option("project"), workspace: Option("workspace"));
    }
}
