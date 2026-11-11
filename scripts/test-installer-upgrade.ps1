[CmdletBinding()]
param([string]$Iscc = 'H:/Proyectos/ai_agent/.preview-tools/inno/ISCC.exe', [switch]$KeepOldRunning,
    [ValidateSet('spanish','english')][string]$Language = 'spanish')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$sandbox = Join-Path $projectRoot ('.preview-tools/installer-upgrade-tests/' + [Guid]::NewGuid().ToString('N'))
$install = Join-Path $sandbox 'installed'
$old = Join-Path $install 'versions/previous-test'
$payload = Join-Path $sandbox 'payload'
New-Item -ItemType Directory -Force -Path $old,$payload | Out-Null
# A separate AppId and /NOICONS isolate this test from the user's installation.
$testId = [Guid]::NewGuid().ToString().ToUpperInvariant()
$registry = "HKCU:/Software/Microsoft/Windows/CurrentVersion/Uninstall/{$testId}_is1"
$settingsKey = "Software\AiSysadminInstallerTests\$testId"
$settingsRegistry = "HKCU:/$settingsKey"
$source = @'
using System;
using System.IO;
using System.Windows.Forms;
public class UpgradeFixture : Form {
    private Timer shutdown;
    protected override void OnLoad(EventArgs e) {
        File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ready.txt"), "ready");
        shutdown = new Timer { Interval=100 };
        shutdown.Tick += delegate { if(File.Exists(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"close.request"))) Close(); };
        shutdown.Start();
        base.OnLoad(e);
    }
    protected override void OnFormClosing(FormClosingEventArgs e) {
        File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "closed.txt"), "graceful");
        base.OnFormClosing(e);
    }
    [STAThread] public static void Main() {
        AppDomain.CurrentDomain.ProcessExit += delegate {
            File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "closed.txt"), "process-exit");
        };
        Application.Run(new UpgradeFixture { Text="Installer fixture", ShowInTaskbar=false,
            WindowState=FormWindowState.Minimized });
    }
}
'@
$executable = Join-Path $old 'AiSysadmin.exe'
Add-Type -TypeDefinition $source -ReferencedAssemblies 'System.Windows.Forms','System.Drawing' -OutputAssembly $executable -OutputType WindowsApplication
Copy-Item -LiteralPath $executable -Destination (Join-Path $payload 'AiSysadmin.exe')
& $Iscc '/Q' "/DPublishDir=$payload" "/DOutputDir=$sandbox" '/DAppVersion=upgrade-test' "/DInstallerAppId={{$testId}" "/DInstallerSettingsKey=$settingsKey" (Join-Path $projectRoot 'apps/windows/installer/Windows.iss')
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el instalador aislado.' }
$running = Start-Process -FilePath $executable -WindowStyle Hidden -PassThru
try {
    $ready = [Diagnostics.Stopwatch]::StartNew()
    while (-not (Test-Path -LiteralPath (Join-Path $old 'ready.txt'))) {
        if ($running.HasExited -or $ready.Elapsed.TotalSeconds -gt 10) { throw 'La app ficticia no inició.' }
        Start-Sleep -Milliseconds 100; $running.Refresh()
    }
    $setup = Join-Path $sandbox 'AI-Sysadmin-Agent-upgrade-test-win-x64-setup.exe'
    $closeMode = if($KeepOldRunning) { '/NOCLOSEAPPLICATIONS' } else { '/CLOSEAPPLICATIONS' }
    $process = Start-Process -FilePath $setup -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/NOICONS',"/LANG=$Language",$closeMode,"/DIR=`"$install`"","/LOG=`"$(Join-Path $sandbox 'upgrade.log')`"" -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "Falló la actualización aislada: $($process.ExitCode)." }
    $expectedLanguage = if ($Language -eq 'english') { 'en' } else { 'es' }
    if ((Get-ItemProperty -LiteralPath $settingsRegistry).Language -ne $expectedLanguage) { throw 'El idioma del instalador no se guardó para la app.' }
    if($KeepOldRunning) {
        $running.Refresh()
        if($running.HasExited) { throw 'La instalación integrada cerró la versión anterior antes de aprobar el reinicio.' }
        Set-Content -LiteralPath (Join-Path $old 'close.request') -Value 'approved restart fixture'
    }
    if (-not $running.WaitForExit(10000)) { throw 'La versión anterior sigue abierta.' }
    if (-not (Test-Path -LiteralPath (Join-Path $old 'closed.txt'))) { throw 'La versión anterior no recibió un cierre normal.' }
    if (-not (Test-Path -LiteralPath (Join-Path $install 'versions/upgrade-test/AiSysadmin.exe'))) { throw 'La versión nueva no se instaló.' }
    $installedIcon = Join-Path $install 'app.ico'
    if (-not (Test-Path -LiteralPath $installedIcon)) { throw 'Falta el icono estable de la instalación.' }
    if ((Get-FileHash -LiteralPath $installedIcon).Hash -ne (Get-FileHash -LiteralPath (Join-Path $projectRoot 'apps/windows/Assets/app.ico')).Hash) { throw 'El icono instalado no corresponde a la identidad de la app.' }
    Write-Output 'Actualización verificada: instancia anterior cerrada normalmente y nueva versión instalada.'
} finally {
    if (-not $running.HasExited) {
        $null = $running.CloseMainWindow(); $null = $running.WaitForExit(3000)
        if (-not $running.HasExited -and $running.Path -eq $executable) { Stop-Process -Id $running.Id -Force }
    }
    if (Test-Path -LiteralPath $registry) {
        $registered = (Get-ItemProperty -LiteralPath $registry).InstallLocation
        if ([IO.Path]::GetFullPath($registered).TrimEnd('\') -ne [IO.Path]::GetFullPath($install).TrimEnd('\')) { throw 'Ruta de desinstalación de prueba inesperada.' }
        Start-Process -FilePath (Join-Path $install 'unins000.exe') -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART' -WindowStyle Hidden -Wait
    }
    if (Test-Path -LiteralPath $settingsRegistry) {
        Remove-ItemProperty -LiteralPath $settingsRegistry -Name Language -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $settingsRegistry
    }
}
