using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace AiSysadminDesktop;

public static class AiProviderTransport
{
    public sealed record Message(string role, string content, string? Image = null);
    private static object WireMessage(Message message, bool claude) => new {
        message.role,
        content = message.Image == null ? (object)message.content : claude ? new object[] {
            new { type = "image", source = new { type = "base64", media_type = "image/png", data = message.Image[22..] } },
            new { type = "text", text = message.content }
        } : new object[] {
            new { type = "text", text = message.content },
            new { type = "image_url", image_url = new { url = message.Image } }
        }
    };
    public sealed record Model(string Id, string Name);

    internal static string StructuredContent(string content)
    {
        var text = content.Trim();
        if (!text.StartsWith("```", StringComparison.Ordinal) || !text.EndsWith("```", StringComparison.Ordinal)) return text;
        var newline = text.IndexOf('\n');
        if (newline < 0) return text;
        var language = text[3..newline].Trim();
        return language.Length == 0 || language.Equals("json", StringComparison.OrdinalIgnoreCase) ? text[(newline + 1)..^3].Trim() : text;
    }

    public static async Task<string> CompleteAsync(HttpClient client, LocalConnectionStore.AiInvocation invocation, Message[] messages, CancellationToken token)
    {
        var provider = AiProviders.Infer(invocation.Provider, invocation.BaseUrl);
        if (messages.Any(message => message.Image != null) && provider is "opencode" or "deepseek")
            throw new InvalidOperationException("El envío de capturas no está habilitado para este proveedor. Elegí Gemini, OpenAI, Claude o un modelo de visión de Ollama/servidor compatible.");
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
                messages = messages.Where(message => message.role != "system").Select(message => WireMessage(message, true)).ToArray(),
            });
        } else {
            if (invocation.ApiKey.Length > 0) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", invocation.ApiKey);
            if (provider == "openai") {
                if (invocation.Organization.Length > 0) request.Headers.Add("OpenAI-Organization", invocation.Organization);
                if (invocation.Project.Length > 0) request.Headers.Add("OpenAI-Project", invocation.Project);
            }
            var body = new Dictionary<string, object> { ["model"] = invocation.Model, ["messages"] = messages.Select(message => WireMessage(message, false)).ToArray(), ["stream"] = false };
            body[provider == "openai" ? "max_completion_tokens" : "max_tokens"] = 4096;
            request.Content = Json(body);
        }
        JsonElement response;
        try { response = await SendAsync(client, request, token); }
        catch (InvalidOperationException error) when (messages.Any(message => message.Image != null) && error.Message.StartsWith("HTTP 400:", StringComparison.Ordinal)) {
            throw new InvalidOperationException("El proveedor rechazó la consulta con imagen (HTTP 400). Elegí un modelo con visión compatible o enviá la pregunta sin captura. No se reintentó ni se modificó la clave guardada.");
        }
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

    public static async Task<JsonElement> DiscoverAsync(string provider, string secret = "", HttpMessageHandler? handler = null, string? baseUrl = null, string username = "opencode", string organization = "", string project = "", string workspace = "")
    {
        if (!AiProviders.IsLocal(provider)) return await DiscoverCloudAsync(provider, secret, handler, organization, project, workspace);
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

    private static async Task<JsonElement> DiscoverCloudAsync(string provider, string secret, HttpMessageHandler? handler, string organization, string project, string workspace)
    {
        var preset = AiProviders.Get(provider);
        AiProviders.ValidateCredentials(preset.BaseUrl, secret);
        if (string.IsNullOrWhiteSpace(secret)) throw new ArgumentException("Ingresá la clave API para consultar los modelos disponibles.");
        foreach (var value in new[] { organization, project, workspace })
            if (value.Length > 200 || value.Any(char.IsControl)) throw new ArgumentException("Los datos de la cuenta no son válidos.");
        using var client = new HttpClient(handler ?? new HttpClientHandler { AllowAutoRedirect = false }) { Timeout = TimeSpan.FromSeconds(15) };
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        var models = new Dictionary<string, Model>(StringComparer.Ordinal);
        var cursors = new HashSet<string>(StringComparer.Ordinal);
        var cursor = "";
        try {
            for (var page = 0; page < 100; page++) {
                var address = provider == "gemini" ? "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000" : preset.BaseUrl + "/models";
                if (provider == "claude") address += "?limit=1000";
                if (cursor.Length > 0) address += (provider == "gemini" ? "&pageToken=" : "&after_id=") + Uri.EscapeDataString(cursor);
                using var request = new HttpRequestMessage(HttpMethod.Get, address);
                if (provider == "gemini") request.Headers.Add("x-goog-api-key", secret);
                else if (provider == "claude") {
                    request.Headers.Add("x-api-key", secret);
                    request.Headers.Add("anthropic-version", "2023-06-01");
                    if (workspace.Length > 0) request.Headers.Add("anthropic-workspace-id", workspace);
                } else request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secret);
                if (provider == "openai") {
                    if (organization.Length > 0) request.Headers.Add("OpenAI-Organization", organization);
                    if (project.Length > 0) request.Headers.Add("OpenAI-Project", project);
                }
                var response = await SendAsync(client, request, timeout.Token, 4 * 1024 * 1024);
                var entries = provider == "gemini" && !response.TryGetProperty("models", out _) ? JsonSerializer.SerializeToElement(Array.Empty<object>()) : response.GetProperty(provider == "gemini" ? "models" : "data");
                foreach (var entry in entries.EnumerateArray()) {
                    if (provider == "gemini" && (!entry.TryGetProperty("supportedGenerationMethods", out var methods) || !methods.EnumerateArray().Any(method => method.GetString() == "generateContent"))) continue;
                    if (entry.TryGetProperty("lifecycle", out var lifecycle) && lifecycle.ValueKind == JsonValueKind.String && lifecycle.GetString() == "retired") continue;
                    var id = entry.GetProperty(provider == "gemini" ? "name" : "id").GetString() ?? "";
                    if (provider == "gemini" && id.StartsWith("models/", StringComparison.Ordinal)) id = id[7..];
                    if (id.Length == 0 || id.Length > 200 || id.Any(char.IsControl)) continue;
                    var name = entry.TryGetProperty(provider == "gemini" ? "displayName" : "display_name", out var label) ? label.GetString() : null;
                    models[id] = new Model(id, string.IsNullOrWhiteSpace(name) ? id : name + " · " + id);
                }
                cursor = provider == "gemini" && response.TryGetProperty("nextPageToken", out var next) ? next.GetString() ?? "" :
                    provider == "claude" && response.TryGetProperty("has_more", out var more) && more.ValueKind == JsonValueKind.True ? response.GetProperty("last_id").GetString() ?? "" : "";
                if (cursor.Length == 0) return JsonSerializer.SerializeToElement(new { models = models.Values.OrderBy(model => model.Name).Select(model => new { id = model.Id, name = model.Name }) });
                if (!cursors.Add(cursor)) break;
            }
            throw new InvalidOperationException("El proveedor no permitió completar la lista de modelos. Reintentá la actualización.");
        } catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException) {
            throw new InvalidOperationException("No se pudo consultar los modelos del proveedor. Revisá la conexión y reintentá.");
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
        if (!response.IsSuccessStatusCode) {
            var reason = (int)response.StatusCode switch {
                401 => "El proveedor rechazó la autenticación. Revisá la clave configurada; este error no borra la clave guardada.",
                403 => "El proveedor denegó el acceso. Revisá los permisos del proyecto, la cuenta y el modelo; no se borró la clave guardada.",
                429 => "Se alcanzó una cuota o límite de solicitudes del proveedor. Esperá o revisá la cuota de tu cuenta; no hace falta volver a guardar la clave.",
                500 or 502 or 503 or 504 => "El proveedor está temporalmente indisponible o sobrecargado. Probá de nuevo más tarde o elegí otro modelo. No se borró ni modificó la clave guardada.",
                404 => "El modelo o endpoint no está disponible. Actualizá la lista de modelos en Configuración → IA.",
                _ => "El proveedor rechazó la solicitud. Revisá el modelo y la configuración; no se modificaron las credenciales guardadas."
            };
            throw new InvalidOperationException($"HTTP {(int)response.StatusCode}: {reason}");
        }
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
