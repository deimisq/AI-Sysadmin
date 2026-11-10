using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Media.Imaging;

namespace AiSysadminDesktop;

public static class WindowsIdentity
{
    // Must match the installed shortcuts and stay unchanged between versions.
    public const string AppId = "Sentrait.AiSysadminAgent.Desktop";
    private static readonly Lazy<System.Drawing.Icon> Small = new(() => LoadIcon(16));
    private static readonly Lazy<System.Drawing.Icon> Large = new(() => LoadIcon(48));
    private static System.Drawing.Icon LoadIcon(int size)
    {
        var resource = System.Windows.Application.GetResourceStream(new Uri("pack://application:,,,/AiSysadmin;component/Assets/app.ico"))
            ?? throw new InvalidOperationException("Falta el icono de la aplicación.");
        using var stream = resource.Stream;
        using var source = new System.Drawing.Icon(stream);
        return new System.Drawing.Icon(source, size, size);
    }
    public static void InitializeProcess() => Marshal.ThrowExceptionForHR(SetCurrentProcessExplicitAppUserModelID(AppId));
    public static void Apply(Window window)
    {
        var bitmap = Imaging.CreateBitmapSourceFromHIcon(Large.Value.Handle, Int32Rect.Empty, BitmapSizeOptions.FromEmptyOptions());
        bitmap.Freeze(); window.Icon = bitmap;
        var handle = new WindowInteropHelper(window).Handle;
        SendMessage(handle, 0x0080, IntPtr.Zero, Small.Value.Handle);
        SendMessage(handle, 0x0080, new IntPtr(1), Large.Value.Handle);
    }
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    private static extern int SetCurrentProcessExplicitAppUserModelID(string appId);
    [DllImport("user32.dll")]
    private static extern IntPtr SendMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);
}
