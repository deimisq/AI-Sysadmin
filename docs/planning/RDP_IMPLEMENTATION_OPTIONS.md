# RDP Implementation Options for AI SysAdmin Desktop

**Fecha**: 2026-01-23  
**Estado**: Análisis Técnico  
**Objetivo**: Renderizar RDP dentro de la aplicación Tauri

---

## Situación Actual

### ✅ Completado

- Conexión TCP a puerto 3389
- Lanzamiento de cliente RDP nativo (mstsc.exe)
- Auto-login con credenciales almacenadas
- UI preparada para RDP

### ❌ Bloqueado

- **IronRDP**: Conflictos de dependencias internas
  - Error: `picky_asn1` v0.9 vs v0.10
  - Crate `sspi` requiere versiones incompatibles
  - No compila con `ironrdp 0.5`

---

## Opciones Analizadas

### Opción 1: IronRDP (Pure Rust) ❌

**Repositorio**: <https://github.com/Devolutions/IronRDP>  
**Estado**: Activo pero inestable

#### Problema Principal

```toml
# Cargo.toml intento
ironrdp = "0.5"
ironrdp-tokio = "0.1"
ironrdp-connector = "0.1"
```

**Error de Compilación**:

```
error[E0308]: mismatched types
  --> sspi-0.14.2/src/pku2u/generators.rs
  |
  | expected `ExplicitContextTag1<OctetStringAsn1>`, 
  | found a different `ExplicitContextTag1<OctetStringAsn1>`
  |
  = note: two different versions of crate `picky_asn1` are being used
```

#### Posibles Soluciones IronRDP

1. **Usar versión específica del git**:

   ```toml
   ironrdp = { git = "https://github.com/Devolutions/IronRDP", rev = "abc123" }
   ```

   - Buscar commit específico que compile
   - Alto riesgo de breaking changes

2. **Contribuir PR** para arreglar dependencias
   - Tiempo estimado: 2-4 semanas
   - Requiere expertise en RDP protocol

3. **Esperar release estable**
   - IronRDP aún en desarrollo activo
   - No hay garantía de timeline

**Veredicto**: ❌ No viable a corto plazo

---

### Opción 2: FreeRDP Sidecar ⭐ RECOMENDADO

**Repositorio**: <https://github.com/FreeRDP/FreeRDP>  
**Madurez**: Producción (usado por Remmina, xrdp, etc.)

#### Arquitectura Propuesta

```
┌──────────────────────────────────────────┐
│ Tauri Frontend (React + Canvas)         │
│ - Renderiza frames RGB                   │
│ - Captura input (mouse/keyboard)         │
└──────────────┬───────────────────────────┘
               │ Tauri Events
               │ - "rdp_frame" → bitmap
               │ - Commands → input
┌──────────────▼───────────────────────────┐
│ Rust Backend                             │
│ - Spawn FreeRDP con parámetros custom    │
│ - Lee frames vía shared memory / socket  │
│ - Convierte a eventos Tauri              │
└──────────────┬───────────────────────────┘
               │ IPC / Shared Memory
┌──────────────▼───────────────────────────┐
│ FreeRDP Process (xfreerdp / wfreerdp)    │
│ - /v:host /u:user /p:pass                │
│ - /headless (sin ventana)                │
│ - /video-stream:file://output.pipe       │
└──────────────────────────────────────────┘
```

#### Ventajas

- ✅ **Estable**: Battle-tested en millones de instalaciones
- ✅ **Completo**: Soporta RDP 10, RemoteFX, audio, clipboard
- ✅ **Mantenido**: Updates frecuentes
- ✅ **Multiplataforma**: Windows, Linux, macOS

#### Desventajas

- ⚠️ **Dependencia externa**: Requiere FreeRDP instalado
- ⚠️ **Empaquetado**: Necesita distribución del binario
- ⚠️ **IPC Complexity**: Comunicación proceso-a-proceso

#### Implementación Técnica

**1. Detección/Instalación**

```rust
// src-tauri/src/rdp_sidecar.rs
fn check_freerdp_installed() -> Result<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        // Check bundled wfreerdp.exe
        let bundled = resolve_resource("binaries/wfreerdp.exe")?;
        if bundled.exists() { return Ok(bundled); }
    }
    
    #[cfg(target_os = "linux")]
    {
        which::which("xfreerdp")
    }
}
```

**2. Spawn con captura de frames**

```rust
async fn spawn_rdp_session(host: String, user: String, pass: String) -> Result<RdpSession> {
    let mut cmd = Command::new(freerdp_path);
    cmd.arg(format!("/v:{}", host))
       .arg(format!("/u:{}", user))
       .arg(format!("/p:{}", pass))
       .arg("/headless")
       .arg("/video-stream:pipe://rdp_frames")
       .arg("/size:1920x1080")
       .arg("/bpp:32");
    
    let child = cmd.spawn()?;
    
    // Read frames from named pipe
    let frame_reader = FrameReader::new("rdp_frames")?;
    
    Ok(RdpSession { child, frame_reader })
}
```

**3. Stream frames a Frontend**

