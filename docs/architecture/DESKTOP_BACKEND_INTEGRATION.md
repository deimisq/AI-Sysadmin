# Plan de Integración Backend Python para Desktop

## ✅ Estado Actual: 80% Completado

### Implementación Completada (Opción 1: Sidecar Process)

La integración del backend Python como sidecar de Tauri está casi completa. Ver [PHASE2_STATUS.md](../PHASE2_STATUS.md) para estado detallado.

---

## 🎯 Objetivo Logrado

✅ Backend FastAPI empaquetado como ejecutable standalone  
✅ Integrado en Tauri como sidecar process  
✅ Auto-arranque del backend al iniciar la app  
✅ Health checks automáticos  
✅ Base de datos dual (SQLite/PostgreSQL)  
✅ Detección de modo desktop en frontend  

---

## 📦 Arquitectura Implementada

```
┌─────────────────────────────────────────────────────┐
│            Tauri Application                        │
│  ┌───────────────────────────────────────────────┐ │
│  │  Frontend (Next.js)                           │ │
│  │  - Detecta modo desktop (__TAURI__)           │ │
│  │  - API URL: http://127.0.0.1:8000             │ │
│  └─────────────────┬───────────────────────────── │
│                    │ HTTP Requests                 │
│                    ▼                               │
│  ┌─────────────────────────────────────────────┐  │
│  │  Backend Sidecar (Python/FastAPI)          │  │
│  │  - Auto-started by Tauri                   │  │
│  │  - Runs on localhost:8000                  │  │
│  │  - SQLite database in AppData              │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Tareas Completadas

### Alta Prioridad

- [x] Configurar PyInstaller para empaquetar backend
- [x] Adaptar base de datos para usar SQLite en desktop
- [x] Integrar backend como sidecar en Tauri
- [x] Crear detección automática de modo desktop en frontend
- [x] Auto-inicio del backend al abrir la app
- [x] Manejo de errores si el backend falla
- [x] Sistema de logs para debugging

### Archivos Creados

**Backend:**

- `backend/desktop_config.py` - Configuración modo desktop
- `backend/desktop_main.py` - Entry point ejecutable
- `backend/build_desktop.py` - Script build PyInstaller
- `backend/runtime_hook.py` - Hook inicialización
- `backend/requirements-desktop.txt` - Dependencias desktop
- `backend/BUILD_DESKTOP.md` - Guía de build

**Tauri:**

- `frontend/src-tauri/src/lib.rs` - Auto-start backend + health check
- `frontend/src-tauri/Cargo.toml` - Dependencias (ureq, shell-sidecar)
- `frontend/src-tauri/tauri.conf.json` - Config sidecar
- `frontend/src-tauri/binaries/` - Directorio para ejecutables

**Frontend:**

- `frontend/src/utils/desktop-config.ts` - Detección desktop + API URLs
- `frontend/DESKTOP_FRONTEND_INTEGRATION.md` - Guía frontend

**Documentación:**

- `PHASE2_STATUS.md` - Estado Fase 2
- `WINDOWS_TESTING_GUIDE.md` - Guía pruebas Windows

### Archivos Modificados

- `backend/settings.py` - DB dinámica
- `backend/database.py` - SQLite + PostgreSQL
- `.gitignore` - PyInstaller artifacts

---

## 🔄 Implementación Detallada

### 1. Backend Python Executable ✅

**Build:**

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements-desktop.txt
python build_desktop.py
```

**Output:**

- `backend/dist/ai-sysadmin-backend.exe` (Windows)
- Tamaño: ~80-150 MB
- Incluye Python + todas las dependencias

### 2. Tauri Sidecar Configuration ✅

**tauri.conf.json:**

```json
{
  "bundle": {
    "externalBin": [
      "binaries/ai-sysadmin-backend"
    ]
  }
}
```

**lib.rs - Auto-start:**

```rust
let sidecar_command = app.shell().sidecar("ai-sysadmin-backend")?;
let (mut rx, mut child) = sidecar_command.spawn()?;

// Health check
check_backend_health("http://127.0.0.1:8000/health")?;
```

### 3. Frontend Desktop Detection ✅

**desktop-config.ts:**

```typescript
export function isDesktopMode(): boolean {
  return '__TAURI__' in window;
}

export function getApiBaseUrl(): string {
  return isDesktopMode() 
    ? 'http://127.0.0.1:8000'
    : process.env.NEXT_PUBLIC_API_URL || '/api/v1';
}
```

### 4. Database Auto-Configuration ✅

**desktop_config.py:**

```python
if DESKTOP_MODE:
    data_dir = get_desktop_data_dir()
    DATABASE_URL = f"sqlite:///{data_dir}/database.db"
else:
    DATABASE_URL = os.getenv('DATABASE_URL')  # PostgreSQL
```

