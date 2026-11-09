namespace AiSysadminDesktop;

// One bounded in-memory job per application instance. No file contents enter the UI bridge.
public sealed class SftpTransferJob
{
    public sealed record Snapshot(string id, string sessionId, string direction, string status, long bytes, long total, string? error, string? fileName);
    private readonly object _gate = new();
    private Snapshot? _state;
    private CancellationTokenSource? _cancellation;

    public Snapshot? Latest() { lock (_gate) return _state; }

    public Snapshot? Get(string sessionId)
    {
        lock (_gate) return _state?.sessionId == sessionId ? _state : null;
    }

    public Snapshot Start(string sessionId, string direction, Func<CancellationToken, Action<long, long>, Task> execute)
    {
        lock (_gate)
        {
            if (_cancellation != null) throw new InvalidOperationException("Ya hay una transferencia en curso en la aplicación.");
            var cancellation = _cancellation = new CancellationTokenSource(TimeSpan.FromMinutes(30));
            var state = _state = new(Guid.NewGuid().ToString(), sessionId, direction, "preparing", 0, 0, null, null);
            _ = Task.Run(async () =>
            {
                string status; string? error = null;
                try
                {
                    await execute(cancellation.Token, (bytes, total) => {
                        lock (_gate) _state = _state! with { bytes = bytes, total = total,
                            status = cancellation.IsCancellationRequested ? "cancelling" : "transferring" };
                    });
                    status = "completed"; // Commit may have succeeded just before cancellation was requested.
                }
                catch (OperationCanceledException) { status = "cancelled"; }
                catch (Exception ex) { status = "failed"; error = ex.Message; }
                lock (_gate)
                {
                    _state = _state! with { status = status, error = error };
                    _cancellation = null;
                    cancellation.Dispose();
                }
            });
            return state;
        }
    }

    public void SetFileName(string sessionId, string fileName)
    {
        lock (_gate) if (_state?.sessionId == sessionId && _cancellation != null) _state = _state with { fileName = fileName };
    }

    public void Cancel(string sessionId, string? id = null)
    {
        lock (_gate)
            if (_state?.sessionId == sessionId && (id == null || id == _state.id) && _cancellation != null)
            {
                _state = _state with { status = "cancelling" };
                _cancellation.Cancel();
            }
    }

    public void CancelAll() { lock (_gate) { if (_state != null) Cancel(_state.sessionId); } }
}
