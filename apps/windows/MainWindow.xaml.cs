using System;
using System.Windows;
using Microsoft.Web.WebView2.Core;
// using AxMSTSCLib; // Namespace del ActiveX RDP
using System.Text.Json;
using System.Windows.Forms; // Necesario para el Host

namespace AiSysadminDesktop
{
    public partial class MainWindow : Window
    {
        // private AxMsRdpClient9NotSafeForScripting _rdpClient;

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
                string json = e.TryGetWebMessageAsString();
                
                // Parseamos el JSON usando System.Text.Json
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
                                string host = payload.GetProperty("host").GetString() ?? "";
                                string user = payload.GetProperty("username").GetString() ?? "";
                                string pass = payload.GetProperty("password").GetString() ?? "";
                                
                                ConnectRdp(host, user, pass);
                            }
                        }
                        else if (type == "STOP_RDP")
                        {
                            DisconnectRdp();
                        }
                        else if (type == "UPDATE_BOUNDS")
                        {
                            // TODO: Implementar lógica de redimensionamiento
                        }
                        else if (type == "SSH_CONNECT")
                        {
                            // TODO: Implementar conexión SSH usando Renci.SshNet o SSH2
                            MainWebView.CoreWebView2.PostWebMessageAsJson("{\"type\": \"SSH_CONNECTED\", \"payload\": \"session-123\"}");
                        }
                        else if (type == "PTY_CREATE")
                        {
                            // TODO: Implementar creación de PTY
                            MainWebView.CoreWebView2.PostWebMessageAsJson("{\"type\": \"PTY_CREATED\", \"payload\": \"pty-123\"}");
                        }
                        else if (type == "PTY_WRITE")
                        {
                            // TODO: Escribir en el PTY
                        }
                        else if (type == "SFTP_LIST")
                        {
                            // TODO: Listar archivos vía SFTP
                            MainWebView.CoreWebView2.PostWebMessageAsJson("{\"type\": \"SFTP_LIST_RESULT\", \"payload\": []}");
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
