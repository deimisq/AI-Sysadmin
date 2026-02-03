# Script to download guacd for Windows (without Docker)
Write-Host "⬇️ Downloading guacd for Windows..." -ForegroundColor Cyan

$zipUrl = "https://github.com/queleg/guacamole-server-windows/releases/download/v1.5.4/guacamole-server-1.5.4-win64.zip"
$destDir = "frontend-desktop/bin/guacd"
$zipFile = "guacd.zip"

# Create directory
if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

# Download
Write-Host "Downloading from GitHub..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile
} catch {
    Write-Host "❌ Download failed. Please download manually." -ForegroundColor Red
    Write-Host "Url: $zipUrl"
    exit 1
}

# Extract
Write-Host "Extracting files..." -ForegroundColor Yellow
Expand-Archive -Path $zipFile -DestinationPath $destDir -Force

# Cleanup
Remove-Item $zipFile

# Verify
if (Test-Path "$destDir/bin/guacd.exe") {
    Write-Host ""
    Write-Host "✅ guacd installed successfully!" -ForegroundColor Green
    Write-Host "Path: $destDir/bin/guacd.exe"
} else {
    Write-Host "⚠️ Warning: exe not found in expected path. Please check $destDir" -ForegroundColor Yellow
    Get-ChildItem -Recurse $destDir
}
