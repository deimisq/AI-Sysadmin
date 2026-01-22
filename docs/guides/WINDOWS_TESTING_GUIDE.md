# 🪟 Guía Completa: Probar AI Sysadmin Agent en Windows

Esta guía te llevará paso a paso para ejecutar la aplicación desktop de Tauri en Windows.

---

## 📋 Requisitos Previos

### Hardware Mínimo

- **Sistema Operativo**: Windows 10/11 (64-bit)
- **RAM**: 4GB mínimo (8GB recomendado)
- **Espacio en Disco**: 5GB libres
- **Internet**: Para descargar dependencias

---

## ⚙️ Instalación de Herramientas

### 1. Visual Studio Build Tools (OBLIGATORIO)

**¿Qué es?** Herramientas de compilación C++ que Rust necesita en Windows.

**Pasos:**

1. **Descargar** Visual Studio Build Tools:
   - URL: <https://visualstudio.microsoft.com/downloads/>
   - Scroll hasta "All Downloads"
   - Buscar "Build Tools for Visual Studio 2022"
   - Click en "Download"

2. **Instalar** (IMPORTANTE - seleccionar componentes correctos):

   ```
   Al ejecutar el instalador:
   ✅ Seleccionar: "Desktop development with C++"
   
   En el panel derecho, asegurarse de tener marcado:
   ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
   ✅ Windows 10/11 SDK
   ✅ C++ CMake tools for Windows
   ```

3. **Esperar** la instalación (puede tomar 10-20 minutos)

4. **Reiniciar** Windows después de la instalación

### 2. Node.js (si no lo tienes)

**Verificar si ya está instalado:**

```powershell
node --version
```

Si no está instalado:

1. **Descargar** Node.js:
   - URL: <https://nodejs.org/>
   - Descargar la versión LTS (Long Term Support)
   - Ejemplo: Node.js 20.x LTS

2. **Instalar**:
   - Ejecutar el instalador descargado
   - Siguiente → Siguiente → Instalar
   - ✅ Marcar "Automatically install necessary tools"

3. **Verificar**:

   ```powershell
   node --version
   npm --version
   ```

### 3. Rust

**Pasos:**

1. **Descargar** Rustup (instalador de Rust):
   - URL: <https://rustup.rs/>
   - Click en "Download rustup-init.exe (64-bit)"

2. **Ejecutar** `rustup-init.exe`:

   ```
   Aparecerá en consola:
   
   1) Proceed with installation (default)
   2) Customize installation
   3) Cancel installation
   
   Presiona 1 y Enter
   ```

3. **Esperar** la instalación (5-10 minutos)

4. **Cerrar y reabrir** PowerShell/CMD para actualizar el PATH

5. **Verificar**:

   ```powershell
   rustc --version
   cargo --version
   ```

   Deberías ver algo como:

   ```
   rustc 1.92.0 (ded5c06cf 2025-12-08)
   cargo 1.92.0 (344c4567c 2025-10-21)
   ```

### 4. Git (si no lo tienes)

1. **Descargar**: <https://git-scm.com/download/win>
2. **Instalar** con opciones por defecto
3. **Verificar**:

   ```powershell
   git --version
   ```

---

## 🚀 Clonar y Preparar el Proyecto

### 1. Abrir PowerShell

- **Windows 11**: Click derecho en Start → "Windows Terminal"
- **Windows 10**: Buscar "PowerShell" en el menú inicio

### 2. Navegar a tu carpeta de proyectos

```powershell
# Ejemplo: ir al escritorio
cd $HOME\Desktop

# O crear una carpeta para proyectos
mkdir Proyectos
cd Proyectos
```

### 3. Clonar el repositorio

```powershell
git clone https://github.com/sentrait/ai_agent.git
cd ai_agent
```

### 4. Cambiar a la rama testing

```powershell
git checkout testing
```

### 5. Navegar a la carpeta frontend

```powershell
cd frontend
```

### 6. Instalar dependencias

```powershell
npm install
```

Esto tomará 2-5 minutos. Verás un montón de paquetes descargándose.

---

## ▶️ Ejecutar la Aplicación

### Modo Desarrollo (con Hot Reload)

```powershell
npm run tauri-dev
```

**¿Qué pasará?**

1. **Primera ejecución** (10-15 minutos):
   - Rust compilará ~460 paquetes
   - Verás una barra de progreso
   - Es normal que tarde, es solo la primera vez

2. **Siguientes ejecuciones** (10-30 segundos):
   - Mucho más rápido
   - Solo recompila lo que cambió

3. **Resultado**:
   - Se abrirá una ventana nativa de Windows
   - Con tu aplicación corriendo dentro
   - Los cambios en el código se reflejarán automáticamente

**Pantalla esperada:**

```
   Compiling app v0.1.0
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 8.2s
     Running `target/debug/app.exe`

[Se abre ventana de la aplicación]
```

### Modo Producción (Crear Instalador)

⚠️ **Advertencia**: Esto toma mucho más tiempo (30-60 minutos la primera vez)

```powershell
npm run tauri-build
```

