# Guacamole-Lite: Alternativa Rápida para Windows

**Problema**: guacd no tiene build oficial para Windows  
**Solución**: Usar guacamole-lite (Node.js implementation)

---

## Instalación Rápida

### 1. Instalar guacamole-lite globalmente

```bash
npm install -g guacamole-lite
```

### 2. Crear script de inicio

Crea `start-guacamole.js`:

```javascript
const GuacamoleLite = require('guacamole-lite');

const server = new GuacamoleLite.Server({
    port: 4822,
    host: '127.0.0.1'
});

server.on('connection', (connection) => {
    console.log('New connection:', connection.id);
});

server.on('error', (error) => {
    console.error('Error:', error);
});

console.log('Guacamole-Lite running on ws://127.0.0.1:4822');
```

### 3. Ejecutar

```bash
node start-guacamole.js
```

---

## Integración con Tauri

Modificar `guacamole_manager.rs` para usar Node.js:

```rust
#[cfg(target_os = "windows")]
{
    // Check if guacamole-lite is installed
    let node_path = which::which("node")?;
    let script_path = resolve_resource("guacamole-lite-server.js")?;
    
    let child = Command::new(node_path)
        .arg(script_path)
        .spawn()?;
}
```

---

## Ventajas

✅ Funciona en Windows inmediatamente  
✅ No requiere compilación  
✅ Compatible con guacamole-common-js  
✅ Mismo protocolo que guacd  

## Desventajas

⚠️ Requiere Node.js instalado  
⚠️ Menos features que guacd original  

---

## Instalación Ahora

```bash
cd frontend-desktop
npm install guacamole-lite --save
```

Luego puedo integrar el servidor directamente en el proceso de Tauri.
