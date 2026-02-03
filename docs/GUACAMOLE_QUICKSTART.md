# 🚀 Quick Start: Guacamole RDP Integration

## ✅ Sin Docker en Producción

Tu app **NO necesitará Docker** cuando la distribuyas. El plan es:

### Para Desarrollo (AHORA)

```bash
# Opción A: Con Docker (más fácil)
docker run -d -p 4822:4822 guacamole/guacd

# Opción B: Sin Docker (usar node)
node frontend-desktop/guacamole-proxy.cjs
```

### Para Producción (MSI/EXE)

```
Tu_App.exe incluirá:
├── node.exe (portable, 20 MB)
├── guacamole-proxy.cjs
└── ws module

Al iniciar la app:
1. Lanza automáticamente node + proxy
2. Conecta frontend al proxy
3. ¡Funciona sin Docker ni instalaciones!
```

---

## 🎯 Setup Inmediato (Windows)

### Paso 1: Instalar dependencias

```powershell
cd frontend-desktop
.\setup-guacamole.ps1
```

O manualmente:

```bash
# Instalar ws para el proxy
cd frontend-desktop
npm install ws

# Instalar guacamole-common-js para el frontend
npm install guacamole-common-js

# Iniciar guacd (temporal con Docker)
docker run -d -p 4822:4822 guacamole/guacd
```

### Paso 2: Iniciar proxy

```bash
cd frontend-desktop
node guacamole-proxy.cjs
```

Deberías ver:

```
🚀 Starting Guacamole WebSocket Proxy...
   Guacamole: 127.0.0.1:4822
   WebSocket: ws://127.0.0.1:4823
✅ WebSocket proxy listening on ws://127.0.0.1:4823
```

### Paso 3: Usar en tu componente

Opción A - Reemplazar NativeRdpCanvas:

```tsx
// En RDPComponent.tsx
import { GuacamoleRdpCanvas } from './GuacamoleRdpCanvas';

// Cambiar:
<NativeRdpCanvas ... />

// Por:
<GuacamoleRdpCanvas
  host={credentials.ip}
  username={credentials.username}
  password={credentials.password}
  width={800}
  height={600}
  onDisconnect={handleDisconnect}
/>
```

Opción B - Toggle entre Native y Guacamole:

```tsx
const [useGuacamole, setUseGuacamole] = useState(true);

{useGuacamole ? (
  <GuacamoleRdpCanvas ... />
) : (
  <NativeRdpCanvas ... />
)}
```

### Paso 4: Iniciar app

```bash
npm run tauri dev
```

---

## 🎨 Resultado Esperado

✅ **RDP renderiza en HTML Canvas**
✅ **Integración visual perfecta** (no ventanas flotantes)
✅ **Funciona como mRemoteNG** pero mejor
✅ **Cross-platform** (funciona en Linux/Mac también)

---

## 📦 Para Distribución MSI/EXE

Ver: `docs/GUACAMOLE_EMBEDDED_PLAN.md`

Resumen:

1. Descargar Node.js portable (20 MB)
2. Incluir en `resources/node/`
3. Configurar Tauri bundler
4. Al iniciar app, lanza proxy automáticamente

**No se requiere Docker ni instalaciones externas.**

---

## 🔧 Troubleshooting

### "Cannot connect to guacd"

```bash
# Verificar que guacd esté corriendo:
docker ps | grep guacd

# Ver logs:
docker logs guacd

# Reiniciar:
docker restart guacd
```

### "WebSocket connection failed"

```bash
# Verificar que el proxy esté corriendo:
# Debería haber proceso node en puerto 4823

# Reiniciar proxy:
node guacamole-proxy.cjs
```

### "Module 'ws' not found"

```bash
cd frontend-desktop
npm install ws
```

---

## 🎯 Comparación

| Método | Integración Visual | Docker? | Producción |
|--------|-------------------|---------|------------|
| MSTSC nativo | ⚠️ Flotante | ❌ No | ✅ Lista |
| Guacamole | ✅ Perfecta | ⚠️ Solo dev | ✅ Node embebido |

**Conclusión:** Guacamole es la mejor opción para integración visual perfecta.
