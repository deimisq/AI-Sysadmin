using System;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using System.Text.Json;
using Renci.SshNet;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System.IO;
using System.Text;
using System.Collections.Concurrent;
using System.ComponentModel;
using System.Net.Http;
using System.Windows.Threading;
using System.Windows.Interop;
using System.Runtime.InteropServices;
using Microsoft.Web.WebView2.Wpf;

namespace AiSysadminDesktop
{
    public partial class MainWindow : Window
    {
        // SSH & PTY Sessions
        private readonly ConcurrentDictionary<string, SshClient> _sshClients = new();
        private readonly ConcurrentDictionary<string, ShellStream> _shellStreams = new();
        private readonly System.Threading.SemaphoreSlim _sftpGate = new(1, 1);
        private string _uiOrigin = "https://appassets.local";
        private volatile bool _closing;
        private readonly HttpClient _apiClient = new() { Timeout = TimeSpan.FromSeconds(30) };
        private readonly LocalConnectionStore _localConnections = new();
        private readonly LocalAiService _localAi;
        private readonly TerminalContextStore _terminalContexts = new();
        private readonly ConcurrentDictionary<string, (int Id, string Fingerprint)> _localSessions = new();
        private readonly LocalTaskAgent _taskAgent;
        private readonly ChatCommandService _chatCommands;
        private readonly InteractiveChatExecutor _interactiveChat = new();
        private readonly DispatcherTimer _startupTimeout = new() { Interval = TimeSpan.FromSeconds(20) };
        private bool _initializing;
        private bool _uiReady;
        private string _startupDiagnostic = "";

        public MainWindow()
        {
            _localAi = new LocalAiService(_localConnections, contextReader: ReadTerminalContextAsync);
            _chatCommands = new ChatCommandService(_localConnections,
                (session, id, fingerprint) => _localSessions.TryGetValue(session, out var target) && target.Id == id && target.Fingerprint == fingerprint && _sshClients.TryGetValue(session, out var client) && client.IsConnected,
                (session, command, token) => {
                    if (!_shellStreams.TryGetValue(session, out var stream)) throw new InvalidOperationException("La terminal todavía no está disponible.");
                    return _interactiveChat.ExecuteAsync(session, command, text => { stream.Write(text); stream.Flush(); }, token);
                });
            _localAi.RegisterCommand = _chatCommands.Register;
            _localAi.BeginUserTurn = _chatCommands.InvalidateProposals;
            _taskAgent = new LocalTaskAgent(_localConnections,
                (session, id, fingerprint) => _localSessions.TryGetValue(session, out var target) && target.Id == id && target.Fingerprint == fingerprint && _sshClients.TryGetValue(session, out var client) && client.IsConnected,
                async (session, command, token) => {
                    if (!_sshClients.TryGetValue(session, out var client)) throw new InvalidOperationException("Sesión cerrada.");
                    _terminalContexts.Append(session, Encoding.UTF8.GetBytes("\n[Agente SSH]\n$ " + command + "\n"));
                    var result = await TaskSshExecutor.ExecuteAsync(client, command, token);
                    _terminalContexts.Append(session, Encoding.UTF8.GetBytes(result.Output + "\n[exit " + result.ExitCode + "]\n"));
                    return result;
                }, ReadTerminalContextAsync);
            InitializeComponent();
            SourceInitialized += (_,_) => { WindowsIdentity.Apply(this); ApplyNativeDarkCaption(); };
            _startupTimeout.Tick += (_,_) => ShowStartupError("UI_START_TIMEOUT");
            InitializeRdpControl();
            
            // Iniciar WebView
            _ = InitializeAsync();
        }

        private Task<TerminalContextStore.Snapshot> ReadTerminalContextAsync(int id, string fingerprint, string? session) => _terminalContexts.ReadAsync(id, fingerprint, session, _localConnections.GetContextLimit());

