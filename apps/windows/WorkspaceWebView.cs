using Microsoft.Web.WebView2.Wpf;
using System.Windows.Input;

namespace AiSysadminDesktop;

public sealed class WorkspaceWebView : WebView2CompositionControl
{
    // The composition control's WPF double-click handler interferes with Chromium's
    // normal down/up sequence. Let the browser recognize double-clicks itself.
    // https://github.com/MicrosoftEdge/WebView2Feedback/issues/5099
    protected override void OnMouseDoubleClick(MouseButtonEventArgs e) { }
}
