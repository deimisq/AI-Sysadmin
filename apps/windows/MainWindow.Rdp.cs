using System.ComponentModel;
using System.Text.Json;
using System.Windows;
using System.Windows.Forms.Integration;
using System.Windows.Threading;

namespace AiSysadminDesktop;

public partial class MainWindow
{
    private sealed record RdpSession(string Id, RdpActiveXHost Client, WindowsFormsHost Surface, int? TemporaryId, string Host, int Port)
    {
        public bool Failed { get; set; }
    }
    private readonly RdpSessionSet<RdpSession> _rdpSessions = new();

    private static string RdpSessionId(JsonElement payload)
    {
        var id = payload.GetProperty("sessionId").GetString() ?? "";
        if (!Guid.TryParse(id, out _)) throw new ArgumentException("Identificador de sesión RDP inválido.");
        return id;
    }

    private void StartRdp(JsonElement payload)
    {
        var id = RdpSessionId(payload);
        if (_rdpSessions.TryGet(id, out _)) return; // Retransmission cannot replace a live session.
        var host = payload.GetProperty("host").GetString() ?? "";
        var user = payload.GetProperty("username").GetString() ?? "";
        var password = payload.GetProperty("password").GetString() ?? "";
        var port = payload.TryGetProperty("port", out var value) ? value.GetInt32() : 3389;
        if (string.IsNullOrWhiteSpace(host) || port is < 1 or > 65535) throw new ArgumentException("Destino RDP inválido.");
        var client = new RdpActiveXHost { Dock = System.Windows.Forms.DockStyle.Fill };
        var surface = new WindowsFormsHost { Visibility = Visibility.Collapsed };
        int? temporaryId = payload.TryGetProperty("temporaryServerId", out var temporary) ? temporary.GetInt32() : null;
        var session = new RdpSession(id, client, surface, temporaryId, host, port);
        _rdpSessions.Add(id, session);
        try {
            if (temporaryId is { } tempId) _localConnections.RegisterTemporaryTarget(tempId, id, host, port, user, "rdp");
            client.ConnectionStateChanged += (state, code) => Dispatcher.BeginInvoke(new Action(() => {
                if (_closing || !_rdpSessions.TryGet(id, out var current) || current != session) return;
                if (state is "error" or "disconnected") {
                    session.Failed = true;
                    HideRdp(id);
                }
                if (state == "ready" && _rdpSessions.ActiveId == id) { client.Refresh(); client.Focus(); }
                MainWebView.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "RDP_STATUS", sessionId = id, state, code }));
            }));
            ((ISupportInitialize)client).BeginInit();
            surface.Child = client;
            RdpContainer.Children.Add(surface);
            ((ISupportInitialize)client).EndInit();
            client.CreateControl();
            client.Visible = true;
            UpdateRdpBounds(payload);
            RdpContainer.UpdateLayout();
            dynamic rdp = client.Client;
            rdp.Server = host;
            rdp.UserName = user;
            rdp.AdvancedSettings9.ClearTextPassword = password;
            rdp.AdvancedSettings9.RDPPort = port;
            rdp.AdvancedSettings9.SmartSizing = true;
            rdp.AdvancedSettings9.EnableCredSspSupport = true;
            rdp.AdvancedSettings9.DisplayConnectionBar = false;
            rdp.DesktopWidth = Math.Max(200, (int)RdpContainer.ActualWidth);
            rdp.DesktopHeight = Math.Max(200, (int)RdpContainer.ActualHeight);
            rdp.Connect();
        }
        catch { try { CloseRdp(id); } catch { /* Preserve the original connection error. */ } throw; }
    }

    private void HideRdp(string id)
    {
        if (_rdpSessions.TryGet(id, out var session)) session!.Surface.Visibility = Visibility.Collapsed;
        _rdpSessions.Hide(id);
        if (_rdpSessions.ActiveId == null) RdpContainer.Visibility = Visibility.Collapsed;
    }

    private void UpdateRdpBounds(JsonElement payload)
    {
        var id = RdpSessionId(payload);
        if (!_rdpSessions.TryGet(id, out var session) || session!.Failed) return;
        double Number(string key, double fallback) => payload.TryGetProperty(key, out var value) && value.TryGetDouble(out var number) && double.IsFinite(number) ? Math.Max(0, number) : fallback;
        if ((payload.TryGetProperty("visible", out var visible) && !visible.GetBoolean()) || Number("width", 0) < 50 || Number("height", 0) < 50) { HideRdp(id); return; }
        if (_rdpSessions.ActiveId is { } previous && previous != id && _rdpSessions.TryGet(previous, out var old)) old!.Surface.Visibility = Visibility.Collapsed;
        _rdpSessions.Activate(id);
        var dpi = System.Windows.Media.VisualTreeHelper.GetDpi(this);
        RdpContainer.Margin = new Thickness(Number("x", 0) / dpi.DpiScaleX, Number("y", 0) / dpi.DpiScaleY, 0, 0);
        RdpContainer.Width = Number("width", 800) / dpi.DpiScaleX;
        RdpContainer.Height = Number("height", 600) / dpi.DpiScaleY;
        RdpContainer.Visibility = Visibility.Visible;
        session.Surface.Visibility = Visibility.Visible;
        RdpContainer.UpdateLayout();
        session.Client.BringToFront();
        session.Client.Invalidate();
    }

    private void CloseRdp(string id)
    {
        var session = _rdpSessions.Remove(id);
        if (session == null) return;
        if (session.TemporaryId is { } temporary) _localConnections.CloseTemporaryTarget(temporary, id);
        try { if (session.Client.Client.Connected != 0) session.Client.Client.Disconnect(); }
        finally {
            try { session.Client.Dispose(); }
            finally {
                session.Surface.Child = null;
                RdpContainer.Children.Remove(session.Surface);
                session.Surface.Dispose();
                if (_rdpSessions.ActiveId == null) RdpContainer.Visibility = Visibility.Collapsed;
            }
        }
    }

    private void DisconnectAllRdp()
    {
        foreach (var id in _rdpSessions.Ids)
            try { CloseRdp(id); }
            catch (Exception error) { Console.WriteLine("RDP cleanup: " + error.GetType().Name); }
    }

    [System.Runtime.InteropServices.DllImport("user32.dll", SetLastError = true)]
    [return: System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.Bool)]
    private static extern bool PrintWindow(IntPtr window, IntPtr dc, uint flags);

    private object CaptureRdp(JsonElement payload)
    {
        var id = _rdpSessions.ActiveId;
        if (id == null || !_rdpSessions.TryGet(id, out var session) || session == null)
            throw new InvalidOperationException("Activá la sesión RDP de este destino antes de capturar.");
        if (session.Failed ||
            session.Surface.Visibility != Visibility.Visible || WindowState == WindowState.Minimized ||
            session.Host != payload.GetProperty("host").GetString() || session.Port != payload.GetProperty("port").GetInt32())
            throw new InvalidOperationException("Activá la sesión RDP de este destino antes de capturar.");
        if ((int)session.Client.Client.Connected == 0) throw new InvalidOperationException("La sesión RDP no está conectada.");
        var client = session.Client;
        if (client.Width is < 50 or > 4096 || client.Height is < 50 or > 4096 || (long)client.Width * client.Height > 10000000)
            throw new InvalidOperationException("El tamaño del escritorio no permite una captura segura.");
        // Render only the ActiveX window. Never fall back to capturing the local screen.
        using var bitmap = new System.Drawing.Bitmap(client.Width, client.Height);
        using (var graphics = System.Drawing.Graphics.FromImage(bitmap)) {
            var dc = graphics.GetHdc();
            try { if (!PrintWindow(client.Handle, dc, 2)) throw new InvalidOperationException("RDP no pudo renderizar la captura. Podés compartir el error como texto."); }
            finally { graphics.ReleaseHdc(dc); }
        }
        var scale = Math.Min(1.0, 1920.0 / Math.Max(bitmap.Width, bitmap.Height));
        using var resized = new System.Drawing.Bitmap(bitmap, Math.Max(1,(int)(bitmap.Width * scale)), Math.Max(1,(int)(bitmap.Height * scale)));
        using var memory = new System.IO.MemoryStream();
        resized.Save(memory, System.Drawing.Imaging.ImageFormat.Png);
        if (memory.Length > 4 * 1024 * 1024) throw new InvalidOperationException("La captura supera 4 MiB. Reducí el tamaño del escritorio.");
        return new { image = "data:image/png;base64," + Convert.ToBase64String(memory.ToArray()), captured_at = DateTimeOffset.UtcNow, session_id = id };
    }
}
