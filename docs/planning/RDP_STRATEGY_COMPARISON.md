# Comparación de Estrategias: RDP Embebido 100% Funcional

**Fecha**: 2026-01-23  
**Objetivo**: Determinar mejor arquitectura para RDP embebido

---

## Opciones en Evaluación

### Opción 1: IronRDP + WebAssembly (Pure Rust)

### Opción 2: Apache Guacamole Sidecar (guacd)

### Opción 3: Window Capture (FreeRDP visible)

---

## Análisis Detallado

### ⚙️ Opción 1: IronRDP + WebAssembly

**Cómo funciona**:

```
Rust Backend (IronRDP) → Frames RGB → Tauri Event → React Canvas
                ↑
         Keyboard/Mouse Input
```

**Pros**:

- ✅ Pure Rust - No dependencias externas
- ✅ Mejor integración con Tauri
- ✅ Control total del protocolo
- ✅ WASM permite lógica en frontend si necesario
- ✅ Performance nativa

**Contras**:

- ❌ **BLOQUEADO**: Conflictos de dependencias (recordar `picky_asn1` error)
- ⚠️ Crates de IronRDP en desarrollo activo (API inestable)
- ⚠️ Requiere expertise en RDP protocol
- ⚠️ Debugging complejo

**Estado Actual**:
Ya intentamos esto en fases anteriores:

```toml
ironrdp = "0.5"
ironrdp-connector = "0.1"
```

**Error obtenido**:

```
error: two different versions of crate `picky_asn1` are being used
```

**¿Solución posible?**

- Usar versión específica de git:

  ```toml
  ironrdp = { git = "https://github.com/Devolutions/IronRDP", rev = "COMMIT_HASH" }
  ```

- Contactar maintainers para fix
- Esperar release stable

**Timeline si desbloqueamos**:

- 1 día: Resolver dependencias
- 2-3 días: Implementar rendering
- 1-2 días: Input handling
- **Total: 4-6 días**

**Riesgo**: ⚠️ ALTO (puede no resolver conflictos)

---

### 🌐 Opción 2: Apache Guacamole Sidecar

**Cómo funciona**:

```
React (guacamole-common-js) → WebSocket → guacd (sidecar) → RDP Server
                                             ↑
                                    Empaquetado en Tauri
```

**Arquitectura**:

```rust
// src-tauri/src/guacamole_manager.rs
fn spawn_guacd() -> Result<Child> {
    let guacd_path = resolve_resource("binaries/guacd.exe")?;
    Command::new(guacd_path)
        .arg("--listen-port")
        .arg("4822")
        .spawn()
}
```

```tsx
// Frontend
import Guacamole from 'guacamole-common-js';

const client = new Guacamole.Client(
    new Guacamole.WebSocketTunnel('ws://localhost:4822')
);

client.connect(`
    connection-type=rdp
    &hostname=${host}
    &username=${user}
    &password=${pass}
`);

const display = client.getDisplay();
canvasRef.current.appendChild(display.getElement());
```

**Pros**:

- ✅ **Battle-tested**: Usado en producción por miles de empresas
- ✅ **Feature-complete**: Soporta RDP, VNC, SSH, Telnet
- ✅ **Clipboard, Audio, Files**: Todo funciona out-of-the-box
- ✅ **Multi-protocolo**: Bonus - también tendrías VNC gratis
- ✅ **Documentación extensa**
- ✅ **Active development**: Apache project con comunidad grande

**Contras**:

- ⚠️ Dependencia externa (guacd binary)
- ⚠️ Empaquetado más complejo (~20MB adicional)
- ⚠️ WebSocket overhead (mínimo, pero existe)
- ⚠️ Requiere gestión de proceso guacd

**Implementación**:

**Día 1**: Setup guacd

```bash
# Windows build de guacd
choco install guacamole-server
# O descargar pre-built binary
```

**Día 2**: Frontend integration

```bash
npm install guacamole-common-js
```

**Día 3**: Keyboard/Mouse perfect mapping

**Día 4**: Clipboard + File transfer

**Timeline**:

- **Total: 4 días** (muy predecible)

**Riesgo**: 🟢 BAJO (tecnología probada)

---

### 🪟 Opción 3: Window Capture (FreeRDP + Desktop Duplication API)

**Cómo funciona**:

```
FreeRDP (ventana oculta) → Desktop Duplication API → Capture frames → Canvas
                ↑
        PostMessage/SendInput
```

**Arquitectura**:

```rust
// Windows Desktop Duplication API
use windows::Win32::Graphics::Dxgi::*;

impl WindowCapture {
    fn capture_frame(&self) -> Result<Vec<u8>> {
        let output = self.adapter.EnumOutputs(0)?;
        let output1: IDXGIOutput1 = output.cast()?;
        
        let duplication = output1.DuplicateOutput(self.device)?;
        
        let mut frame_info = Default::default();
        let mut desktop_resource = None;
        
        duplication.AcquireNextFrame(
            50, // timeout ms
            &mut frame_info,
            &mut desktop_resource
        )?;
        
        // Convert to RGB bytes
        // ...
    }
}
```

**Pros**:

- ✅ Funciona **garantizado** (no depende de bugs de terceros)
- ✅ FreeRDP ya instalado
- ✅ Desktop Duplication API es hardware accelerated
- ✅ ~60 FPS posible

**Contras**:

