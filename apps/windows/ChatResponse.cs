using System.Text.Json;

namespace AiSysadminDesktop;

public static class ChatResponse
{
    public sealed record Parsed(string Analysis, string? Command);
    public static Parsed Parse(string content)
    {
        var analysis = content;
        string? command = null;
        var explicitNoCommand = false;
        try {
            using var document = JsonDocument.Parse(AiProviderTransport.StructuredContent(content));
            if (document.RootElement.ValueKind == JsonValueKind.Object) {
                if (document.RootElement.TryGetProperty("analysis", out var text) && text.ValueKind == JsonValueKind.String) analysis = text.GetString()!;
                if (document.RootElement.TryGetProperty("proposed_command", out var proposed)) {
                    if (proposed.ValueKind == JsonValueKind.String) command = proposed.GetString();
                    explicitNoCommand = proposed.ValueKind == JsonValueKind.Null || string.IsNullOrWhiteSpace(command);
                }
            }
        } catch (JsonException) { /* Providers may return a Markdown answer despite the requested format. */ }
        if (!explicitNoCommand && string.IsNullOrWhiteSpace(command)) {
            // Recover only a single, explicitly labelled shell block. Never concatenate examples.
            var lines = analysis.Replace("\r\n", "\n").Split('\n');
            var blocks = new List<string>();
            for (var index = 0; index < lines.Length; index++) {
                var fence = lines[index].Trim();
                if (!fence.StartsWith("```", StringComparison.Ordinal)) continue;
                var language = fence[3..].Trim().ToLowerInvariant();
                var start = ++index;
                while (index < lines.Length && lines[index].Trim() != "```") index++;
                if (index == lines.Length) return new(analysis, null);
                if (language is "bash" or "sh" or "shell" or "zsh") blocks.Add(string.Join("\n", lines[start..index]).Trim());
            }
            if (blocks.Count == 1) command = blocks[0];
        }
        if (string.IsNullOrWhiteSpace(command) || command.Length > 4000 || command.Contains('\0')) command = null;
        return new(analysis, command);
    }
}
