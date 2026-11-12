using System.Windows;

namespace AiSysadminDesktop;

public partial class MainWindow
{
    private readonly WindowPresentationStore _windowPresentation = new();
    private WindowState _lastVisibleWindowState = WindowState.Normal;

    private void RestoreWindowPresentation()
    {
        if (_windowPresentation.Load() is { } saved)
        {
            var fitted = WindowPresentationStore.Fit(saved, SystemParameters.WorkArea.Width, SystemParameters.WorkArea.Height, MinWidth, MinHeight);
            Width = fitted.Width;
            Height = fitted.Height;
            WindowState = saved.Maximized ? WindowState.Maximized : WindowState.Normal;
        }
        _lastVisibleWindowState = WindowState;
        StateChanged += (_, _) => { if (WindowState != WindowState.Minimized) _lastVisibleWindowState = WindowState; };
    }

    private void SaveWindowPresentation()
    {
        var bounds = WindowState == WindowState.Normal ? new Rect(0, 0, ActualWidth, ActualHeight) : RestoreBounds;
        _windowPresentation.Save(new(1, bounds.Width, bounds.Height, _lastVisibleWindowState == WindowState.Maximized));
    }
}
