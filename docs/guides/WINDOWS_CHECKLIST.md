# ✅ Checklist de Verificación - Windows Setup

Usa este checklist para verificar que tienes todo listo antes de ejecutar la app.

## 📋 Pre-requisitos

### Sistema Operativo

- [ ] Windows 10 64-bit o superior
- [ ] Al menos 5GB de espacio libre
- [ ] Permisos de administrador disponibles

## 🔧 Herramientas Instaladas

### 1. Visual Studio Build Tools

```powershell
# Verificar que existe cl.exe (compilador C++)
where.exe cl.exe
```

**✅ Correcto**: Devuelve una ruta como `C:\Program Files\...\cl.exe`  
**❌ Error**: `INFO: Could not find files...` → Instalar Build Tools

### 2. Node.js & npm

```powershell
node --version
npm --version
```

**✅ Correcto**:

```
v20.x.x
10.x.x
```

**❌ Error**: `'node' is not recognized...` → Instalar Node.js

### 3. Rust

```powershell
rustc --version
cargo --version
```

**✅ Correcto**:

```
rustc 1.92.0 (ded5c06cf 2025-12-08)
cargo 1.92.0 (344c4567c 2025-10-21)
```

**❌ Error**: `'rustc' is not recognized...` → Instalar Rust

### 4. Git

```powershell
git --version
```

**✅ Correcto**: `git version 2.x.x`

## 📦 Proyecto Preparado

### Código Descargado

```powershell
# Verificar que estás en el directorio correcto
cd ai_agent\frontend
Get-Location
```

**✅ Correcto**: Termina en `\ai_agent\frontend`

### Dependencias Instaladas

```powershell
# Verificar que node_modules existe
Test-Path node_modules
```

**✅ Correcto**: `True`  
**❌ Error**: `False` → Ejecutar `npm install`

## 🎯 Listo para Ejecutar

Si todos los checks anteriores son ✅, puedes ejecutar:

```powershell
npm run tauri-dev
```

---

## 🆘 Si Algo Falla

### Reiniciar PowerShell

Cierra y abre PowerShell después de instalar cualquier herramienta.

### Verificar PATH

```powershell
$env:PATH -split ';' | Select-String -Pattern "cargo|rust"
```

Deberías ver rutas como:

- `C:\Users\[TU_USUARIO]\.cargo\bin`

### Limpiar y Reinstalar

```powershell
# Si algo está raro, limpia todo:
Remove-Item -Recurse -Force node_modules
npm install
```

---

## 📊 Resumen Visual

```
Requisito              Estado    Comando de Verificación
─────────────────────────────────────────────────────────
Windows 10+            [ ]       Get-ComputerInfo
Visual Studio Tools    [ ]       where.exe cl.exe
Node.js                [ ]       node --version
Rust                   [ ]       rustc --version
Git                    [ ]       git --version
Proyecto clonado       [ ]       Get-Location
npm dependencies       [ ]       Test-Path node_modules
─────────────────────────────────────────────────────────

Si todos son [✓], estás listo para: npm run tauri-dev
```

---

## 🎓 Script de Verificación Automática (Opcional)

Copia y pega esto en PowerShell:

```powershell
Write-Host "🔍 Verificando requisitos..." -ForegroundColor Cyan

# Node.js
try { 
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no encontrado" -ForegroundColor Red
}

# Rust
try {
    $rustVersion = rustc --version
    Write-Host "✅ Rust: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Rust no encontrado" -ForegroundColor Red
}

# Git
try {
    $gitVersion = git --version
    Write-Host "✅ Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git no encontrado" -ForegroundColor Red
}

# Build Tools (cl.exe)
try {
    $clPath = where.exe cl.exe 2>$null
    if ($clPath) {
        Write-Host "✅ Visual Studio Build Tools instaladas" -ForegroundColor Green
    } else {
        Write-Host "❌ Visual Studio Build Tools no encontradas" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Visual Studio Build Tools no encontradas" -ForegroundColor Red
}

# node_modules
if (Test-Path "node_modules") {
    Write-Host "✅ Dependencias npm instaladas" -ForegroundColor Green
} else {
    Write-Host "⚠️  node_modules no existe. Ejecuta: npm install" -ForegroundColor Yellow
}

Write-Host "`n✨ Verificación completa!" -ForegroundColor Cyan
```

Este script te mostrará rápidamente qué falta.
