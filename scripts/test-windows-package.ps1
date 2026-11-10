[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$PackageDirectory,
    [switch]$ExerciseInstaller,
    [string]$TestRoot = ''
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$packages = (Resolve-Path -LiteralPath $PackageDirectory).Path
$sums = Join-Path $packages 'SHA256SUMS.txt'
foreach ($line in Get-Content -LiteralPath $sums) {
    if ($line -notmatch '^([0-9a-f]{64})  ([^\\/]+)$') { throw 'Lista de hashes invalida.' }
    $expected = $Matches[1]; $name = $Matches[2]
    if ((Get-FileHash -LiteralPath (Join-Path $packages $name) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw "Hash incorrecto: $name" }
}
$zip = @(Get-ChildItem $packages -Filter '*-portable.zip')
if ($zip.Count -ne 1) { throw 'Se requiere un unico ZIP portable.' }
if (-not $TestRoot) { $TestRoot = Join-Path $projectRoot '.preview-tools/package-tests' }
$sandbox = Join-Path $TestRoot ([Guid]::NewGuid().ToString('N'))
$portable = Join-Path $sandbox 'portable'
New-Item -ItemType Directory -Path $portable -Force | Out-Null
Expand-Archive -LiteralPath $zip[0].FullName -DestinationPath $portable
$manifest = Get-Content (Join-Path $portable 'package-manifest.json') -Raw | ConvertFrom-Json
function Assert-Payload([string]$Directory) {
    $prefix = [IO.Path]::GetFullPath($Directory).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    foreach ($file in $manifest.files) {
        $path = [IO.Path]::GetFullPath((Join-Path $Directory $file.path))
        if (-not $path.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)) { throw 'Ruta fuera del paquete.' }
        if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256) { throw "Contenido invalido: $($file.path)" }
    }
    foreach ($required in @('AiSysadmin.exe','coreclr.dll','hostfxr.dll','WebView2Loader.dll','wwwroot/index.html','wwwroot/preferences.html','wwwroot/brand/icon.png','wwwroot/brand/logo.png')) {
        if (-not (Test-Path -LiteralPath (Join-Path $Directory $required))) { throw "Componente faltante: $required" }
    }
}
Assert-Payload $portable
if ($ExerciseInstaller) {
    $key = 'HKCU:/Software/Microsoft/Windows/CurrentVersion/Uninstall/{4DFF87E7-6939-4591-910C-8BA873B15B32}_is1'
    if (Test-Path $key) { throw 'Ya existe una instalacion registrada. No se ejecutara la prueba sobre ella.' }
    function Shortcut-Fingerprint {
        foreach ($shortcut in @((Join-Path ([Environment]::GetFolderPath('Programs')) 'AI Sysadmin Agent.lnk'),(Join-Path ([Environment]::GetFolderPath('Desktop')) 'AI Sysadmin Agent.lnk'))) {
            if (Test-Path -LiteralPath $shortcut) { "$shortcut $((Get-FileHash -LiteralPath $shortcut -Algorithm SHA256).Hash)" } else { "$shortcut absent" }
        }
    }
    $shortcutsBefore = @(Shortcut-Fingerprint)
    $vault = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'AiSysadmin'
    function Vault-Fingerprint {
        foreach ($name in @('connections.v1.dat','connections.v1.dat.bak','known-hosts.json')) {
            $file = Join-Path $vault $name
            if (Test-Path -LiteralPath $file) { "$name $((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash)" } else { "$name absent" }
        }
    }
    $before = @(Vault-Fingerprint)
    $install = [IO.Path]::GetFullPath((Join-Path $sandbox 'installed'))
    $allowed = [IO.Path]::GetFullPath($sandbox).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (-not $install.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase)) { throw 'Destino de prueba fuera del directorio aislado.' }
    $setup = @(Get-ChildItem $packages -Filter '*-setup.exe')
    if ($setup.Count -ne 1) { throw 'Se requiere un unico instalador.' }
    $logPath = Join-Path $sandbox 'install.log'
    $process = Start-Process -FilePath $setup[0].FullName -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/NOICONS',"/DIR=`"$install`"","/LOG=`"$logPath`"" -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "El instalador devolvio $($process.ExitCode). Revisá el log en el directorio de prueba." }
    $registered = (Get-ItemProperty -LiteralPath $key).InstallLocation
    if ([IO.Path]::GetFullPath($registered).TrimEnd('\') -ne $install.TrimEnd('\')) { throw 'La instalacion registrada no corresponde al directorio de prueba. No se ejecutara el desinstalador.' }
    Assert-Payload (Join-Path $install "versions/$($manifest.version)")
    $uninstall = Join-Path $install 'unins000.exe'
    $process = Start-Process -FilePath $uninstall -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART' -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0 -or (Test-Path $key)) { throw 'La desinstalacion de prueba no finalizo correctamente.' }
    if (@(Compare-Object $before @(Vault-Fingerprint)).Count -ne 0) { throw 'El inventario del usuario cambio durante la prueba.' }
    if (@(Compare-Object $shortcutsBefore @(Shortcut-Fingerprint)).Count -ne 0) { throw 'Los accesos directos del usuario cambiaron durante la prueba.' }
    Write-Output 'Instalacion y desinstalacion verificadas; inventario del usuario conservado.'
}
Write-Output "Paquete verificado: $($manifest.version), $($manifest.files.Count) archivos. Directorio de prueba: $sandbox"
