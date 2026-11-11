using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.ComponentModel;
using System.Windows.Threading;
using System.Runtime.InteropServices;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using MessageBox = System.Windows.MessageBox;
using Color = System.Windows.Media.Color;
using Brushes = System.Windows.Media.Brushes;

namespace AiSysadminDesktop;

public sealed class PreferencesWindow : Window
{
    // Match the main window's composition controller when sharing its browser
    // environment. A windowed controller fails with ERROR_INVALID_STATE here.
    private readonly WorkspaceWebView _view = new() { Visibility = Visibility.Hidden, AllowExternalDrop = false,
        DefaultBackgroundColor = System.Drawing.Color.FromArgb(32, 32, 32) };
    private readonly TextBlock _status = new() { Text = UserLanguage.Text("Abriendo Configuración…"), Foreground = Brushes.LightGray,
        HorizontalAlignment = System.Windows.HorizontalAlignment.Center, VerticalAlignment = System.Windows.VerticalAlignment.Center, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(24) };
    private readonly DispatcherTimer _timeout = new() { Interval = TimeSpan.FromSeconds(20) };
    private readonly Func<string, JsonElement, Task<JsonElement>> _request;
    private readonly Action<string> _changed;
    private bool _closed;
    private bool _destroy;
    private bool _ready;
    private bool _initializationStarted;
    private string _section;
    public bool HasFailed { get; private set; }
    public string? InitializationFailure { get; private set; }
    private string _origin = DesktopShellPolicy.Origin;

    public PreferencesWindow(Window owner, CoreWebView2Environment environment, bool enterprise, string section,
        Func<string, JsonElement, Task<JsonElement>> request, Action<string> changed)
    {
        Owner = owner; Title = UserLanguage.Text("Configuración · AI Sysadmin Agent");
        Icon = new BitmapImage(new Uri("pack://application:,,,/AiSysadmin;component/Assets/app.ico"));
        FontFamily = new System.Windows.Media.FontFamily("Segoe UI");
        UseLayoutRounding = true;
        _section = NormalizeSection(section);
        Width = 1020; Height = 740; MinWidth = 820; MinHeight = 540;
        WindowStartupLocation = WindowStartupLocation.CenterOwner; ShowInTaskbar = false;
        Background = new SolidColorBrush(Color.FromRgb(32, 32, 32));
        _request = request; _changed = changed;
        var grid = new Grid(); grid.Children.Add(_view); grid.Children.Add(_status); Content = grid;
        SourceInitialized += (_, _) => { var handle = new WindowInteropHelper(this).Handle; int dark = 1; DwmSetWindowAttribute(handle, 20, ref dark, 4); };
        _timeout.Tick += (_, _) => Fail(UserLanguage.Text("La configuración no respondió. Cierra esta ventana y vuelve a abrirla."));
        Closed += (_, _) => { _closed = true; _timeout.Stop(); _view.Dispose(); };
        Loaded += async (_, _) => { if (!_initializationStarted) { _initializationStarted = true; await InitializeAsync(environment, enterprise); } };
    }

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

    private static string NormalizeSection(string section) => section is "ai" or "backups" or "context" ? section : "general";

    public void NavigateTo(string section)
    {
        _section = NormalizeSection(section);
        if (_ready) Dispatch("preferences-navigate", _section);
    }

    public void Destroy() { _destroy = true; Close(); }

    protected override void OnClosing(CancelEventArgs e)
    {
        if (!_destroy)
        {
            e.Cancel = true;
            if (_ready) Dispatch("preferences-hidden", null);
            Hide();
        }
        base.OnClosing(e);
    }

    private async void Dispatch(string name, string? detail)
    {
        try { if (!_closed) await _view.CoreWebView2.ExecuteScriptAsync("window.dispatchEvent(new CustomEvent(" + JsonSerializer.Serialize(name) + ",{detail:" + JsonSerializer.Serialize(detail) + "}));"); }
        catch { HasFailed = true; }
    }

