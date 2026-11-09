using System.Runtime.InteropServices;
using System.Windows;
using Cursors = System.Windows.Input.Cursors;
using System.Windows.Interop;
using Controls = System.Windows.Controls;
using Media = System.Windows.Media;

namespace AiSysadminDesktop;

internal sealed class SshTrustDialog : Window
{
    private const int WmSetCursor = 0x0020;
    [DllImport("user32.dll", EntryPoint = "LoadCursorW")]
    private static extern IntPtr LoadCursor(IntPtr instance, IntPtr name);
    [DllImport("user32.dll")]
    private static extern IntPtr SetCursor(IntPtr cursor);
    [DllImport("user32.dll")]
    private static extern int ShowCursor(bool show);
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetCursorInfo(ref CursorInfo info);
    [StructLayout(LayoutKind.Sequential)]
    private struct CursorInfo
    {
        public int Size;
        public int Flags;
        public IntPtr Handle;
        public int X;
        public int Y;
    }

    private static void EnsureVisibleCursor()
    {
        SetCursor(LoadCursor(IntPtr.Zero, new IntPtr(32512)));
        var info = new CursorInfo { Size = Marshal.SizeOf<CursorInfo>() };
        // SetCursor alone cannot make a cursor visible when its display count is negative.
        // Only repair a hidden state, so pointer movement cannot keep increasing the count.
        if (GetCursorInfo(ref info) && info.Flags == 0)
            for (var attempt = 0; attempt < 32; attempt++)
                if (ShowCursor(true) >= 0) break;
    }

    private SshTrustDialog(Window owner, string destination, string fingerprint)
    {
        Owner = owner;
        Title = "Verificar identidad SSH";
        Width = 520;
        SizeToContent = SizeToContent.Height;
        ResizeMode = ResizeMode.NoResize;
        WindowStartupLocation = WindowStartupLocation.CenterOwner;
        ShowInTaskbar = false;
        Cursor = Cursors.Arrow;
        ForceCursor = true;
        Background = new Media.SolidColorBrush(Media.Color.FromRgb(32, 32, 32));
        Foreground = Media.Brushes.WhiteSmoke;
        FontFamily = new Media.FontFamily("Segoe UI");
        FontSize = 13;

        var content = new Controls.StackPanel { Margin = new Thickness(22) };
        content.Children.Add(new Controls.TextBlock {
            Text = "Primera conexión a " + destination, FontSize = 16,
            FontWeight = FontWeights.SemiBold, TextWrapping = TextWrapping.Wrap
        });
        content.Children.Add(new Controls.TextBlock {
            Text = "Verifica esta huella con el administrador antes de confiar en el servidor.",
            Margin = new Thickness(0, 12, 0, 10), TextWrapping = TextWrapping.Wrap
        });
        content.Children.Add(new Controls.TextBox {
            Text = fingerprint, IsReadOnly = true, TextWrapping = TextWrapping.Wrap,
            FontFamily = new Media.FontFamily("Consolas"), Padding = new Thickness(10),
            Background = new Media.SolidColorBrush(Media.Color.FromRgb(24, 24, 24)),
            Foreground = Media.Brushes.WhiteSmoke,
            BorderBrush = Media.Brushes.DimGray, Cursor = Cursors.Arrow
        });
        var buttons = new Controls.StackPanel {
            Orientation = Controls.Orientation.Horizontal,
            HorizontalAlignment = System.Windows.HorizontalAlignment.Right,
            Margin = new Thickness(0, 20, 0, 0)
        };
        var accept = new Controls.Button {
            Content = "Confiar y conectar", Padding = new Thickness(14, 7, 14, 7),
            Margin = new Thickness(0, 0, 8, 0), Cursor = Cursors.Arrow
        };
        var cancel = new Controls.Button {
            Content = "Cancelar", Padding = new Thickness(14, 7, 14, 7),
            IsCancel = true, IsDefault = true, Cursor = Cursors.Arrow
        };
        accept.Click += (_, _) => DialogResult = true;
        cancel.Click += (_, _) => DialogResult = false;
        buttons.Children.Add(accept);
        buttons.Children.Add(cancel);
        content.Children.Add(buttons);
        Content = content;

        // A native modal owns cursor handling instead of inheriting WebView2's cursor.
        SourceInitialized += (_, _) => {
            if (PresentationSource.FromVisual(this) is HwndSource source)
                source.AddHook((IntPtr hwnd, int message, IntPtr wParam, IntPtr lParam, ref bool handled) => {
                    if (message == WmSetCursor) {
                        EnsureVisibleCursor();
                        handled = true;
                        return new IntPtr(1);
                    }
                    return IntPtr.Zero;
                });
        };
        Loaded += (_, _) => { Activate(); cancel.Focus(); EnsureVisibleCursor(); };
        Activated += (_, _) => EnsureVisibleCursor();
    }

    internal static bool Confirm(Window owner, string destination, string fingerprint)
    {
        owner.Dispatcher.VerifyAccess();
        var previous = System.Windows.Input.Mouse.OverrideCursor;
        try {
            System.Windows.Input.Mouse.OverrideCursor = Cursors.Arrow;
            return new SshTrustDialog(owner, destination, fingerprint).ShowDialog() == true;
        }
        finally {
            System.Windows.Input.Mouse.OverrideCursor = previous;
            System.Windows.Input.Mouse.UpdateCursor();
            EnsureVisibleCursor();
        }
    }
}