```rust
async fn stream_frames_to_frontend(app: AppHandle, mut reader: FrameReader) {
    while let Some(frame) = reader.read_frame().await {
        // Encode frame as base64 or binary
        app.emit_all("rdp_frame", RdpFrame {
            width: frame.width,
            height: frame.height,
            data: frame.rgb_data,
        }).ok();
    }
}
```

**4. Frontend Canvas**

```tsx
// RDPCanvas.tsx
const RDPCanvas = ({ sessionId }: { sessionId: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const unlisten = listen<RdpFrame>('rdp_frame', (event) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const imageData = ctx.createImageData(event.payload.width, event.payload.height);
            imageData.data.set(event.payload.data);
            ctx.putImageData(imageData, 0, 0);
        });
        
        return () => { unlisten.then(f => f()); };
    }, [sessionId]);
    
    return <canvas ref={canvasRef} width={1920} height={1080} />;
};
```

#### Empaquetado en Tauri

**Cargo.toml**:

```toml
[package.metadata.tauri.bundle]
resources = [
    "binaries/wfreerdp.exe",  # Windows
    "binaries/xfreerdp",       # Linux
]
```

**Build Script** (Linux):

```bash
# Download/compile FreeRDP portable
wget https://github.com/FreeRDP/FreeRDP/releases/download/2.11.0/FreeRDP-x86_64.AppImage
chmod +x FreeRDP-x86_64.AppImage
cp FreeRDP-x86_64.AppImage src-tauri/binaries/xfreerdp
```

#### Ejemplo Real

**Proyecto similar**: Remmina usa FreeRDP como backend  
**Proyecto Tauri**: <https://github.com/rustdesk/rustdesk> usa librustdesk (custom)

---

### Opción 3: RustDesk's librustdesk 🤔

**Repositorio**: <https://github.com/rustdesk/rustdesk>  
**Estado**: Activo

RustDesk implementó su propio protocolo pero también soporta RDP vía proxy.

#### Pros

- Pure Rust
- Diseñado para embedding

#### Contras

- **No es RDP puro**: Usa proxy/relay
- **Complejo**: Requiere servidor relay
- **Overkill**: Para nuestro caso

**Veredicto**: ❌ Demasiado complejo para el caso de uso

---

### Opción 4: WebRTC + Guacamole 🌐

**Arquitectura**: Browser-based RDP

```
App (WebView) → Guacamole Server → RDP Server
```

#### Pros

- ✅ No requiere binarios nativos
- ✅ Funciona en cualquier plataforma

#### Contras

- ❌ Requiere servidor backend separado
- ❌ Latencia adicional
- ❌ Complejidad de deployment

**Veredicto**: ❌ No es "desktop-first"

---

## Recomendación Final

### ⭐ **Opción 2: FreeRDP Sidecar**

#### Timeline Estimado

- **Semana 1**:
  - Implementar spawn de FreeRDP
  - Configurar IPC básico
- **Semana 2**:
  - Stream de frames a canvas
  - Input handling (mouse/keyboard)
- **Semana 3**:
  - Empaquetado de binarios
  - Testing en Windows/Linux
- **Semana 4**:
  - Optimizaciones de performance
  - Polish UI/UX

#### Siguientes Pasos Inmediatos

1. ✅ Crear proof of concept: spawn FreeRDP headless
2. ✅ Verificar que podemos capturar output
3. ✅ Implementar canal Tauri Event básico
4. ⏸️ Construir Canvas de renderizado

---

## Comparación de Opciones

| Criterio | IronRDP | FreeRDP Sidecar | RustDesk | Guacamole |
|----------|---------|-----------------|----------|-----------|
| **Complejidad** | Media | Media | Alta | Media |
| **Estado** | ❌ No compila | ✅ Estable | ⚠️ Custom | ✅ Estable |
| **Performance** | ⚡ Excelente | ⚡ Excelente | ⚡ Buena | 🐌 Red |
| **Mantenimiento** | ❌ Inestable | ✅ Activo | ✅ Activo | ✅ Activo |
| **Portabilidad** | ✅ Pure Rust | ⚠️ Binario | ⚠️ Complejo | ✅ Web |
| **Time to Market** | 🔴 4+ semanas | 🟢 2-3 semanas | 🔴 6+ semanas | 🟡 3-4 semanas |
| **Viabilidad** | ❌ Bloqueado | ✅ **RECOMENDADO** | ⚠️ Overkill | ❌ No desktop |

---

## Decisión

**Implementar Opción 2: FreeRDP Sidecar**

### Justificación

1. **Funciona ahora**: No depende de fixes externos
2. **Batalla probada**: Usado por millones
3. **Tiempo razonable**: 2-3 semanas vs 4+ de IronRDP
4. **Mejor UX**: Embedded en app vs ventana externa actual
5. **Profesional**: Solución enterprise-grade

### Plan de Acción

- [ ] Crear `rdp_sidecar.rs` con spawn logic
- [ ] Implementar frame streaming
- [ ] Crear `RDPCanvas.tsx` component
- [ ] Empaquetar FreeRDP binario
- [ ] Testing y optimización

¿Procedemos con esta implementación?