**Ubicaciones:**

- Windows: `%APPDATA%/AI Sysadmin Agent/database.db`
- macOS: `~/Library/Application Support/AI Sysadmin Agent/database.db`
- Linux: `~/.local/share/ai-sysadmin-agent/database.db`

---

## 📋 Tareas Pendientes

### Para Completar Fase 2

- [ ] **Probar build en Windows** (requiere Windows real)
- [ ] **Copiar ejecutable a `src-tauri/binaries/`** con nombre correcto
- [ ] **Actualizar calls de API en frontend** para usar `getApiEndpoint()`
- [ ] **Testing end-to-end** con backend + frontend

### Media Prioridad (Fase 3)

- [ ] Migración automática de datos PostgreSQL → SQLite (si es necesario)
- [ ] Auto-actualizaciones de la app (Tauri updater)
- [ ] Instalador personalizado con logos
- [ ] Cifrado de base de datos SQLite
- [ ] Backup automático de base de datos

### Baja Prioridad

- [ ] Notificaciones del sistema operativo
- [ ] Deep linking (tauri://)
- [ ] Tray icon con menú contextual
- [ ] Shortcuts de teclado globales

---

## 🧪 Testing

### Test 1: Build Backend

```bash
cd backend
python build_desktop.py
```

✅ **Esperado:** Ejecutable creado en `backend/dist/`

### Test 2: Run Backend Manual

```bash
cd backend/dist
ai-sysadmin-backend.exe  # Windows
```

✅ **Esperado:**

```
🚀 AI Sysadmin Agent - Desktop Backend
Server: http://127.0.0.1:8000
Desktop Mode: ✅ Enabled
```

### Test 3: Tauri con Backend

```bash
# 1. Copiar ejecutable
copy backend\dist\ai-sysadmin-backend.exe frontend\src-tauri\binaries\ai-sysadmin-backend-x86_64-pc-windows-msvc.exe

# 2. Run Tauri
cd frontend
npm run tauri-dev
```

✅ **Esperado:**

- Ventana de Tauri se abre
- Backend se inicia automáticamente
- Health check OK en consola
- Frontend puede hacer requests a API

### Test 4: Frontend Detection

Abrir DevTools en la app de Tauri, verificar consola:

✅ **Esperado:**

```
🖥️  Environment Info:
   Desktop Mode: true
   API Base URL: http://127.0.0.1:8000
```

---

## 📊 Cronograma Actualizado

1. **Semana 1**: Configuración básica de Tauri ✅ **COMPLETADO**
2. **Semana 2**: Empaquetar backend Python con PyInstaller ✅ **COMPLETADO**
3. **Semana 3**: Integrar backend como sidecar ✅ **COMPLETADO**
4. **Semana 4**: Testing y pulido ⏳ **EN PROCESO**

---

## 📚 Documentación

- **[backend/BUILD_DESKTOP.md](../backend/BUILD_DESKTOP.md)** - Cómo hacer build del backend
- **[frontend/DESKTOP_FRONTEND_INTEGRATION.md](../frontend/DESKTOP_FRONTEND_INTEGRATION.md)** - Integración frontend  
- **[PHASE2_STATUS.md](../PHASE2_STATUS.md)** - Estado detallado Fase 2
- **[WINDOWS_TESTING_GUIDE.md](../WINDOWS_TESTING_GUIDE.md)** - Guía de pruebas Windows

---

## 🎉 Siguiente Paso

**Para el usuario:** Probar el build completo en Windows siguiendo [WINDOWS_TESTING_GUIDE.md](../WINDOWS_TESTING_GUIDE.md)

**Comandos rápidos:**

```powershell
# 1. Build backend
cd backend
python build_desktop.py

# 2. Copiar a Tauri
copy dist\ai-sysadmin-backend.exe ..\frontend\src-tauri\binaries\ai-sysadmin-backend-x86_64-pc-windows-msvc.exe

# 3. Run app
cd ..\frontend
npm run tauri-dev
```

---

## ✅ Checklist Final

Antes de distribuir:

- [ ] Backend build exitoso
- [ ] Ejecutable funciona standalone
- [ ] Tauri inicia backend automáticamente
- [ ] Health check pasa
- [ ] Frontend detecta modo desktop
- [ ] API calls funcionan
- [ ] Base de datos SQLite se crea
- [ ] Logs aparecen correctamente
- [ ] No hay errores en consola
- [ ] App arranca en < 10 segundos

---

**Estado**: 80% Completado  
**Fecha**: 2026-01-09  
**Bloqueador**: Requiere testing en Windows real  
