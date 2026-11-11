# Distribución Windows

El cliente local usa .NET 10 LTS. Esta entrega produce dos artefactos **de prueba**, sin firma comercial:

- `AI-Sysadmin-Agent-0.11.N-win-x64-setup.exe`: instalación por usuario, accesos directos y desinstalador.
- `AI-Sysadmin-Agent-0.11.N-win-x64-portable.zip`: extraer todo el contenido y abrir `AiSysadmin.exe`.

Ambos incluyen el runtime .NET; no requieren que el técnico instale un SDK o runtime .NET por separado. Requieren **WebView2 Evergreen Runtime** instalado. El instalador comprueba sus entradas de registro y, si falta, indica la descarga oficial; no lo descarga ni instala de manera oculta.

El instalador limita esta compilación a Windows x64 y build 19045 o posterior. Esto no constituye certificación para todas las ediciones/versiones: debe usarse un Windows con soporte y completarse la matriz de compatibilidad. ARM64 nativo y Windows de 32 bits no se distribuyen en esta entrega.

## Datos y actualizaciones

La instalación predeterminada reside en `%LOCALAPPDATA%/Programs/AI Sysadmin Agent/versions/<version>`. Los accesos directos apuntan a la versión instalada más recientemente. La app consulta actualizaciones y requiere aprobaciones separadas para descargar, instalar y reiniciar. No hay rollback automático; las carpetas separadas no garantizan compatibilidad de un cliente antiguo con datos nuevos.

Inventario, credenciales, configuración IA, registros y perfil WebView2 permanecen en `%LOCALAPPDATA%/AiSysadmin`. Desinstalar conserva ese directorio. El ZIP portable tampoco vuelve portable el vault: la protección DPAPI sigue ligada a la cuenta de Windows. Para migrar conexiones/carpetas a otra cuenta o equipo, usar la copia cifrada portable de Ajustes.

El instalador no inicia conexiones SSH/RDP ni solicita una cuenta o clave IA. Abrir el programa permite trabajar en modo local; la configuración cloud requiere el consentimiento correspondiente. Enterprise conserva su implementación actual y no incluye todavía enrolamiento/gateway nuevo.

El runtime incluido debe actualizarse mediante una nueva compilación y distribución de la aplicación cuando Microsoft publique correcciones. No se debe asumir que una actualización del runtime global actualiza estas copias autocontenidas.

## Archivos por SFTP

### Espacio de trabajo IDE

Preview.9 incluye menús Archivo/Conexiones/Ver/Herramientas/Ayuda y panel inferior redimensionable. En **Ver** se pueden alternar explorador, acompañante y panel inferior. Este último ofrece Sesiones, seguimiento de Tareas IA y la última Transferencia SFTP de la instancia. Cerrar un monitor no cancela su operación; la cancelación se solicita desde su botón. El catálogo se abre desde **Conexiones → Catálogo de conexiones**. Configuración mantiene su ventana independiente en Windows. Esta entrega no incluye división de terminales en mosaico.

1. Abrir una conexión SSH y pulsar **Archivos** en la barra de la sesión.
2. Navegar hasta la carpeta remota. El icono de subida permite elegir un archivo local con el diálogo de Windows.
3. Para descargar, usar el icono de descarga del archivo, doble clic o Enter y elegir el destino local.
4. Consultar el nombre, bytes y estado en el pie del panel. **Cancelar transferencia** solicita detenerla; cerrar el panel permite continuar y recuperar su estado al reabrirlo en la misma sesión.

Solo se transfiere un archivo a la vez por instancia. Las subidas no reemplazan archivos remotos existentes. Para reemplazar un destino local durante una descarga, Windows pide confirmación. Se usan temporales y comprobación de tamaño antes de publicar el nombre final. Si la conexión impide retirar un temporal remoto, se informa su ruta. No hay reanudación ni transferencias de carpetas completas; desconectar SSH solicita cancelación. El contenido transferido no se adjunta al acompañante IA.

## IA en conexiones RDP

El sistema operativo elegido en el perfil es un dato declarado y editable (incluye Windows 11), no una detección automática. Para confirmar versión o recursos, compartir la salida pertinente del equipo remoto. El nombre del equipo no certifica su sistema operativo.

