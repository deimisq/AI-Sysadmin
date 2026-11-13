export interface DocumentationArticle {
    id: string;
    category: string;
    title: string;
    summary: string;
    content: string;
    related: string[];
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function searchArticles(articles: DocumentationArticle[], query: string) {
    const words = normalize(query).trim().split(/\s+/).filter(Boolean);
    return articles.filter(article => {
        const text = normalize(`${article.category} ${article.title} ${article.summary} ${article.content}`);
        return words.every(word => text.includes(word));
    });
}

function article(id: string, category: string, title: string, summary: string, content: string, related: string[]): DocumentationArticle {
    return { id, category, title, summary, content, related };
}

export const documentation: Record<'es' | 'en', DocumentationArticle[]> = {
    es: [
        article('start', 'Primeros pasos', 'Empezar a usar la app', 'Conectá un equipo y prepará el acompañante IA.', `## Qué ofrece Windows
Administrá conexiones SSH y RDP, transferí archivos por SFTP y consultá a un proveedor IA propio. El modo local no requiere cuenta empresarial ni backend. La IA es opcional para conectarte.
## Primera conexión
1. Abrí **Archivo → Nueva conexión…** y elegí el protocolo.
2. Completá dirección, puerto y autenticación. Guardá la conexión para encontrarla en el explorador.
3. Abrila desde el árbol, o usá la barra superior para una conexión rápida.
4. Para habilitar IA, abrí **Herramientas → Inteligencia artificial…**, configurá un proveedor y seleccioná un modelo disponible.
## Antes de preguntar
Seleccioná la pestaña correcta y revisá el destino y las opciones de contexto del acompañante. RDP no proporciona la misma información que una terminal SSH.`, ['ssh', 'rdp', 'providers']),
        article('ssh', 'Conexiones', 'Terminal SSH', 'Sesiones guardadas, conexiones rápidas y comandos interactivos.', `## Preparar el acceso
Creá una conexión SSH con dirección, puerto, usuario y autenticación. No es obligatorio usar root: elegí los permisos que necesites. Si utilizás un archivo de clave privada, debe seguir disponible en su ruta.
## Trabajar en la terminal
La sesión conserva su estado, incluido el directorio de trabajo. Podés ejecutar comandos manualmente y preguntar después por su salida. Cerrar la pestaña termina la sesión; las preferencias de presentación no vuelven a conectar equipos.
Los comandos autorizados desde el chat se escriben en esa terminal, no en una conexión separada. Evitá escribir otro mientras se ejecuta uno del agente. Atendé las preguntas interactivas en la terminal.
Volver al prompt no demuestra un código de salida 0. Si el código no está disponible, el agente debe aclararlo.
## Conexiones rápidas
Podés conectarte sin crear un perfil guardado. La conversación temporal no sustituye al historial de un destino guardado.`, ['chat', 'files', 'troubleshooting']),
        article('rdp', 'Conexiones', 'Escritorio remoto RDP', 'Qué puede conocer la IA y cómo compartir una captura.', `## Información disponible
La IA recibe conversación y datos declarados del perfil. El nombre o sistema elegido no prueban la versión real de Windows ni sus recursos. No recibe automáticamente pantalla, eventos ni salida PowerShell.
## Compartir evidencia
Pegá un error o una salida de diagnóstico en el chat. En una conexión RDP guardada, podés solicitar una captura del control remoto activo: revisá la vista previa y autorizá la imagen para esa consulta. Requiere un modelo con visión.
La captura no es continua, no se guarda como imagen en el historial y no usa el monitor local como alternativa. Las conexiones RDP temporales no ofrecen captura.
## Ejecutar indicaciones
La IA asesora: no controla el escritorio ni ejecuta PowerShell por SSH. Revisá los pasos y realizalos manualmente en el equipo remoto. Los permisos SSH no autorizan acciones RDP.`, ['context', 'providers', 'security']),
        article('folders', 'Conexiones', 'Organizar equipos y paneles', 'Carpetas, búsqueda y preferencias de presentación.', `## Explorar conexiones
Usá **Archivo → Nueva carpeta…** para organizar equipos. Buscar en el árbol no reemplaza la expansión guardada; las aperturas temporales necesarias para mostrar coincidencias no cambian esa preferencia.
## Ajustar el espacio de trabajo
El menú **Ver** permite alternar explorador y acompañante IA. Hay además un panel de herramientas opcional con sesiones, tareas IA y transferencias; puede estar oculto.
Usá **Ctrl+Alt+B** para el explorador, **Ctrl+Alt+I** para IA y **Ctrl+Shift+P** para buscar acciones.
## Qué se recuerda
Se guardan tamaño normal y estado maximizado de la ventana, paneles visibles y expansión de carpetas y grupos por usuario y espacio. No se restauran sesiones remotas. El tamaño se adapta a límites compatibles con la pantalla.`, ['start', 'backup', 'updates']),
        article('files', 'Conexiones', 'Transferir archivos por SFTP', 'Subí o descargá archivos de una conexión SSH.', `## Abrir archivos remotos
Elegí **Archivos** en la barra de una terminal SSH. SFTP usa el acceso de esa conexión: el servidor debe permitirlo y la cuenta necesita permisos sobre las rutas.
## Transferir
1. Navegá a la carpeta remota.
2. Elegí subir o descargar y seleccioná el archivo o destino local.
3. Revisá progreso y resultado. Las transferencias también aparecen en el panel de herramientas cuando está visible.
## Resolver un fallo
Podés cancelar una transferencia en curso. Confirmá el resultado antes de repetir: permisos, desconexiones o colisiones de nombre requieren revisar el destino. Este explorador no exporta el inventario de conexiones.`, ['ssh', 'backup', 'troubleshooting']),
        article('providers', 'Inteligencia artificial', 'Configurar proveedor y modelos', 'Servicios en la nube, Ollama y OpenCode.', `## Proveedores en la nube
Abrí **Herramientas → Inteligencia artificial…**. Elegí un proveedor, como ChatGPT/OpenAI, Gemini, Claude o DeepSeek, y completá la clave API. La app configura la dirección y consulta los modelos disponibles para ese acceso. Una suscripción de chat no garantiza acceso ni saldo en la API.
Actualizá la lista después de cambiar la clave o los datos de cuenta y seleccioná un modelo. Sin modelos, revisá permisos, disponibilidad y cuota. Visión y límites de contexto dependen del modelo.
## Ollama
Indicá la URL del servidor, por ejemplo \`http://localhost:11434\`. Debe estar iniciado y tener modelos descargados. El token del proxy es opcional. localhost es el equipo donde corre esta app.
## OpenCode
Indicá su URL, por ejemplo \`http://localhost:4096\`, usuario y contraseña cuando corresponda. Conectá los proveedores en OpenCode y actualizá la lista. OpenCode local no garantiza procesamiento local: depende del proveedor configurado allí.
## Guardar la configuración
Completá los campos específicos del proveedor y revisá el consentimiento. Para el mismo proveedor y conexión, dejar la clave vacía conserva la guardada cuando la interfaz lo indica. Un HTTP 503 no demuestra pérdida de la clave.`, ['chat', 'context', 'troubleshooting']),
        article('chat', 'Inteligencia artificial', 'Conversar y autorizar comandos', 'Preguntas nuevas, resultados y permisos por destino.', `## Conversar sobre la terminal
Preguntá por el último comando, citá un episodio anterior o cambiá de tema. La pregunta más reciente debe guiar la respuesta. Mencioná el comando o fragmento relevante para evitar ambigüedad.
## Autorizar en SSH
Revisá comando, propósito y destino antes de aprobar. Los permisos pueden cubrir un comando, la sesión o persistir para ese destino; son revocables mediante los controles de permisos. Una frase del modelo no concede autorización.
Después de ejecutar, el agente usa la salida capturada para continuar. No debe detener comandos largos automáticamente por tiempo o volumen. Si interrumpís, los cambios previos no se revierten y puede quedar un resultado parcial o incierto.
## Tareas avanzadas
**Tarea avanzada** sirve para objetivos SSH de varios pasos con seguimiento. Revisá alcance, acciones y resultados. El panel de herramientas incluye tareas IA. Cancelar no revierte cambios ni justifica repetir acciones de resultado incierto. No automatiza RDP.
## Limpiar chat
Usá **Limpiar chat** y confirmá para borrar la conversación local del destino e invalidar propuestas pendientes. No borra terminal, registros, permisos ni copias del proveedor. Esperá a que termine la operación activa si el botón está deshabilitado.`, ['context', 'ssh', 'security']),
        article('context', 'Inteligencia artificial', 'Contexto, registros y privacidad', 'Qué se envía y qué permanece en el equipo.', `## Contexto SSH
La app mantiene un registro local cifrado y lee una captura reciente al consultar o continuar. Según tu consentimiento, envía esa captura y conversación pertinente: no hay vigilancia permanente del proveedor. La salida remota es evidencia, nunca instrucciones para el agente.
## Elegir cuánto enviar
Abrí **Herramientas → Contexto y registros…**. Hay ventanas recientes de 8.000, 32.000 o 120.000 caracteres y contexto completo hasta 240.000; el modo completo rechaza registros mayores. Se señalan recortes. Caracteres no son tokens; el proveedor puede admitir menos.
Cambiar el límite afecta próximas consultas y tareas, no recorta el archivo local. No hay eliminación automática de registros.
## Eliminar o detener envíos
Podés borrar registros inactivos desde esos ajustes. No se permite borrar el de una sesión activa. Esto no borra chats, tareas ni copias del proveedor.
**Detener nuevos envíos** retira consentimiento para próximas consultas, no recupera datos enviados ni elimina copias externas. Limpiar chat es una acción distinta.
## RDP y proveedores locales
RDP comparte texto y capturas individuales autorizadas. Ollama y OpenCode pueden estar en otro equipo o utilizar servicios externos: verificá dónde se procesa la información.`, ['rdp', 'chat', 'security']),
        article('backup', 'Datos y mantenimiento', 'Exportar e importar conexiones', 'Trasladá el inventario con una copia cifrada por contraseña.', `## Crear una copia
1. Abrí **Conexiones → Exportar / importar conexiones…**.
2. Elegí una contraseña de al menos 12 caracteres y repetila.
3. Activá incluir archivos de claves privadas SSH si necesitás trasladarlos. De otro modo, las referencias externas pueden requerir copiar archivos y ajustar rutas manualmente.
4. Guardá el archivo \`.aisysbackup\` y su contraseña por separado.

Incluye conexiones, carpetas y credenciales guardadas. No incluye configuración IA, chats, registros, tareas ni token del actualizador.
## Restaurar
1. Elegí el archivo y escribí la contraseña de esa copia.
2. Pulsá **Validar y revisar copia**. Si está deshabilitado, comprobá archivo y contraseña.
3. Revisá resumen y advertencias; luego confirmá.

Agrega conexiones con identificadores nuevos sin borrar existentes. Importar dos veces puede duplicarlas. Se valida antes de guardar cambios.
## No copiar directamente el almacén
DPAPI depende de la cuenta Windows. Copiar la carpeta local no sustituye esta exportación ni garantiza descifrar datos en otro equipo o cuenta.`, ['security', 'updates', 'ssh']),
        article('updates', 'Datos y mantenimiento', 'Versión y actualizaciones', 'Consultá la compilación y aprobá cada etapa.', `## Consultar la versión
La barra inferior y **Ayuda → Ayuda de la aplicación** muestran la versión. Ayuda incluye instalación, sistema y commit. Windows usa versiones cortas \`0.11.N\` y muestra el commit por separado.
## Actualizar desde la app
Busca versiones al abrir y permite comprobar manualmente en Ayuda. Aprobá por separado descarga, preparación de instalación y reinicio de la app para aplicar cambios. Verifica tamaño y SHA256; rechaza versiones inferiores.
La app sigue abierta hasta aprobar el reinicio. El auxiliar espera su salida y actualiza. No reinicia Windows automáticamente. Revisá los fallos antes de reintentar.
## Instalación y datos
El ejecutable usa una ruta fija con \`AiSysadmin.exe\`; los datos permanecen separados en \`%LOCALAPPDATA%/AiSysadmin\`. El instalador solicita cierre normal solo a su propia instalación. Si no confirma el cierre dentro del plazo previsto, aborta antes de reemplazar archivos.
Para migrar desde clientes antiguos con carpetas por versión, ejecutá una vez el instalador nuevo con la app cerrada. Después usá el actualizador integrado. Si abre una versión antigua, compará versión del proceso y destino del acceso directo.
## Apoyar el proyecto
Ayuda abre el sitio oficial de Sentra IT y GitHub Sponsors de deimisq en el navegador predeterminado. Los aportes son voluntarios y no condicionan funciones. La app no solicita datos de pago.`, ['backup', 'troubleshooting', 'folders']),
        article('security', 'Datos y mantenimiento', 'Credenciales y uso seguro', 'Protección local y revisión de información compartida.', `## Protección local
Windows protege secretos locales con DPAPI de tu cuenta. Credenciales IA y token GitHub del actualizador tienen usos separados. No compartas carpetas de datos, claves ni capturas con secretos.
## Permisos y evidencia
El acceso remoto depende de la cuenta del equipo y sus permisos. El modo local no incorpora por sí mismo los roles de un backend empresarial. Usá privilegios mínimos y revisá comandos.
El perfil contiene datos declarados que pueden estar desactualizados. Confirmá sistema, recursos y resultados con evidencia. Una respuesta convincente de IA no es una verificación.
## Copias y soporte
Usá exportación cifrada para trasladar conexiones. Antes de compartir diagnósticos, ocultá contraseñas, tokens, direcciones sensibles y contenido privado. Limpiar el historial no revoca claves ni elimina copias externas. Las actualizaciones deben conservar las claves: revisá proveedor, error y versión antes de concluir que se perdieron.`, ['context', 'backup', 'troubleshooting']),
        article('troubleshooting', 'Ayuda y otros modos', 'Resolver problemas frecuentes', 'Separá conexión, proveedor y versión instalada.', `## No conecta
Revisá protocolo, dirección, puerto, red y autenticación. Para SFTP, también permisos de la ruta. No cambies firewall ni reinicies servicios sin identificar causa e impacto.
## Errores de IA
- **401 o 403:** revisá autenticación y permisos.
- **429:** revisá cuota y frecuencia de consultas.
- **503:** puede ser indisponibilidad temporal; no demuestra pérdida de clave.
- **Sin modelos locales:** revisá URL, servicio iniciado y modelos descargados de Ollama o proveedores conectados de OpenCode.
## No continúa tras un comando
Comprobá si sigue ejecutándose o espera respuesta en la terminal. Si volvió el prompt, preguntá por ese comando y compartí su fragmento si falta contexto. No repitas acciones de resultado incierto: una interrupción puede dejar cambios parciales.
## Parece faltar una función
Compará versión y commit en Ayuda y el destino del acceso directo: un proceso o anclaje antiguo puede abrir otro ejecutable. Anotá mensaje y versión del instalador; evitá instalaciones simultáneas.
## Pedir soporte
Incluí versión, commit, pasos, resultado esperado y error exacto, sin claves ni datos privados. No necesitás instalar Node ni recompilar para usar la app instalada.`, ['providers', 'updates', 'chat']),
        article('enterprise', 'Ayuda y otros modos', 'Modo local y empresarial', 'Identificá qué requiere un backend independiente.', `## Windows local
Inventario, conexiones, credenciales protegidas, proveedor IA propio y respaldos pertenecen al modo local. No requieren cuenta empresarial.
## Funciones de backend
Las vistas empresariales de usuarios, permisos, informes y comprobaciones programadas dependen de un backend configurado y sus permisos. No son capacidades automáticas del inventario local. Instalar la app no configura correo.
El acompañante empresarial puede usar IA del backend; no presupongas que utiliza tu clave local ni las mismas políticas de datos. Consultá al administrador antes de compartir información.
## Elegir la guía
Para conexiones locales, seguí estas guías Windows. Desarrollo y despliegue de servicios independientes se documentan en el repositorio; no son pasos necesarios para usar la app instalada.`, ['start', 'security', 'context']),
    ],
    en: [
        article('start', 'Getting started', 'Start using the app', 'Connect a computer and set up the AI companion.', `## Windows features
Manage SSH/RDP connections, transfer files with SFTP and use your own AI provider. Local mode needs no enterprise account or backend. AI is optional for connecting.
## First connection
1. Open **File → New connection…** and choose a protocol.
2. Enter address, port and authentication. Save it to find it in the explorer.
3. Open it from the tree, or use the top bar for a quick connection.
4. To enable AI, open **Tools → Artificial intelligence…**, configure a provider and select an available model.
## Before asking
Select the correct tab and check the companion's destination and context options. RDP does not provide the same information as SSH.`, ['ssh', 'rdp', 'providers']),
        article('ssh', 'Connections', 'SSH terminal', 'Saved sessions, quick connections and interactive commands.', `## Prepare access
Create an SSH connection with address, port, username and authentication. Root is not required: choose the permissions needed. File-based private keys must remain accessible at their path.
## Work in the terminal
The session preserves state, including its working directory. Run commands manually and ask about their output later. Closing the tab ends the session; presentation preferences do not reconnect computers.
Authorized chat commands are typed into that terminal, not a separate connection. Avoid typing another while an agent command runs. Answer interactive prompts in the terminal.
A prompt return does not prove exit code 0. The agent should state when the code is unavailable.
## Quick connections
Connect without a saved profile. Temporary conversations do not replace a saved destination's history.`, ['chat', 'files', 'troubleshooting']),
        article('rdp', 'Connections', 'RDP remote desktop', 'What AI can know and how to share a screenshot.', `## Available information
AI receives conversation and declared profile details. The name or selected OS does not prove the actual Windows version or resources. Screen, events and PowerShell output are not received automatically.
## Share evidence
Paste errors or diagnostic output into chat. For saved RDP connections, request a screenshot of the active remote control: review its preview and authorize it for that question. A vision-capable model is required.
Capture is not continuous, the image is not stored in history, and the local monitor is never used as a fallback. Temporary RDP connections do not offer capture.
## Follow instructions
AI advises: it does not control the desktop or execute PowerShell over SSH. Review and perform steps manually on the remote computer. SSH permissions do not authorize RDP actions.`, ['context', 'providers', 'security']),
        article('folders', 'Connections', 'Organize computers and panels', 'Folders, search and presentation preferences.', `## Explore connections
Use **File → New folder…** to organize computers. Tree search does not replace saved expansion; temporary expansions for matches do not change that preference.
## Adjust the workspace
The **View** menu toggles explorer and AI companion. An optional tools panel contains sessions, AI tasks and transfers and may be hidden.
Use **Ctrl+Alt+B** for explorer, **Ctrl+Alt+I** for AI and **Ctrl+Shift+P** to search actions.
## Remembered preferences
Normal window size, maximized state, panel visibility and folder/group expansion are saved per user and workspace. Remote sessions are not restored. Window size is constrained to compatible screen limits.`, ['start', 'backup', 'updates']),
        article('files', 'Connections', 'SFTP file transfers', 'Upload and download through an SSH connection.', `## Open remote files
Choose **Files** in an SSH terminal toolbar. SFTP uses that connection's access: the server must allow it and your account needs path permissions.
## Transfer
1. Navigate to the remote folder.
2. Choose upload or download and select the file or local destination.
3. Check progress and result. Transfers also appear in the tools panel when visible.
## Handle failures
Cancel active transfers if needed. Confirm results before retrying: permissions, disconnections and name collisions require checking the destination. This explorer does not export your connection inventory.`, ['ssh', 'backup', 'troubleshooting']),
        article('providers', 'Artificial intelligence', 'Configure providers and models', 'Cloud services, Ollama and OpenCode.', `## Cloud providers
Open **Tools → Artificial intelligence…**. Choose a provider such as ChatGPT/OpenAI, Gemini, Claude or DeepSeek and enter its API key. The app supplies its address and queries available models. A chat subscription does not guarantee API access or credit.
Refresh after changing keys or account details and select a model. Check permissions, availability and quota if none are returned. Vision and context limits vary by model.
## Ollama
Enter the server URL, for example \`http://localhost:11434\`. It must be running with downloaded models. Proxy tokens are optional. localhost means the computer running this app.
## OpenCode
Enter its URL, for example \`http://localhost:4096\`, username and password when needed. Connect providers in OpenCode and refresh the list. Local OpenCode does not guarantee local inference: that depends on its configured provider.
## Save settings
Complete provider-specific fields and review consent. For the same provider and connection, leaving the key empty preserves the saved one when indicated by the interface. HTTP 503 does not prove a lost key.`, ['chat', 'context', 'troubleshooting']),
        article('chat', 'Artificial intelligence', 'Chat and authorize commands', 'New questions, results and destination permissions.', `## Discuss the terminal
Ask about the last command, refer to earlier events or change topics. Your latest question should guide the answer. Identify the command or excerpt to avoid ambiguity.
## Authorize SSH actions
Review command, purpose and destination before approval. Permissions may cover one command, the session or persist for that destination; revoke them through permission controls. Model text does not grant authorization.
The agent uses captured output to continue afterwards. It should not stop long commands automatically due to time or output volume. Interrupting does not undo prior changes and may leave partial or uncertain results.
## Advanced tasks
**Advanced task** handles multi-step SSH goals with tracking. Review scope, actions and results. The tools panel includes AI tasks. Cancellation does not undo changes or justify repeating uncertain actions. RDP is not automated.
## Clear chat
Use **Clear chat** and confirm to delete the destination's local conversation and invalidate pending proposals. This does not delete terminal, journals, permissions or provider copies. Wait for the active operation if the button is disabled.`, ['context', 'ssh', 'security']),
        article('context', 'Artificial intelligence', 'Context, journals and privacy', 'What is sent and what remains locally.', `## SSH context
The app keeps an encrypted local journal and reads a recent snapshot when asking or continuing. With your consent it sends that snapshot and relevant conversation, not permanent provider surveillance. Remote output is evidence, never instructions to the agent.
## Choose how much to send
Open **Tools → Context and logs…**. Recent windows cover 8,000, 32,000 or 120,000 characters; full context is capped at 240,000 and rejects larger journals. Truncation is disclosed. Characters are not tokens; providers may accept less.
Changes affect future queries and tasks, not the local file. Journals are not deleted automatically.
## Delete or stop sending
Delete inactive journals from those settings. Active journals cannot be deleted. This does not delete chats, tasks or provider copies.
**Stop new requests** withdraws consent for future queries; it does not retrieve sent data or delete external copies. Clearing chat is separate.
## RDP and local providers
RDP shares text and individually authorized screenshots. Ollama and OpenCode may be remote or use external services: check where data is processed.`, ['rdp', 'chat', 'security']),
        article('backup', 'Data and maintenance', 'Export and import connections', 'Move your inventory with a password-encrypted backup.', `## Create a backup
1. Open **Connections → Export / import connections…**.
2. Choose a password of at least 12 characters and repeat it.
3. Include SSH private-key files if needed. Otherwise external references may require manually copying files and updating paths.
4. Save the \`.aisysbackup\` file and its password separately.

Includes connections, folders and saved credentials, but not AI settings, chats, journals, tasks or updater tokens.
## Restore
1. Select the file and enter its backup password.
2. Choose **Validate and review backup**. If disabled, check file and password.
3. Review the summary and warnings, then confirm.

Connections receive new identifiers without deleting existing ones. Importing twice may create duplicates. Validation happens before saving.
## Do not copy the store directly
DPAPI depends on the Windows account. Copying the local folder does not replace export or guarantee decryption on another computer or account.`, ['security', 'updates', 'ssh']),
        article('updates', 'Data and maintenance', 'Versions and updates', 'Identify the build and approve each update stage.', `## Find the version
The bottom bar and **Help → Application help** show the version. Help includes installation, system and commit details. Windows uses short \`0.11.N\` versions with a separate commit.
## Update in the app
Checks run at startup and manually in Help. Separately approve download, installation preparation and app restart to apply changes. Size and SHA256 are verified; downgrades are rejected.
The app stays open until restart approval. The helper waits for exit and updates. Windows never restarts automatically. Review failures before retrying.
## Installation and data
The executable uses a fixed path with \`AiSysadmin.exe\`; data remains separate in \`%LOCALAPPDATA%/AiSysadmin\`. The installer requests normal closure only for its own installation. It aborts before replacing files if closure cannot be confirmed within the allowed time.
For older clients using version folders, run the new installer once with the app closed. Use integrated updates afterwards. If an old version opens, compare process version and shortcut target.
## Support the project
Help opens the official Sentra IT site and deimisq's GitHub Sponsors in your default browser. Contributions are optional and never restrict features. The app does not request payment details.`, ['backup', 'troubleshooting', 'folders']),
        article('security', 'Data and maintenance', 'Credentials and safe use', 'Local protection and review of shared information.', `## Local protection
Windows protects local secrets using your account's DPAPI. AI credentials and updater GitHub tokens have separate purposes. Do not share data folders, keys or screenshots containing secrets.
## Permissions and evidence
Remote access depends on the remote account's permissions. Local mode does not itself provide an enterprise backend's roles. Use minimum privileges and review commands.
Profile details are declared and may be outdated. Verify system, resources and results with evidence. A convincing AI answer is not verification.
## Backups and support
Use encrypted export to move connections. Remove passwords, tokens, sensitive addresses and private content before sharing diagnostics. Clearing history does not revoke keys or delete external copies. Updates should preserve keys: check provider, error and version first.`, ['context', 'backup', 'troubleshooting']),
        article('troubleshooting', 'Help and other modes', 'Troubleshoot common problems', 'Separate connection, provider and version issues.', `## Cannot connect
Check protocol, address, port, network and authentication. For SFTP also check path permissions. Do not change firewall rules or restart services before identifying cause and impact.
## AI errors
- **401 or 403:** check authentication and permissions.
- **429:** check quota and query frequency.
- **503:** may mean temporary unavailability, not a lost key.
- **No local models:** check URL, running service and downloaded Ollama models or connected OpenCode providers.
## No continuation after a command
Check if it is still running or awaiting terminal input. If the prompt returned, identify the command and share relevant output if context is missing. Do not repeat uncertain actions; interruptions can leave partial changes.
## A feature seems missing
Compare version and commit in Help and the shortcut target: an old process or pinned shortcut may open another executable. Record installer message and version; avoid concurrent installations.
## Request support
Include version, commit, steps, expected result and exact error without keys or private data. Installed app users do not need Node or source rebuilds.`, ['providers', 'updates', 'chat']),
        article('enterprise', 'Help and other modes', 'Local and enterprise modes', 'Identify what needs an independent backend.', `## Local Windows
Inventory, connections, protected credentials, your own AI provider and backups belong to local mode. No enterprise account is required.
## Backend features
Enterprise user, permission, report and scheduled-check views depend on a configured backend and its permissions. They are not automatic local inventory capabilities. Installing the app does not configure email.
The enterprise companion may use backend AI settings; do not assume it uses your local key or identical data policies. Consult the administrator before sharing information.
## Choose the guide
Follow these Windows guides for local connections. Independent service development and deployment instructions belong to repository documentation and are not required to use the installed app.`, ['start', 'security', 'context']),
    ],
};
