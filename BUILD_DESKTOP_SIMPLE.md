# 🖥️ Build Desktop App - Solo Frontend (SaaS Backend)

## Enfoque Simplificado

La aplicación desktop es **solo el frontend** empaquetado con Tauri.  
Se conecta al **backend SaaS** (en tu servidor).

### Ventajas

- ✅ Build rápido (2-5 minutos)
- ✅ Ejecutable pequeño (~15-20 MB)
- ✅ Sin problemas de dependencias de Python
- ✅ Backend centralizado y fácil de actualizar
- ✅ Experiencia de app nativa en Windows

---

## 🔧 Configuración Inicial

### 1. Configurar URL del Backend

Edita `frontend/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://tu-dominio.com
```

Reemplaza `https://tu-dominio.com` con la URL de tu backend SaaS.

---

## 🚀 Build para Distribución

### En Windows

```powershell
cd frontend

# 1. Instalar dependencias (si no lo hiciste)
npm install

# 2. Build la aplicación
npm run tauri-build
```

**Tiempo estimado:** 5-10 minutos (primera vez)

### Resultado

El instalador se crea en:

```
frontend/src-tauri/target/release/bundle/msi/
```

Archivos generados:

- `AI Sysadmin Agent_0.9.4_x64_en-US.msi` (Inglés)
- `AI Sysadmin Agent_0.9.4_x64_es-ES.msi` (Español)

**Tamaño aproximado:** 15-20 MB

---

## 📦 Distribuir la Aplicación

### Opción 1: Instalador MSI

Comparte el archivo `.msi` con tus usuarios:

1. Usuario descarga el `.msi`
2. Doble click para instalar
3. La app se instala en `C:\Program Files\AI Sysadmin Agent\`
4. Acceso directo creado en el menú de inicio

### Opción 2: Ejecutable Portable

Si prefieres sin instalador:

```
frontend/src-tauri/target/release/AI Sysadmin Agent.exe
```

**Tamaño:** ~15 MB  
Usuarios pueden ejecutarlo directamente sin instalar.

---

## 🌐 Funcionamiento

```
┌─────────────────────────────────────┐
│   App Desktop (Tauri + Next.js)    │
│   Instalada en Windows              │
│                                     │
│   - Ventana nativa                  │
│   - Notificaciones del sistema      │
│   - Auto-updates (opcional)         │
└──────────────┬──────────────────────┘
               │
               │ HTTPS
               ▼
┌─────────────────────────────────────┐
│   Backend SaaS (FastAPI)            │
│   https://tu-dominio.com            │
│                                     │
│   - PostgreSQL                      │
│   - Múltiples usuarios              │
│   - Actualizaciones centralizadas   │
└─────────────────────────────────────┘
```

---

## ⚙️ Configuración Avanzada

### Cambiar Nombre/Versión

Edita `frontend/src-tauri/tauri.conf.json`:

```json
{
  "productName": "AI Sysadmin Agent",
  "version": "0.9.4"
}
```

### Cambiar Icono

Reemplaza los iconos en:

```
frontend/src-tauri/icons/
```

Formatos necesarios:

- `icon.ico` (Windows)
- `icon.icns` (macOS)
- `icon.png` (Linux)

### Auto-Updates (Opcional)

Tauri soporta auto-updates. Ver:
<https://tauri.app/v1/guides/distribution/updater>

---

## 🧪 Testing Antes de Distribuir

### Modo Desarrollo

```powershell
npm run tauri-dev
```

Verifica:

- [ ] La app se conecta al backend
- [ ] Login funciona
- [ ] Navegación funciona
- [ ] Datos se cargan correctamente

### Build de Producción

```powershell
npm run tauri-build
cd src-tauri/target/release
.\AI Sysadmin Agent.exe
```

Prueba el ejecutable antes de distribuir.

---

## 📊 Comparación con Enfoque Local

| Aspecto | Frontend + Backend Local | Solo Frontend (Este) |
|---------|-------------------------|---------------------|
| Tamaño ejecutable | 200-250 MB | 15-20 MB |
| Tiempo de build | 20+ minutos | 5 minutos |
| Complejidad | Alta | Baja |
| Actualizaciones backend | Nuevo build completo | Automáticas |
| Requisitos | PyInstaller, Python, etc | Solo Node.js |
| Offline | ✅ Sí | ❌ No |
| Multi-usuario | ❌ No | ✅ Sí |

---

## ⚠️ Consideraciones

### CORS en el Backend

Asegúrate de que tu backend permita requests del desktop:

```python
# backend/main.py
allowed_origins = [
    "tauri://localhost",
    "https://tauri.localhost",
    "http://localhost:3000",
    # ... otras origins
]
```

### HTTPS Recomendado

Para producción, el backend debería usar HTTPS:

- Obtén un certificado SSL (Let's Encrypt gratis)
- Configura Nginx/Apache para HTTPS

---

## 🚀 Comando Rápido de Build

```powershell
# Todo en uno
cd frontend && npm install && npm run tauri-build
```

El instalador estará en:

```
src-tauri/target/release/bundle/msi/
```

---

## 💡 Tips

### Build más Rápido

Después del primer build, los siguientes son mucho más rápidos (~2 minutos).

### Reducir Tamaño

El tamaño ya es bastante pequeño (~15-20 MB). Para reducir más:

1. Quita dependencias no usadas de `package.json`
2. Optimiza imágenes/assets
3. Usa lazy loading en Next.js

### Firma de Código (Opcional)

Para evitar advertencias de Windows SmartScreen:

- Obtén un certificado de firma de código
- Configura Tauri para firmar el instalador

Ver: <https://tauri.app/v1/guides/distribution/sign-windows>

---

## ✅ Checklist Final

Antes de distribuir:

- [ ] `NEXT_PUBLIC_API_URL` configurada correctamente
- [ ] Build exitoso sin errores
- [ ] Ejecutable probado en Windows limpio
- [ ] Login funciona
- [ ] Todas las features principales funcionan
- [ ] Icono y nombre correctos
- [ ] Versión actualizada en `tauri.conf.json`

---

**¡Listo para distribuir!** 🎉

El proceso es ahora mucho más simple que empaquetar todo el backend.