Ante errores de IA: HTTP 401 indica rechazo de autenticación, 403 requiere revisar permisos, 429 cuota o límite de solicitudes y 503 indisponibilidad temporal del proveedor. Esos errores no borran la clave almacenada. En Configuración → IA, el indicador de clave guardada permite distinguir su presencia del campo de contraseña vacío, que conserva la clave al guardar el mismo proveedor.

En RDP, el acompañante funciona como asesor: recibe los metadatos del destino y la conversación. Podés describir un problema o pegar en el chat el error, evento o resultado que quieras analizar. Conserva el hilo para preguntas posteriores; en conexiones temporales, el historial permanece en memoria hasta cerrar la sesión.

La IA no recibe capturas, cambios del escritorio ni salida de PowerShell/CMD automáticamente. No ejecuta comandos, controla el escritorio ni usa tareas o permisos SSH desde RDP. Los pasos sugeridos deben realizarse manualmente dentro del equipo remoto y sus resultados compartirse en el chat. Los registros SSH no se usan como evidencia de RDP.

Desde `0.10.0-preview.40`, **Adjuntar captura del RDP** permite capturar el control de escritorio remoto activo del destino. Revisar la vista previa, descartar una imagen negra o incorrecta, marcar la autorización y escribir la pregunta. La imagen se envía una sola vez junto a esa consulta al proveedor configurado; no se escribe en disco ni se conserva en el historial. El análisis textual puede conservarse en la conversación. Para conocer cambios posteriores hace falta otra captura. No hay captura de pantalla local como alternativa si falla el renderizado de RDP.

Requiere un modelo con visión: se implementaron formatos de imagen para Gemini/OpenAI y endpoints compatibles (incluido Ollama con un modelo visual), y Claude. El envío visual no está habilitado para OpenCode o DeepSeek en esta implementación. La compatibilidad depende del modelo seleccionado. La imagen se limita a PNG de 4 MiB y se reduce a 1920 píxeles en su lado mayor. No se adjuntan imágenes en consultas SSH. Las pruebas de payload usan imágenes sintéticas; la compatibilidad de captura del ActiveX con el escritorio remoto real sigue requiriendo comprobación manual en la vista previa.

La cobertura automatizada usa destinos y respuestas sintéticos: comprueba aislamiento de contexto, historial y ausencia de propuestas ejecutables en RDP guardado y temporal. No sustituye una prueba real del escritorio, autenticación o diagnóstico sobre un servidor Windows.

## Trasladar conexiones a otro equipo

Abrir **Conexiones → Exportar / importar conexiones**. Elegir una contraseña de al menos 12 caracteres, repetirla y exportar el archivo `.aisysbackup`. Incluye conexiones, credenciales guardadas y carpetas; la opción **Incluir el contenido de los archivos de claves privadas SSH** permite trasladar también las claves referenciadas por ruta. Si un archivo falta, la exportación informa el problema y no entrega una copia incompleta. Al desmarcarla, esas claves deberán copiarse por separado.

En el otro equipo, abrir la misma sección, seleccionar el archivo, ingresar su contraseña, validar el contenido y confirmar la importación. Se agregan las conexiones sin borrar las existentes. La copia usa cifrado con contraseña independiente de la cuenta Windows; no alcanza con copiar el vault DPAPI. No incluye configuración IA ni conversaciones.

## Compilar

La política de versiones cortas, el acceso a GitHub privado y el flujo de descarga, instalación y reinicio aprobados se describen en [Versiones y actualizaciones](WINDOWS_UPDATES.md). La versión actual se consulta en la barra inferior y en Ayuda.

Requisitos de desarrollo: SDK indicado en [global.json](../global.json), Node 22, dependencias del frontend (`npm ci` en el cliente) e Inno Setup 6.7.3 o compatible. Las herramientas descargadas en `.preview-tools` son locales del entorno y no se distribuyen.

Desde PowerShell en la raíz:

```powershell
./scripts/package-windows.ps1 -Iscc 'C:/ruta/Inno Setup 6/ISCC.exe'
```

Si el SDK/Node no están en PATH, usar los parámetros `-Dotnet` y `-Node` con sus ejecutables. La política local de ejecución de scripts debe permitir ejecutar el script revisado; no hace falta cambiar una política global para usar el instalador compilado.

