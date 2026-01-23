# Guía de Instalación: FreeRDP para Windows

**Última actualización**: Enero 2026  
**Sistema**: Windows 10/11  
**Dificultad**: Media

---

## Opción 1: Instalación vía Chocolatey (RECOMENDADO) ⭐

### Paso 1: Instalar Chocolatey

Si no tienes Chocolatey instalado:

1. **Abre PowerShell como Administrador**:
   - Presiona `Win + X`
   - Selecciona "Windows PowerShell (Admin)" o "Terminal (Admin)"

2. **Ejecuta este comando**:

   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

3. **Espera a que termine** (puede tardar 1-2 minutos)

4. **Verifica la instalación**:

   ```powershell
   choco --version
   ```

   Deberías ver algo como: `2.2.2`

### Paso 2: Instalar FreeRDP

1. **En la misma PowerShell (Admin), ejecuta**:

   ```powershell
   choco install freerdp -y
   ```

2. **Espera a que descargue e instale** (puede tardar 2-5 minutos)

3. **Verifica la instalación**:

   ```powershell
   wfreerdp --version
   ```

   Deberías ver algo como:

   ```
   This is FreeRDP version 2.11.0
   ```

4. **Reinicia PowerShell** (cierra y abre nueva ventana)

5. **Verifica que está en PATH**:

   ```powershell
   where.exe wfreerdp
   ```

   Deberías ver la ruta, ejemplo:

   ```
   C:\ProgramData\chocolatey\bin\wfreerdp.exe
   ```

✅ **¡Listo!** FreeRDP está instalado y listo para usar.

---

## Opción 2: Instalación Manual (Binarios Pre-compilados)

### Paso 1: Descargar Binarios

1. **Ve a GitHub Releases**:
   - URL: <https://github.com/FreeRDP/FreeRDP/releases>

2. **Descarga el archivo para Windows**:
   - Busca el release más reciente (ejemplo: `v2.11.2`)
   - Descarga: `FreeRDP-2.11.2-win64.zip`
   - Si no hay build de Windows, descarga el código fuente (ver Opción 3)

### Paso 2: Extraer e Instalar

1. **Extrae el archivo ZIP**:
   - Haz clic derecho → "Extraer todo..."
   - Elige ubicación: `C:\FreeRDP`

2. **Agrega al PATH**:

   a. **Abre Variables de Entorno**:
      - Presiona `Win + R`
      - Escribe: `sysdm.cpl` → Enter
      - Pestaña "Opciones avanzadas"
      - Botón "Variables de entorno..."

   b. **Edita la variable PATH**:
      - En "Variables del sistema", busca `Path`
      - Haz clic en "Editar..."
      - Haz clic en "Nuevo"
      - Agrega: `C:\FreeRDP\bin` (o donde extrajiste los binarios)
      - Haz clic "Aceptar" en todas las ventanas

3. **Verifica la instalación**:
   - Abre **nueva** PowerShell

   ```powershell
   wfreerdp --version
   ```

---

## Opción 3: Compilar desde Código Fuente (Avanzado)

### Requisitos Previos

1. **Instalar Visual Studio 2022 Community**:
   - Descarga: <https://visualstudio.microsoft.com/es/downloads/>
   - Durante instalación, selecciona:
     - ✅ "Desarrollo para el escritorio con C++"
     - ✅ "Desarrollo multiplataforma de .NET Core"

2. **Instalar CMake**:

   ```powershell
   choco install cmake -y
   ```

3. **Instalar Git**:

   ```powershell
   choco install git -y
   ```

### Compilación

1. **Clonar el repositorio**:

   ```powershell
   cd C:\
   git clone https://github.com/FreeRDP/FreeRDP.git
   cd FreeRDP
   ```

2. **Crear directorio de build**:

   ```powershell
   mkdir build
   cd build
   ```