        async Task InitializeAsync()
        {
            if (_initializing || _closing) return;
            _initializing = true;
            ShowStartupLoading();
            try
            {
            var profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AiSysadmin", "WebView2");
            var environment = await CoreWebView2Environment.CreateAsync(null, profile).WaitAsync(TimeSpan.FromSeconds(15));
            await MainWebView.EnsureCoreWebView2Async(environment).WaitAsync(TimeSpan.FromSeconds(15));
            var core = MainWebView.CoreWebView2;
            await core.AddScriptToExecuteOnDocumentCreatedAsync("window.__AI_AGENT_NATIVE_PREFERENCES__=true;");
            var settings = core.Settings;
            settings.IsBuiltInErrorPageEnabled = false;
            settings.AreDefaultContextMenusEnabled = true;
            core.ContextMenuRequested += (_,args) => {
                for (var index = args.MenuItems.Count - 1; index >= 0; index--)
                    if (args.MenuItems[index].Name is not ("copy" or "cut" or "paste" or "selectAll")) args.MenuItems.RemoveAt(index);
                if (args.MenuItems.Count == 0) args.Handled = true;
            };
            settings.AreDefaultScriptDialogsEnabled = false;
            core.ScriptDialogOpening += (_,args) => {
                if (args.Kind == CoreWebView2ScriptDialogKind.Alert) { System.Windows.MessageBox.Show(this,args.Message,"AI Sysadmin Agent",MessageBoxButton.OK,MessageBoxImage.Information); args.Accept(); }
                else if (args.Kind is CoreWebView2ScriptDialogKind.Confirm or CoreWebView2ScriptDialogKind.Beforeunload)
                { if (System.Windows.MessageBox.Show(this,args.Message,"AI Sysadmin Agent",MessageBoxButton.YesNo,MessageBoxImage.Question) == MessageBoxResult.Yes) args.Accept(); }
            };
            settings.AreBrowserAcceleratorKeysEnabled = false;
            settings.AreDevToolsEnabled = false;
            settings.IsStatusBarEnabled = false;
            settings.IsZoomControlEnabled = false;
            settings.IsSwipeNavigationEnabled = false;
            settings.IsPinchZoomEnabled = false;
            core.PermissionRequested += (_,args) => {
                args.State = args.PermissionKind == CoreWebView2PermissionKind.ClipboardRead
                    && args.IsUserInitiated && DesktopShellPolicy.IsInternal(args.Uri,_uiOrigin)
                    ? CoreWebView2PermissionState.Allow : CoreWebView2PermissionState.Deny;
            };
            core.NewWindowRequested += (_,args) => args.Handled = true;
            core.DownloadStarting += (_,args) => {
                using var deferral = args.GetDeferral();
                args.Handled = true;
                var dialog = new Microsoft.Win32.SaveFileDialog {
                    Title = "Guardar archivo", FileName = Path.GetFileName(args.ResultFilePath),
                    Filter = "Todos los archivos|*.*", OverwritePrompt = true
                };
                if (dialog.ShowDialog(this) == true) args.ResultFilePath = dialog.FileName;
                else args.Cancel = true;
            };
            core.NavigationCompleted += (_,args) => {
                if (_closing || MainWebView.CoreWebView2 != core) return;
                if (!args.IsSuccess) ShowStartupError("UI_LOAD_" + args.WebErrorStatus);
                else if (!_uiReady) _startupTimeout.Start();
            };
            core.ProcessFailed += (_,args) => {
                if (!_closing && MainWebView.CoreWebView2 == core) ShowStartupError("UI_PROCESS_" + args.ProcessFailedKind);
            };
            
            // Suscribirse a mensajes desde React
            MainWebView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
            MainWebView.CoreWebView2.NavigationStarting += (_, e) =>
            {
                if (!DesktopShellPolicy.IsInternal(e.Uri,_uiOrigin))
                    e.Cancel = true;
                else if (!_closing) { _preferencesWindow?.Destroy(); ShowStartupLoading(); _startupTimeout.Start(); }
            };
            // Serve API requests through the local proxy while retaining a relative frontend API URL.
            MainWebView.CoreWebView2.AddWebResourceRequestedFilter("https://appassets.local/api/*", CoreWebView2WebResourceContext.All);
            MainWebView.CoreWebView2.WebResourceRequested += async (_, e) =>
            {
                using var deferral = e.GetDeferral();
                try
                {
                    if (System.Windows.Application.Current is not App app || !app.EnterpriseProxyAvailable)
                        throw new InvalidOperationException("Enterprise proxy unavailable");
                    var uri = new Uri(e.Request.Uri);
                    using var request = new HttpRequestMessage(new HttpMethod(e.Request.Method), "http://localhost:8080" + uri.PathAndQuery);
                    if (e.Request.Headers.Contains("Authorization"))
                        request.Headers.TryAddWithoutValidation("Authorization", e.Request.Headers.GetHeader("Authorization"));
                    if (e.Request.Content != null)
                    {
                        using var body = new MemoryStream();
                        await e.Request.Content.CopyToAsync(body);
                        request.Content = new ByteArrayContent(body.ToArray());
                        if (e.Request.Headers.Contains("Content-Type"))
                            request.Content.Headers.TryAddWithoutValidation("Content-Type", e.Request.Headers.GetHeader("Content-Type"));
                    }
                    using var response = await _apiClient.SendAsync(request);
                    var bytes = await response.Content.ReadAsByteArrayAsync();
                    e.Response = environment.CreateWebResourceResponse(new MemoryStream(bytes), (int)response.StatusCode,
                        response.ReasonPhrase ?? "Response", $"Content-Type: {response.Content.Headers.ContentType}\r\nCache-Control: no-store\r\n");
                }
                catch (Exception)
                {
                    if (!_closing && MainWebView.CoreWebView2 == core)
                        e.Response = environment.CreateWebResourceResponse(new MemoryStream(Encoding.UTF8.GetBytes("{\"detail\":\"Backend unavailable\"}")), 502,
                            "Bad Gateway", "Content-Type: application/json\r\n");
                }
            };
            var assets = Path.Combine(AppContext.BaseDirectory, "wwwroot");
            var devUrl = Environment.GetEnvironmentVariable("AI_AGENT_UI_URL");
            var entry = DesktopShellPolicy.EntryPoint(assets,devUrl);
            if (!string.IsNullOrEmpty(devUrl))
            {
                _uiOrigin = entry.GetLeftPart(UriPartial.Authority);
                MainWebView.Source = entry;
            }
            else
            {
                if (!File.Exists(Path.Combine(assets, "index.html"))) throw new FileNotFoundException("Build frontend-desktop-ui before running the Windows app.");
                MainWebView.CoreWebView2.SetVirtualHostNameToFolderMapping("appassets.local", assets, CoreWebView2HostResourceAccessKind.DenyCors);
                _uiOrigin = DesktopShellPolicy.Origin;
                MainWebView.Source = entry;
            }
            }
            catch (Exception ex) { ShowStartupError("UI_INIT_" + ex.GetType().Name); }
            finally { _initializing = false; }
            
            // Inyectar objeto bridge (opcional, por ahora usamos mensajes)
        }
        private void ShowStartupLoading()
        {
            _uiReady = false;
            MainWebView.Visibility = Visibility.Hidden;
            StartupPanel.Visibility = Visibility.Visible;
            StartupTitle.Text = "Preparando tu espacio de trabajo";
            StartupDescription.Text = "Iniciando las conexiones y herramientas de este equipo…";
            StartupProgress.Visibility = Visibility.Visible;
            StartupActions.Visibility = Visibility.Collapsed;
            StartupCode.Text = "";
        }
        private void ShowStartupError(string code)
        {
            if (_closing) return;
            _startupTimeout.Stop();
            _uiReady = false;
            MainWebView.Visibility = Visibility.Hidden;
            StartupPanel.Visibility = Visibility.Visible;
            StartupTitle.Text = "No pudimos iniciar el espacio de trabajo";
            StartupDescription.Text = "Tus conexiones y credenciales guardadas se conservan. Podés reintentar; si el problema continúa, repará la instalación con el paquete más reciente.";
            StartupProgress.Visibility = Visibility.Collapsed;
            StartupActions.Visibility = Visibility.Visible;
            StartupCode.Text = "Código: " + code;
            _startupDiagnostic = $"AI Sysadmin Agent {typeof(MainWindow).Assembly.GetName().Version}\n{code}\nWindows {Environment.OSVersion.Version}\n.NET {Environment.Version}";
        }
        private async void RetryStartup_Click(object sender,RoutedEventArgs e)
        {
            if (_initializing || _closing) return;
            _startupTimeout.Stop();
            MainWebView.Dispose(); WebSurface.Children.Clear();
            MainWebView = new WorkspaceWebView { Visibility = Visibility.Hidden, DefaultBackgroundColor = System.Drawing.Color.FromArgb(26,27,30), AllowExternalDrop = false };
            WebSurface.Children.Add(MainWebView);
            await InitializeAsync();
        }
        private void CopyStartupDiagnostic_Click(object sender,RoutedEventArgs e)
        {
            try { System.Windows.Clipboard.SetText(_startupDiagnostic); } catch { StartupCode.Text = "No se pudo copiar el diagnóstico. " + StartupCode.Text; }
        }
        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd,int attribute,ref int value,int size);
        private void ApplyNativeDarkCaption()
        {
            var handle = new WindowInteropHelper(this).Handle; int enabled = 1; int caption = 0x001E1B1A; int text = 0x00F0EBE9;
            DwmSetWindowAttribute(handle,20,ref enabled,4);
            DwmSetWindowAttribute(handle,35,ref caption,4);
            DwmSetWindowAttribute(handle,36,ref text,4);
        }

