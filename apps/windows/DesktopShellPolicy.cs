using System.IO;

namespace AiSysadminDesktop;

public static class DesktopShellPolicy
{
    public const string Origin = "https://appassets.local";
    public static Uri EntryPoint(string assets, string? developmentUrl)
    {
        if (!string.IsNullOrEmpty(developmentUrl))
        {
            if (!Uri.TryCreate(developmentUrl,UriKind.Absolute,out var uri) || !uri.IsLoopback || uri.Scheme != "http" || uri.UserInfo.Length != 0)
                throw new ArgumentException("La interfaz de desarrollo debe usar HTTP local.");
            return uri;
        }
        if (!File.Exists(Path.Combine(assets,"index.html"))) throw new FileNotFoundException("Faltan archivos de la aplicación.");
        // Virtual host mapping does not supply a directory index for the root URL.
        return new Uri(Origin + "/index.html");
    }
    public static bool IsInternal(string value,string origin) => Uri.TryCreate(value,UriKind.Absolute,out var uri)
        && uri.GetLeftPart(UriPartial.Authority) == origin && uri.UserInfo.Length == 0;
}
