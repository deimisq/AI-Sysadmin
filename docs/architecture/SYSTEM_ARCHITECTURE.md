# Arquitectura y funcionalidades

## Cliente Windows vigente

El cliente de escritorio actual usa WPF sobre .NET 10 y aloja la interfaz React/TypeScript/Vite mediante WebView2. El origen interno es https://appassets.local y la navegación externa del WebView está restringida. Los enlaces externos autorizados se abren mediante el host nativo.

El modo local no necesita autenticación de empresa ni un backend. El host mantiene conexiones SSH, transferencias SFTP y controles nativos RDP. La interfaz solicita operaciones por mensajes correlacionados con respuestas; no recibe permisos por una instrucción del modelo.

## Flujos principales

1. El técnico selecciona o crea una conexión guardada o temporal.
2. El host valida el destino y abre SSH/SFTP o RDP desde el equipo del técnico.
3. La sesión SSH conserva su terminal interactiva, estado y registro cifrado local.
4. Cada consulta IA recibe una captura reciente del contexto permitido y la conversación relevante. No existe vigilancia remota permanente.
5. Los comandos propuestos requieren autorización por comando, sesión o destino. Se escriben en la terminal SSH abierta y su salida alimenta la continuación.
6. RDP comparte únicamente texto o una captura revisada y autorizada para una consulta. No permite al agente controlar el escritorio ni ejecutar herramientas SSH sobre ese destino.

## Persistencia y credenciales

El almacén local, las credenciales, los registros y la configuración IA se protegen con DPAPI para el usuario de Windows. La identidad de instalación y el directorio de datos deben permanecer estables al actualizar. Las copias portables de conexiones usan cifrado con contraseña y no incluyen chats, claves IA ni tokens GitHub.

El instalador guarda únicamente es/en como idioma bajo HKCU. El host entrega ese valor a las ventanas antes de cargar React. Los catálogos traducen textos propios; no traducen contenido del usuario ni salida de equipos.

## Actualizaciones

La versión Windows tiene formato 0.11.N; CI asigna N por ejecución. La app consulta releases, valida versión, tamaño y SHA256 y solicita aprobaciones separadas para descarga, instalación y reinicio. El instalador permite cerrar versiones anteriores. No se reinicia Windows automáticamente ni se sobrescriben assets ya publicados.

## Componentes web y backend

El backend FastAPI y la interfaz Next.js 16/React 19 tienen despliegue independiente. El backend usa SQLAlchemy y los servicios configurados de base de datos, proveedores IA y automatización. JWT usa PyJWT con algoritmo configurado, firma, sujeto y caducidad obligatorios; las contraseñas conservan bcrypt. El acceso de empresa debe validarse con las pruebas de autorización y con la configuración real del despliegue.

La distribución web requiere Node.js 22. No debe confundirse con el cliente WPF, que no incluye ni requiere esos servicios para las conexiones locales.

## Implementaciones anteriores

Las integraciones Tauri/Rust, Guacamole y los planes de fases anteriores se conservan como antecedentes y componentes independientes. No forman parte del instalador Windows vigente. La presencia de código o de una propuesta en el repositorio no significa que esté soportada o certificada para producción.

## Validación y límites

Las pruebas Windows usan datos sintéticos. Las integraciones SSH/SFTP se ejecutan en loopback; las pruebas del instalador usan ejecutables, rutas y claves de registro aisladas. Las auditorías de dependencias y secretos son controles puntuales, no una garantía de seguridad absoluta. Los objetos antiguos retenidos por GitHub deben purgarse antes de abrir la visibilidad si contienen secretos.

Referencias: [implementación vigente](../IMPLEMENTACION_V3.md), [distribución](../WINDOWS_DISTRIBUTION.md), [actualizaciones](../WINDOWS_UPDATES.md), [seguridad](../../SECURITY.md) y [revisión de publicación](../OPEN_SOURCE_REVIEW.md).
