using System.IO;
using System.Text.Json;

namespace AiSysadminDesktop;

// Preferencias visuales por cuenta Windows, fuera del inventario protegido.
public sealed class WindowPresentationStore
{
    public sealed record Presentation(int Version, double Width, double Height, bool Maximized);
    private readonly string _path;
    public WindowPresentationStore(string? path = null) => _path = path ?? Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AiSysadmin", "window-presentation.v1.json");

    public Presentation? Load()
    {
        try
        {
            if (!File.Exists(_path) || new FileInfo(_path).Length > 4096) return null;
            var value = JsonSerializer.Deserialize<Presentation>(File.ReadAllText(_path));
            return IsValid(value) ? value : null;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException) { return null; }
    }

    public static Presentation Fit(Presentation value, double availableWidth, double availableHeight, double minWidth, double minHeight) => value with {
        Width = Math.Clamp(value.Width, minWidth, Math.Max(minWidth, availableWidth)),
        Height = Math.Clamp(value.Height, minHeight, Math.Max(minHeight, availableHeight))
    };

    private static bool IsValid(Presentation? value) => value is { Version: 1 }
        && double.IsFinite(value.Width) && double.IsFinite(value.Height)
        && value.Width > 0 && value.Height > 0 && value.Width <= 100000 && value.Height <= 100000;

    public bool Save(Presentation value)
    {
        if (!IsValid(value)) return false;
        var temporary = _path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(_path))!);
            File.WriteAllText(temporary, JsonSerializer.Serialize(value));
            File.Move(temporary, _path, overwrite: true);
            return true;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { return false; }
        finally { try { if (File.Exists(temporary)) File.Delete(temporary); } catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { } }
    }
}
