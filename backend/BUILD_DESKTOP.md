# 🐍 Backend Python - Build para Desktop

## Guía para construir el backend como ejecutable

Esta guía explica cómo empaquetar el backend FastAPI en un ejecutable standalone para la aplicación desktop de Tauri.

---

## 📋 Requisitos

### Software Necesario

- **Python 3.10+**
- **pip** (gestor de paquetes)
- **Virtual environment** (recomendado)

### En Windows Además

- **Visual Studio Build Tools** (si usa dependencias compiladas)

---

## 🚀 Proceso de Build

### 1. Crear Entorno Virtual (Recomendado)

```bash
# Desde la carpeta backend/
python -m venv venv

# Activar (Windows)
venv\Scripts\activate

# Activar (Linux/Mac)
source venv/bin/activate
```

### 2. Instalar Dependencias

```bash
# Instalar dependencias de desktop (incluye PyInstaller)
pip install -r requirements-desktop.txt
```

### 3. Ejecutar el Build

```bash
# Construir el ejecutable
python build_desktop.py
```

Este proceso:

- ✅ Compila Python a bytecode
- ✅ Empaqueta todas las dependencias
- ✅ Incluye intérprete Python
- ✅ Crea ejecutable standalone

**Tiempo estimado:**

- Primera vez: 10-20 minutos
- Siguientes: 5-10 minutos

### 4. Resultado

El ejecutable se crea en:

```
backend/dist/
├── ai-sysadmin-backend.exe    (Windows)
└── ai-sysadmin-backend         (Linux/Mac)
```

---

## 🧪 Probar el Ejecutable

### Ejecución Manual

```bash
# Navegar a dist/
cd dist

# Windows
ai-sysadmin-backend.exe

# Linux/Mac
./ai-sysadmin-backend
```

Deberías ver:

```
====================================================
🚀 AI Sysadmin Agent - Desktop Backend
====================================================
Server: http://127.0.0.1:8000
API Docs: http://127.0.0.1:8000/docs
Desktop Mode: ✅ Enabled
====================================================
```

### Verificar Funcionamiento

1. Abrir navegador en `http://127.0.0.1:8000/docs`
2. Verificar que la API responde
3. Probar endpoint `/health`

---

## 📁 Estructura de Archivos

### Archivos de Build

| Archivo | Propósito |
|---------|-----------|
| `desktop_main.py` | Punto de entrada del ejecutable |
| `desktop_config.py` | Configuración modo desktop |
| `build_desktop.py` | Script de build PyInstaller |
| `runtime_hook.py` | Hook de inicialización |
| `requirements-desktop.txt` | Dependencias desktop |

### Configuración Automática

El modo desktop se detecta automáticamente cuando:

1. Variable de entorno `DESKTOP_MODE=true`
2. PyInstaller bundle detectado (`sys.frozen`)

### Database en Desktop

**Ubicación automática:**

- **Windows**: `%APPDATA%/AI Sysadmin Agent/database.db`
- **macOS**: `~/Library/Application Support/AI Sysadmin Agent/database.db`
- **Linux**: `~/.local/share/ai-sysadmin-agent/database.db`

---

## 🎨 Diferencias Desktop vs SaaS

| Aspecto | SaaS | Desktop |
|---------|------|---------|
| **Base de datos** | PostgreSQL | SQLite |
| **Host** | 0.0.0.0 | 127.0.0.1 |
| **Auth** | Completa | Simplificada |
| **Logs** | `/var/log/` | AppData/logs/ |
| **Config** | `/etc/` | AppData/config/ |

---

## 🐛 Troubleshooting

### Error: "ModuleNotFoundError"

**Causa:** PyInstaller no detectó un módulo

**Solución:**

1. Editar `build_desktop.py`
2. Agregar en `--hidden-import=nombre_modulo`
3. Rebuild

Ejemplo:

```python
'--hidden-import=mi_modulo',
```

### Error: "Database is locked"

**Causa:** SQLite con múltiples conexiones

**Solución:**
Ya configurado en `database.py`:

```python
connect_args={"check_same_thread": False}
```

### Ejecutable muy grande (>500MB)

**Causa:** Dependencias innecesarias incluidas

**Solución:**

1. Agregar exclusiones en `build_desktop.py`
2. Usar `--exclude-module=modulo_pesado`
3. Eliminar dependencias no usadas

### Error al iniciar: "Failed to initialize"

**Causa:** Archivos de datos no incluidos

**Solución:**
Agregar en `build_desktop.py`:

```python
'--add-data=ruta/origen:ruta/destino',
```

---

## 📊 Tamaño del Ejecutable

### Típico

- **Windows**: ~80-150 MB
- **Linux**: ~70-130 MB
- **macOS**: ~75-135 MB

### Optimizaciones Aplicadas

- ✅ Nivel de optimización Python: 2
- ✅ Excluye: matplotlib, numpy, pandas, PIL
- ✅ Compresión UPX (opcional)
- ✅ Solo dependencias necesarias

---

## 🔄 Actualizar el Build

Cuando cambies código del backend:

```bash
# 1. Activar entorno virtual
venv\Scripts\activate

# 2. Si cambiastelibs, reinstalar
pip install -r requirements-desktop.txt

# 3. Rebuild
python build_desktop.py

# 4. El nuevo ejecutable estará en dist/
```

---

## 🎯 Próximo Paso

Una vez que tengas el ejecutable:

1. **Probarlo manualmente** (esta sección)
2. **Integrarlo en Tauri** como sidecar
3. **Configurar auto-inicio**
4. **Empaquetar todo** en el instalador

Ver: [../docs/DESKTOP_BACKEND_INTEGRATION.md](../docs/DESKTOP_BACKEND_INTEGRATION.md) para integración con Tauri.

---

## 🔐 Notas de Seguridad

### Modo Desktop

- ✅ Solo escucha en `127.0.0.1` (localhost)
- ✅ No acepta conexiones externas
- ✅ Base de datos local cifrada (planeado)
- ✅ Credenciales en AppData protegido

### Producción

- ⚠️ No exponer el puerto 8000 públicamente
- ⚠️ Usar firewall si es necesario
- ⚠️ Actualizar regularmente

---

## 📝 Scripts Útiles

### Build Script Completo (Windows)

```batch
@echo off
echo Building AI Sysadmin Agent Backend...

cd /d %~dp0
call venv\Scripts\activate
python build_desktop.py

echo.
echo Build complete! Execute is in dist/
pause
```

Guardar como `build.bat`

### Build Script (Linux/Mac)

```bash
#!/bin/bash
echo "Building AI Sysadmin Agent Backend..."

cd "$(dirname "$0")"
source venv/bin/activate
python build_desktop.py

echo ""
echo "Build complete! Executable is in dist/"
```

Guardar como `build.sh` y dar permisos: `chmod +x build.sh`

---

## ✅ Checklist de Build

Antes de distribuir:

- [ ] Build exitoso sin errores
- [ ] Ejecutable se inicia correctamente
- [ ] API responde en `/health`
- [ ] Base de datos SQLite se crea
- [ ] Logs se escriben correctamente
- [ ] No hay imports faltantes
- [ ] Tamaño razonable (<200MB)
- [ ] Probado en sistema limpio

---

## 🎉 ¡Listo

El backend está empaquetado y listo para integrarse con Tauri.

**Siguiente:** Configurar Tauri para que inicie este ejecutable automáticamente.
