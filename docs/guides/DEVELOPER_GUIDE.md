# Guía de desarrollo

## Componentes vigentes

El cliente Windows está en [apps/windows](../../apps/windows), con interfaz React/TypeScript/Vite en [frontend-desktop-ui](../../frontend-desktop-ui). Usa WPF, .NET 10 y WebView2. El modo local funciona sin backend ni cuenta de empresa.

La interfaz web independiente está en [frontend-web](../../frontend-web), usa Next.js 16/React 19 y requiere Node.js 22. El backend FastAPI usa su propia configuración de base de datos y servicios. No confundir las recetas Tauri/PyInstaller anteriores con la distribución Windows vigente.

## Preparación

Usar el SDK de [global.json](../../global.json) y Node.js 22. Instalar las dependencias de interfaz con npm ci desde su carpeta. Las herramientas locales, entornos virtuales y archivos de datos no se versionan.

Para validar el cliente: npm test y npm run build en frontend-desktop-ui; después dotnet test apps/windows.Tests/AiSysadmin.Tests.csproj desde la raíz. El empaquetado y las pruebas aisladas del instalador se explican en [distribución Windows](../WINDOWS_DISTRIBUTION.md).

Las integraciones SSH/SFTP requieren un intérprete Python con asyncssh indicado mediante AI_AGENT_SSH_LAB_PYTHON. Usan únicamente un laboratorio de loopback sintético. Las pruebas DPAPI requieren Windows con un perfil válido.

## Seguridad y datos

No probar contra equipos reales del usuario. No incluir claves, contraseñas, copias de conexiones ni archivos de entorno reales en Git. Conservar los datos locales al actualizar y usar directorios y claves de registro aisladas al probar el almacenamiento o el instalador.

El cliente protege datos con DPAPI; los backups de conexiones usan contraseña independiente. El backend usa su configuración de cifrado propia. JWT se firma y valida con PyJWT, algoritmo permitido explícito, sujeto y caducidad obligatorios. Los hashes de contraseñas conservan bcrypt.

Los comandos del chat se ejecutan en la terminal SSH abierta con permisos mediados por la app. RDP requiere texto o una captura revisada y autorizada por consulta. Los datos de terminal son evidencia no confiable y nunca conceden autorización.

## Idiomas

Documentar el proyecto en español. La app usa español e inglés mediante catálogos compartidos y el idioma guardado por el instalador. Conservar todos los marcadores de parámetros. No traducir nombres de equipos, comandos, salidas de terminal ni conversaciones.

## Cambios y distribución

Seguir [AGENTS.md](../../AGENTS.md), actualizar documentación y [notas de versión](../releases/WINDOWS_0.11.md), revisar el diff y ejecutar las pruebas afectadas antes del commit. La línea Windows usa 0.11.N, con N asignado automáticamente por CI. No aumentar manualmente números distintos ni sustituir assets publicados.

El único destino de trabajo es deimisq/AI-Sysadmin. No sincronizar otros repositorios. La publicación pública está pendiente de resolver objetos sensibles todavía recuperables en GitHub; ver [revisión de publicación](../OPEN_SOURCE_REVIEW.md) y [seguridad](../../SECURITY.md).
