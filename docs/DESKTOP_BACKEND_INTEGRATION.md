# Plan de Integración Backend Python para Desktop

## Objetivo

Empaquetar el backend FastAPI dentro de la aplicación Tauri para que funcione completamente offline.

## Estrategias Disponibles

### Opción 1: Sidecar Process (Recomendada) ⭐

**Ventajas:**

- Tauri tiene soporte nativo para sidecars
- El backend se empaqueta como binario
- Fácil comunicación entre Rust y Python

**Implementación:**

1. **Crear ejecutable Python con PyInstaller:**

```bash
cd backend
pip install pyinstaller
pyinstaller --onefile main.py --name ai-sysadmin-backend
```

1. **Configurar en tauri.conf.json:**

```json
{
  "bundle": {
    "externalBin": [
      "../../backend/dist/ai-sysadmin-backend"
    ]
  }
}
```

1. **Iniciar backend desde Rust:**

```rust
use tauri::api::process::{Command, CommandEvent};

let (mut rx, _child) = Command::new_sidecar("ai-sysadmin-backend")
    .expect("failed to create sidecar")
    .spawn()
    .expect("Failed to spawn backend");
```

### Opción 2: Embedded Python Interpreter

**Ventajas:**

- Mayor control sobre el entorno Python
- No requiere compilar a ejecutable

**Desventajas:**

- Más complejo de configurar
- Mayor tamaño de distribución

### Opción 3: Reescribir Backend en Rust

**Ventajas:**

- Un solo lenguaje
- Máximo rendimiento
- Menor tamaño de distribución

**Desventajas:**

- Mucho trabajo de refactorización
- Perderíamos el ecosistema Python

## Plan de Implementación - Fase 1

### 1. Preparar Backend para Desktop

**Cambios necesarios:**

- [ ] Base de datos: Cambiar de PostgreSQL a SQLite
- [ ] Configuración: Detectar modo desktop
- [ ] Autenticación: Modo local simplificado (opcional)
- [ ] Scripts: Crear empaquetador PyInstaller

**Archivo: `backend/desktop_config.py`**

```python
import os
from pathlib import Path

DESKTOP_MODE = os.getenv('DESKTOP_MODE') == 'true'

if DESKTOP_MODE:
    # Usar SQLite en la carpeta de datos del usuario
    import appdirs
    APP_NAME = "AI Sysadmin Agent"
    APP_AUTHOR = "YourCompany"
    
    data_dir = Path(appdirs.user_data_dir(APP_NAME, APP_AUTHOR))
    data_dir.mkdir(parents=True, exist_ok=True)
    
    DATABASE_URL = f"sqlite:///{data_dir}/database.db"
else:
    # Modo SaaS normal
    DATABASE_URL = os.getenv('DATABASE_URL')
```

### 2. Crear Script de Build

**Archivo: `backend/build_desktop.py`**

```python
import PyInstaller.__main__
import sys
import os

def build():
    PyInstaller.__main__.run([
        'main.py',
        '--onefile',
        '--name=ai-sysadmin-backend',
        '--add-data=templates:templates',
        '--add-data=static:static',
        '--hidden-import=uvicorn',
        '--hidden-import=fastapi',
        '--hidden-import=sqlalchemy',
        '--distpath=dist',
        '--clean',
    ])

if __name__ == '__main__':
    build()
```

### 3. Actualizar Tauri para Gestionar Backend

**Archivo: `frontend/src-tauri/src/lib.rs`**

```rust
use tauri::{Manager, api::process::{Command, CommandEvent}};
use std::sync::Mutex;

struct BackendProcess(Mutex<Option<std::process::Child>>);

#[tauri::command]
fn start_backend() -> Result<String, String> {
    // Iniciar backend Python
    let (mut rx, child) = Command::new_sidecar("ai-sysadmin-backend")
        .expect("failed to create backend sidecar")
        .spawn()
        .expect("Failed to spawn backend");
    
    Ok("Backend started".to_string())
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Iniciar backend automáticamente
            start_backend().unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![start_backend])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 4. Configuración del Frontend

El frontend debe detectar que está en modo desktop y usar `http://localhost:8000` en lugar de la API remota.

**Archivo: `frontend/src/config/api.ts`**

```typescript
const isDesktop = typeof window !== 'undefined' && 
                  (window as any).__TAURI__;

export const API_URL = isDesktop 
    ? 'http://localhost:8000/api/v1'
    : process.env.NEXT_PUBLIC_API_URL || '/api/v1';
```

## Tareas Pendientes

### Alta Prioridad

- [ ] Configurar PyInstaller para empaquetar backend
- [ ] Adaptar base de datos para usar SQLite en desktop
- [ ] Integrar backend como sidecar en Tauri
- [ ] Crear detección automática de modo desktop en frontend

### Media Prioridad

- [ ] Auto-inicio del backend al abrir la app
- [ ] Manejo de errores si el backend falla
- [ ] Sistema de logs para debugging

### Baja Prioridad

- [ ] Auto-actualizaciones de la app
- [ ] Instalador personalizado con logos
- [ ] Notificaciones del sistema
- [ ] Deep linking (tauri://)

## Cronograma Estimado

1. **Semana 1**: Configuración básica de Tauri (✅ COMPLETADO)
2. **Semana 2**: Empaquetar backend Python con PyInstaller
3. **Semana 3**: Integrar backend como sidecar
4. **Semana 4**: Testing y pulido de la experiencia

## Notas

- Mantener el código del SaaS intacto
- Usar variables de entorno para diferenciar modos
- Documentar bien cada paso para futuros desarrollos