    private async Task InitializeAsync(CoreWebView2Environment environment, bool enterprise)
    {
        var step = "WEBVIEW_CREATE";
        try
        {
            _timeout.Start();
            await _view.EnsureCoreWebView2Async(environment).WaitAsync(TimeSpan.FromSeconds(15));
            if (_closed) return;
            step = "WEBVIEW_CONFIGURE";
            var core = _view.CoreWebView2;
            await core.AddScriptToExecuteOnDocumentCreatedAsync(UserLanguage.BootstrapScript);
            var entry = DesktopShellPolicy.EntryPoint(Path.Combine(AppContext.BaseDirectory, "wwwroot"), Environment.GetEnvironmentVariable("AI_AGENT_UI_URL"));
            _origin = entry.GetLeftPart(UriPartial.Authority);
            if (_origin == DesktopShellPolicy.Origin)
                core.SetVirtualHostNameToFolderMapping("appassets.local", Path.Combine(AppContext.BaseDirectory, "wwwroot"), CoreWebView2HostResourceAccessKind.DenyCors);
            var settings = core.Settings;
            settings.IsBuiltInErrorPageEnabled = false; settings.AreDevToolsEnabled = false;
            settings.AreBrowserAcceleratorKeysEnabled = false; settings.IsStatusBarEnabled = false;
            settings.IsZoomControlEnabled = false; settings.IsPinchZoomEnabled = false; settings.IsSwipeNavigationEnabled = false;
            settings.AreDefaultScriptDialogsEnabled = false;
            core.ContextMenuRequested += (_, args) => {
                for (var i = args.MenuItems.Count - 1; i >= 0; i--)
                    if (args.MenuItems[i].Name is not ("copy" or "cut" or "paste" or "selectAll")) args.MenuItems.RemoveAt(i);
                if (args.MenuItems.Count == 0) args.Handled = true;
            };
            core.ScriptDialogOpening += (_, args) => {
                if (args.Kind == CoreWebView2ScriptDialogKind.Alert) { MessageBox.Show(this, args.Message, Title); args.Accept(); }
                else if (args.Kind is CoreWebView2ScriptDialogKind.Confirm or CoreWebView2ScriptDialogKind.Beforeunload)
                    if (MessageBox.Show(this, args.Message, Title, MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes) args.Accept();
            };
            core.NewWindowRequested += (_, args) => args.Handled = true;
            core.PermissionRequested += (_, args) => args.State = args.PermissionKind == CoreWebView2PermissionKind.ClipboardRead && args.IsUserInitiated && DesktopShellPolicy.IsInternal(args.Uri, _origin) ? CoreWebView2PermissionState.Allow : CoreWebView2PermissionState.Deny;
            core.NavigationStarting += (_, args) => { if (!DesktopShellPolicy.IsInternal(args.Uri, _origin)) args.Cancel = true; };
            core.NavigationCompleted += (_, args) => { if (!args.IsSuccess) Fail("No se pudo cargar Configuración. Cierra esta ventana y vuelve a abrirla."); };
            core.ProcessFailed += (_, _) => Fail("La interfaz de Configuración se detuvo. Cierra esta ventana y vuelve a abrirla.");
            core.DownloadStarting += (_, args) => {
                using var deferral = args.GetDeferral(); args.Handled = true;
                var dialog = new Microsoft.Win32.SaveFileDialog { Title = UserLanguage.Text("Guardar copia cifrada"), FileName = Path.GetFileName(args.ResultFilePath), OverwritePrompt = true };
                if (dialog.ShowDialog(this) == true) args.ResultFilePath = dialog.FileName; else args.Cancel = true;
            };
            core.WebMessageReceived += OnMessage;
            step = "WEBVIEW_BOOTSTRAP";
            await core.AddScriptToExecuteOnDocumentCreatedAsync("sessionStorage.setItem('workspace-mode','" + (enterprise ? "enterprise" : "local") + "');window.__AI_AGENT_PREFERENCES_WINDOW__=true;");
            if (!_closed) _view.Source = new UriBuilder(new Uri(entry, "preferences.html")) { Query = "section=" + _section, Fragment = "" }.Uri;
        }
        catch (Exception ex)
        {
            InitializationFailure = $"{step}: {ex}";
            System.Diagnostics.Trace.WriteLine($"Preferences initialization: {ex}");
            Fail($"No se pudo abrir Configuración ({step}, 0x{ex.HResult:X8}). Las sesiones de la ventana principal continúan disponibles.");
        }
    }

    private async void OnMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs args)
    {
        string? requestId = null;
        try
        {
            if (_closed || !DesktopShellPolicy.IsInternal(args.Source, _origin)) return;
            using var doc = JsonDocument.Parse(args.WebMessageAsJson);
            var root = doc.RootElement;
            var type = root.GetProperty("type").GetString() ?? "";
            requestId = root.TryGetProperty("requestId", out var id) ? id.GetString() : null;
            if (type == "DESKTOP_UI_READY") { _ready = true; _timeout.Stop(); _status.Visibility = Visibility.Collapsed; _view.Visibility = Visibility.Visible; NavigateTo(_section); return; }
            if (type == "DESKTOP_UI_FAILED") { Fail("No se pudo mostrar Configuración."); return; }
            if (type == "PREFERENCES_CLOSE") { Reply(requestId, JsonSerializer.SerializeToElement(true)); Close(); return; }
            var payload = root.GetProperty("payload").Clone();
            if (!PreferencesPolicy.Allows(type, payload)) throw new InvalidOperationException("Esta operación no está disponible desde Configuración.");
            var result = await _request(type, payload);
            // Notify even if the window closed while an already-authorized write was finishing.
            if (type == "LOCAL_BACKUP_IMPORT") _changed("local-inventory-restored");
            if (type == "LOCAL_REQUEST" && (payload.GetProperty("endpoint").GetString() is "/ai/settings" or "/ai/settings/pause") && payload.GetProperty("method").GetString() != "GET") _changed("local-ai-settings-changed");
            Reply(requestId, result);
        }
        catch (Exception ex)
        {
            if (!_closed) _view.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, error = ex.Message }));
        }
    }

    private void Reply(string? requestId, JsonElement result) { if (!_closed) _view.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, result })); }
    private void Fail(string message) { if (_closed) return; HasFailed = true; _timeout.Stop(); _view.Visibility = Visibility.Hidden; _status.Text = message; _status.Visibility = Visibility.Visible; }
}