3. **Configurar con CMake**:

   ```powershell
   cmake .. -G "Visual Studio 17 2022" -A x64 `
     -DCMAKE_BUILD_TYPE=Release `
     -DWITH_CLIENT=ON `
     -DWITH_SERVER=OFF
   ```

4. **Compilar**:

   ```powershell
   cmake --build . --config Release
   ```

   **Nota**: Esto puede tardar 10-20 minutos

5. **Los binarios estarán en**:

   ```
   C:\FreeRDP\build\client\Windows\Release\wfreerdp.exe
   ```

6. **Copiar a ubicación permanente**:

   ```powershell
   mkdir C:\FreeRDP\bin
   copy C:\FreeRDP\build\client\Windows\Release\*.exe C:\FreeRDP\bin\
   copy C:\FreeRDP\build\client\Windows\Release\*.dll C:\FreeRDP\bin\
   ```

7. **Agregar al PATH** (ver pasos en Opción 2)

---

## Opción 4: Alternativa - Usar MSYS2 (Para Desarrolladores)

### Instalación

1. **Instalar MSYS2**:
   - Descarga: <https://www.msys2.org/>
   - Ejecuta el instalador
   - Sigue el wizard (Next → Next → Install)

2. **Abre MSYS2 MINGW64** (desde menú inicio)

3. **Actualiza sistema**:

   ```bash
   pacman -Syu
   ```

   Cierra la ventana si te lo pide y vuelve a abrir MSYS2 MINGW64

4. **Instala FreeRDP**:

   ```bash
   pacman -S mingw-w64-x86_64-freerdp
   ```

5. **Agrega al PATH de Windows**:
   - Agrega: `C:\msys64\mingw64\bin`
   - (Ver pasos de Opción 2)

6. **Verifica**:

   ```powershell
   wfreerdp --version
   ```

---

## Verificación Final

### Test Rápido de Conexión

Prueba conectar a un servidor de demostración:

```powershell
wfreerdp /v:test.myserver.com /u:demo /cert:ignore
```

Si aparece una ventana de conexión RDP, **¡funciona perfectamente!**

---

## Troubleshooting

### Error: "wfreerdp no se reconoce como comando"

**Solución**:

1. Verifica que esté en PATH:

   ```powershell
   $env:Path -split ';' | Select-String freerdp
   ```

2. Si no aparece, cierra y abre **nueva** PowerShell

3. Si aún no funciona, reinicia Windows

### Error: "VCRUNTIME140.dll no encontrado"

**Solución**:

1. Instala Visual C++ Redistributable:

   ```powershell
   choco install vcredist140 -y
   ```

### Error al compilar desde fuente

**Soluciones comunes**:

```powershell
# Actualizar CMake
choco upgrade cmake -y

# Limpiar directorio build
cd C:\FreeRDP
Remove-Item -Recurse -Force build
mkdir build
cd build

# Reintentar compilación
cmake .. -G "Visual Studio 17 2022" -A x64
cmake --build . --config Release
```

---

## Para la Aplicación AI SysAdmin Desktop

Una vez instalado FreeRDP correctamente:

1. **Cierra la aplicación** si está abierta
2. **Reinicia** para que detecte FreeRDP en PATH
3. **Compila de nuevo**:

   ```bash
   git pull
   npm run tauri dev
   ```

4. **Conecta a servidor Windows** - Debería usar FreeRDP Sidecar

---

## Recomendación Personal

Para **desarrollo y testing**, recomiendo:

✅ **Opción 1 (Chocolatey)** - Más rápida y confiable  
⏱️ Tiempo total: ~5-10 minutos

Para **producción** (app distribuida):

✅ Empaquetaremos FreeRDP directamente en la app  
  (No requerirá instalación del usuario)

---

## Contacto y Ayuda

Si tienes problemas:

1. Revisa la sección Troubleshooting
2. Verifica requirements de sistema
3. Asegúrate de ejecutar PowerShell como **Administrador**
4. Reinicia Windows después de instalar

¿Necesitas ayuda adicional? Dime en qué paso tienes problemas y te ayudo específicamente.
