using System;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using System.Text.Json;
using System.Windows.Forms;
using Renci.SshNet;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System.IO;
using System.Text;

namespace AiSysadminDesktop
{
    public partial class MainWindow : Window
    {
        // SSH & PTY Sessions
        private static readonly Dictionary<string, SshClient> _sshClients = new();
        private static readonly Dictionary<string, ShellStream> _shellStreams = new();

        public MainWindow()
        {
            InitializeComponent();
            InitializeRdpControl();
            
            // Iniciar WebView
            InitializeAsync();
        }

        async void InitializeAsync()
        {
            await MainWebView.EnsureCoreWebView2Async(null);
            
            // Suscribirse a mensajes desde React
            MainWebView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
            
            // Inyectar objeto bridge (opcional, por ahora usamos mensajes)
        }

        private void InitializeRdpControl()
        {
            // Crear instancia del ActiveX
            // _rdpClient = new AxMsRdpClient9NotSafeForScripting();
            
            // Incrustarlo en el Host WPF
            // RdpHost.Child = _rdpClient;
        }

        private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                // Use WebMessageAsJson because we are sending objects from React
                string json = e.WebMessageAsJson;
                Console.WriteLine($"[Bridge] Received: {json}");
                
                using (JsonDocument doc = JsonDocument.Parse(json))
                {
                    JsonElement root = doc.RootElement;
                    
                    if (root.TryGetProperty("type", out JsonElement typeElement))
                    {
                        string type = typeElement.GetString() ?? "";

                        if (type == "START_RDP")
                        {
                            if (root.TryGetProperty("payload", out JsonElement payload))
                            {
                                string host = payload.TryGetProperty("host", out var h) ? h.GetString() ?? "" : "";
                                string user = payload.TryGetProperty("username", out var u) ? u.GetString() ?? "" : "";
                                string pass = payload.TryGetProperty("password", out var p) ? p.GetString() ?? "" : "";
                                
                                ConnectRdp(host, user, pass);
                            }
                        }
                        else if (type == "STOP_RDP")
                        {
                            DisconnectRdp();
                        }
                        else if (type == "SSH_CONNECT")
                        {
                            if (root.TryGetProperty("payload", out JsonElement payload))
                            {
                                string host = payload.TryGetProperty("host", out var h) ? h.GetString() ?? "" : "";
                                int port = payload.TryGetProperty("port", out var p) && p.ValueKind == JsonValueKind.Number ? p.GetInt32() : 22;
                                string user = payload.TryGetProperty("username", out var u) ? u.GetString() ?? "root" : "root";
                                string pass = payload.TryGetProperty("password", out var pw) ? pw.GetString() : null;
                                string keyPath = payload.TryGetProperty("privateKeyPath", out var kp) ? kp.GetString() : null;

                                string sessionId = Guid.NewGuid().ToString();
                                Console.WriteLine($"[SSH] Attempting connection to {host}:{port} as {user}");

                                Task.Run(async () => {
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

                                        var client = new SshClient(connInfo);
                                        client.Connect();
                                        _sshClients[sessionId] = client;

                                        await Dispatcher.InvokeAsync(() => {
                                            var responseObj = JsonSerializer.Serialize(new { type = "SSH_CONNECTED", sessionId = sessionId });
                                            MainWebView.CoreWebView2.PostWebMessageAsJson(responseObj);
                                        });
                                    } catch (Exception ex) {
                                        Console.WriteLine($"[SSH] Error: {ex.Message}");
                                        await Dispatcher.InvokeAsync(() => {
                                            var errorObj = JsonSerializer.Serialize(new { type = "SSH_ERROR", message = ex.Message });
                                            MainWebView.CoreWebView2.PostWebMessageAsJson(errorObj);
                                        });
                                    }
                                });
                            }
                        }
                        else if (type == "PTY_CREATE")
                        {
                            if (root.TryGetProperty("payload", out JsonElement payload))
                            {
                                string sessionId = payload.GetProperty("sessionId").GetString() ?? "";
                                int rows = payload.GetProperty("rows").GetInt32();
                                int cols = payload.GetProperty("cols").GetInt32();

                                if (_sshClients.TryGetValue(sessionId, out var client)) {
                                    var stream = client.CreateShellStream("xterm-256color", (uint)cols, (uint)rows, (uint)cols, (uint)rows, 1024);
                                    _shellStreams[sessionId] = stream;

                                    // Background thread to read from SSH and send to React
                                    Task.Run(async () => {
                                        byte[] buffer = new byte[8192];
                                        try {
                                            Console.WriteLine($"[PTY] Reading loop started for: {sessionId}");
                                            while (client.IsConnected && _shellStreams.ContainsKey(sessionId)) {
                                                // Using Read instead of ReadAsync because ShellStream can be tricky with async
                                                // but we are in a background task so it's fine.
                                                int read = stream.Read(buffer, 0, buffer.Length);
                                                if (read > 0) {
                                                    var dataArray = buffer.Take(read).ToArray();
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
                                        Console.WriteLine($"[PTY] Reading loop ended for: {sessionId}");
                                    });

                                    var successMsg = JsonSerializer.Serialize(new { type = "PTY_CREATED", ptyId = sessionId });
                                    MainWebView.CoreWebView2.PostWebMessageAsJson(successMsg);
                                } else {
                                    Console.WriteLine($"[PTY] Error: SSH Client not found for sessionId: {sessionId}");
                                    var errorObj = JsonSerializer.Serialize(new { type = "PTY_ERROR", message = "SSH Client not found" });
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
                                    stream.Expect(new System.Text.RegularExpressions.Regex(".*")); // Hack to force state check
                                    // ShellStream resize is tricky, some versions use specific methods
                                    // For Renci.SshNet:
                                    stream.TermWidth = (uint)cols;
                                    stream.TermHeight = (uint)rows;
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
                                    if (_shellStreams.Remove(ptyId, out var stream)) stream.Dispose();
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
                                    if (_shellStreams.Remove(sessionId, out var stream)) stream.Dispose();
                                    if (_sshClients.Remove(sessionId, out var client)) {
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
                    }
                }
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show("Error processing message: " + ex.Message);
            }
        }

        private void ConnectRdp(string host, string user, string password)
        {
            System.Windows.MessageBox.Show($"RDP Mock: Connecting to {host} as {user}");
            
            /*
            if (_rdpClient.Connected == 1) _rdpClient.Disconnect();

            _rdpClient.Server = host;
            _rdpClient.UserName = user;
            
            // Config Advanced
            var adv = _rdpClient.AdvancedSettings9;
            adv.ClearTextPassword = password;
            adv.SmartSizing = true;
            adv.EnableCredSspSupport = true;

            // Conectar
            try 
            {
                _rdpClient.Connect();
                RdpContainer.Visibility = Visibility.Visible; // Mostrar capa nativa
            } 
            catch (Exception ex) 
            {
                System.Windows.MessageBox.Show("RDP Connect Error: " + ex.Message);
            }
            */
            RdpContainer.Visibility = Visibility.Visible;
        }

        private void DisconnectRdp()
        {
            /*
            if (_rdpClient.Connected == 1)
            {
                _rdpClient.Disconnect();
            }
            */
            RdpContainer.Visibility = Visibility.Collapsed; // Ocultar
        }

        private void NativeDisconnect_Click(object sender, RoutedEventArgs e)
        {
            DisconnectRdp();
            // Avisar a React
            MainWebView.CoreWebView2.PostWebMessageAsJson("{\"type\": \"RDP_DISCONNECTED\"}");
        }
    }
}
