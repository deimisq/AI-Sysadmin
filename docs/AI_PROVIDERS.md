# Proveedores de inteligencia artificial en Windows

En **Configuración → Inteligencia artificial**, elegir el proveedor y completar sus campos. Las direcciones de los proveedores de nube están predefinidas. Ollama y OpenCode muestran una URL de servidor editable, con su dirección local predeterminada.

| Proveedor | Autenticación | Modelos |
| --- | --- | --- |
| ChatGPT / OpenAI | Clave de la API de OpenAI; organización y proyecto opcionales | Lista sugerida u otro identificador disponible en la cuenta |
| Gemini | Clave de Google AI Studio | Lista sugerida u otro modelo compatible |
| Claude | Clave de la API de Anthropic; workspace cuando la clave lo requiere | API Messages nativa |
| DeepSeek | Clave de su API | Lista sugerida u otro modelo compatible |
| Ollama | URL y modelo; token opcional para un proxy protegido | Modelos instalados en el servidor indicado |
| OpenCode | URL, usuario y contraseña si está protegido | Modelos de sus proveedores conectados |

La lista de modelos sugeridos no garantiza acceso en todas las cuentas. El inicio de sesión de ChatGPT no se utiliza como autenticación de esta conexión API. Las claves siguen guardadas cifradas mediante DPAPI para el usuario Windows; nunca se devuelven a la interfaz.

## Ollama

Instalar y abrir Ollama, descargar un modelo, indicar la **URL del servidor** y elegir **Actualizar modelos locales**. Ejemplos: `http://localhost:11434`, `http://192.168.1.50:11434` o `https://servidor.example/ollama`. Se aceptan direcciones con `/api`, con `/v1` o sin sufijo. La detección consulta `/api/tags` y las conversaciones usan `/v1/chat/completions` en ese mismo servidor y ruta de proxy. La configuración remota del servicio debe permitir conexiones desde el equipo del técnico.

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