        private void InitializeRdpControl()
        {
            // Crear instancia del ActiveX
            // _rdpClient = new AxMsRdpClient9NotSafeForScripting();
            
            // Incrustarlo en el Host WPF
            // RdpHost.Child = _rdpClient;
        }

        private async void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                // Use WebMessageAsJson because we are sending objects from React
                string json = e.WebMessageAsJson;
                if (new Uri(e.Source).GetLeftPart(UriPartial.Authority) != _uiOrigin) return;
                
                using (JsonDocument doc = JsonDocument.Parse(json))
                {
                    JsonElement root = doc.RootElement;
                    string? requestId = root.TryGetProperty("requestId", out var request) ? request.GetString() : null;
                    
                    if (root.TryGetProperty("type", out JsonElement typeElement))
                    {
                        string type = typeElement.GetString() ?? "";
                        if (type == "PREFERENCES_OPEN")
                        {
                            var enterprise = root.TryGetProperty("payload", out var preferences) && preferences.TryGetProperty("enterprise", out var company) && company.ValueKind == JsonValueKind.True;
                            var section = root.TryGetProperty("payload", out var preferencesPayload) && preferencesPayload.TryGetProperty("section", out var target) ? target.GetString() ?? "general" : "general";
                            OpenPreferences(enterprise, section);
                            MainWebView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, result = true }));
                            return;
                        }
                        if (type == "DESKTOP_UI_READY")
                        {
                            _startupTimeout.Stop(); _uiReady = true;
                            StartupPanel.Visibility = Visibility.Collapsed;
                            MainWebView.Visibility = Visibility.Visible;
                            return;
                        }
                        if (type == "DESKTOP_UI_FAILED") { ShowStartupError("UI_RENDER_ERROR"); return; }

                        if (type is "LOCAL_CONTEXT_LIST" or "LOCAL_CONTEXT_DELETE")
                        {
                            var payload = root.GetProperty("payload").Clone();
                            if (type == "LOCAL_CONTEXT_DELETE")
                            {
                                if (!payload.TryGetProperty("confirmed",out var confirmed) || confirmed.ValueKind != JsonValueKind.True) throw new InvalidOperationException("Confirmá el borrado del registro local.");
                                await Task.Run(() => _terminalContexts.DeleteAsync(payload.GetProperty("id").GetString()!));
                            }
                            var result = await Task.Run(() => _terminalContexts.ListAsync());
                            if (!_closing) MainWebView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, result }));
                            return;
                        }
                        if (type is "LOCAL_BACKUP_EXPORT" or "LOCAL_BACKUP_PREVIEW" or "LOCAL_BACKUP_IMPORT")
                        {
                            var payload = root.GetProperty("payload").Clone();
                            var result = await Task.Run(() => {
                                var password = payload.GetProperty("password").GetString() ?? "";
                                if (type == "LOCAL_BACKUP_EXPORT") return JsonSerializer.SerializeToElement(new { data = _localConnections.ExportBackup(password, payload.TryGetProperty("include_key_files", out var includeKeys) && includeKeys.ValueKind == JsonValueKind.True) });
                                var data = payload.GetProperty("data").GetString() ?? "";
                                return type == "LOCAL_BACKUP_PREVIEW" ? _localConnections.PreviewBackup(data,password) : _localConnections.ImportBackup(data,password,payload.GetProperty("hash").GetString() ?? "",payload.TryGetProperty("confirmed",out var confirm) && confirm.ValueKind == JsonValueKind.True,payload.GetProperty("operation_id").GetString() ?? "");
                            });
                            if (!_closing) MainWebView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, result }));
                            return;
                        }
                        if (type is "LOCAL_CHAT_EXECUTE" or "LOCAL_CHAT_PERMISSION" or "LOCAL_CHAT_REVOKE" or "LOCAL_CHAT_CANCEL")
                        {
                            var payload = root.GetProperty("payload").Clone();
                            object result;
                            if (type == "LOCAL_CHAT_CANCEL") { _chatCommands.Cancel(); result = true; }
                            else if (type == "LOCAL_CHAT_EXECUTE") {
                                if (_taskAgent.Status()?.Status == "running") throw new InvalidOperationException("Esperá o cancelá la tarea activa antes de ejecutar desde el chat.");
                                result = await _chatCommands.ExecuteAsync(payload);
                            }
                            else {
                                var serverId = payload.GetProperty("server_id").GetInt32();
                                var session = payload.GetProperty("session_id").GetString() ?? "";
                                if (type == "LOCAL_CHAT_REVOKE") _chatCommands.Revoke(serverId, session);
                                result = new { scope = _chatCommands.Permission(serverId, session) };
                            }
                            if (!_closing) MainWebView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, result }));
                            return;
                        }
                        if (type is "LOCAL_TASK_START" or "LOCAL_TASK_STATUS" or "LOCAL_TASK_CANCEL")
                        {
                            if (type == "LOCAL_TASK_START" && _chatCommands.IsExecuting) throw new InvalidOperationException("Hay un comando del chat en ejecución.");
                            var payload = root.GetProperty("payload").Clone();
                            var result = await Task.Run(() => type == "LOCAL_TASK_START" ? _taskAgent.Start(payload) : type == "LOCAL_TASK_CANCEL" ? _taskAgent.Cancel(payload.GetProperty("id").GetString()!) : _taskAgent.Status());
                            if (!_closing) MainWebView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, result }));
                            return;
                        }
                        if (type == "LOCAL_AI_DIAGNOSE")
                        {
                            var aiBody = root.GetProperty("payload").Clone();
                            var result = await Task.Run(() => _localAi.DiagnoseAsync(aiBody));
                            if (!_closing) MainWebView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, result }));
                            return;
                        }
                        else if (type == "LOCAL_AI_MODELS")
                        {
                            var result = await DiscoverAiModelsAsync(root.GetProperty("payload"));
                            MainWebView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, result }));
                            return;
                        }
                        else if (type == "LOCAL_REQUEST")
                        {
                            var payload = root.GetProperty("payload");
                            var method = payload.GetProperty("method").GetString() ?? "GET";
                            var endpoint = payload.GetProperty("endpoint").GetString() ?? "";
                            var body = payload.TryGetProperty("body", out var data) ? data.Clone() : default;
                            var result = await Task.Run(() => _localConnections.Handle(method, endpoint, body));
                            var route = endpoint.Trim('/').Split('/');
                            if (method == "DELETE" && route.Length == 3 && route[0] == "servers" && route[2] == "history" && int.TryParse(route[1], out var clearedServer)) _localAi.CancelForServer(clearedServer);
                            if (!_closing) MainWebView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, result }));
                            return;
                        }
                        else if (type == "CAPTURE_RDP")
                        {
                            var result = CaptureRdp(root.GetProperty("payload"));
                            MainWebView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, result }));
                        }
                        else if (type == "START_RDP")
                        {
                            StartRdp(root.GetProperty("payload"));
                        }
                        else if (type == "STOP_RDP")
                        {
                            CloseRdp(RdpSessionId(root.GetProperty("payload")));
                        }
                        else if (type == "RDP_BOUNDS")
                        {
                            UpdateRdpBounds(root.GetProperty("payload"));
                        }
                        else if (type == "SSH_CONNECT")
                        {
                            if (root.TryGetProperty("payload", out JsonElement payload))
                            {
                                string host = payload.TryGetProperty("host", out var h) ? h.GetString() ?? "" : "";
                                int port = payload.TryGetProperty("port", out var p) && p.ValueKind == JsonValueKind.Number ? p.GetInt32() : 22;
                                string user = payload.TryGetProperty("username", out var u) ? u.GetString() ?? "root" : "root";
                                string? pass = payload.TryGetProperty("password", out var pw) ? pw.GetString() : null;
                                string? keyPath = payload.TryGetProperty("privateKeyPath", out var kp) ? kp.GetString() : null;
                                LocalConnectionStore.LocalSshTarget? localTarget = null;
                                int? temporaryServerId = payload.TryGetProperty("temporaryServerId", out var temporaryId) ? temporaryId.GetInt32() : null;
                                if (temporaryServerId is >= 0) throw new ArgumentException("Destino temporal inválido.");
                                if (payload.TryGetProperty("localServerId", out var localId))
                                {
                                    localTarget = await Task.Run(() => _localConnections.GetLocalSshTarget(localId.GetInt32()));
                                    host = localTarget.Host; port = localTarget.Port; user = localTarget.Username;
                                    pass = localTarget.Password; keyPath = localTarget.PrivateKey;
                                }

                                string sessionId = Guid.NewGuid().ToString();
                                Console.WriteLine($"[SSH] Attempting connection to {host}:{port} as {user}");

                                _ = Task.Run(async () => {
                                    SshClient? pendingClient = null;
                                    try {
                                        ConnectionInfo connInfo;
                                        if (!string.IsNullOrEmpty(keyPath)) {
                                            PrivateKeyFile keyFile;
                                            if (keyPath.Trim().StartsWith("-----BEGIN")) {
                                                // It's the key content, not a path
                                                using (var ms = new MemoryStream(Encoding.UTF8.GetBytes(keyPath))) {
                                                    keyFile = new PrivateKeyFile(ms);
                                                    connInfo = new ConnectionInfo(host, port, user, new PrivateKeyAuthenticationMethod(user, keyFile));
                                                }
                                            } else {
                                                // It's a file path
                                                keyFile = new PrivateKeyFile(keyPath);
                                                connInfo = new ConnectionInfo(host, port, user, new PrivateKeyAuthenticationMethod(user, keyFile));
                                            }
                                        } else {
                                            connInfo = new ConnectionInfo(host, port, user, new PasswordAuthenticationMethod(user, pass ?? ""));
                                        }

                                        var client = pendingClient = new SshClient(connInfo);
                                        client.ConnectionInfo.Timeout = TimeSpan.FromSeconds(20);
                                        SshHostTrust.Configure(client, host, port, this);
                                        client.Connect();
                                        if (_closing) throw new OperationCanceledException("The application is closing");
                                        _sshClients[sessionId] = client;
                                        if (localTarget != null) { _localSessions[sessionId] = (localTarget.ServerId, localTarget.Fingerprint); _terminalContexts.Register(sessionId, localTarget.ServerId, localTarget.Fingerprint); }
                                        else if (temporaryServerId is { } temporary) {
                                            var fingerprint = _localConnections.RegisterTemporaryTarget(temporary, sessionId, host, port, user);
                                            _localSessions[sessionId] = (temporary, fingerprint);
                                            _terminalContexts.Register(sessionId, temporary, fingerprint);
                                        }
                                        pendingClient = null;

                                        await Dispatcher.InvokeAsync(() => {
                                            var responseObj = JsonSerializer.Serialize(new { type = "SSH_CONNECTED", requestId, result = sessionId, sessionId });
                                            MainWebView.CoreWebView2.PostWebMessageAsJson(responseObj);
                                        });
                                    } catch (Exception ex) {
                                        pendingClient?.Dispose();
                                        _sshClients.TryRemove(sessionId, out _);
                                        _localSessions.TryRemove(sessionId, out _);
                                        if (temporaryServerId is { } temporary) _localConnections.CloseTemporaryTarget(temporary, sessionId);
                                        Console.WriteLine($"[SSH] Error: {ex.Message}");
                                        await Dispatcher.InvokeAsync(() => {
                                            var errorObj = JsonSerializer.Serialize(new { type = "SSH_ERROR", requestId, error = ex.Message, message = ex.Message });
                                            MainWebView.CoreWebView2.PostWebMessageAsJson(errorObj);
                                        });
                                    }
                                });
                            }
                        }
                        else if (type == "SFTP_TRANSFER_LATEST")
                        {
                            MainWebView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, result = _sftpTransfers.Latest() }));
                        }
                        else if (type is "SFTP_TRANSFER_START" or "SFTP_TRANSFER_STATUS" or "SFTP_TRANSFER_CANCEL")
                        {
                            var payload = root.GetProperty("payload");
                            var session = payload.GetProperty("sessionId").GetString() ?? "";
                            object? result;
                            if (type == "SFTP_TRANSFER_START")
                                result = StartSftpTransfer(session, payload.GetProperty("direction").GetString() ?? "",
                                    payload.GetProperty("path").GetString() ?? "", payload.TryGetProperty("name", out var name) ? name.GetString() ?? "" : "");
                            else
                            {
                                if (type == "SFTP_TRANSFER_CANCEL") _sftpTransfers.Cancel(session, payload.GetProperty("id").GetString() ?? "");
                                result = _sftpTransfers.Get(session);
                            }
                            MainWebView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, result }));
                        }
                        else if (type == "SFTP_LIST_FILES")
                        {
                            var payload = root.GetProperty("payload");
                            var sessionId = payload.GetProperty("sessionId").GetString() ?? "";
                            var path = payload.GetProperty("path").GetString() ?? ".";
                            if (!await _sftpGate.WaitAsync(0)) throw new InvalidOperationException("Hay otra lectura SFTP en curso. Vuelve a intentarlo.");
                            try
                            {
                                if (!_sshClients.TryGetValue(sessionId, out var source) || !source.IsConnected)
                                    throw new InvalidOperationException("La sesión SSH está cerrada.");
                                var listing = await Task.Run(() => {
                                    using var sftp = new SftpClient(source.ConnectionInfo);
                                    sftp.OperationTimeout = TimeSpan.FromSeconds(10);
                                    SshHostTrust.Configure(sftp, source.ConnectionInfo.Host, source.ConnectionInfo.Port, this);
                                    sftp.Connect();
                                    return LocalSftpBrowser.List(sftp, path);
                                });
                                if (!_sshClients.TryGetValue(sessionId, out var current) || current != source || !source.IsConnected)
                                    throw new InvalidOperationException("La sesión SSH se cerró durante la lectura.");
                                MainWebView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, result = listing }));
                            }
                            finally { _sftpGate.Release(); }
                        }
                        else if (type == "PTY_CREATE")
                        {
                            if (root.TryGetProperty("payload", out JsonElement payload))
                            {
                                string sessionId = payload.GetProperty("sessionId").GetString() ?? "";
                                int rows = payload.GetProperty("rows").GetInt32();
                                int cols = payload.GetProperty("cols").GetInt32();

                                if (_sshClients.TryGetValue(sessionId, out var client)) {
                                    var stream = await Task.Run(() => client.CreateShellStream("xterm-256color", (uint)cols, (uint)rows, (uint)cols, (uint)rows, 1024));
                                    if (!_sshClients.ContainsKey(sessionId)) { stream.Dispose(); throw new InvalidOperationException("Session closed"); }
                                    if (_shellStreams.TryRemove(sessionId, out var previous)) previous.Dispose();
                                    _shellStreams[sessionId] = stream;

                                    // Background thread to read from SSH and send to React
                                    _ = Task.Run(async () => {
                                        byte[] buffer = new byte[8192];
                                        try {
                                            Console.WriteLine($"[PTY] Reading loop started for: {sessionId}");
                                            while (client.IsConnected && _shellStreams.ContainsKey(sessionId)) {
                                                // Using Read instead of ReadAsync because ShellStream can be tricky with async
                                                // but we are in a background task so it's fine.
                                                int read = stream.Read(buffer, 0, buffer.Length);
                                                if (read > 0) {
                                                    var dataArray = buffer.Take(read).ToArray();
                                                    _interactiveChat.Observe(sessionId, dataArray);
                                                    _terminalContexts.Append(sessionId, dataArray);
                                                    var jsonMsg = JsonSerializer.Serialize(new {
                                                        type = "PTY_DATA",
                                                        ptyId = sessionId,
                                                        payload = dataArray
                                                    });
                                                    await Dispatcher.InvokeAsync(() => {
                                                        MainWebView.CoreWebView2.PostWebMessageAsJson(jsonMsg);
                                                    });
                                                } else {
                                                    await Task.Delay(10);
                                                }
                                            }
                                        } catch (Exception ex) {
                                            Console.WriteLine("[PTY] Read Error: " + ex.Message);
                                        }
                                        _interactiveChat.Close(sessionId);
                                        Console.WriteLine($"[PTY] Reading loop ended for: {sessionId}");
                                    });

                                    var successMsg = JsonSerializer.Serialize(new { type = "PTY_CREATED", requestId, result = sessionId, ptyId = sessionId });
                                    MainWebView.CoreWebView2.PostWebMessageAsJson(successMsg);
                                } else {
                                    Console.WriteLine($"[PTY] Error: SSH Client not found for sessionId: {sessionId}");
                                    var errorObj = JsonSerializer.Serialize(new { type = "PTY_ERROR", requestId, error = "SSH Client not found" });
                                    MainWebView.CoreWebView2.PostWebMessageAsJson(errorObj);
                                }
                            }
                        }
                        else if (type == "PTY_RESIZE")
                        {
                            if (root.TryGetProperty("payload", out JsonElement payload))
                            {
                                string ptyId = payload.TryGetProperty("ptyId", out var p) ? p.GetString() ?? "" : "";
                                int rows = payload.TryGetProperty("rows", out var r) ? r.GetInt32() : 24;
                                int cols = payload.TryGetProperty("cols", out var c) ? c.GetInt32() : 80;

                                if (_shellStreams.TryGetValue(ptyId, out var stream)) {
                                    Console.WriteLine($"[PTY] Resizing {ptyId} to {cols}x{rows}");
                                    // ShellStream resize is tricky, some versions use specific methods
                                    // For Renci.SshNet:
                                    stream.ChangeWindowSize((uint)cols, (uint)rows, (uint)cols, (uint)rows);
                                }
                            }
                        }
                        else if (type == "PTY_WRITE")
                        {
                            if (root.TryGetProperty("payload", out JsonElement payload))
                            {
                                string ptyId = payload.GetProperty("ptyId").GetString() ?? "";
                                if (payload.TryGetProperty("data", out JsonElement dataElement) && dataElement.ValueKind == JsonValueKind.Array) {
                                    byte[] data = dataElement.EnumerateArray().Select(x => x.GetByte()).ToArray();
                                    if (data.Contains((byte)3)) _interactiveChat.MarkInterrupted(ptyId);
                                    if (_shellStreams.TryGetValue(ptyId, out var stream)) {
                                        stream.Write(data, 0, data.Length);
                                        stream.Flush();
                                    }
                                }
                            }
                        }
                        else if (type == "PTY_CLOSE")
                        {
                            if (root.TryGetProperty("payload", out JsonElement payload))
                            {
                                string ptyId = payload.TryGetProperty("ptyId", out var p) ? p.GetString() ?? "" : "";
                                if (!string.IsNullOrEmpty(ptyId)) {
                                    Console.WriteLine($"[PTY] Closing stream for: {ptyId}");
                                    _interactiveChat.Close(ptyId);
                                    if (_shellStreams.TryRemove(ptyId, out var stream)) stream.Dispose();
                                }
                            }
                        }
                        else if (type == "SSH_DISCONNECT")
                        {
                            if (root.TryGetProperty("payload", out JsonElement payload))
                            {
                                string sessionId = payload.TryGetProperty("sessionId", out var p) ? p.GetString() ?? "" : "";
                                if (!string.IsNullOrEmpty(sessionId)) {
                                    Console.WriteLine($"[SSH] Disconnecting session: {sessionId}");
                                    _interactiveChat.Close(sessionId);
                                    _sftpTransfers.Cancel(sessionId);
                                    if (_shellStreams.TryRemove(sessionId, out var stream)) stream.Dispose();
                                    if (_sshClients.TryRemove(sessionId, out var client)) {
                                        _terminalContexts.Close(sessionId);
                                        if (_localSessions.TryRemove(sessionId, out var target) && target.Id < 0) _localConnections.CloseTemporaryTarget(target.Id, sessionId);
                                        client.Disconnect();
                                        client.Dispose();
                                    }
                                }
                            }
                        }
                        else if (type == "GREET")
                        {
                            string name = "User";
                            if (root.TryGetProperty("payload", out JsonElement p) && p.TryGetProperty("name", out JsonElement n))
                                name = n.GetString() ?? "User";
                            
                            MainWebView.CoreWebView2.PostWebMessageAsJson($"{{\"type\": \"GREET_RESPONSE\", \"payload\": \"Hello {name} from .NET!\"}}");
                        }
                        else
                        {
                            throw new NotSupportedException($"Unsupported native command: {type}");
                        }
                        if (type != "SSH_CONNECT" && type != "PTY_CREATE" && type != "SFTP_LIST_FILES" && !type.StartsWith("SFTP_TRANSFER_", StringComparison.Ordinal))
                            MainWebView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, result = true }));
                    }
                }
            }
            catch (Exception ex)
            {
                if (_closing) return;
                using var failed = JsonDocument.Parse(e.WebMessageAsJson);
                var requestId = failed.RootElement.TryGetProperty("requestId", out var id) ? id.GetString() : null;
                MainWebView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { requestId, error = ex.Message }));
            }
        }

        protected override void OnClosed(EventArgs e)
        {
            _closing = true;
            _preferencesWindow?.Destroy();
            _sftpTransfers.CancelAll();
            _startupTimeout.Stop();
            _taskAgent.Dispose();
            foreach (var id in _shellStreams.Keys)
                if (_shellStreams.TryRemove(id, out var stream)) stream.Dispose();
            foreach (var id in _sshClients.Keys)
                if (_sshClients.TryRemove(id, out var client)) client.Dispose();
            DisconnectAllRdp();
            _apiClient.Dispose();
            _localAi.Dispose();
            _chatCommands.Cancel();
            _terminalContexts.Dispose();
            MainWebView.Dispose();
            base.OnClosed(e);
        }


    }
}
