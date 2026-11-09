using System.IO;
using Renci.SshNet;

namespace AiSysadminDesktop;

public partial class MainWindow
{
    private readonly SftpTransferJob _sftpTransfers = new();

    private SftpTransferJob.Snapshot StartSftpTransfer(string sessionId, string direction, string directory, string name)
    {
        if (direction is not ("upload" or "download")) throw new ArgumentException("Dirección de transferencia inválida.");
        var remote = SftpFileTransfer.Join(directory, direction == "download" ? name : "placeholder");
        if (!_sshClients.TryGetValue(sessionId, out var source) || !source.IsConnected)
            throw new InvalidOperationException("La sesión SSH está cerrada.");
        return _sftpTransfers.Start(sessionId, direction, async (token, progress) => {
            token.ThrowIfCancellationRequested();
            var chosen = await Dispatcher.InvokeAsync(() => {
                if (_closing || token.IsCancellationRequested) return (path: (string?)null, overwrite: false);
                if (direction == "upload")
                {
                    var dialog = new Microsoft.Win32.OpenFileDialog { Title = "Subir archivo a " + directory, CheckFileExists = true, Multiselect = false };
                    return (path: dialog.ShowDialog(this) == true ? dialog.FileName : null, overwrite: false);
                }
                var safeName = new string(name.Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c).ToArray());
                var save = new Microsoft.Win32.SaveFileDialog { Title = "Descargar archivo", FileName = safeName,
                    Filter = "Todos los archivos|*.*", OverwritePrompt = true };
                return save.ShowDialog(this) == true ? (path: save.FileName, overwrite: File.Exists(save.FileName)) : (path: (string?)null, overwrite: false);
            });
            if (chosen.path == null) throw new OperationCanceledException();
            _sftpTransfers.SetFileName(sessionId, direction == "upload" ? Path.GetFileName(chosen.path) : name);
            token.ThrowIfCancellationRequested();
            if (!_sshClients.TryGetValue(sessionId, out var current) || current != source || !source.IsConnected)
                throw new InvalidOperationException("La sesión SSH se cerró antes de transferir.");
            using var sftp = new SftpClient(source.ConnectionInfo);
            sftp.OperationTimeout = TimeSpan.FromSeconds(10);
            SshHostTrust.Configure(sftp, source.ConnectionInfo.Host, source.ConnectionInfo.Port, this);
            sftp.Connect();
            token.ThrowIfCancellationRequested();
            if (direction == "upload") SftpFileTransfer.Upload(sftp, chosen.path, directory, token, progress);
            else SftpFileTransfer.Download(sftp, remote, chosen.path, chosen.overwrite, token, progress);
        });
    }
}
