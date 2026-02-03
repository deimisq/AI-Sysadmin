# Guacamole Setup Script for AI Sysadmin Desktop
# This script sets up Guacamole for development and production

Write-Host "🚀 AI Sysadmin Desktop - Guacamole Setup" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Check if Node.js is installed
Write-Host "📦 Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Install proxy dependencies
Write-Host ""
Write-Host "📦 Installing proxy dependencies..." -ForegroundColor Yellow
cd frontend-desktop

# Create package.json for proxy if it doesn't exist
if (!(Test-Path "package-proxy.json")) {
    Write-Host "Creating package-proxy.json..." -ForegroundColor Gray
    @"
{
  "name": "guacamole-proxy",
  "version": "1.0.0",
  "dependencies": {
    "ws": "^8.16.0"
  }
}
"@ | Out-File -FilePath "package-proxy.json" -Encoding UTF8
}

# Install ws module
Write-Host "Installing ws module..." -ForegroundColor Gray
npm install ws --no-save
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Check for guacd
Write-Host ""
Write-Host "📦 Checking for guacd..." -ForegroundColor Yellow

# Option 1: Docker (for testing)
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
    Write-Host ""
    Write-Host "🐳 Starting guacd container..." -ForegroundColor Yellow
    
    # Stop existing container if running
    docker stop guacd 2>$null
    docker rm guacd 2>$null
    
    # Start guacd
    docker run -d --name guacd -p 4822:4822 guacamole/guacd
    
    Write-Host "✅ guacd container started on port 4822" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Docker not found. You'll need to:" -ForegroundColor Yellow
    Write-Host "   1. Install Docker Desktop, OR" -ForegroundColor Gray
    Write-Host "   2. Download guacd.exe manually" -ForegroundColor Gray
    Write-Host ""
}

# Install guacamole-common-js for frontend
Write-Host ""
Write-Host "📦 Installing guacamole-common-js..." -ForegroundColor Yellow
cd ..
cd frontend-desktop
npm install guacamole-common-js --save
Write-Host "✅ guacamole-common-js installed" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Start the proxy:" -ForegroundColor White
Write-Host "      node guacamole-proxy.cjs" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Start Tauri app:" -ForegroundColor White
Write-Host "      npm run tauri dev" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Connect to RDP using Guacamole component" -ForegroundColor White
Write-Host ""
Write-Host "🔧 For production build, see docs/GUACAMOLE_EMBEDDED_PLAN.md" -ForegroundColor Yellow
