namespace AiSysadminDesktop;

public sealed class RdpSessionSet<T> where T : class
{
    private readonly Dictionary<string, T> _sessions = new(StringComparer.Ordinal);
    public string? ActiveId { get; private set; }
    public IEnumerable<T> Values => _sessions.Values;
    public bool TryGet(string id, out T? session) => _sessions.TryGetValue(id, out session);
    public void Add(string id, T session) => _sessions.Add(id, session);
    public bool Activate(string id)
    {
        if (!_sessions.ContainsKey(id)) return false;
        ActiveId = id;
        return true;
    }
    public void Hide(string id) { if (ActiveId == id) ActiveId = null; }
    public T? Remove(string id)
    {
        if (!_sessions.Remove(id, out var session)) return null;
        Hide(id);
        return session;
    }
    public string[] Ids => _sessions.Keys.ToArray();
}
