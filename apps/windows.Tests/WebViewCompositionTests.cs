using System.Windows;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using Xunit;
using AiSysadminDesktop;

namespace AiSysadmin.Tests;

public class WebViewCompositionTests
{
    [Fact]
    public void CompositionBrowserInitializesAndNavigatesLocalHtml()
    {
        Exception? failure = null;
        var navigated = false;
        var thread = new Thread(() => {
            var dispatcher = Dispatcher.CurrentDispatcher;
            SynchronizationContext.SetSynchronizationContext(new DispatcherSynchronizationContext(dispatcher));
            var browser = new WorkspaceWebView();
            var window = new Window { Title = "AI Sysadmin · Prueba local de composición", Width = 480, Height = 320, ShowInTaskbar = false, Content = browser };
            var timeout = new DispatcherTimer { Interval = TimeSpan.FromSeconds(25) };
            void Finish() {
                timeout.Stop();
                try { browser.Dispose(); window.Close(); }
                catch (Exception error) { failure ??= error; }
                finally { dispatcher.BeginInvokeShutdown(DispatcherPriority.Normal); }
            }
            timeout.Tick += (_, _) => { failure = new TimeoutException("Composition browser did not finish local navigation."); Finish(); };
            dispatcher.BeginInvoke(new Action(async () => {
                try {
                    window.Show();
                    timeout.Start();
                    var profile = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "AiSysadmin-tests", Guid.NewGuid().ToString("N"));
                    var environment = await CoreWebView2Environment.CreateAsync(null, profile);
                    await browser.EnsureCoreWebView2Async(environment);
                    browser.NavigationCompleted += (_, args) => {
                        navigated = args.IsSuccess;
                        if (!args.IsSuccess) failure = new InvalidOperationException("Local navigation failed: " + args.WebErrorStatus);
                        Finish();
                    };
                    browser.NavigateToString("<!doctype html><html><body>Prueba local sin conexiones remotas</body></html>");
                }
                catch (Exception error) { failure = error; Finish(); }
            }));
            Dispatcher.Run();
        });
        thread.IsBackground = true;
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        Assert.True(thread.Join(TimeSpan.FromSeconds(35)), "Composition startup timed out.");
        Assert.Null(failure);
        Assert.True(navigated);
    }
}
