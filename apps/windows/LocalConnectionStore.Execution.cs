namespace AiSysadminDesktop;

public sealed partial class LocalConnectionStore
{
    public bool HasAiExecutionGrant(string fingerprint) => WithInventory(data => data.AiExecutionGrants.Contains(fingerprint));
    public void SetAiExecutionGrant(string fingerprint, bool allowed) => WithInventory(data => {
        if (allowed) data.AiExecutionGrants.Add(fingerprint); else data.AiExecutionGrants.Remove(fingerprint);
        Save(data); return true;
    });
}
