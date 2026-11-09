# Reparaciones de arquitectura V2

## Cambios

- Las rutas de diagnóstico, ejecución, credenciales y consola SSH comprueban usuario activo, organización y acceso al servidor antes de usar credenciales.
- La identidad de aprobación proviene del JWT. El campo heredado `approved_by` no concede permisos.
- Los listados conservan el filtro de organización; la asignación y la importación CSV comprueban el acceso al grupo.
- La configuración global requiere superadministrador. Los endpoints heredados de clientes globales también quedan restringidos.
- JWT y cifrado requieren secretos explícitos de al menos 32 caracteres; se rechazan los valores predeterminados conocidos y las plantillas.
- Los frontends recuperan los módulos reales del historial. La exclusión de Git de la carpeta `lib` ya no oculta sus fuentes.
- El escritorio usa fetch del navegador, con validación TLS normal, y una API relativa. El puente nativo correlaciona cada solicitud y libera sus escuchas ante respuestas, errores o timeout.
- Windows usa .NET 8, carga `wwwroot` en WebView2 y copia el bundle al compilar/publicar. Las solicitudes de API pasan por el proxy local sin desactivar TLS ni permitir redirecciones a otros orígenes.
- RDP instancia el ActiveX instalado de Microsoft; se retiró la simulación. SSH utiliza colecciones concurrentes, cierre de recursos y la operación real de redimensionado del PTY.
- Windows verifica la huella SSH: pide confirmación la primera vez y rechaza cambios posteriores. El backend utiliza known_hosts, sin desactivar su comprobación.
- Se eliminaron registros que incluían contraseñas o claves privadas.
- Se actualizaron los Dockerfiles, scripts raíz, empaquetado y CI a las rutas V2. El binario Linux tiene un punto de entrada que inicia Uvicorn.
- SSH.NET se actualizó a 2026.0.0, versión corregida para [los avisos de seguridad publicados](https://github.com/sshnet/SSH.NET/releases/tag/2026.0.0).

## Desarrollo

Requisitos: Node.js 22, Python 3.11 y .NET SDK 8 para Windows. WebView2 Runtime debe estar instalado para abrir el shell.

```powershell
cd frontend-desktop-ui
npm ci
npm run build
npm test
cd ..
dotnet build apps/windows/AiSysadmin.csproj -c Release
dotnet test apps/windows.Tests/AiSysadmin.Tests.csproj -c Release
```

El shell carga el bundle compilado. Para usar Vite con recarga:

```powershell
$env:AI_AGENT_UI_URL = 'http://127.0.0.1:5173'
# En otra terminal: npm run desktop:dev
dotnet run --project apps/windows/AiSysadmin.csproj
```

En modo empaquetado, `AI_AGENT_BACKEND_URL` configura el backend del proxy Windows; por defecto usa `http://127.0.0.1:8000`. Se permite HTTP solamente en loopback. En desarrollo, `API_PROXY_TARGET` configura el proxy de Vite hacia el mismo backend. La vista previa visual separada utiliza datos ficticios y no cambia esta configuración.

Web:

```powershell
cd frontend-web
npm ci
npm run build
npm start
```

El frontend web usa `/api/v1` y espera un reverse proxy hacia FastAPI. Docker/Nginx proporciona ese enrutamiento.

## Configuración de seguridad y producción

Usa `backend/.env.example` para desarrollo y `.env.prod.template` para Docker. Las variables correctas son `SECRET_KEY`, `ALGORITHM` y `ENCRYPTION_KEY`. Genera secretos propios; las plantillas no son valores utilizables.

**Conserva la clave de cifrado de cualquier instalación con credenciales guardadas.** Cambiarla sin volver a cifrar los datos impide recuperar esas credenciales. Las instalaciones que usaron la clave predeterminada necesitan una migración de cifrado antes de cambiarla.

El archivo local `.env.prod` se conserva, pero deja de versionarse. Su eliminación del índice no borra las versiones anteriores del historial. Si contenía secretos utilizados en un despliegue, deben rotarse fuera de este checkout, coordinando la migración de los datos cifrados.

Configura `SSH_KNOWN_HOSTS` con la ruta a un archivo de huellas verificadas en el backend, o proporciona el archivo known_hosts estándar del usuario que ejecuta el proceso. Las conexiones a hosts desconocidos fallan de forma segura. No se agregan huellas automáticamente en el backend.

```sh
docker compose --env-file .env.prod -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

## Validación

- 51 pruebas de autorización, aislamiento entre organizaciones, rechazo de secretos inseguros y protección de credenciales del backend.
- 5 pruebas del puente: solicitudes concurrentes, errores, timeout, navegador y compatibilidad Tauri.
- 7 pruebas locales del proxy Windows: redirecciones, conservación de cuerpo/token, CORS, exigencia de HTTPS remoto y rechazo de puertos ocupados.
- Compilación estricta de TypeScript y bundle de escritorio.
- Compilación de las páginas web de producción.
- Compilación de Windows y comprobación de sintaxis de todos los archivos Python.

Las pruebas de backend usan SQLite en memoria y sustituyen los servicios externos; las del proxy usan servidores HTTP locales. No verifican una conexión SSH/RDP real, PostgreSQL/pgvector ni el arranque de contenedores. La validación contra esos servicios requiere un entorno de integración configurado. Los workflows quedan preparados para ejecutarse en GitHub; no se dispararon ni publicaron releases desde esta reparación.
