# Guacamole Embedded Distribution Plan

## 🎯 Objetivo

Incluir Guacamole en el instalador MSI/EXE sin dependencias externas (sin Docker)

## 📦 Opciones de Distribución

### Opción A: Node.js + guacamole-proxy.cjs (SIMPLE - RECOMENDADO)

**Para producción inmediata:**

```
Tu_App.exe (Instalador)
├── app/
│   ├── ai-sysadmin-desktop.exe
│   ├── guacamole-proxy.cjs
│   ├── node.exe (portable, 20 MB)
│   └── node_modules/
│       └── ws/
└── resources/
```

**Ventajas:**

- ✅ Fácil de implementar (YA TIENES EL CÓDIGO)
- ✅ Node portable es solo 20 MB
- ✅ Funciona immediately
- ✅ No requiere compilación compleja

**Proceso de build:**

1. Descargar Node.js portable
2. Instalar `ws` module
3. Empaquetar con Tauri bundler
4. El código Rust ya busca estos archivos

---

### Opción B: guacd.exe compilado estático (NATIVO)

**Para máxima performance:**

```
Tu_App.exe (Instalador)
├── app/
│   ├── ai-sysadmin-desktop.exe
│   └── binaries/
│       ├── guacd.exe (compilado estático)
│       ├── freerdp.dll
│       └── dependencias.dll
```

**Ventajas:**

- ✅ Nativo Windows, máxima performance
- ✅ No requiere Node.js
- ❌ Más difícil de compilar

**Proceso:**

1. Compilar guacamole-server para Windows
2. Crear binario estático
3. Incluir en `binaries/` folder
4. El código Rust ya busca en esta ubicación

---

### Opción C: Rust RDP Client (FUTURO - MÁS COMPLEJO)

**Integración nativa 100% Rust:**

```rust
use rustdesk_rdp; // O crear binding a FreeRDP
```

**Ventajas:**

- ✅ Sin dependencias externas
- ✅ Integración perfecta
- ✅ Cross-platform
- ❌ Requiere desarrollo significativo (3-5 días)

---

## 🚀 Plan de Implementación INMEDIATO

### FASE 1: Testing (HOY - 30 min)

```bash
# 1. Instalar dependencias proxy
cd frontend-desktop
npm install ws

# 2. Iniciar guacd con Docker (temporal para testing)
docker run -d -p 4822:4822 guacamole/guacd

# 3. Iniciar proxy
node guacamole-proxy.cjs

# 4. Conectar frontend
# El código Rust ya está listo
```

### FASE 2: Producción (SIGUIENTE - 1 hora)

```bash
# 1. Descargar Node portable para Windows
wget https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip

# 2. Extraer y copiar a resources
unzip node-v20.11.0-win-x64.zip
cp -r node-v20.11.0-win-x64 frontend-desktop/resources/node

# 3. Configurar Tauri bundler para incluir archivos
# Editar tauri.conf.json
```

### FASE 3: Integración Frontend (20 min)

```typescript
// Ya tienes GuacamoleCanvas component
// Solo necesitamos conectar al WebSocket
// frontend-desktop/src/components/rdp/GuacamoleCanvas.tsx
```

---

## 📋 Checklist de Distribución

### Para MSI/EXE Installer

- [ ] Node.js portable incluido (20 MB)
- [ ] guacamole-proxy.cjs incluido
- [ ] node_modules/ws incluido
- [ ] Auto-start proxy al abrir app
- [ ] Auto-stop proxy al cerrar app
- [ ] Fallback a guacd.exe si disponible

### Tauri Configuration

```json
{
  "tauri": {
    "bundle": {
      "resources": [
        "guacamole-proxy.cjs",
        "resources/node/**",
        "resources/node_modules/**"
      ],
      "externalBin": [
        "resources/node/node.exe"
      ]
    }
  }
}
```

---

## 🔧 Alternativa SIN Node.js (AVANZADO)

Si no quieres incluir Node, podemos:

1. **Compilar guacd estáticamente** (complejo pero posible)
2. **Usar rust-rdp** (desarrollo custom de 3-5 días)
3. **Wrapper de FreeRDP** en Rust con rendering a Canvas

**Recomendación:** Empezar con Node.js portable (Opción A), es la más práctica y ya tienes el código.

---

## 📊 Comparación de Tamaños

| Solución | Tamaño Extra | Complejidad | Tiempo |
|----------|--------------|-------------|--------|
| Node + proxy | ~25 MB | Baja | 1 hora |
| guacd estático | ~15 MB | Media | 4-6 horas |
| Rust nativo | 0 MB | Alta | 3-5 días |

**Para producción INMEDIATA: Usar Opción A (Node + proxy)**
