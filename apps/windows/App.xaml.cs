using System.Windows;

namespace AiSysadminDesktop
{
    public partial class App : System.Windows.Application
    {
        private ApiProxyServer? _proxyServer;
        public bool EnterpriseProxyAvailable { get; private set; }

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            // Start API proxy server
            try
            {
                _proxyServer = new ApiProxyServer();
                _proxyServer.Start(8080);
                EnterpriseProxyAvailable = true;
            }
            catch (System.Exception ex)
            {
                // Local connections remain usable. Never forward enterprise requests
                // to another process which might own the occupied proxy port.
                EnterpriseProxyAvailable = false;
                System.Diagnostics.Trace.WriteLine($"Enterprise proxy unavailable: {ex.GetType().Name}");
            }
        }

        protected override void OnExit(ExitEventArgs e)
        {
            _proxyServer?.Stop();
            base.OnExit(e);
        }
    }
}
