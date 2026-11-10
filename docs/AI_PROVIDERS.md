# Proveedores de inteligencia artificial en Windows

En **Configuración → Inteligencia artificial**, elegir el proveedor y completar sus campos. Las direcciones de los proveedores de nube están predefinidas. Ollama y OpenCode muestran una URL de servidor editable, con su dirección local predeterminada.

| Proveedor | Autenticación | Modelos |
| --- | --- | --- |
| ChatGPT / OpenAI | Clave de la API de OpenAI; organización y proyecto opcionales | Catálogo consultado con la clave configurada |
| Gemini | Clave de Google AI Studio | Catálogo consultado con la clave configurada |
| Claude | Clave de la API de Anthropic; workspace cuando la clave lo requiere | Catálogo de Anthropic; API Messages nativa |
| DeepSeek | Clave de su API | Catálogo consultado con la clave configurada |
| Ollama | URL y modelo; token opcional para un proxy protegido | Modelos instalados en el servidor indicado |
| OpenCode | URL, usuario y contraseña si está protegido | Modelos de sus proveedores conectados |

La lista se consulta automáticamente al salir del campo de clave y al abrir una configuración con clave guardada. **Actualizar modelos** permite reintentar o refrescarla. El selector usa exclusivamente las respuestas del proveedor, sin identificadores manuales. Un catálogo no garantiza permisos de generación, cuota o facturación; algunos modelos pueden no admitir chat. El inicio de sesión de ChatGPT no se utiliza como autenticación de esta conexión API. Las claves siguen guardadas cifradas mediante DPAPI para el usuario Windows; nunca se devuelven a la interfaz.

## Ollama

Instalar y abrir Ollama, descargar un modelo, indicar la **URL del servidor** y elegir **Actualizar modelos**. Ejemplos: `http://localhost:11434`, `http://192.168.1.50:11434` o `https://servidor.example/ollama`. Se aceptan direcciones con `/api`, con `/v1` o sin sufijo. La detección consulta `/api/tags` y las conversaciones usan `/v1/chat/completions` en ese mismo servidor y ruta de proxy. La configuración remota del servicio debe permitir conexiones desde el equipo del técnico.

Ollama nativo no requiere autenticación. Si un proxy exige un token Bearer, puede guardarse en el campo opcional. Para enviar credenciales a otro equipo se exige HTTPS. No se descarga ni se inicia un modelo automáticamente. Los modelos identificados como remotos o de nube se excluyen de esta lista. También se puede escribir un identificador de modelo ya instalado.

## OpenCode

Configurar sus proveedores y ejecutar `opencode serve` en el servidor indicado. La URL predeterminada es `http://127.0.0.1:4096`, pero se pueden usar otro host, puerto o ruta de proxy. La app lista únicamente los proveedores que OpenCode informa como conectados. Si el servicio usa `OPENCODE_SERVER_PASSWORD`, escribir esa contraseña en la app. El usuario predeterminado es `opencode`; si se configuró `OPENCODE_SERVER_USERNAME`, introducirlo en **Usuario del servidor OpenCode**. Para credenciales fuera de este equipo se exige HTTPS.

OpenCode puede usar modelos locales o servicios en la nube: que el agente esté en este equipo no significa que el modelo sea local. Cada consulta crea una sesión independiente con herramientas deshabilitadas, usa el agente `plan`, pide una respuesta y elimina esa sesión al terminar. Si la llamada falla, intenta abortarla antes de limpiar. No toca otras sesiones. El servicio debe confirmar las restricciones de la sesión; si no lo hace, la app no envía el contexto. Los registros propios del servicio o del proveedor pueden conservar datos.

El modo **Ejecutar tarea** sigue usando el agente SSH de la aplicación: autorización explícita por objetivo, un destino, hasta diez comandos y cinco minutos. El modelo elegido propone los pasos; OpenCode no recibe herramientas para ejecutar comandos en el equipo del técnico.

## Compartir contexto

Guardar la configuración no envía consultas, no prueba una clave contra la nube y no ejecuta tareas. La detección solo consulta el catálogo de modelos en la URL elegida. Para habilitar la IA se acepta el aviso del proveedor y dirección seleccionados. Al pedir ayuda se comparte la consulta, la identidad del destino y el contexto de terminal configurado. Cambiar proveedor, dirección o usuario limpia la credencial escrita y exige aceptar el aviso nuevamente. Una credencial guardada no se reutiliza para otra dirección o usuario.

En OpenAI, los campos opcionales de organización y proyecto se envían como `OpenAI-Organization` y `OpenAI-Project`. Claude usa `anthropic-workspace-id` si se indicó un workspace; es necesario para claves que no están restringidas a uno. Gemini y DeepSeek solo necesitan su clave y el identificador del modelo para estas conexiones directas.

## Referencias de integración