La versión de escritorio se define en [AiSysadmin.csproj](../apps/windows/AiSysadmin.csproj), separada del versionado legacy del backend. La salida reside en `dist/windows/<version>/`; el script no reemplaza un ZIP/instalador existente de esa versión. Los directorios intermedios de publicación quedan en `dist/windows/staging/` y están excluidos de Git.

Se valida la presencia del ejecutable, runtime, loader WebView2 y bundle. Se rechazan archivos de inventario, contexto, tareas y `.env` dentro del paquete. Se incorporan los avisos/metadata de licencias disponibles en las dependencias NuGet, además de la licencia actual del repositorio. `package-manifest.json` enumera hashes de los archivos; `SHA256SUMS.txt` permite comprobar los artefactos. Los hashes no reemplazan una firma de autenticidad del publicador.

## Verificar

```powershell
./scripts/test-windows-package.ps1 -PackageDirectory ./dist/windows/0.11.N
```

La prueba extrae el ZIP en un directorio nuevo dentro de `.preview-tools/package-tests`, comprueba los hashes y valida el contenido. Para probar instalación/desinstalación:

```powershell
./scripts/test-windows-package.ps1 -PackageDirectory ./dist/windows/0.11.N -ExerciseInstaller
```

La segunda opción se niega a usar una instalación ya registrada. Instala en una carpeta aislada, sin iniciar la aplicación ni crear iconos, verifica archivos, ejecuta su desinstalador y comprueba que el inventario/los accesos directos previos no cambiaron. No prueba todavía la interfaz de la aplicación instalada, una actualización sobre una instalación anterior o una cuenta Windows diferente.

El flujo [windows-package.yml](../.github/workflows/windows-package.yml) se ejecuta con cada push a una rama y también permite ejecución manual. Ejecuta las pruebas del cliente, genera los paquetes y verifica la instalación, desinstalación y cierre de la versión anterior durante una actualización. Solo publica si todos los controles terminan correctamente.

Cada ejecución de `testing` publica una versión del canal de actualización integrado en [GitHub Releases](https://github.com/deimisq/AI-Sysadmin/releases), con el instalador Windows x64 `*-setup.exe`, el ZIP portable y `SHA256SUMS.txt`. La versión es `MAYOR.MENOR.N`, donde `N` es el número de ejecución del workflow. No lleva sufijos de CI, intento o commit. Los reintentos conservan la versión y no reemplazan releases publicados. Otras ramas generan prereleases que el actualizador ignora. Las notas identifican la rama y el commit exacto. Los paquetes también se conservan como artefactos de Actions durante 14 días; los adjuntos del release permanecen disponibles.

La publicación usa el token automático de GitHub con permiso de escritura limitado al job de release; no requiere configurar un token personal. Al ser privado el repositorio, las descargas requieren acceso al repositorio. Las compilaciones actuales son de prueba y no están firmadas. Si falla una ejecución, revisar Actions y volver a ejecutarla después de corregir el problema. Los antiguos flujos del servidor y de sincronización pública no publican automáticamente desde este repositorio.

## Antes de distribuir comercialmente

Faltan firma de código y timestamp, revisión de licencias y titular del producto —la licencia actual del repositorio todavía contiene el marcador `[Your Company Name]`—, matriz de sistemas soportados, pruebas de actualización/recuperación e instalador en equipos limpios. Tampoco se anuncia una verificación real de IA, RDP y SSH contra infraestructura del cliente a partir de las pruebas simuladas.

Referencias: [soporte de .NET](https://dotnet.microsoft.com/en-us/platform/support/policy), [publicación .NET](https://learn.microsoft.com/en-us/dotnet/core/deploying/), [distribución WebView2](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution), [Inno Setup](https://jrsoftware.org/isdl.php).

## Idiomas del instalador y de la app

El instalador muestra el selector español/inglés y guarda es/en en HKCU bajo Software\Sentrait\AiSysadminAgent. El cliente y su ventana de preferencias reciben ese valor antes de cargar React. Los catálogos traducen textos propios y diálogos nativos; no modifican datos del usuario ni salidas remotas. Las pruebas del instalador deben usar InstallerSettingsKey y AppId sintéticos para no cambiar el idioma de una instalación real. Las notas legales de terceros conservan su texto oficial.
