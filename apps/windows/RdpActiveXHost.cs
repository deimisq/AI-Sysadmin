using System;
using System.Windows.Forms;
using System.Runtime.InteropServices;

namespace AiSysadminDesktop;

// Microsoft documents this CLSID; installations need not expose a matching ProgID.
public sealed class RdpActiveXHost : AxHost
{
    private static readonly Guid EventsId = new("336d5562-efa8-482e-8cb3-c5c0fc7a7db6");
    private readonly List<(int Id, Delegate Handler)> _eventHandlers = new();
    public event Action<string, int>? ConnectionStateChanged;
    public RdpActiveXHost() : base("8B918B82-7985-4C24-89DF-C33AD2BBFBCD") { }

    protected override void CreateSink()
    {
        base.CreateSink();
        Subscribe(2, new Action(() => ConnectionStateChanged?.Invoke("connected", 0)));
        Subscribe(3, new Action(() => ConnectionStateChanged?.Invoke("ready", 0)));
        Subscribe(4, new Action<int>(code => ConnectionStateChanged?.Invoke("disconnected", code)));
        Subscribe(10, new Action<int>(code => ConnectionStateChanged?.Invoke("error", code)));
    }

    private void Subscribe(int id, Delegate handler)
    {
        ComEventsHelper.Combine(GetOcx() ?? throw new InvalidOperationException("RDP events require an initialized control."), EventsId, id, handler);
        _eventHandlers.Add((id, handler));
    }

    protected override void DetachSink()
    {
        try {
            var client = GetOcx();
            if (client != null)
                foreach (var item in _eventHandlers)
                    ComEventsHelper.Remove(client, EventsId, item.Id, item.Handler);
        }
        finally { _eventHandlers.Clear(); base.DetachSink(); }
    }

    public dynamic Client => GetOcx() ?? throw new InvalidOperationException("The RDP control is not initialized.");
}
