using System;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using AxMSTSCLib; // Namespace del ActiveX RDP
using System.Windows.Forms; // Necesario para el Host

namespace AiSysadminDesktop
{
    public partial class MainWindow : Window
    {
        private AxMsRdpClient9NotSafeForScripting _rdpClient;

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
            _rdpClient = new AxMsRdpClient9NotSafeForScripting();
            
            // Incrustarlo en el Host WPF
            RdpHost.Child = _rdpClient;
        }

        private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                string json = e.TryGetWebMessageAsString();
                // En producción usaríamos System.Text.Json
                // Aquí simulamos un parseo básico
                
                if (json.Contains("START_RDP"))
                {
                    // Extraer params (aquí deberías usar un JSON Parser real)
                    string host = ExtractJsonValue(json, "host");
                    string user = ExtractJsonValue(json, "username");
                    string pass = ExtractJsonValue(json, "password");
                    
                    ConnectRdp(host, user, pass);
                }
                else if (json.Contains("STOP_RDP"))
                {
                    DisconnectRdp();
                }
                else if (json.Contains("UPDATE_BOUNDS"))
                {
                    // React nos dice dónde está el hueco negro
                    // json: { x: 200, y: 50, width: 800, height: 600 }
                    
                    // Aplicar márgenes al Grid contenedor
                    // RdpContainer.Margin = new Thickness(x, y, 0, 0);
                    // RdpContainer.Width = ...
                }
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show("Error processing message: " + ex.Message);
            }
        }

        private void ConnectRdp(string host, string user, string password)
        {
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
        }

        private void DisconnectRdp()
        {
            if (_rdpClient.Connected == 1)
            {
                _rdpClient.Disconnect();
            }
            RdpContainer.Visibility = Visibility.Collapsed; // Ocultar
        }

        private void NativeDisconnect_Click(object sender, RoutedEventArgs e)
        {
            DisconnectRdp();
            // Avisar a React
            MainWebView.CoreWebView2.PostWebMessageAsJson("{\"type\": \"RDP_DISCONNECTED\"}");
        }

        // Helper simple para demo
        private string ExtractJsonValue(string json, string key) {
            // Implementar lógica simple de string o usar Newtonsoft
            return ""; 
        }
    }
}