- ❌ Ventana debe estar "visible" (aunque oculta)
- ⚠️ Performance overhead de capture continuo
- ⚠️ Sólo funciona en Windows (necesitas alternativa para Linux)
- ⚠️ Más código custom

**Timeline**:

- **Total: 4 días**

**Riesgo**: 🟢 BAJO (API estable de Windows)

---

## Comparación Directa

| Criterio | IronRDP | Guacamole | Window Capture |
|----------|---------|-----------|----------------|
| **Complejidad** | Alta | Media | Media |
| **Riesgo** | 🔴 Alto | 🟢 Bajo | 🟢 Bajo |
| **Performance** | ⚡ Excelente | ⚡ Buena | ⚡ Buena |
| **Features** | ⚠️ Básico | ✅ Completo | ✅ Completo |
| **Mantenimiento** | 🔴 Difícil | 🟢 Fácil | 🟡 Medio |
| **Bundle Size** | Pequeño | +20MB | Pequeño |
| **Multi-plataforma** | ✅ Sí | ✅ Sí | ❌ Windows only |
| **Clipboard** | ❌ Manual | ✅ Built-in | ⚠️ Manual |
| **Audio** | ❌ Manual | ✅ Built-in | ✅ Gratis (FreeRDP) |
| **Files Transfer** | ❌ Manual | ✅ Built-in | ✅ Gratis (FreeRDP) |
| **Time to MVP** | ❓ Incierto | 4 días | 4 días |
| **Bloqueadores** | Picky_asn1 | Ninguno | Ninguno |

---

## Recomendación Final

### 🏆 **Opción 2: Apache Guacamole Sidecar**

**Razones**:

1. **Cero Riesgo de Bloqueo**
   - IronRDP tiene dependencias rotas
   - Guacamole es Apache project estable
   - Window Capture funciona pero limitado

2. **Feature Completo**

   ```
   ✅ RDP rendering
   ✅ Clipboard bidireccional
   ✅ Audio redirection
   ✅ File transfer
   ✅ Multi-monitor
   ✅ Printer redirection
   ✅ BONUS: VNC, SSH también disponibles
   ```

3. **Usado en Producción**
   - Empresas Fortune 500 usan Guacamole
   - Décadas de bug fixes
   - Seguridad auditada

4. **Timeline Predecible**
   - 4 días garantizados
   - Documentación clara
   - Ejemplos abundantes

5. **Escalabilidad**

   ```
   Hoy: RDP a Windows
   Mañana: VNC a Linux
   Futuro: SSH terminal mejorado
   Bonus: Telnet, Kubernetes exec
   ```

---

## Plan de Implementación: Guacamole

### Día 1: Setup Backend

**1.1. Obtener guacd binary**

```bash
# Windows
choco install guacamole-server

# O download pre-built
# https://guacamole.apache.org/releases/
```

**1.2. Crear guacamole_manager.rs**

```rust
use std::process::{Command, Child};
use tauri::api::process::Command as TauriCommand;

pub struct GuacamoleManager {
    guacd_process: Option<Child>,
    port: u16,
}

impl GuacamoleManager {
    pub fn start(&mut self) -> Result<()> {
        let guacd_path = resolve_resource("binaries/guacd.exe")?;
        
        let child = Command::new(guacd_path)
            .arg("-f")  // foreground
            .arg("-b")  // bind address
            .arg("127.0.0.1")
            .arg("-l")  // listen port
            .arg(self.port.to_string())
            .spawn()?;
        
        self.guacd_process = Some(child);
        Ok(())
    }
}
```

### Día 2: Frontend Integration

**2.1. Install dependencies**

```bash
npm install guacamole-common-js
npm install @types/guacamole-common-js
```

**2.2. Create GuacamoleCanvas component**

```tsx
import Guacamole from 'guacamole-common-js';

export function GuacamoleCanvas({ host, username, password }) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const clientRef = useRef<Guacamole.Client | null>(null);
    
    useEffect(() => {
        const tunnel = new Guacamole.WebSocketTunnel('ws://localhost:4822');
        const client = new Guacamole.Client(tunnel);
        
        client.connect(`connection-type=rdp&hostname=${host}&username=${username}&password=${password}`);
        
        client.onstatechange = (state) => {
            if (state === Guacamole.Client.State.CONNECTED) {
                console.log('Connected!');
            }
        };
        
        const display = client.getDisplay();
        canvasRef.current.appendChild(display.getElement());
        
        // Mouse
        const mouse = new Guacamole.Mouse(display.getElement());
        mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = 
            (state) => client.sendMouseState(state);
        
        // Keyboard
        const keyboard = new Guacamole.Keyboard(document);
        keyboard.onkeydown = (keysym) => client.sendKeyEvent(1, keysym);
        keyboard.onkeyup = (keysym) => client.sendKeyEvent(0, keysym);
        
        clientRef.current = client;
        
        return () => {
            client.disconnect();
        };
    }, [host, username, password]);
    
    return <div ref={canvasRef} className="w-full h-full" />;
}
```

### Día 3: Polish

- Clipboard integration
- Error handling
- Reconnection logic

### Día 4: Testing

- Multi-sesión testing
- Performance optimization
- Edge cases

---

## Contingencia: Si IronRDP se Desbloquea

Si alguien arregla `picky_asn1`:

1. **Mantener Guacamole** como opción de usuario
2. **Agregar IronRDP** como opción experimental
3. **Dejar elegir** en settings

---

## Decisión

**Proceder con Opción 2: Apache Guacamole**

¿Comenzamos la implementación?
