using System.Text.Json;

namespace AiSysadminDesktop;

public static class PreferencesPolicy
{
    public static bool Allows(string type, JsonElement payload)
    {
        if (type is "LOCAL_CONTEXT_LIST" or "LOCAL_CONTEXT_DELETE" or "LOCAL_BACKUP_EXPORT" or "LOCAL_BACKUP_PREVIEW" or "LOCAL_BACKUP_IMPORT" or "LOCAL_AI_MODELS") return true;
        if (type != "LOCAL_REQUEST") return false;
        var method = payload.GetProperty("method").GetString();
        var endpoint = payload.GetProperty("endpoint").GetString();
        return endpoint switch {
            "/ai/providers" => method == "GET",
            "/ai/settings" => method is "GET" or "PUT" or "DELETE",
            "/workspace/context-policy" => method is "GET" or "PUT",
            _ => false
        };
    }
}
