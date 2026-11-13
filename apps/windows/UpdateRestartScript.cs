using System.Text;
using System.Text.Json;

namespace AiSysadminDesktop;

public static class UpdateRestartScript
{
    public static string Create(int processId, string installer, string root, string digest, long size, string log, string errorMessage)
    {
        var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new { processId, installer, root, digest, size, log, errorMessage })));
        return $$"""
            $ErrorActionPreference='Stop'
            $plan=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{{encoded}}')) | ConvertFrom-Json
            Wait-Process -Id $plan.processId -ErrorAction SilentlyContinue
            try {
                if ((Get-Item -LiteralPath $plan.installer).Length -ne $plan.size -or (Get-FileHash -LiteralPath $plan.installer -Algorithm SHA256).Hash -ne $plan.digest) { throw 'SHA256/size mismatch' }
                $arguments=@('/SP-','/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/NORESTARTAPPLICATIONS',('/DIR="'+$plan.root+'"'),('/LOG="'+$plan.log+'"'))
                $setup=Start-Process -FilePath $plan.installer -ArgumentList $arguments -WindowStyle Hidden -Wait -PassThru
                if ($setup.ExitCode -ne 0) { throw ('Installer exit: '+$setup.ExitCode) }
                $executable=Join-Path $plan.root 'AiSysadmin.exe'
                if (-not(Test-Path -LiteralPath $executable)) { throw 'Missing installed executable' }
                Start-Process -FilePath $executable -WorkingDirectory $plan.root
                Remove-Item -LiteralPath $plan.installer -ErrorAction SilentlyContinue
            } catch {
                [IO.File]::WriteAllText($plan.log+'.error.txt', $_.Exception.Message)
                Add-Type -AssemblyName System.Windows.Forms
                [System.Windows.Forms.MessageBox]::Show($plan.errorMessage,'AI Sysadmin Agent') | Out-Null
            }
            """;
    }
}
