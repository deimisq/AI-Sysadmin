# Guacamole Server (guacd) Installation Guide

**Para**: AI SysAdmin Desktop - RDP Integration  
**Fecha**: 2026-01-23

---

## ¿Qué es guacd?

**guacd** es el daemon (servidor) de Apache Guacamole que:

- Maneja conexiones RDP, VNC, SSH, Telnet
- Traduce protocolos a Guacamole protocol (JSON sobre WebSocket)
- Necesario para que la app se conecte a servidores Windows vía RDP

---

## Instalación en Windows

### Opción 1: Chocolatey (RECOMENDADO) ⭐

```powershell
# Como Administrador
choco install guacamole-server -y
```

**Ubicación**: `C:\Program Files\Guacamole\bin\guacd.exe`

### Opción 2: Build Manual (Avanzado)

Guacamole Server para Windows no tiene builds oficiales fácilmente disponibles.

**Alternativa simple**: Usar el binario que empaquetaremos con la app.

---

## Instalación en Linux

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install guacd -y
```

### Fedora/RHEL

```bash
sudo dnf install guacd -y
```

### Arch Linux

```bash
sudo pacman -S guacamole-server
```

---

## Instalación en macOS

```bash
brew install guacamole-server
```

---

## Verificación de Instalación

### Test 1: Verificar binario

**Windows**:

```cmd
where guacd
```

**Linux/Mac**:

```bash
which guacd
```

### Test 2: Verificar versión

```bash
guacd --version
```

Deberías ver algo como:

```
Guacamole proxy daemon version 1.5.4
```

### Test 3: Ejecutar manualmente

```bash
# Windows
guacd -f -b 127.0.0.1 -l 4822

# Linux/Mac
guacd -f -b 127.0.0.1 -l 4822
```

Si aparece:

```
guacd[PID]: INFO: Guacamole proxy daemon (guacd) version 1.5.4 started
guacd[PID]: INFO: Listening on host 127.0.0.1, port 4822
```

**¡Funciona!** Presiona Ctrl+C para detenerlo.

---

## Para Desarrollo (Ya instalaste Chocolatey)

Como ya tienes Chocolatey instalado (para FreeRDP), simplemente:

```powershell
choco install guacamole-server -y
```

---

## Troubleshooting

### Error: "guacd not found"

**Solución Windows**:

1. Verifica que Chocolatey lo instaló:

   ```cmd
   dir "C:\Program Files\Guacamole\bin\"
   ```

2. Si no existe, reinstala:

   ```cmd
   choco uninstall guacamole-server -y
   choco install guacamole-server -y
   ```

### Error: "Port 4822 already in use"

Otro proceso está usando el puerto. Cambia el puerto:

```rust
// src-tauri/src/main.rs
GuacamoleManager::with_port(4823) // Usar otro puerto
```

### Error: "Failed to start guacd"

Verifica permisos:

**Windows**: Ejecuta PowerShell como Administrador  
**Linux**: `sudo apt install guacd`  
**Mac**: `brew install guacamole-server`

---

## Empaquetado con la App (Futuro)

Para distribución final, empaquetaremos `guacd.exe` directamente:

```
frontend-desktop/
└── src-tauri/
    └── binaries/
        ├── guacd.exe (Windows)
        ├── guacd (Linux)
        └── guacd (macOS)
```

La app lo detectará automáticamente.

---

## Siguiente Paso

Una vez instalado guacd:

1. **Compila la app**: `npm run tauri dev`
2. **La app iniciará guacd automáticamente**
3. **Conecta a servidor Windows** - ¡RDP funcionará!

---

## Ayuda Adicional

Si tienes problemas:

1. Revisa logs de guacd
2. Verifica firewall (puerto 4822)
3. Asegúrate que no hay otro guacd corriendo:

   ```cmd
   tasklist | findstr guacd    # Windows
   ps aux | grep guacd          # Linux/Mac
   ```

¿Necesitas ayuda? Consulta el código en `guacamole_manager.rs`.
