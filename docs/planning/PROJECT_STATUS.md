# Estado del Proyecto: Windows/RDP Support

**Fecha**: 2026-01-23  
**Fase Actual**: 3A - RDP Infrastructure  
**Progreso Global**: ~40%

---

## ✅ Completado

### 1. Infraestructura SSH ✓

- [x] Conexión SSH nativa (russh 0.45)
- [x] Terminal interactivo con PTY
- [x] Auto-reconnect
- [x] Gestión de sesiones múltiples

### 2. RDP UI/UX ✓

- [x] Componente RDPComponent.tsx
- [x] Detección automática de servidores Windows (vía `os_info`)
- [x] Interfaz elegante con opciones:
  - Escritorio Remoto (botón)
  - PowerShell Terminal (fallback SSH)

### 3. RDP - Cliente Nativo ✓

- [x] Comando `launch_native_rdp`
- [x] Auto-login con `cmdkey` (Windows)
- [x] Soporte multiplataforma (Windows/Linux/macOS)
- [x] Funciona sin modificar app

### 4. RDP - Sidecar (Fase 1) ✓

- [x] Módulo `rdp_sidecar.rs` creado
- [x] Detección automática de FreeRDP
- [x] Spawn de proceso con configuración
- [x] Gestión de ciclo de vida (cleanup)
- [x] Integración con RDPManager

### 5. Documentación ✓

- [x] Análisis técnico de opciones (RDP_IMPLEMENTATION_OPTIONS.md)
- [x] Guía de instalación FreeRDP (INSTALL_FREERDP_WINDOWS.md)
- [x] Plan de implementación Phase 3

---

## 🚧 En Progreso

### RDP Sidecar - Fase 2: Frame Capture

**Estado**: Pendiente  
**Bloqueador**: FreeRDP debe estar instalado en máquina dev

**Tareas**:

- [ ] Implementar IPC/Named Pipe para captura de frames
- [ ] Configurar FreeRDP para output headless
- [ ] Decodificar frames RGB desde FreeRDP
- [ ] Crear canal Tauri Event para streaming

### RDP Sidecar - Fase 3: Canvas Rendering

**Estado**: Diseñado, no implementado

**Tareas**:

- [ ] Componente RDPCanvas.tsx
- [ ] Event listener para `rdp_frame`
- [ ] Renderizado de frames en Canvas HTML5
- [ ] Optimización de performance (double buffering)

### RDP Sidecar - Fase 4: Input Handling

**Estado**: Diseñado, no implementado

**Tareas**:

- [ ] Captura de eventos mouse en Canvas
- [ ] Captura de eventos keyboard
- [ ] Conversión a coordenadas RDP
- [ ] Envío de input vía Tauri Command → FreeRDP

---

## ❌ Bloqueado

### IronRDP (Pure Rust)

**Estado**: Bloqueado indefinidamente  
**Razón**: Conflictos internos de dependencias (`picky_asn1`)  
**Alternativa**: FreeRDP Sidecar (elegida)

### SFTP (Explorador de Archivos)

**Estado**: UI lista, backend deshabilitado  
**Razón**: Conflictos de versiones russh-sftp  
**Plan**: Reactivar con `russh` actualizado o migrar a `ssh2`

---

## 🎯 Próximos Pasos Inmediatos

### Opción A: Continuar FreeRDP Sidecar (Requiere FreeRDP instalado)

**Si tienes FreeRDP instalado**:

1. **Implementar captura de frames** (2-3 días)
   - Named Pipes en Windows
   - Compartir memoria o sockets en Linux
   - Parsing de output FreeRDP

2. **Crear Canvas de renderizado** (1-2 días)
   - Componente React con Canvas
   - Event streaming desde Rust
   - Renderizado de bitmaps RGB

3. **Input handling** (1-2 días)
   - Mouse events → comandos FreeRDP
   - Keyboard → stdin FreeRDP

**Timeline**: ~1 semana para RDP embebido funcional

### Opción B: Pausar RDP Embebido, Focus en otras features

**Alternativas válidas**:

1. **Reactivar SFTP** (Explorador de Archivos)
   - Investigar fix de russh-sftp
   - O migrar a ssh2-rs (más estable)
   - Timeline: 2-3 días

2. **PowerShell Remoting mejorado**
   - Detección automática de PowerShell en Windows
   - Syntax highlighting para PS
   - Timeline: 1-2 días

3. **Multi-tab support**
   - Múltiples terminales en tabs
   - Guardar/restaurar sesiones
   - Timeline: 2-3 días

4. **Credential Manager mejorado**
   - SSH Keys management UI
   - Vault encryption
   - Timeline: 3-4 días

---

## Decisión Recomendada

### 🎯 Plan Híbrido (RECOMENDADO)

**Semana 1-2**:

- ✅ Usar **cliente RDP nativo** (`mstsc.exe` + `cmdkey`) → Ya funciona perfectamente
- ⚡ Implementar **SFTP** para explorador de archivos
- ⚡ Mejorar **PowerShell** terminal experience

**Semana 3+** (cuando FreeRDP esté confirmado):

- Continuar RDP Sidecar para embedding
- Canvas + frame streaming
- Input handling

### Justificación

1. **RDP nativo funciona ahora** - Los usuarios ya pueden usar Escritorio Remoto
2. **SFTP más urgente** - Explorador de archivos es feature muy pedida
3. **PowerShell polish** - Mejora UX para Windows sin esperar RDP embebido
4. **RDP embebido es bonus** - No bloqueante para release

---

## Estado de Funcionalidades (Feature Matrix)

| Feature | Linux | Windows | Prioridad | Estado |
|---------|-------|---------|-----------|--------|
| **SSH Terminal** | ✅ | ✅ | 🔴 Critical | ✅ Funcional |
| **PTY Nativo** | ✅ | ✅ | 🔴 Critical | ✅ Funcional |
| **RDP Nativo (externo)** | ✅ | ✅ | 🟡 High | ✅ Funcional |
| **RDP Embebido** | 🚧 | 🚧 | 🟢 Nice-to-have | 🚧 40% |
| **SFTP Browser** | ⚠️ | ⚠️ | 🟡 High | ❌ Disabled |
| **PowerShell Detect** | N/A | ⚠️ | 🟡 High | ⚠️ Basic |
| **Multi-tab** | ⚠️ | ⚠️ | 🟢 Nice-to-have | ❌ TODO |
| **SSH Keys UI** | ⚠️ | ⚠️ | 🟡 High | ⚠️ Basic |

**Leyenda**:

- ✅ Completado y funcional
- 🚧 En desarrollo
- ⚠️ Parcial/Necesita mejoras
- ❌ No implementado

---

## Quick Wins Disponibles

Features que se pueden completar rápido y dan mucho valor:

1. **SFTP Fix** (2 días) → Explorador de archivos funcional
2. **PowerShell Auto-detect** (1 día) → Mejor UX en Windows
3. **Connection Presets** (1 día) → Guardar configs de conexión
4. **Dark/Light Theme** (1 día) → Personalización
5. **Session History** (1 día) → Ver sesiones recientes

---

## Pregunta para ti

¿Qué prefieres priorizar ahora?

**A)** Continuar con RDP Embebido (requiere FreeRDP instalado + 1 semana)  
**B)** Implementar SFTP para explorador de archivos (2-3 días)  
**C)** Pulir PowerShell + agregar Quick Wins (3-4 días para varios)  
**D)** Otra feature específica que necesites

Dime qué es más importante para tu caso de uso y ajusto el roadmap.
