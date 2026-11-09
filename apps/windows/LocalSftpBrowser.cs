using System;
using System.Linq;
using Renci.SshNet;

namespace AiSysadminDesktop;

public static class LocalSftpBrowser
{
    public sealed record Entry(string name, bool is_dir, long size, long modified);
    public sealed record Listing(string path, Entry[] entries);

    public static Listing List(SftpClient client, string path)
    {
        if (string.IsNullOrWhiteSpace(path) || path.Length > 4096 || path.Contains('\0'))
            throw new ArgumentException("Ruta SFTP inválida.");
        // Remote paths are protocol data, never shell commands or local Windows paths.
        client.ChangeDirectory(path);
        var resolved = client.WorkingDirectory;
        var files = client.ListDirectory(resolved).Where(f => f.Name is not ("." or "..")).Take(10001).ToArray();
        if (files.Length > 10000) throw new InvalidOperationException("El directorio supera las 10000 entradas. Abre una subcarpeta.");
        return new Listing(resolved, files.Select(f => new Entry(f.Name, f.IsDirectory,
            f.Attributes.Size, new DateTimeOffset(DateTime.SpecifyKind(f.LastWriteTimeUtc, DateTimeKind.Utc)).ToUnixTimeSeconds())).ToArray());
    }
}
