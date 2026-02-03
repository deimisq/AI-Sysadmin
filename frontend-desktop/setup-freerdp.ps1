# Script to download FreeRDP for Windows
Write-Host "⬇️ Downloading wfreerdp.exe..." -ForegroundColor Cyan

# Official release from Cloudbase Solutions (commonly used stable build) or GitHub actions
# Using a known stable URL for wfreerdp.exe
$url = "https://github.com/FreeRDP/FreeRDP/releases/download/2.11.7/wfreerdp.exe" 
# Note: GitHub releases often have installers. For portable exe we might need to extract or find specific build.
# Alternative: Use specific reputable mirror or pre-checked binary.
# For this script, we'll try to get a portable version if available, otherwise suggest manual.

$scriptRoot = $PSScriptRoot
$destDir = Join-Path $scriptRoot "binaries"
$exeFile = Join-Path $destDir "wfreerdp.exe"

# Create directory
if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

Write-Host "Checking for wfreerdp.exe at $exeFile..." -ForegroundColor Gray

if (Test-Path $exeFile) {
    Write-Host "✅ wfreerdp.exe already exists." -ForegroundColor Green
    exit 0
}

Write-Host "⚠️ Automatic download of standalone wfreerdp.exe is tricky due to changing URLs." -ForegroundColor Yellow
Write-Host "👉 Please download 'wfreerdp.exe' manually and place it in:" -ForegroundColor White
Write-Host "   $destDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Download Link (Official): https://github.com/FreeRDP/FreeRDP/releases" -ForegroundColor Blue
Write-Host "Look for 'wfreerdp.exe' inside the release assets or zip."
