# AI Sysadmin Agent - Desktop Application

Esta es la versión de escritorio del AI Sysadmin Agent usando Tauri.

## 📋 Requisitos Previos

### Para Desarrollo

- **Node.js** 18+ y npm
- **Rust** 1.70+ (instalar desde <https://rustup.rs/>)
- **Visual Studio Build Tools** (solo Windows):
  - Descargar desde: <https://visualstudio.microsoft.com/downloads/>
  - Durante la instalación, seleccionar "Desktop development with C++"
  
### Verificar Instalación

```bash
node --version
npm --version
rustc --version
cargo --version
```

## 🚀 Desarrollo

### 1. Instalar Dependencias

```bash
cd frontend
npm install
```

### 2. Ejecutar en Modo Desarrollo

```bash
npm run tauri-dev
```

Esto iniciará:

- El servidor de desarrollo de Next.js en `http://localhost:3000`
- La aplicación Tauri que carga el frontend

### 3. Hot Reload

Los cambios en el código se reflejarán automáticamente:

- **Frontend (React/Next.js)**: Recarga automática
- **Backend Rust**: Requiere reiniciar el comando

## 📦 Build para Producción

### Windows

```bash
npm run tauri-build
```

El instalador se generará en:

```
frontend/src-tauri/target/release/bundle/msi/AI Sysadmin Agent_0.9.4_x64_en-US.msi
```

### Tipos de Instaladores Generados

- **MSI**: Instalador Windows estándar
- **NSIS**: Instalador con más opciones de personalización (si está configurado)

## 🏗️ Arquitectura

### Diferencias entre SaaS y Desktop

| Característica | SaaS (Web) | Desktop (Tauri) |
|----------------|------------|-----------------|
| Frontend Build | `standalone` | `export` (estático) |
| Backend | FastAPI en Docker | Sidecar Python (próximamente) |
| Base de datos | PostgreSQL remota | SQLite local |
| Distribución | Servidor web | Instalador .exe/.msi |

### Variables de Entorno

La aplicación detecta automáticamente el modo:

```javascript
// next.config.js
output: process.env.DESKTOP_BUILD === 'true' ? 'export' : 'standalone'
```

## 🔧 Configuración

### tauri.conf.json

Principales configuraciones:

```json
{
  "productName": "AI Sysadmin Agent",
  "version": "0.9.4",
  "identifier": "com.aisysadmin.agent",
  "build": {
    "frontendDist": "../out",
    "beforeBuildCommand": "DESKTOP_BUILD=true npm run build"
  },
  "app": {
    "windows": [{
      "width": 1400,
      "height": 900,
      "minWidth": 1024,
      "minHeight": 768
    }]
  }
}
```

## 🐛 Troubleshooting

### Error: "Rust no está instalado"

```bash
# Windows (PowerShell)
winget install --id Rustlang.Rustup

# O descargar desde https://rustup.rs/
```

### Error: "MSVC build tools not found"

1. Instalar Visual Studio Build Tools
2. Seleccionar "Desktop development with C++"
3. Reiniciar terminal

### Error al compilar

```bash
# Limpiar cache de Rust
cd frontend/src-tauri
cargo clean

# Volver a intentar
cd ..
npm run tauri-build
```

## 📱 Próximas Funcionalidades

- [ ] Backend Python como sidecar embebido
- [ ] Base de datos SQLite local
- [ ] Auto-actualizaciones
- [ ] Soporte para macOS y Linux
- [ ] Deep linking
- [ ] Notificaciones nativas del sistema

## 🤝 Contribuir

Ver [CONTRIBUTING.md](../CONTRIBUTING.md) para detalles.

## 📄 Licencia

Ver [LICENSE](../LICENSE) para detalles.
