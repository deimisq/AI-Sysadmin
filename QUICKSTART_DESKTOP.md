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
cd /home/ubuntu/ai_agent/frontend
npm install
```

### 3. Ejecutar Aplicación Desktop

```bash
npm run tauri-dev
```

Esto abrirá una ventana nativa con la aplicación.

---

## 📦 Para Crear Instalador Windows

**IMPORTANTE:** Esto solo funciona en Windows. Para compilar desde Linux necesitarás cross-compilation.

```bash
npm run tauri-build
```

El instalador se creará en:

```
frontend/src-tauri/target/release/bundle/msi/
```

---

## 🎯 Estado Actual

### ✅ Completado

- [x] Tauri configurado e integrado
- [x] Next.js compatible con export estático
- [x] Scripts de build listos
- [x] Configuración dual (SaaS + Desktop)
- [x] Documentación

### 🔄 Pendiente (Próximos Pasos)

- [ ] Empaquetar backend Python
- [ ] Integrar backend como sidecar
- [ ] Base de datos SQLite local
- [ ] Testing en Windows
- [ ] Instalador personalizado con logo

---

## 🐛 Solución Rápida de Problemas

### "rustc: command not found"

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### Error de compilación en Linux

Tauri requiere algunas dependencias del sistema:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

### "msiexec: command not found"

Normal si estás en Linux. Para crear el instalador .msi necesitas estar en Windows.

---

## 📝 Notas Importantes

1. **SaaS sigue funcionando normalmente** - No hemos tocado el código de producción
2. **El frontend es el mismo** - Solo cambia cómo se empaqueta
3. **Backend aún no integrado** - Por ahora solo es la interfaz
4. **Windows es el objetivo inicial** - macOS y Linux vendrán después

---

## 🎓 Recursos

- [Documentación Tauri](https://tauri.app/)
- [Guía de Pre-requisitos](https://tauri.app/v1/guides/getting-started/prerequisites)
- [API de Tauri](https://tauri.app/v1/api/js/)
