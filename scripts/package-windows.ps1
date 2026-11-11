[CmdletBinding()]
param(
    [string]$Dotnet = 'dotnet',
    [string]$Node = 'node',
    [string]$Iscc = 'ISCC.exe',
    [string]$PackageVersion = '',
    [switch]$SkipFrontend,
    [switch]$SkipInstaller
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'prepare-brand.ps1')
$project = Join-Path $projectRoot 'apps/windows/AiSysadmin.csproj'
$desktopVersion = ([xml](Get-Content -LiteralPath $project -Raw)).Project.PropertyGroup.Version | Where-Object { $_ } | Select-Object -First 1
if ($PackageVersion) { $desktopVersion = $PackageVersion }
if ($desktopVersion -notmatch '^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$') { throw 'Version de escritorio invalida.' }
$buildId = [Guid]::NewGuid().ToString('N')
$stage = Join-Path $projectRoot "dist/windows/staging/$buildId"
$publish = Join-Path $stage 'app'
$output = Join-Path $projectRoot "dist/windows/$desktopVersion"
New-Item -ItemType Directory -Path $stage,$output -Force | Out-Null
$zip = Join-Path $output "AI-Sysadmin-Agent-$desktopVersion-win-x64-portable.zip"
$installer = Join-Path $output "AI-Sysadmin-Agent-$desktopVersion-win-x64-setup.exe"
if ((Test-Path $zip) -or (Test-Path $installer)) { throw 'Ya existe un paquete de esta version. Archivá los artefactos anteriores o cambiá la version antes de compilar.' }
if (-not $SkipFrontend) {
    Push-Location (Join-Path $projectRoot 'frontend-desktop-ui')
    try {
        & $Node 'node_modules/typescript/bin/tsc' '-b'
        if ($LASTEXITCODE -ne 0) { throw 'TypeScript fallo.' }
        & $Node 'node_modules/vite/bin/vite.js' 'build'
        if ($LASTEXITCODE -ne 0) { throw 'El bundle del cliente fallo.' }
    } finally { Pop-Location }
}
if (-not (Test-Path (Join-Path $projectRoot 'frontend-desktop-ui/dist/index.html'))) { throw 'Falta el bundle de produccion.' }
if (-not (Test-Path (Join-Path $projectRoot 'frontend-desktop-ui/dist/preferences.html'))) { throw 'Falta la interfaz de configuracion.' }
Push-Location $projectRoot
try {
    & $Dotnet publish $project '-c' 'Release' '-p:PublishProfile=WindowsX64' "-p:Version=$desktopVersion" '-o' $publish
    if ($LASTEXITCODE -ne 0) { throw 'dotnet publish fallo.' }
} finally { Pop-Location }
foreach ($required in @('AiSysadmin.exe','AiSysadmin.dll','coreclr.dll','hostfxr.dll','wwwroot/index.html','wwwroot/preferences.html','wwwroot/brand/icon.png','wwwroot/brand/logo.png')) {
    if (-not (Test-Path (Join-Path $publish $required))) { throw "Paquete incompleto: $required" }
}
if (-not (Get-ChildItem $publish -Filter 'WebView2Loader.dll' -Recurse)) { throw 'Falta WebView2Loader.dll.' }
$runtimeConfig = Get-Content (Join-Path $publish 'AiSysadmin.runtimeconfig.json') -Raw | ConvertFrom-Json
if (-not $runtimeConfig.runtimeOptions.includedFrameworks) { throw 'El paquete no incluye su runtime.' }
Copy-Item (Join-Path $projectRoot 'apps/windows/installer/install-notes.txt') (Join-Path $publish 'LEEME.txt')
Copy-Item (Join-Path $projectRoot 'LICENSE') (Join-Path $publish 'LICENSE-PROJECT.txt')
Copy-Item (Join-Path $projectRoot 'NOTICE') (Join-Path $publish 'NOTICE')
Copy-Item (Join-Path $projectRoot 'THIRD_PARTY_NOTICES.md') (Join-Path $publish 'THIRD_PARTY_NOTICES.md')
$assets = Get-Content (Join-Path $projectRoot 'apps/windows/obj/project.assets.json') -Raw | ConvertFrom-Json
$noticeRoot = Join-Path $publish 'ThirdParty'
& $Node (Join-Path $projectRoot 'scripts/collect-frontend-notices.mjs') (Join-Path $projectRoot 'frontend-desktop-ui') (Join-Path $noticeRoot 'npm')
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron conservar los avisos originales del frontend.' }
foreach ($folder in $assets.packageFolders.PSObject.Properties.Name) {
    foreach ($library in $assets.libraries.PSObject.Properties) {
        if ($library.Value.type -ne 'package') { continue }
        $package = Join-Path $folder $library.Value.path
        foreach ($notice in Get-ChildItem -LiteralPath $package -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^(LICENSE|NOTICE|THIRD.PARTY)' -or $_.Extension -eq '.nuspec' }) {
            $destination = Join-Path $noticeRoot $library.Name.Replace('/','-')
            New-Item -ItemType Directory -Force -Path $destination | Out-Null
            Copy-Item -LiteralPath $notice.FullName -Destination $destination
        }
    }
    foreach ($framework in $runtimeConfig.runtimeOptions.includedFrameworks) {
        $packageId = $framework.name.ToLowerInvariant() + '.runtime.win-x64'
        $package = Join-Path $folder "$packageId/$($framework.version)"
        foreach ($notice in Get-ChildItem -LiteralPath $package -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^(LICENSE|NOTICE|THIRD.PARTY)' -or $_.Extension -eq '.nuspec' }) {
            $destination = Join-Path $noticeRoot "$packageId-$($framework.version)"
            New-Item -ItemType Directory -Force -Path $destination | Out-Null
            Copy-Item -LiteralPath $notice.FullName -Destination $destination
        }
    }
}
$forbidden = Get-ChildItem $publish -File -Recurse -Force | Where-Object { $_.Name -like '.env*' -or $_.Name -in 'connections.v1.dat','known-hosts.json' -or $_.Extension -in '.terminal','.task' }
if ($forbidden) { throw 'El paquete contiene archivos de configuracion o datos locales que no deben distribuirse.' }
$manifest = Get-ChildItem $publish -File -Recurse | Sort-Object FullName | ForEach-Object {
    [ordered]@{ path = $_.FullName.Substring($publish.Length + 1).Replace('\','/'); sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant(); bytes = $_.Length }
}
[ordered]@{ version = $desktopVersion; architecture = 'win-x64'; runtime = $runtimeConfig.runtimeOptions.includedFrameworks; files = @($manifest) } |
    ConvertTo-Json -Depth 8 | Set-Content (Join-Path $publish 'package-manifest.json') -Encoding UTF8
Compress-Archive -Path (Join-Path $publish '*') -DestinationPath $zip -CompressionLevel Optimal
if (-not $SkipInstaller) {
    & $Iscc '/Q' "/DPublishDir=$publish" "/DOutputDir=$output" "/DAppVersion=$desktopVersion" (Join-Path $projectRoot 'apps/windows/installer/Windows.iss')
    if ($LASTEXITCODE -ne 0) { throw 'La compilacion del instalador fallo. El ZIP portable ya esta disponible.' }
}
Get-ChildItem $output -File | Where-Object { $_.Extension -in '.zip','.exe' } | Sort-Object Name | ForEach-Object {
    "{0}  {1}" -f (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant(),$_.Name
} | Set-Content (Join-Path $output 'SHA256SUMS.txt') -Encoding ASCII
Write-Output "Paquetes generados en $output"
if (Test-Path (Join-Path $projectRoot 'docs/releases/WINDOWS_0.11.md')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot 'docs/releases/WINDOWS_0.11.md') -Destination (Join-Path $output 'RELEASE_NOTES.md')
}
