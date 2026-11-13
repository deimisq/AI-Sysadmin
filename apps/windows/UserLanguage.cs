using System.IO;
using System.Text.Json;
using Microsoft.Win32;

namespace AiSysadminDesktop;

public static class UserLanguage
{
    public const string RegistryPath = @"Software\Sentrait\AiSysadminAgent";
    public static string Current { get; } = Read();
    private static readonly Lazy<Dictionary<string, string>> English = new(Load);

    private static string Read()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RegistryPath);
            return key?.GetValue("Language") as string == "en" ? "en" : "es";
        }
        catch (System.Security.SecurityException) { return "es"; }
        catch (UnauthorizedAccessException) { return "es"; }
    }

    private static Dictionary<string, string> Load()
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var resource in new[] { "AiSysadmin.Language.Common", "AiSysadmin.Language.Desktop", "AiSysadmin.Language.Controls" })
        {
            using var stream = typeof(UserLanguage).Assembly.GetManifestResourceStream(resource)
                ?? throw new InvalidOperationException("Falta el catálogo de idiomas de la aplicación.");
            foreach (var pair in JsonSerializer.Deserialize<Dictionary<string, string>>(stream)!) result[pair.Key] = pair.Value;
        }
        return result;
    }

    public static string Text(string text) => Translate(text, Current);
    public static string Translate(string text, string language) => language == "en" && English.Value.TryGetValue(text, out var translated) ? translated : text;
    public static string BootstrapScript => "window.__AI_AGENT_LANGUAGE__=" + JsonSerializer.Serialize(Current) + ";";
    public static string Prompt(string text) => Current == "en" ? text.Replace("Responde en español", "Respond in English", StringComparison.Ordinal) : text + " Usa español neutro, sin voseo ni regionalismos.";
}
