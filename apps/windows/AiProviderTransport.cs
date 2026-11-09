using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace AiSysadminDesktop;

public static class AiProviderTransport
{
    public sealed record Message(string role, string content);
    public sealed record Model(string Id, string Name);

    public static async Task<string> CompleteAsync(HttpClient client, LocalConnectionStore.AiInvocation invocation, Message[] messages, CancellationToken token)
    {
        var provider = AiProviders.Infer(invocation.Provider, invocation.BaseUrl);
        if (AiProviders.IsLocal(provider)) {
            AiProviders.NormalizeEndpoint(provider, invocation.BaseUrl);
            AiProviders.ValidateCredentials(invocation.BaseUrl, invocation.ApiKey);
        }
        if (provider == "opencode") return await OpenCodeAsync(client, invocation, messages, token);
        var claude = provider == "claude";
        using var request = new HttpRequestMessage(HttpMethod.Post, invocation.BaseUrl + (claude ? "/messages" : "/chat/completions"));
        if (claude) {
            request.Headers.Add("x-api-key", invocation.ApiKey);
            request.Headers.Add("anthropic-version", "2023-06-01");
            if (invocation.Workspace.Length > 0) request.Headers.Add("anthropic-workspace-id", invocation.Workspace);
            request.Content = Json(new {
                model = invocation.Model, max_tokens = 4096,
                system = string.Join("\n\n", messages.Where(message => message.role == "system").Select(message => message.content)),
                messages = messages.Where(message => message.role != "system").ToArray(),
            });
        } else {
            if (invocation.ApiKey.Length > 0) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", invocation.ApiKey);
            if (provider == "openai") {
                if (invocation.Organization.Length > 0) request.Headers.Add("OpenAI-Organization", invocation.Organization);
                if (invocation.Project.Length > 0) request.Headers.Add("OpenAI-Project", invocation.Project);
            }
            var body = new Dictionary<string, object> { ["model"] = invocation.Model, ["messages"] = messages, ["stream"] = false };
            body[provider == "openai" ? "max_completion_tokens" : "max_tokens"] = 4096;
            request.Content = Json(body);
        }
        var response = await SendAsync(client, request, token);
        var text = claude ? string.Join("\n", response.GetProperty("content").EnumerateArray()
            .Where(part => part.GetProperty("type").GetString() == "text").Select(part => part.GetProperty("text").GetString())) :
            response.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
        return !string.IsNullOrWhiteSpace(text) ? text : throw new InvalidOperationException("El proveedor no devolvió contenido de texto.");
    }

