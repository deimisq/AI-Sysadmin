# Plan de Implementación: RDP 100% Funcional Embebido

**Objetivo**: RDP completamente interactivo dentro de la app, equivalente a mstsc.exe

---

## Desafío Técnico

FreeRDP normalmente abre una ventana GUI. Para embedirlo necesitamos:

1. Capturar frames del buffer de FreeRDP
2. Enviar input (mouse/keyboard) al proceso FreeRDP

---

## Soluciones Posibles

### Opción 1: FreeRDP con Frame Export (INVESTIGAR)

**Parámetros potenciales de wfreerdp**:

```bash
wfreerdp /v:host /u:user /p:pass \
  /video-child:0          # Redirige video a child process
  /gfx:RFX                # RemoteFX codec
  /rfx                    # Habilita RemoteFX
```

**Investigar**:

- [ ] `/video` - Video output options
- [ ] `/gfx` - Graphics pipeline modes
- [ ] Si hay modo "offscreen rendering"

### Opción 2: Window Capture (FALLBACK)

Si FreeRDP no tiene modo headless:

**Windows**:

```rust
// Capturar ventana de FreeRDP usando Windows API
use windows::Win32::Graphics::Gdi::*;

1. Spawn FreeRDP normal
2. FindWindow("RAIL_WINDOW", ...)
3. BitBlt() loop para copiar pixels
4. Convertir a RGB y enviar a canvas
```

**Ventajas**:

- ✅ Funciona con cualquier versión de FreeRDP
- ✅ No requiere modificaciones a FreeRDP

**Desventajas**:

- ⚠️ Performance overhead (screenshots continuos)
- ⚠️ Ventana debe estar visible (puede ocultarse fuera de pantalla)

### Opción 3: libfreerdp Integration (COMPLEJO)

Usar la biblioteca de FreeRDP directamente:

```rust
// Bindings a libfreerdp
use freerdp_sys::*; // Crear FFI bindings

// Control total sobre rendering
fn rdp_update_callback(frame: &RdpFrame) {
    // Recibir frames directamente
    send_to_canvas(frame);
}
```

**Ventajas**:

- ✅ Máximo control
- ✅ Mejor performance
- ✅ Acceso a todas las features

**Desventajas**:

- ❌ Requiere crear Rust bindings a libfreerdp (semanas de trabajo)
- ❌ Complejidad muy alta
- ❌ Mantenimiento difícil

---

## Decisión: Opción 2 (Window Capture) - IMPLEMENTACIÓN RÁPIDA

### Implementación

#### Fase 1: Window Capture (Windows)

```rust
// src-tauri/src/rdp_window_capture.rs

use windows::Win32::Foundation::*;
use windows::Win32::Graphics::Gdi::*;
use windows::Win32::UI::WindowsAndMessaging::*;

pub struct WindowCapture {
    hwnd: HWND,
    width: u32,
    height: u32,
}

impl WindowCapture {
    pub fn find_freerdp_window(pid: u32) -> Result<HWND> {
        // Buscar ventana de FreeRDP por PID
        unsafe {
            EnumWindows(Some(enum_callback), LPARAM(pid as isize))
        }
    }
    
    pub fn capture_frame(&self) -> Result<Vec<u8>> {
        unsafe {
            let hdc_window = GetDC(self.hwnd);
            let hdc_mem = CreateCompatibleDC(hdc_window);
            let hbitmap = CreateCompatibleBitmap(hdc_window, self.width as i32, self.height as i32);
            
            SelectObject(hdc_mem, hbitmap);
            
            // Copiar pixels
            BitBlt(
                hdc_mem,
                0, 0,
                self.width as i32,
                self.height as i32,
                hdc_window,
                0, 0,
                SRCCOPY,
            );
            
            // Extraer pixels a Vec<u8>
            let mut pixels = vec![0u8; (self.width * self.height * 4) as usize];
            GetDIBits(
                hdc_mem,
                hbitmap,
                0,
                self.height,
                pixels.as_mut_ptr() as *mut _,
                &mut bmi,
                DIB_RGB_COLORS,
            );
            
            // Cleanup
            DeleteObject(hbitmap);
            DeleteDC(hdc_mem);
            ReleaseDC(self.hwnd, hdc_window);
            
            Ok(pixels)
        }
    }
}
```

#### Fase 2: Input Forwarding

```rust
// Enviar eventos al proceso FreeRDP

pub fn send_mouse_event(hwnd: HWND, x: i32, y: i32, button: MouseButton) {
    unsafe {
        PostMessageW(
            hwnd,
            match button {
                MouseButton::Left => WM_LBUTTONDOWN,
                MouseButton::Right => WM_RBUTTONDOWN,
                _ => WM_MOUSEMOVE,
            },
            WPARAM(0),
            LPARAM(((y << 16) | x) as isize),
        );
    }
}

pub fn send_key_event(hwnd: HWND, key: VirtualKey, down: bool) {
    unsafe {
        PostMessageW(
            hwnd,
            if down { WM_KEYDOWN } else { WM_KEYUP },
            WPARAM(key as usize),
            LPARAM(0),
        );
    }
}
```

#### Fase 3: Ocultar Ventana FreeRDP

```rust
// Mover ventana fuera de pantalla pero mantenerla renderizando
unsafe {
    SetWindowPos(
        hwnd,
        None,
        -10000, // X fuera de pantalla
        -10000, // Y fuera de pantalla
        width as i32,
        height as i32,
        SWP_NOACTIVATE | SWP_NOZORDER,
    );
}
```

---

## Timeline para Opción 2

### Día 1: Window Capture

- [x] Crear `rdp_window_capture.rs`
- [ ] Implementar `FindWindow` para FreeRDP
- [ ] Implementar `BitBlt` capture loop
- [ ] Testear captura de frames

### Día 2: Frame Streaming

- [ ] Integrar con sistema existente de frames
- [ ] Reemplazar mock generator con real frames
- [ ] Optimizar frame rate (target 30 FPS)

### Día 3: Input Handling

- [ ] Mouse events en Canvas → Tauri Command
- [ ] Conversion de coordenadas
- [ ] PostMessage a ventana FreeRDP
- [ ] Keyboard events

### Día 4: Polish

- [ ] Performance tuning
- [ ] Error handling
- [ ] Reconnection logic
- [ ] Testing extensivo

**Tiempo total**: 4 días para MVP funcional

---

## Alternativa: Investigación de FreeRDP Headless

Antes de implementar Window Capture, voy a:

1. **Revisar documentación de wfreerdp** para opciones headless
2. **Probar parámetros** `/video`, `/gfx`, `/gdi`
3. **Ver si hay modo framebuffer** que podamos leer

Si encuentro modo headless nativo, será mejor que Window Capture.

---

## Acción Inmediata

¿Quieres que:

**A)** Investigue primero opciones headless de FreeRDP (2-3 horas)
**B)** Vaya directo a implementar Window Capture (4 días)
**C)** Combinación: investigar rápido, si no hay headless → Window Capture

Recomiendo **Opción C**.
