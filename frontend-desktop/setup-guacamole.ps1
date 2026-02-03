# Guacamole Setup Script for AI Sysadmin Desktop
# This script sets up Guacamole for development and production

Write-Host "AI Sysadmin Desktop - Guacamole Setup" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Check if Node.js is installed
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "OK - Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR - Node.js not found. Please install Node.js from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Install proxy dependencies
Write-Host ""
Write-Host "[2/5] Installing proxy dependencies..." -ForegroundColor Yellow
cd frontend-desktop

# Install ws module
Write-Host "Installing ws module..." -ForegroundColor Gray
npm install ws --no-save
Write-Host "OK - Dependencies installed" -ForegroundColor Green

# Check for guacd
Write-Host ""
Write-Host "[3/5] Checking for guacd..." -ForegroundColor Yellow

# Option 1: Docker (for testing)
try {
    $dockerVersion = docker --version
    Write-Host "OK - Docker found: $dockerVersion" -ForegroundColor Green
    Write-Host ""
    Write-Host "Starting guacd container..." -ForegroundColor Yellow
    
    # Stop existing container if running
    docker stop guacd 2>$null
    docker rm guacd 2>$null
    
    # Start guacd
    docker run -d --name guacd -p 4822:4822 guacamole/guacd
    
    Write-Host "OK - guacd container started on port 4822" -ForegroundColor Green
} catch {
    Write-Host "WARNING - Docker not found. You'll need to:" -ForegroundColor Yellow
    Write-Host "   1. Install Docker Desktop, OR" -ForegroundColor Gray
    Write-Host "   2. Download guacd.exe manually" -ForegroundColor Gray
    Write-Host ""
}

# Install guacamole-common-js for frontend
Write-Host ""
Write-Host "[4/5] Installing guacamole-common-js..." -ForegroundColor Yellow
npm install guacamole-common-js --save
Write-Host "OK - guacamole-common-js installed" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "[5/5] Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Start the proxy:" -ForegroundColor White
Write-Host "      node guacamole-proxy.cjs" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Start Tauri app:" -ForegroundColor White
Write-Host "      npm run tauri dev" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Connect to RDP using Guacamole component" -ForegroundColor White
Write-Host ""
Write-Host "For production build, see docs/GUACAMOLE_EMBEDDED_PLAN.md" -ForegroundColor Yellow
