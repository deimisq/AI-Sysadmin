# AI Sysadmin Agent - Desktop (Windows)

## 🚀 Instalación Rápida

### Opción 1: Script Automático (Recomendado)

1. Abre PowerShell o CMD en esta carpeta (`frontend-desktop`)
2. Ejecuta:

   ```
   install-windows.bat
   ```

Esto limpiará e instalará todas las dependencias automáticamente.

### Opción 2: Manual

Si el script no funciona, sigue estos pasos:

```powershell
# 1. Limpiar instalación anterior
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

# 2. Instalar dependencias
npm install

# Si falla, intenta:
npm install --legacy-peer-deps
```

## 🔧 Solución de Problemas

### Error: "Failed to resolve import react-markdown"

**Causa:** Las dependencias no están instaladas correctamente.

**Solución:**

```bash
# Borra todo y reinstala
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Error: "WebView2 not found"

**Solución:** Instala WebView2 Runtime

- Descarga: <https://developer.microsoft.com/microsoft-edge/webview2/>

### Error: "Build tools not found"

**Solución:** Instala Visual Studio Build Tools

1. Descarga: <https://visualstudio.microsoft.com/visual-cpp-build-tools/>
2. Instala "Desktop development with C++"
3. Reinicia la terminal

### Error de compilación de Rust

**Solución:**

1. Instala Rust: <https://www.rust-lang.org/tools/install>
2. Reinicia la terminal
3. Verifica: `rustc --version`

## 📦 Verificar Instalación

Para verificar que todo se instaló correctamente:

```bash
# Ver dependencias instaladas
npm list --depth=0

# Verificar react-markdown específicamente
npm list react-markdown
```

Deberías ver:

```
ai-sysadmin-agent@0.0.0
├── react-markdown@10.1.0
└── ... (otras dependencias)
```

## 🏃 Ejecutar la Aplicación

### Modo Desarrollo

```bash
npm run tauri dev
```

### Compilar para Producción

```bash
npm run tauri build
```

El instalador se generará en:

```
src-tauri/target/release/bundle/
```

## 🌐 Variables de Entorno

Crea un archivo `.env` en esta carpeta:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

Ajusta la URL según tu backend.

## 📋 Requisitos del Sistema

- **Windows 10/11** (64-bit)
- **Node.js 18+** - <https://nodejs.org/>
- **Rust** - <https://www.rust-lang.org/>
- **Visual Studio Build Tools** - Para compilación nativa
- **WebView2** - Para la interfaz (generalmente ya instalado en Windows 11)

## 🆘 Ayuda

Si sigues teniendo problemas:

1. Verifica versiones:

   ```bash
   node --version    # Debe ser v18 o superior
   npm --version
   rustc --version
   ```

2. Limpia completamente:

   ```bash
   rmdir /s /q node_modules
   rmdir /s /q src-tauri\target
   del package-lock.json
   npm cache clean --force
   npm install
   ```

3. Revisa los logs detallados:

   ```bash
   npm run tauri dev -- --verbose
   ```

## ✅ Features Disponibles

- ✅ Dashboard completo con gestión de servidores
- ✅ Chat IA conversacional para diagnóstico
- ✅ Consola SSH interactiva
- ✅ Informes programados
- ✅ Panel de administración completo (11 secciones)
- ✅ Documentación integrada
- ✅ Tema claro/oscuro
- ✅ Notificaciones de versión

## 🔗 Enlaces

- **Documentación Tauri:** <https://tauri.app/>
- **Repositorio:** <https://github.com/sentrait/ai_agent>
- **Branch:** testing