- [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat)
- [Compatibilidad OpenAI de Gemini](https://ai.google.dev/gemini-api/docs/openai)
- [API de Claude](https://platform.claude.com/docs/en/api/messages)
- [API de DeepSeek](https://api-docs.deepseek.com/)
- [Compatibilidad OpenAI de Ollama](https://docs.ollama.com/api/openai-compatibility)
- [Servidor de OpenCode](https://docs.opencode.ai/docs/server/)

Los adaptadores se prueban con claves ficticias y respuestas HTTP simuladas. La prueba nativa de Configuración utiliza un perfil WebView2 aislado y datos de prueba. El uso con claves reales o modelos locales requiere que el servicio correspondiente esté disponible.

## Catálogos consultados

- OpenAI y DeepSeek: `GET /models`, autenticación Bearer.
- [Gemini](https://ai.google.dev/api/models): `GET /v1beta/models`, cabecera `x-goog-api-key`, paginación mediante `nextPageToken`; se incluyen modelos con `generateContent`.
- [Claude](https://platform.claude.com/docs/en/api/models/list): `GET /v1/models`, cabeceras `x-api-key` y `anthropic-version`, paginación mediante `has_more` y `last_id`.

La lista se deduplica y ordena; se conserva el modelo seleccionado cuando sigue disponible. Las claves guardadas se reutilizan desde el almacén nativo sin devolverlas al formulario. No se siguen redirecciones con credenciales.

## Conversación y ejecución

**Conversar con el agente** interpreta el contexto disponible y propone comandos. Con una sesión SSH activa, cada propuesta nueva muestra una fila compacta con **Ejecutar**, el selector de permiso (**Una vez**, **Esta sesión**, **Siempre aquí**) y un icono para rechazar. El selector explica el efecto cuando se elige una autorización automática. Las propuestas del historial solo permiten copiar; no se ejecutan como si fueran nuevas.

El permiso de sesión queda en memoria y se vincula al identificador de conexión SSH y la identidad del destino. El persistente se guarda cifrado por usuario Windows, vinculado al destino y sus credenciales; cambiar esos datos invalida su aplicación. No se incluye en las copias portables del inventario. Las conexiones temporales no admiten permisos persistentes. **Revocar permiso automático** devuelve el control a las autorizaciones individuales.

El chat envía el texto aprobado sin `eval`, comillas adicionales ni `printf` de cierre a la terminal SSH abierta, conservando el directorio y las variables de su shell. La shell debe estar lista para recibir comandos; el agente no responde a contraseñas o diálogos interactivos. La app reconoce el regreso del prompt observado (incluidos cambios de directorio en prompts habituales usuario@host) y captura la salida para analizarla. El código de salida queda como no disponible: volver al prompt no demuestra éxito. Los prompts personalizados que no se reconozcan requieren detener la espera manualmente; no se añade instrumentación a la shell.

Los permisos de sesión o persistentes permiten continuar sin preguntar, con un límite de diez pasos automáticos por consulta. El chat no interrumpe comandos automáticamente por el antiguo plazo de 25 segundos ni por producir mucha salida. La captura para el análisis conserva los últimos 24000 caracteres e indica cuando es parcial; la terminal sigue recibiendo toda la salida. **Detener comando** intenta interrumpirlo con Ctrl+C en esa misma terminal y revoca la autorización automática; los cambios ya hechos no se revierten. El chat recibe un estado de interrupción o desconexión con la salida parcial y continúa con un análisis, sin afirmar éxito ni repetir automáticamente la operación. Escribir una autorización en lenguaje natural no modifica los permisos: deben concederse con los controles explícitos del chat.

Windows registra las propuestas y solo ejecuta el comando exacto asociado a su identificador de un solo uso. Una nueva propuesta reemplaza las anteriores de esa sesión; vencen a los diez minutos. Se revalidan el consentimiento, la identidad del destino y la conexión inmediatamente antes de ejecutar. No se reintenta una operación cuyo resultado sea incierto.

**Tarea avanzada** conserva el flujo separado por objetivo, con una sesión SSH del destino y autorización explícita. Los comandos se ejecutan en canales SSH independientes; los resultados aparecen en el registro de la tarea. El prompt de la terminal interactiva puede permanecer sin cambios. Una respuesta del modelo que anuncia una acción no es evidencia de ejecución: debe existir un evento de comando y su resultado. No se permite ejecutar una tarea avanzada y un comando del chat simultáneamente.

Se aceptan respuestas estructuradas como JSON directo o dentro de un bloque Markdown JSON completo. El texto libre sigue admitido en conversación; una decisión de tarea inválida detiene la ejecución.

## Contexto de conversación y limpieza

No es necesario limpiar el chat para cambiar de tema. Cada mensaje del técnico es una petición nueva y puede iniciar otro objetivo o referirse a un episodio anterior. El modelo recibe una indicación explícita de distinguir esas peticiones de las continuaciones automáticas que genera la app después de ejecutar un comando. Se conserva el registro de la sesión y sus datos de alcance para resolver preguntas como «¿por qué falló ese servicio antes?» o «¿qué hizo lo último que ejecuté?», incluidos los comandos manuales. Si una referencia tiene varios significados posibles, se pide una aclaración concreta; una explicación o solicitud de sugerencias no requiere ejecutar acciones. Una pregunta nueva invalida las propuestas todavía pendientes del turno anterior, sin revocar permisos ni borrar la conversación.

El modelo recibe los metadatos y la terminal como evidencia, los intercambios anteriores con roles de usuario y asistente, y la pregunta actual como último mensaje. Los comandos autorizados y sus resultados se identifican como registros nativos separados; no se confunde un comando propuesto con una ejecución comprobada. El análisis posterior a ejecutar conserva el objetivo de esa propuesta y distingue éxito del comando de cumplimiento del objetivo. Por ejemplo, actualizar índices de paquetes no demuestra la salud general del servidor y el código de salida se interpreta asociado a su comando, sin consultar un `echo $?` posterior.

**Limpiar chat**, disponible también en el icono superior, elimina la conversación de ese destino en el equipo, limpia el borrador y los resultados mostrados e invalida las propuestas anteriores. Las respuestas que lleguen tarde no restauran el historial. La consulta pendiente de ese destino se cancela. La terminal y su registro cifrado siguen disponibles como evidencia y los permisos de ejecución se conservan. No borra datos ya recibidos por el proveedor ni copias anteriores del inventario. El historial mantiene hasta veinte registros por destino e incluye hasta dieciséis antecedentes recientes en cada consulta.
