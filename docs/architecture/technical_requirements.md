# Requisitos técnicos

## Cliente Windows vigente

La distribución de escritorio usa .NET 10, WPF, WebView2 y una interfaz React/TypeScript. Requiere Windows x64 compatible con el instalador y Microsoft Edge WebView2 Runtime Evergreen. El instalador incluye el runtime .NET; el usuario no necesita Python, Node.js, Docker ni un backend para usar conexiones locales.

Las conexiones SSH/SFTP/RDP salen del equipo del técnico. Requieren conectividad al destino y credenciales autorizadas. Los proveedores IA de nube requieren una clave de su API; los modelos y sus costos dependen del proveedor. Ollama/OpenCode requieren un servidor configurado y accesible. HTTPS es necesario para enviar credenciales a servidores externos al equipo, según la política del proveedor local.

Los datos locales se protegen con DPAPI para la cuenta Windows. Para migrar conexiones a otro equipo debe usarse la exportación cifrada con contraseña. Copiar el almacén DPAPI no permite abrirlo con otra cuenta.

La app y el instalador ofrecen español e inglés. La documentación propia se mantiene en español. Las salidas de equipos y proveedores conservan su idioma original.

## Desarrollo de Windows

- SDK fijado en [global.json](../../global.json).
- Node.js 22 para [frontend-desktop-ui](../../frontend-desktop-ui).
- Windows con un perfil válido para probar DPAPI.
- Laboratorio SSH/SFTP sintético con asyncssh para las integraciones que lo requieran.
- Inno Setup para generar y probar el instalador.

Procedimientos: [distribución Windows](../WINDOWS_DISTRIBUTION.md), [actualizaciones](../WINDOWS_UPDATES.md) y [guía del repositorio](../../AGENTS.md).

## Componentes web y de empresa

El [backend](../../backend) y la [interfaz web](../../frontend-web) tienen despliegue independiente y no se incluyen en el instalador Windows. La interfaz web usa Next.js 16/React 19 y Node.js 22. El backend tiene dependencias Python propias y requiere base de datos, configuración de secretos y servicios según el modo desplegado.

Las recetas antiguas de Docker/Tauri no sustituyen la validación de una instalación de empresa. No usar claves de ejemplo ni credenciales incluidas en documentación como datos de producción. Revisar las [reparaciones de arquitectura](../REPARACIONES_V2.md) antes de desplegar.

## Seguridad y soporte

Una compilación satisfactoria no certifica un despliegue completo ni ausencia de vulnerabilidades. Revisar [seguridad](../../SECURITY.md) y la [evaluación de publicación](../OPEN_SOURCE_REVIEW.md). El software actual no tiene firma comercial de código.

Para informar problemas, incluir versión, commit y reproducción con datos sintéticos. No adjuntar claves, contraseñas ni registros sin revisar. Contacto oficial: [Sentra IT](https://sentrait.com.uy/).
