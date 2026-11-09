using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text.Json;
using System.Windows;
using Renci.SshNet;

namespace AiSysadminDesktop;

internal static class SshHostTrust
{
    private static readonly object Gate = new();
    internal static void Configure(BaseClient client, string host, int port, Window owner)
    {
        client.HostKeyReceived += (_, e) =>
        {
            var fingerprint = "SHA256:" + Convert.ToBase64String(SHA256.HashData(e.HostKey)).TrimEnd('=');
            var path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AiSysadmin", "known-hosts.json");
            lock (Gate)
            {
                var hosts = File.Exists(path)
                    ? JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(path)) ?? new()
                    : new Dictionary<string, string>();
                var key = $"{host}:{port}";
                if (hosts.TryGetValue(key, out var known))
                {
                    e.CanTrust = known == fingerprint;
                    return;
                }
                e.CanTrust = owner.Dispatcher.Invoke(() => SshTrustDialog.Confirm(owner, key, fingerprint));
                if (e.CanTrust)
                {
                    hosts[key] = fingerprint;
                    Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                    File.WriteAllText(path, JsonSerializer.Serialize(hosts));
                }
            }
        };
    }
}
