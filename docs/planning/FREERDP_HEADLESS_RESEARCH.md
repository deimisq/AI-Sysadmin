# Investigación: FreeRDP Headless/Framebuffer Options

**Fecha**: 2026-01-23  
**Objetivo**: Encontrar método para capturar frames de FreeRDP sin ventana GUI

---

## Opciones Conocidas de FreeRDP

### 1. Opciones de Graphics Pipeline

FreeRDP soporta varios modos gráficos:

```bash
# RemoteFX
/gfx:rfx               # RemoteFX codec
/rfx                   # Legacy RemoteFX

# AVC/H.264
/gfx:avc420            # H.264 codec
/gfx:avc444            # H.264 high quality

# Software rendering
/gdi:sw                # Software GDI
/gdi:hw                # Hardware GDI
```

### 2. Opciones de Display

```bash
# Window control
/window-position:x,y   # Posición de ventana
/size:WIDTHxHEIGHT     # Tamaño
/monitors:0,1          # Multi-monitor

# Decorations
-decorations           # Sin bordes de ventana
/window-drag           # Permitir arrastrar
```

### 3. Opciones Potenciales para Headless

#### Opción A: `/video-child` (Linux)

En Linux, xfreerdp tiene:

```bash
xfreerdp /v:host /u:user /video-child:0
```

Esto redirige el video a un child process. **Investigar si existe en Windows wfreerdp**.

#### Opción B: `/dump` o `/screenshot`

Algunos builds de FreeRDP tienen:

```bash
--dump-fps <fps>       # Dump frames a archivos
--screenshot <path>     # Screenshot continuous
```

**Estado**: No confirmado en versión estándar.

#### Opción C: Sin decoraciones + Oculta

```bash
wfreerdp /v:host /u:user /p:pass \
  -decorations \
  /window-position:-10000,-10000 \
  /size:1920x1080
```

Ventana sin bordes, fuera de pantalla → podemos capturarla.

### 4. Modos de Rendering Backend

```bash
/gdi:sw          # Software rendering (más lento, más compatible)
/gdi:hw          # Hardware rendering (más rápido)
```

---

## Investigación Práctica

### Test 1: Verificar opciones disponibles

**Comando**:

```cmd
wfreerdp --help > freerdp_options.txt
```

**Buscar**:

- `headless`
- `offscreen`
- `framebuffer`
- `video`
- `dump`
- `screenshot`

### Test 2: Intentar spawn sin ventana

**Hipótesis**: ¿Podemos redirigir output a named pipe?

```cmd
wfreerdp /v:192.168.1.100 /u:admin /p:pass /gfx:rfx /gdi:sw
```

¿Genera algún output que podamos leer?

### Test 3: Check environment variables

FreeRDP podría tener variables de entorno:

```cmd
set FREERDP_VIDEO_OUTPUT=pipe://rdp_frames
set FREERDP_HEADLESS=1
wfreerdp ...
```

---

## Hallazgos Conocidos (Documentación Oficial)

### FreeRDP 2.x Architecture

FreeRDP tiene estos componentes:

1. **libfreerdp-client** - API de cliente
2. **libfreerdp-core** - Core RDP protocol
3. **libfreerdp-gdi** - Graphics Device Interface
4. **libfreerdp-codec** - Codecs (RemoteFX, etc.)

**Posibilidad**: Usar libfreerdp directamente con custom rendering backend.

### Shadow Server Mode

FreeRDP tiene "shadow server" que permite:

- Conectar a una sesión RDP
- Re-transmitir a otros clientes

**Arquitectura**:

```
App → FreeRDP Shadow Server → Real RDP Server
                ↓
         Capture frames aquí
```

**Comando**:

```bash
freerdp-shadow-cli /server:RDP_HOST /user:USER /password:PASS /port:33389
```

Luego conectamos desde nuestra app al shadow server local.

---

## Soluciones Alternativas Encontradas

### Solución 1: FreeRDP con X11 Virtual Framebuffer (Linux only)

```bash
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
xfreerdp /v:host /u:user /p:pass
# Capturar frames de Xvfb
```

**Problema**: Solo Linux, no Windows.

### Solución 2: FreeRDP Proxy Mode

FreeRDP puede actuar como proxy:

```
wfreerdp /proxy:type:socks5,hostname:localhost,port:1080
```

Si implementamos un proxy que intercepte el stream...

**Problema**: Muy complejo.

### Solución 3: Windows Desktop Duplication API

En lugar de capturar ventana FreeRDP, capturar el escritorio completo:

```rust
use windows::Win32::Graphics::Dxgi::*;

// Desktop Duplication API (más eficiente que BitBlt)
let output_duplication = output.DuplicateOutput(device)?;
let desktop_frame = output_duplication.AcquireNextFrame(...)?;
```

**Ventajas**:

- Más eficiente que BitBlt
- Hardware accelerated

**Desventaja**:

- Captura TODO el escritorio, no solo FreeRDP

---

## Decisión Basada en Investigación

### Si encontramos opción headless nativa

✅ **USAR ESA** - Será la más eficiente

### Si NO HAY opción headless

✅ **Window Capture con optimizaciones**:

1. **Desktop Duplication API** (si está disponible)
   - Hardware accelerated
   - ~60 FPS posible

2. **BitBlt** (fallback)
   - Software capture
   - ~30 FPS razonable

3. **Ventana oculta**:

   ```rust
   SetWindowPos(hwnd, _, -10000, -10000, ...);
   ```

---

## Script de Prueba

Crear archivo `test_headless.bat`:

```batch
@echo off
REM Test various FreeRDP configurations

echo Testing standard connection:
wfreerdp /v:test.server.com /u:demo /cert:ignore /timeout:5000

echo.
echo Testing with window offscreen:
wfreerdp /v:test.server.com /u:demo ^
  /window-position:-10000,-10000 ^
  -decorations ^
  /cert:ignore

echo.
echo Testing with GDI software:
wfreerdp /v:test.server.com /u:demo ^
  /gdi:sw ^
  /cert:ignore

echo.
echo Check if any of these generated output files or logs
dir /b *.log 2>nul
dir /b *.dump 2>nul
```

---

## Próximos Pasos

1. **Ejecutar** `investigate-freerdp-headless.bat` en tu máquina
2. **Revisar** `freerdp_help.txt` generado
3. **Compartir** output aquí para analizar
4. **Decidir**:
   - Si hay headless → Implementar eso
   - Si no hay → Window Capture API

---

## Pregunta para Ti

**¿Puedes ejecutar el script `investigate-freerdp-headless.bat` y compartir el output?**

Específicamente busco si aparece:

- `/video-child`
- `/headless`
- `/dump-fps`
- `/offscreen`
- Cualquier opción de export/output

Eso me dirá si podemos evitar Window Capture.
