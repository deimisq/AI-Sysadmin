# 🚀 Inicio Rápido - Tauri Desktop

## ⚡ Para Probar AHORA (Desarrollo)

### 1. Verificar Requisitos

```bash
# Verificar Node.js
node --version  # Debe ser 18+

# Verificar si Rust está instalado
rustc --version
```

**Si Rust NO está instalado:**

```bash
# Instalar Rust (toma ~5 minutos)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Reiniciar terminal después de instalar
```

### 2. Instalar Dependencias (primera vez)

```bash
cd /home/ubuntu/ai_agent/frontend-desktop
npm install
```

### 3. Ejecutar Aplicación Desktop (Dev Mode)

```bash
npm run tauri:dev
```

Esto abrirá una ventana nativa con la aplicación usando el nuevo cliente SSH nativo en Rust.

---

## 📦 Para Crear Instalador (Release)

Para generar los binarios optimizados (.deb / .AppImage en Linux, .exe en Windows):

```bash
npm run tauri build
```

El instalador se creará en:

```
frontend-desktop/src-tauri/target/release/bundle/
```

---

## 🎯 Estado Actual (v2.0.0)

### ✅ Completado

- [x] **Cliente SSH Nativo**: Implementado con Rust/russh (Async/Tokio).
- [x] **Terminal Event-Driven**: Zero-latency typing con Tauri Events.
- [x] **Dashboard Integrado**: UI de Sysadmin completa en Desktop.
- [x] **Scripts de Build**: `npm run tauri build` genera instaladores.

### 🔄 Pendiente (Próximos Pasos - Phase 2)

- [ ] Multi-tenancy (Organizaciones)
- [ ] Soporte RDP Local (Windows)
- [ ] Integración Ollama Local

---

## 🐛 Solución Rápida de Problemas

### Error de compilación "libwebkit2gtk"

Tauri requiere dependencias de sistema:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### Async/Sync Mutex Issues

Si ves errores de compilación relacionados con `MutexGuard` o `Send` trait, asegúrate de estar usando la versión `2.0.0` donde se corrigió la gestión de `std::sync::Mutex` vs `tokio::sync::Mutex`.

---

## 📝 Notas Importantes

1. **Backend Híbrido**: La app desktop V2.0 usa SSH directo para conectar a servidores pero aún requiere la API backend para autenticación y persistencia de perfiles.
2. **Performance**: La conexión SSH es ~10x más rápida que la versión web (WebSocket proxy).

---

## 🎓 Recursos

- [Documentación Tauri](https://tauri.app/)
- [Guía de Pre-requisitos](https://tauri.app/v1/guides/getting-started/prerequisites)
- [API de Tauri](https://tauri.app/v1/api/js/)
