using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Runtime.InteropServices;
using System.Windows.Interop;
using AiSysadminDesktop;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        WindowsIdentity.InitializeProcess();
        var app = new Application { ShutdownMode = ShutdownMode.OnExplicitShutdown };
        app.Startup += async (_, _) => {
            Window? owner = null;
            PreferencesWindow? preferences = null;
            WebView2CompositionControl? ownerView = null;
            var developmentUrl = Environment.GetEnvironmentVariable("AI_AGENT_UI_URL");
            try {
                Environment.SetEnvironmentVariable("AI_AGENT_UI_URL", null);
                ownerView = new WebView2CompositionControl();
                owner = new Window { Content = ownerView, Title = "Prueba aislada de Configuración", Width = 900, Height = 650 };
                owner.SourceInitialized += (_, _) => WindowsIdentity.Apply(owner);
                owner.Show();
                var nativeHandle = new WindowInteropHelper(owner).Handle;
                if (SendMessage(nativeHandle, 0x007F, IntPtr.Zero, IntPtr.Zero) == IntPtr.Zero || SendMessage(nativeHandle, 0x007F, new IntPtr(1), IntPtr.Zero) == IntPtr.Zero)
                    throw new Exception("La ventana no tiene iconos nativos para Windows.");
                if (GetCurrentProcessExplicitAppUserModelID(out var appIdPointer) != 0) throw new Exception("La app no tiene identidad de barra de tareas.");
                try { if (Marshal.PtrToStringUni(appIdPointer) != WindowsIdentity.AppId) throw new Exception("Identidad incorrecta."); }
                finally { Marshal.FreeCoTaskMem(appIdPointer); }
                var profile = Path.Combine(AppContext.BaseDirectory, "smoke-profiles", Guid.NewGuid().ToString("N"));
                var environment = await CoreWebView2Environment.CreateAsync(null, profile);
                await ownerView.EnsureCoreWebView2Async(environment);
                preferences = new PreferencesWindow(owner, environment, false, "ai", Respond, _ => {});
                var elapsed = Stopwatch.StartNew();
                preferences.Show();
                var view = ((Grid)preferences.Content).Children.OfType<WorkspaceWebView>().Single();
                await WaitForSection(preferences, view, "ai");
                var firstOpenMs = elapsed.ElapsedMilliseconds;
                var core = view.CoreWebView2;
                await WaitForModels(core, "cloud/discovered");
                if (await core.ExecuteScriptAsync("Boolean(document.querySelector('[aria-label=\"Identificador del modelo IA\"]'))") == "true") throw new Exception("El modelo no debe introducirse manualmente.");
                // Use a fake value in memory only; never save settings or contact a provider.
                await core.ExecuteScriptAsync("document.querySelector('#preferences-page-ai input[type=password]').value='smoke-only';");
                preferences.Close();
                if (preferences.IsVisible) throw new Exception("La ventana no se ocultó al cerrar.");
                elapsed.Restart();
                preferences.NavigateTo("context"); preferences.Show();
                await WaitForSection(preferences, view, "context");
                var reopenMs = elapsed.ElapsedMilliseconds;
                if (!ReferenceEquals(core, view.CoreWebView2)) throw new Exception("La reapertura recreó el navegador.");
                preferences.NavigateTo("backups"); await WaitForSection(preferences, view, "backups");
                preferences.NavigateTo("ai"); await WaitForSection(preferences, view, "ai");
                var key = await core.ExecuteScriptAsync("document.querySelector('#preferences-page-ai input[type=password]').value");
                if (key != "\"\"") throw new Exception("El formulario conservó la clave al reabrir.");
                foreach (var provider in new[] { "ollama", "opencode", "openai" }) {
                    await core.ExecuteScriptAsync("(() => { const selector = document.querySelector('select[aria-label=\"Proveedor de IA\"]'); selector.value=" + JsonSerializer.Serialize(provider) + "; selector.dispatchEvent(new Event('change',{bubbles:true})); })();");
                    var limit = Stopwatch.StartNew();
                    var selector = provider == "openai" ? "#preferences-page-ai input[type=password]" : "select[aria-label='Modelo local']";
                    while (await core.ExecuteScriptAsync("Boolean(document.querySelector(" + JsonSerializer.Serialize(selector) + "))") != "true") {
                        if (limit.Elapsed > TimeSpan.FromSeconds(5)) throw new Exception("No se mostró la configuración de " + provider);
                        await Task.Delay(50);
                    }
                    if (provider != "openai" && await core.ExecuteScriptAsync("Boolean(document.querySelector('#preferences-page-ai input[type=url]'))") != "true") throw new Exception("El servicio debe permitir configurar su URL.");
                    if (provider == "ollama" && await core.ExecuteScriptAsync("document.querySelector('#preferences-page-ai input[type=password]').required") == "true") throw new Exception("Ollama no debe exigir token.");
                    if (provider != "openai") await WaitForModels(core, "ollama/installed");
                }
                Console.WriteLine(JsonSerializer.Serialize(new { success = true, nativeTaskbarIcons = true, appUserModelId = WindowsIdentity.AppId, firstOpenMs, reopenMs, sections = new[] { "ai", "context", "backups" }, reusedBrowser = true, clearedKey = true, source = core.Source }));
            } catch (Exception ex) {
                Console.Error.WriteLine(ex);
                Environment.ExitCode = 1;
            } finally {
                preferences?.Destroy(); ownerView?.Dispose(); owner?.Close();
                Environment.SetEnvironmentVariable("AI_AGENT_UI_URL", developmentUrl);
                app.Shutdown(Environment.ExitCode);
            }
        };
        app.Run();
    }

    [DllImport("user32.dll")]
    private static extern IntPtr SendMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetCurrentProcessExplicitAppUserModelID(out IntPtr appId);

    private static Task<JsonElement> Respond(string type, JsonElement payload)
    {
        if (type == "LOCAL_AI_MODELS") return Task.FromResult(JsonSerializer.SerializeToElement(new { models = new[] { new { id = AiProviders.IsLocal(payload.GetProperty("provider").GetString()!) ? "ollama/installed" : "cloud/discovered", name = "Modelo descubierto de prueba" } } }));
        if (type == "LOCAL_REQUEST" && payload.GetProperty("endpoint").GetString() == "/ai/providers")
            return Task.FromResult(JsonSerializer.SerializeToElement(AiProviders.Catalog, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower }));
        object result = type == "LOCAL_CONTEXT_LIST" ? Array.Empty<object>() :
            payload.GetProperty("endpoint").GetString() == "/ai/settings" ?
                new { provider = "openai", base_url = "https://api.openai.com/v1", model = "cloud/discovered", has_api_key = true, consent_accepted = false } :
                new { max_characters = 8000 };
        return Task.FromResult(JsonSerializer.SerializeToElement(result));
    }

    private static async Task WaitForModels(CoreWebView2 core, string model)
    {
        var timer = Stopwatch.StartNew();
        while (await core.ExecuteScriptAsync("Array.from(document.querySelectorAll('#preferences-page-ai select option')).some(option => option.value === " + JsonSerializer.Serialize(model) + ")") != "true") {
            if (timer.Elapsed > TimeSpan.FromSeconds(5)) throw new Exception("No se cargó el catálogo del proveedor.");
            await Task.Delay(50);
        }
    }

    private static async Task WaitForSection(PreferencesWindow window, WorkspaceWebView view, string section)
    {
        var timeout = Stopwatch.StartNew();
        while (timeout.Elapsed < TimeSpan.FromSeconds(25)) {
            if (window.HasFailed) throw new Exception(window.InitializationFailure ?? "Falló la ventana de Configuración.");
            if (view.CoreWebView2 != null) {
                var selector = section switch { "ai" => "select[aria-label='Proveedor de IA']", "context" => "select", _ => "input[type=file]" };
                var script = "Boolean(document.querySelector(" + JsonSerializer.Serialize($"#preferences-page-{section}:not([hidden]) {selector}") + "))";
                if (await view.CoreWebView2.ExecuteScriptAsync(script) == "true") return;
            }
            await Task.Delay(50);
        }
        throw new TimeoutException($"La sección {section} no se abrió.");
    }
}
