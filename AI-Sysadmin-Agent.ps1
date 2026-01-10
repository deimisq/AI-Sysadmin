# AI Sysadmin Agent Launcher
# Simple script que abre el navegador

Write-Host "🚀 Abriendo AI Sysadmin Agent..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

$url = "https://testing.sentrait.com.uy"

try {
    Start-Process $url
    Write-Host "✅ Navegador abierto con $url" -ForegroundColor Green
    Write-Host ""
    Write-Host "Puedes cerrar esta ventana." -ForegroundColor Gray
} catch {
    Write-Host "❌ Error al abrir el navegador: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Presiona Enter para salir..."
    Read-Host
}

Start-Sleep -Seconds 2