**Resultado:**
El instalador se creará en:

```
frontend\src-tauri\target\release\bundle\msi\
```

Archivos generados:

- `AI Sysadmin Agent_0.9.4_x64_en-US.msi` (Inglés)
- `AI Sysadmin Agent_0.9.4_x64_es-ES.msi` (Español)

---

## 🐛 Solución de Problemas

### Error: "rustc: command not found"

**Solución:**

```powershell
# Cerrar y reabrir PowerShell
# O manualmente cargar el entorno:
$env:Path += ";$env:USERPROFILE\.cargo\bin"
```

### Error: "VCRUNTIME140.dll not found"

**Solución:**

- Instalar Visual C++ Redistributable:
- URL: <https://aka.ms/vs/17/release/vc_redist.x64.exe>
- Ejecutar e instalar

### Error: "error: linker `link.exe` not found"

**Causa:** Visual Studio Build Tools no instaladas correctamente

**Solución:**

1. Re-ejecutar el instalador de Build Tools
2. Asegurarse de seleccionar "Desktop development with C++"
3. Reiniciar Windows

### Error al compilar (timeout/out of memory)

**Solución:**

```powershell
# Compilar con menos paralelismo
$env:CARGO_BUILD_JOBS = "2"
npm run tauri-dev
```

### La ventana se abre pero está en blanco

**Causa:** El backend no está corriendo

**Solución actual:**
Por ahora, la app solo muestra el frontend. El backend se integrará en la Fase 2.

---

## 📸 ¿Qué Deberías Ver?

### Al Ejecutar `npm run tauri-dev`

1. **En la consola:**

   ```
   ✓ Built in XXXms
   Running `target/debug/app.exe`
   ```

2. **Una ventana nativa de Windows:**
   - Título: "AI Sysadmin Agent"
   - Tamaño: 1400x900 píxeles
   - Con tu interfaz Next.js dentro

3. **DevTools disponibles:**
   - Click derecho → "Inspect Element" (si está en debug mode)

---

## 🎯 Funcionalidades a Probar

### ✅ Verificaciones Básicas

- [ ] La ventana se abre correctamente
- [ ] Se puede redimensionar
- [ ] Se puede minimizar/maximizar
- [ ] Los controles de ventana funcionan
- [ ] El tamaño mínimo se respeta (1024x768)
- [ ] La app se centra en la pantalla

### ✅ Interfaz

- [ ] Los estilos se cargan correctamente
- [ ] Las imágenes se ven bien
- [ ] El modo oscuro/claro funciona
- [ ] La navegación entre páginas funciona

### ⚠️ Limitaciones Actuales

- ❌ Backend no integrado (solo frontend)
- ❌ Base de datos no conectada
- ❌ Autenticación no funcional aún
- ❌ SSH/Ansible no disponibles

**Nota:** Esto es normal. Es la Fase 1 (solo frontend). El backend se integrará después.

---

## 📊 Comparación de Tiempos

| Tarea | Primera Vez | Siguiente Vez |
|-------|-------------|---------------|
| npm install | 3-5 min | N/A |
| npm run tauri-dev | 10-15 min | 10-30 seg |
| npm run tauri-build | 30-60 min | 15-30 min |

---

## 📝 Comandos de Referencia Rápida

```powershell
# Clonar proyecto
git clone https://github.com/sentrait/ai_agent.git
cd ai_agent\frontend

# Actualizar código
git pull origin testing

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run tauri-dev

# Crear instalador
npm run tauri-build

# Limpiar y reconstruir
Remove-Item -Recurse -Force node_modules, .next, out, src-tauri\target
npm install
npm run tauri-dev
```

---

## 🎓 Recursos Adicionales

- **Documentación Tauri**: <https://tauri.app/>
- **Rust Book**: <https://doc.rust-lang.org/book/>
- **Next.js Docs**: <https://nextjs.org/docs>

---

## 💡 Tips Útiles

### Acelerar Compilaciones Futuras

1. **No borrar** `src-tauri/target/` a menos que sea necesario
2. **Mantener** Rust actualizado:

   ```powershell
   rustup update
   ```

### Ver Logs Detallados

```powershell
# Ver todo lo que hace Tauri
$env:RUST_LOG = "info"
npm run tauri-dev
```

### Cambiar Puerto del Dev Server

Si el puerto 3000 está ocupado:

```powershell
# Editar frontend/package.json
# Cambiar: "dev": "next dev -p 3001"
```

---

## 🎉 ¿Qué Sigue?

Una vez que veas la app funcionando:

1. **Tomar capturas** de pantalla
2. **Probar la interfaz** y reportar bugs
3. **Decidir** si continuar con:
   - Fase 2: Integración del backend Python
   - Optimizaciones de UI para desktop
   - Características específicas de Windows

---

## ❓ Ayuda

Si encuentras problemas:

1. **Revisa** esta guía completa
2. **Verifica** que todos los requisitos estén instalados
3. **Copia** el error exacto que recibes
4. **Incluye** el paso donde falló

**¡Buena suerte! 🚀**
