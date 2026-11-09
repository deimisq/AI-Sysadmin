namespace AiSysadminDesktop;

public static class AiProviders
{
    public sealed record Provider(string Id, string Name, string BaseUrl, string DefaultModel, string[] Models, bool Local, bool RequiresKey);
    public static readonly Provider[] Catalog = [
        new("openai", "ChatGPT / OpenAI", "https://api.openai.com/v1", "gpt-5.4", ["gpt-5.4"], false, true),
        new("gemini", "Gemini", "https://generativelanguage.googleapis.com/v1beta/openai", "gemini-3.8-flash", ["gemini-3.8-flash", "gemini-3.6-flash"], false, true),
        new("claude", "Claude", "https://api.anthropic.com/v1", "claude-sonnet-4-6", ["claude-sonnet-4-6"], false, true),
        new("deepseek", "DeepSeek", "https://api.deepseek.com", "deepseek-flash", ["deepseek-flash", "deepseek-v4-pro"], false, true),
        new("ollama", "Ollama · modelos locales", "http://127.0.0.1:11434/v1", "", [], true, false),
        new("opencode", "OpenCode · agente local", "http://127.0.0.1:4096", "", [], true, false),
    ];
    public static Provider Get(string id) => Catalog.SingleOrDefault(provider => provider.Id == id)
        ?? throw new ArgumentException("Seleccioná un proveedor de la lista.");
    public static string Infer(string id, string baseUrl) => id.Length > 0 ? id :
        Catalog.FirstOrDefault(provider => provider.BaseUrl.Equals(baseUrl.TrimEnd('/'), StringComparison.OrdinalIgnoreCase))?.Id ?? "custom";
    public static bool IsLocal(string id) => id is "ollama" or "opencode";

    public static string NormalizeEndpoint(string provider, string? address)
    {
        var value = string.IsNullOrWhiteSpace(address) ? Get(provider).BaseUrl : address.Trim().TrimEnd('/');
        if (value.Length > 2048 || value.Any(char.IsControl) || !Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
            uri.Scheme is not ("http" or "https") || uri.UserInfo.Length > 0 || uri.Query.Length > 0 || uri.Fragment.Length > 0)
            throw new ArgumentException("Indicá una URL HTTP o HTTPS válida, sin usuario, contraseña, parámetros ni fragmentos.");
        value = uri.GetLeftPart(UriPartial.Path).TrimEnd('/');
        if (provider == "ollama") {
            if (value.EndsWith("/api", StringComparison.OrdinalIgnoreCase)) value = value[..^4];
            else if (value.EndsWith("/v1", StringComparison.OrdinalIgnoreCase)) value = value[..^3];
            value += "/v1";
        }
        return value;
    }

    public static void ValidateCredentials(string address, string secret)
    {
        if (secret.Length > 8192 || secret.Any(char.IsControl)) throw new ArgumentException("La credencial no es válida.");
        var uri = new Uri(address);
        if (secret.Length > 0 && uri.Scheme == "http" && !uri.IsLoopback)
            throw new ArgumentException("Usá HTTPS para enviar credenciales a un servidor de otro equipo.");
    }
}
