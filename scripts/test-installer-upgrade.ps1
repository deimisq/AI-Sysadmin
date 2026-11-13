[CmdletBinding()]
param([string]$Iscc = 'H:/Proyectos/ai_agent/.preview-tools/inno/ISCC.exe', [switch]$KeepOldRunning,
    [ValidateSet('spanish','english')][string]$Language = 'spanish')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$sandbox = Join-Path $projectRoot ('.preview-tools/installer-upgrade-tests/' + [Guid]::NewGuid().ToString('N'))
$install = Join-Path $sandbox 'installed'
$old = Join-Path $install 'versions/previous-test'
$payload = Join-Path $sandbox 'payload'
$profile = Join-Path $sandbox 'synthetic-user-profile'
New-Item -ItemType Directory -Force -Path $old,$payload | Out-Null
New-Item -ItemType Directory -Path $profile | Out-Null
$profileFile=Join-Path $profile 'connections.synthetic.dat'
Set-Content -LiteralPath $profileFile -Value 'synthetic preserved user data'
$profileHash=(Get-FileHash -LiteralPath $profileFile).Hash
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
    private static string MarkerDirectory { get { return Environment.GetEnvironmentVariable("AI_AGENT_UPGRADE_FIXTURE_ROOT") ?? AppDomain.CurrentDomain.BaseDirectory; } }
    private Timer shutdown;
    protected override void OnLoad(EventArgs e) {
        File.WriteAllText(Path.Combine(MarkerDirectory, "ready.txt"), "ready");
        shutdown = new Timer { Interval=100 };
        shutdown.Tick += delegate { if(File.Exists(Path.Combine(MarkerDirectory,"close.request"))) Close(); };
        shutdown.Start();
        base.OnLoad(e);
    }
    protected override void OnFormClosing(FormClosingEventArgs e) {
        File.WriteAllText(Path.Combine(MarkerDirectory, "closed.txt"), "graceful");
        base.OnFormClosing(e);
    }
    [STAThread] public static void Main() {
        AppDomain.CurrentDomain.ProcessExit += delegate {
            File.WriteAllText(Path.Combine(MarkerDirectory, "closed.txt"), "process-exit");
        };
        Application.Run(new UpgradeFixture { Text="Installer fixture", ShowInTaskbar=false,
            WindowState=FormWindowState.Minimized });
    }
}
'@
$executable = Join-Path $old 'AiSysadmin.exe'
Add-Type -TypeDefinition $source -ReferencedAssemblies 'System.Windows.Forms','System.Drawing' -OutputAssembly $executable -OutputType WindowsApplication
Copy-Item -LiteralPath $executable -Destination (Join-Path $payload 'AiSysadmin.exe')
$pins = Join-Path $sandbox 'synthetic-taskbar'
New-Item -ItemType Directory -Path $pins | Out-Null
$shell = New-Object -ComObject WScript.Shell
$pin = Join-Path $pins 'AI Sysadmin Agent.lnk'
$link = $shell.CreateShortcut($pin); $link.TargetPath = $executable; $link.Save()
$otherPin = Join-Path $pins 'Otra instalacion.lnk'
$otherTarget = Join-Path $sandbox 'other-installation/versions/old/AiSysadmin.exe'
$link = $shell.CreateShortcut($otherPin); $link.TargetPath = $otherTarget; $link.Save()
$otherHash = (Get-FileHash -LiteralPath $otherPin).Hash
& $Iscc '/Q' "/DPublishDir=$payload" "/DOutputDir=$sandbox" '/DAppVersion=upgrade-test' "/DInstallerAppId={{$testId}" "/DInstallerSettingsKey=$settingsKey" "/DPinnedShortcutsDir=$pins" (Join-Path $projectRoot 'apps/windows/installer/Windows.iss')
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el instalador aislado.' }
$previousFixtureRoot=$env:AI_AGENT_UPGRADE_FIXTURE_ROOT
$env:AI_AGENT_UPGRADE_FIXTURE_ROOT=$sandbox
$running = Start-Process -FilePath $executable -WindowStyle Hidden -PassThru
try {
    $ready = [Diagnostics.Stopwatch]::StartNew()
    while (-not (Test-Path -LiteralPath (Join-Path $sandbox 'ready.txt'))) {
        if ($running.HasExited -or $ready.Elapsed.TotalSeconds -gt 10) { throw 'La app ficticia no inició.' }
        Start-Sleep -Milliseconds 100; $running.Refresh()
    }
    $setup = Join-Path $sandbox 'AI-Sysadmin-Agent-upgrade-test-win-x64-setup.exe'
    if($KeepOldRunning) {
        $legacyAttempt=Start-Process -FilePath $setup -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/NOICONS','/NOCLOSEAPPLICATIONS',"/DIR=`"$install`"" -WindowStyle Hidden -Wait -PassThru
        if($legacyAttempt.ExitCode -eq 0 -or -not(Test-Path $executable)) { throw 'La migracion incompatible no se rechazo antes de modificar archivos.' }
        # The new updater prepares while the app remains open; replacement starts
        # only after the separate restart approval and the process has exited.
        $running.Refresh(); if($running.HasExited) { throw 'La preparacion cerro la app antes de aprobar el reinicio.' }
        if(Test-Path (Join-Path $install 'AiSysadmin.exe')) { throw 'La preparacion reemplazo archivos sin aprobar el cierre.' }
        Set-Content -LiteralPath (Join-Path $sandbox 'close.request') -Value 'approved restart fixture'
        if(-not $running.WaitForExit(10000)) { throw 'No termino la app tras aprobar el cierre.' }
    }
    $closeMode = '/CLOSEAPPLICATIONS'
    $process = Start-Process -FilePath $setup -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/NOICONS',"/LANG=$Language",$closeMode,"/DIR=`"$install`"","/LOG=`"$(Join-Path $sandbox 'upgrade.log')`"" -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "Falló la actualización aislada: $($process.ExitCode)." }
    $expectedLanguage = if ($Language -eq 'english') { 'en' } else { 'es' }
    if ((Get-ItemProperty -LiteralPath $settingsRegistry).Language -ne $expectedLanguage) { throw 'El idioma del instalador no se guardó para la app.' }
    if (-not $running.WaitForExit(10000)) { throw 'La versión anterior sigue abierta.' }
    if (-not (Test-Path -LiteralPath (Join-Path $sandbox 'closed.txt'))) { throw 'La versión anterior no recibió un cierre normal.' }
    if (-not (Test-Path -LiteralPath (Join-Path $install 'AiSysadmin.exe'))) { throw 'La versión nueva no se instalo en la ruta fija.' }
    if (Test-Path -LiteralPath (Join-Path $install 'versions')) { throw 'Quedaron carpetas de versiones anteriores.' }
    if ($shell.CreateShortcut($pin).TargetPath -ne (Join-Path $install 'AiSysadmin.exe')) { throw 'El acceso anclado no apunta a la ruta fija.' }
    if ((Get-FileHash -LiteralPath $otherPin).Hash -ne $otherHash) { throw 'Se modifico el acceso de otra instalacion.' }
    $installedIcon = Join-Path $install 'app.ico'
    if (-not (Test-Path -LiteralPath $installedIcon)) { throw 'Falta el icono estable de la instalación.' }
    if ((Get-FileHash -LiteralPath $installedIcon).Hash -ne (Get-FileHash -LiteralPath (Join-Path $projectRoot 'apps/windows/Assets/app.ico')).Hash) { throw 'El icono instalado no corresponde a la identidad de la app.' }
    # A second update replaces the same executable, closes the flat installation
    # gracefully and removes obsolete frontend assets, without new version folders.
    foreach($name in @('ready.txt','closed.txt','close.request')) { $marker=Join-Path $sandbox $name; if(Test-Path $marker){Remove-Item -LiteralPath $marker} }
    $executable=Join-Path $install 'AiSysadmin.exe'
    $running=Start-Process -FilePath $executable -WindowStyle Hidden -PassThru
    $ready.Restart()
    while(-not(Test-Path (Join-Path $sandbox 'ready.txt'))) {
        if($running.HasExited -or $ready.Elapsed.TotalSeconds -gt 10){throw 'La instalacion plana no inicio.'}
        Start-Sleep -Milliseconds 100; $running.Refresh()
    }
    $obsolete=Join-Path $install 'wwwroot/obsolete-fixture.js'
    New-Item -ItemType Directory -Path (Split-Path $obsolete -Parent) -Force | Out-Null
    Set-Content -LiteralPath $obsolete -Value 'synthetic obsolete asset'
    $process=Start-Process -FilePath $setup -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/NOICONS','/CLOSEAPPLICATIONS',"/LANG=$Language","/DIR=`"$install`"" -WindowStyle Hidden -Wait -PassThru
    if($process.ExitCode -ne 0 -or -not $running.WaitForExit(10000)){throw 'Fallo la actualizacion sobre el ejecutable fijo.'}
    if((Test-Path $obsolete) -or (Test-Path (Join-Path $install 'versions'))){throw 'Quedaron archivos de una version anterior.'}
    if(-not(Test-Path (Join-Path $sandbox 'closed.txt'))){throw 'La app de ruta fija no se cerro normalmente.'}
    if((Get-FileHash -LiteralPath $profileFile).Hash -ne $profileHash){throw 'Se modificaron los datos sinteticos separados de la instalacion.'}
    Write-Output 'Actualización verificada: instancia anterior cerrada normalmente y nueva versión instalada.'
} finally {
    $env:AI_AGENT_UPGRADE_FIXTURE_ROOT=$previousFixtureRoot
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
