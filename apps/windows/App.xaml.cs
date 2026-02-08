using System.Windows;

namespace AiSysadminDesktop
{
    public partial class App : System.Windows.Application
    {
        private ApiProxyServer _proxyServer;

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            // Start API proxy server
            _proxyServer = new ApiProxyServer();
            _proxyServer.Start(8080);
        }

        protected override void OnExit(ExitEventArgs e)
        {
            _proxyServer?.Stop();
            base.OnExit(e);
        }
    }
}
