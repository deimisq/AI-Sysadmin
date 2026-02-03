# Script to automatically download and extract wfreerdp.exe from RoyalApps NuGet package
Write-Host "⬇️ Downloading FreeRDP (wfreerdp.exe) from NuGet..." -ForegroundColor Cyan

# Using RoyalApps.Community.FreeRdp.WinForms NuGet package which contains wfreerdp.exe
$nugetUrl = "https://www.nuget.org/api/v2/package/RoyalApps.Community.FreeRdp.WinForms"
$scriptRoot = $PSScriptRoot
$destDir = Join-Path $scriptRoot "binaries"
$zipFile = Join-Path $scriptRoot "royalapps.zip"
$extractDir = Join-Path $scriptRoot "temp_extract"

# Create binaries directory
if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

# Download NuGet package (it's essentially a zip)
Write-Host "Downloading package from NuGet..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $nugetUrl -OutFile $zipFile
} catch {
    Write-Host "❌ Download failed. Please check your internet connection." -ForegroundColor Red
    exit 1
}

# Extract
Write-Host "Extracting..." -ForegroundColor Yellow
if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
Expand-Archive -Path $zipFile -DestinationPath $extractDir -Force

# Locate wfreerdp.exe
# Path usually: runtimes/win-x64/native/wfreerdp.exe
$sourceExe = Join-Path $extractDir "runtimes\win-x64\native\wfreerdp.exe"

if (Test-Path $sourceExe) {
    Copy-Item -Path $sourceExe -Destination (Join-Path $destDir "wfreerdp.exe") -Force
    Write-Host ""
    Write-Host "✅ wfreerdp.exe installed successfully!" -ForegroundColor Green
    Write-Host "Path: $(Join-Path $destDir "wfreerdp.exe")"
} else {
    Write-Host "⚠️ Warning: wfreerdp.exe not found in package structure." -ForegroundColor Red
    Get-ChildItem -Recurse $extractDir
}

# Cleanup
Remove-Item $zipFile -Force
Remove-Item $extractDir -Recurse -Force