    private static StringContent Json(object body) => new(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

    private static void LocalAuthentication(HttpRequestMessage request, string provider, string secret, string username = "opencode")
    {
        if (provider == "opencode" && secret.Length > 0)
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes(username + ":" + secret)));
        else if (provider == "ollama" && secret.Length > 0) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secret);
    }

    public static async Task<JsonElement> DiscoverAsync(string provider, string secret = "", HttpMessageHandler? handler = null, string? baseUrl = null, string username = "opencode")
    {
        if (!AiProviders.IsLocal(provider)) throw new ArgumentException("La detección es para Ollama u OpenCode.");
        var endpoint = AiProviders.NormalizeEndpoint(provider, baseUrl);
        AiProviders.ValidateCredentials(endpoint, secret);
        if (secret.Length > 8192 || secret.Contains('\r') || secret.Contains('\n')) throw new ArgumentException("La contraseña del servicio no es válida.");
        using var client = new HttpClient(handler ?? new HttpClientHandler { AllowAutoRedirect = false, UseProxy = false }) { Timeout = TimeSpan.FromSeconds(8) };
        var address = provider == "ollama" ? endpoint[..^3] + "/api/tags" : endpoint + "/provider";
        using var request = new HttpRequestMessage(HttpMethod.Get, address);
        LocalAuthentication(request, provider, secret, username);
        try {
            var response = await SendAsync(client, request, CancellationToken.None, 4 * 1024 * 1024);
            var models = new List<Model>();
            if (provider == "ollama") {
                foreach (var model in response.GetProperty("models").EnumerateArray()) {
                    var id = model.GetProperty("name").GetString()!;
                    if ((model.TryGetProperty("remote_host", out var remote) && !string.IsNullOrEmpty(remote.GetString())) || id.Contains("cloud", StringComparison.OrdinalIgnoreCase)) continue;
                    models.Add(new(id, id));
                }
            } else {
                var connected = response.GetProperty("connected").EnumerateArray().Select(value => value.GetString()).ToHashSet();
                foreach (var item in response.GetProperty("all").EnumerateArray()) {
                    var id = item.GetProperty("id").GetString()!;
                    if (!connected.Contains(id)) continue;
                    foreach (var model in item.GetProperty("models").EnumerateObject())
                        models.Add(new(id + "/" + model.Name, item.GetProperty("name").GetString() + " · " + (model.Value.TryGetProperty("name", out var name) ? name.GetString() : model.Name)));
                }
            }
            return JsonSerializer.SerializeToElement(new { models = models.OrderBy(model => model.Name).Select(model => new { id = model.Id, name = model.Name }) });
        } catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException) {
            throw new InvalidOperationException(provider == "ollama" ? "No se pudo conectar con Ollama. Revisá la URL y que el servicio sea accesible desde este equipo." :
                "No se pudo conectar con OpenCode. Revisá la URL del servidor, el usuario y la contraseña si está protegido.");
        }
    }

    private static async Task<string> OpenCodeAsync(HttpClient client, LocalConnectionStore.AiInvocation invocation, Message[] messages, CancellationToken token)
    {
        var model = invocation.Model.Split('/', 2);
        if (model.Length != 2 || model.Any(string.IsNullOrWhiteSpace)) throw new InvalidOperationException("Elegí un modelo configurado en OpenCode.");
        async Task<JsonElement> Send(HttpMethod method, string path, object? body, CancellationToken cancellation) {
            using var request = new HttpRequestMessage(method, invocation.BaseUrl + path);
            LocalAuthentication(request, "opencode", invocation.ApiKey, invocation.Username);
            if (body != null) request.Content = Json(body);
            return await SendAsync(client, request, cancellation);
        }
        var session = await Send(HttpMethod.Post, "/session", new {
            title = "AI Sysadmin · consulta aislada",
            permission = new[] { new { permission = "*", pattern = "*", action = "deny" } },
        }, token);
        var id = Uri.EscapeDataString(session.GetProperty("id").GetString()!);
        var completed = false;
        try {
            if (!session.TryGetProperty("permission", out var permissions) || !permissions.EnumerateArray().Any(rule =>
                rule.GetProperty("permission").GetString() == "*" && rule.GetProperty("pattern").GetString() == "*" && rule.GetProperty("action").GetString() == "deny"))
                throw new InvalidOperationException("Esta versión de OpenCode no confirmó el aislamiento de la sesión. Actualizá OpenCode antes de conectarlo.");
            var response = await Send(HttpMethod.Post, "/session/" + id + "/message", new {
                model = new { providerID = model[0], modelID = model[1] }, agent = "plan",
                system = string.Join("\n\n", messages.Where(message => message.role == "system").Select(message => message.content)),
                parts = new[] { new { type = "text", text = string.Join("\n\n", messages.Where(message => message.role != "system").Select(message => message.content)) } },
            }, token);
            if (response.TryGetProperty("info", out var info) && info.TryGetProperty("error", out var error) && error.ValueKind != JsonValueKind.Null)
                throw new InvalidOperationException("OpenCode no pudo completar la consulta. Revisá el proveedor y el modelo configurados en OpenCode.");
            var text = string.Join("\n", response.GetProperty("parts").EnumerateArray().Where(part => part.GetProperty("type").GetString() == "text").Select(part => part.GetProperty("text").GetString()));
            if (string.IsNullOrWhiteSpace(text)) throw new InvalidOperationException("OpenCode no devolvió una respuesta de texto.");
            completed = true;
            return text;
        } finally {
            using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            try {
                if (!completed) await Send(HttpMethod.Post, "/session/" + id + "/abort", new {}, cleanup.Token);
                await Send(HttpMethod.Delete, "/session/" + id, null, cleanup.Token);
            } catch { /* Only our ephemeral session is eligible for cleanup. Never retry its prompt. */ }
        }
    }

    private static async Task<JsonElement> SendAsync(HttpClient client, HttpRequestMessage request, CancellationToken token, int maximumBytes = 1024 * 1024)
    {
        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, token);
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException($"El servicio de IA devolvió HTTP {(int)response.StatusCode}. Revisá la clave, el modelo y la disponibilidad del proveedor.");
        await using var stream = await response.Content.ReadAsStreamAsync(token);
        using var memory = new MemoryStream();
        var buffer = new byte[8192]; int read;
        while ((read = await stream.ReadAsync(buffer, token)) > 0) {
            if (memory.Length + read > maximumBytes) throw new InvalidOperationException("La respuesta del proveedor supera el límite permitido.");
            memory.Write(buffer, 0, read);
        }
        if (memory.Length == 0) return JsonSerializer.SerializeToElement(true);
        using var document = JsonDocument.Parse(memory.ToArray());
        return document.RootElement.Clone();
    }
}
