using System.IO;
using Renci.SshNet;

namespace AiSysadminDesktop;

public static class SftpFileTransfer
{
    public static string Join(string directory, string name)
    {
        if (string.IsNullOrWhiteSpace(directory) || directory.Length > 4096 || directory.Contains('\0') ||
            string.IsNullOrEmpty(name) || name is "." or ".." || name.IndexOfAny(['/', '\\', '\0']) >= 0)
            throw new ArgumentException("Ruta de archivo inválida.");
        return directory.TrimEnd('/') + "/" + name;
    }

    // These synchronous operations run on the transfer worker, never the UI thread.
    public static void Download(SftpClient client, string remote, string destination, bool overwrite,
        CancellationToken token, Action<long, long> progress)
    {
        var attributes = client.GetAttributes(remote);
        if (!attributes.IsRegularFile) throw new IOException("Solo se pueden descargar archivos regulares.");
        var temporary = Path.Combine(Path.GetDirectoryName(destination)!, ".aisys-" + Guid.NewGuid().ToString("N") + ".part");
        try
        {
            using (var output = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            using (var input = client.OpenRead(remote))
            {
                Copy(input, output, attributes.Size, token, progress);
                output.Flush(true);
            }
            token.ThrowIfCancellationRequested();
            File.Move(temporary, destination, overwrite);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }

    public static void Upload(SftpClient client, string source, string directory,
        CancellationToken token, Action<long, long> progress)
    {
        var destination = Join(directory, Path.GetFileName(source));
        if (client.Exists(destination)) throw new IOException("Ya existe un archivo con ese nombre en el servidor. Esta versión no sobrescribe archivos remotos.");
        var temporary = Join(directory, ".aisys-" + Guid.NewGuid().ToString("N") + ".part");
        var created = false;
        try
        {
            using (var input = new FileStream(source, FileMode.Open, FileAccess.Read, FileShare.Read))
            using (var output = client.Open(temporary, FileMode.CreateNew, FileAccess.Write))
            {
                created = true;
                Copy(input, output, input.Length, token, progress);
                output.Flush();
            }
            token.ThrowIfCancellationRequested();
            if (client.Exists(destination)) throw new IOException("El destino apareció durante la transferencia; no se reemplazó.");
            client.RenameFile(temporary, destination); // Standard SFTP rename, no POSIX overwrite extension.
            created = false;
        }
        finally
        {
            if (created)
            {
                // If cleanup fails, explicitly report the retained .part path instead of claiming a clean cancellation.
                try { client.DeleteFile(temporary); }
                catch { throw new IOException("Transferencia incompleta. No se pudo retirar el temporal remoto: " + temporary); }
            }
        }
    }

    private static void Copy(Stream input, Stream output, long expected, CancellationToken token, Action<long, long> progress)
    {
        var buffer = new byte[65536];
        long copied = 0;
        progress(0, expected);
        while (true)
        {
            token.ThrowIfCancellationRequested();
            var count = input.Read(buffer, 0, buffer.Length);
            if (count == 0) break;
            token.ThrowIfCancellationRequested();
            copied = checked(copied + count);
            if (copied > expected) throw new IOException("El archivo cambió de tamaño durante la transferencia.");
            output.Write(buffer, 0, count);
            progress(copied, expected);
        }
        if (copied != expected) throw new IOException("La transferencia quedó incompleta o el archivo cambió de tamaño.");
    }
}
