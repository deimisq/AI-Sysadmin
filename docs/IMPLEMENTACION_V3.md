# Implementación V3

**Estado vigente:** la cuarta entrega cambia el enfoque a un acompañante conversacional con registro automático local de terminal. Sustituye el catálogo de consultas y la selección manual descritos en la tercera entrega, que queda como registro histórico.

## Primera entrega — 25 de octubre de 2026

Se inició la implementación sobre la base reparada; no es todavía la sustitución completa del producto.

### Implementado

- Explorador con carpetas anidadas de organización local: crear, renombrar, asignar conexiones y eliminar subárboles sin borrar servidores. Se guarda únicamente metadata de presentación por usuario/organización en este equipo. Los grupos del backend permanecen como origen; no se cambian permisos al organizar carpetas.
- Búsqueda por nombre, dirección o grupo; grupos vacíos visibles y conexiones cuyo grupo no está disponible recuperadas en «Sin agrupar».
- Asistente contextual aislado por servidor: cambiar de contexto reinicia el panel e invalida respuestas pendientes del contexto anterior. El menú del servidor abre su sesión y enfoca su asistente.
- Aviso y aceptación de contexto antes del diagnóstico. En esta entrega la aceptación dura la sesión del panel y ambos endpoints requieren la versión del aviso en la solicitud. Es una comprobación explícita por petición, no un registro durable de consentimiento. La retirada detiene nuevos envíos desde el panel; no cancela ni borra una petición que el backend ya recibió.
- Comandos de IA claramente identificados como copia al portapapeles, sin ejecución automática.
- Identidad del encabezado obtenida de la cuenta autenticada y bienvenida orientada a conexiones.
- Monitoreo y archivos autorizados por organización y acceso al servidor antes de descifrar credenciales o contactar infraestructura.
- Listado de archivos por SFTP en lugar de construir comandos de shell; conserva rutas y nombres especiales. Estadísticas ilegibles devuelven error en lugar de indicadores en cero.

### Límites y compatibilidad

El inventario aún depende del backend. Las carpetas locales no equivalen a una base de conexiones autónoma ni a un vault local. No hay sincronización de carpetas entre dispositivos. Las conexiones nativas de escritorio mantienen su implementación existente; los diagnósticos y SFTP de estos endpoints siguen saliendo del backend, pendientes de migrar al ejecutor local.

La IA todavía utiliza el proveedor configurado en el backend. BYOK directo desde el escritorio, selección visible de proveedor/modelo, almacenamiento seguro de la clave, aceptación persistente y revocación central son la siguiente etapa. Los clientes antiguos de diagnóstico que no envíen `context_consent_version: "2026-10-25"` reciben HTTP 428 y deben incorporar el aviso antes de habilitar el diagnóstico; no se añade consentimiento implícito a esos consumidores.

La separación de conversaciones evita mezclar resultados visibles, pero no agrega historial persistente por servidor. No se implementaron aún gateway Enterprise, licencias nuevas ni distribución preconfigurada.

### Verificación

Pruebas de backend con SQLite aislado y servicios simulados: permisos, denegación antes de invocar servicios, aceptación previa, estadísticas ilegibles y paso literal de rutas. Adaptador SFTP probado con transporte falso, sin infraestructura real. Pruebas del cliente: comunicación nativa y persistencia/validación/eliminación de carpetas. Compilación TypeScript y bundle de producción.

No sustituye pruebas con SSH/RDP/SFTP reales, ni constituye una validación de seguridad completa.

Resultado de esta entrega: 72 casos distintos de backend y 8 del cliente aprobados (suite base y comprobación focalizada tras añadir los dos casos de aceptación). TypeScript y bundle de producción aprobados. El bundle conserva advertencias por tamaño y dependencias compartidas. En navegador, con fixtures aislados, se comprobó crear una carpeta y una subcarpeta, asignar un servidor, conservarlo tras recargar y habilitar/deshabilitar el formulario IA mediante aceptación y retirada. No se enviaron consultas a proveedores reales.

### Próximo bloque

1. Persistencia autónoma de conexiones y credenciales mediante el host Windows, con migración/exportación comprobadas.
2. Proveedores IA configurables, llamadas desde el equipo y consentimiento persistente ligado al proveedor y alcance.
3. Herramientas de diagnóstico locales con aprobación de acciones y comprobación posterior.
4. Pulir el árbol: rutas completas, arrastrar y soltar, favoritos y accesibilidad completa.
5. Inventario administrado Enterprise y gateway como etapas posteriores.

## Segunda entrega — modo local e IA con clave propia

Esta entrega implementa los dos primeros puntos anteriores como una base funcional. La primera entrega se conserva arriba como registro histórico.

### Cliente Windows autónomo

- En Windows, el arranque abre «Mi equipo» por defecto y no exige cuenta ni conexión al backend. Desde el menú de usuario se puede acceder al modo empresa; la pantalla de acceso permite volver al espacio local.
- Alta, consulta, edición y eliminación de conexiones funcionan mediante el puente nativo. Inventario local y empresarial permanecen separados. No hay migración automática de datos existentes.
- El formulario local permite elegir SSH o RDP independientemente del sistema operativo y configurar el puerto. SSH y RDP conservan sus transportes nativos desde el equipo del técnico.
- Se cifra todo el inventario, incluidas credenciales y configuración IA, con DPAPI `CurrentUser`. La lista de servidores nunca devuelve contraseñas ni claves privadas; las credenciales se recuperan bajo demanda para conectar.
- Escrituras con archivo temporal cifrado, sincronización a disco y reemplazo con copia anterior también cifrada. Un mutex coordina instancias concurrentes. Un archivo ilegible genera error y no se reemplaza con un inventario vacío.
- Si el puerto del proxy Enterprise está ocupado, el modo local sigue disponible; las peticiones de empresa se bloquean para evitar enviarlas al proceso ajeno que use ese puerto.

El almacenamiento predeterminado es `%LOCALAPPDATA%/AiSysadmin/connections.v1.dat`. Su copia anterior es `.bak`. Es protección en reposo ligada a la cuenta de Windows; no protege de un proceso malicioso ejecutándose con esa misma cuenta y no es una exportación portable. No se debe prometer recuperación en otro equipo o con otro usuario. La exportación, restauración guiada y borrado de copias históricas aún requieren una entrega propia.

Las carpetas siguen siendo metadata de presentación en el almacenamiento del WebView, separadas por modo/usuario. No contienen credenciales. No se sincronizan todavía con el archivo cifrado o con Enterprise.

### IA propia desde el equipo

En «Ajustes → Tu IA» se configuran URL base HTTPS, identificador del modelo y clave API. El primer adaptador utiliza el formato [Chat Completions documentado por OpenAI](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create). Solo se ofrecen proveedores compatibles con ese contrato; no se implementaron adaptadores nativos de otras API, OAuth ni inferencia local estricta.

La aceptación afirmativa se guarda con versión del alcance, proveedor, modelo y fecha en el inventario cifrado. Cambiar la URL exige una clave nueva; no se reutiliza silenciosamente la del proveedor anterior. La interfaz no recupera la clave guardada, solo informa si existe.

Cada consulta sale desde el proceso Windows directamente a la URL configurada. Se comparte el mensaje escrito y nombre, dirección, sistema operativo y protocolo del servidor seleccionado. Se excluyen automáticamente credenciales, notas/descripción, otros servidores, terminales y archivos. El texto pegado por el usuario sí forma parte del envío y puede contener datos sensibles, como indica el aviso.

No se hace una consulta de pago al guardar ajustes. El transporte valida TLS mediante el sistema, no sigue redirecciones, no reintenta automáticamente y admite una consulta en curso por instancia para evitar consumo duplicado. Limita tiempo y tamaño de respuesta. Los errores HTTP se resumen sin mostrar cuerpos arbitrarios del proveedor.

La respuesta es una sugerencia; no tiene acceso a herramientas ni ejecuta comandos. Se permite copiar un comando propuesto para revisarlo. «Detener nuevos envíos» desconecta la configuración activa; no elimina información que ya haya recibido el proveedor ni borra de forma segura las copias históricas cifradas. Tampoco cancela una solicitud ya iniciada.

### Validación de esta entrega

- Cliente Windows Release compilado, con el bundle actualizado incluido en su carpeta de salida.
- 24 pruebas .NET/VSTest/xUnit aprobadas: cifrado DPAPI real, persistencia, corrupción sin sobrescritura, concurrencia, puertos/protocolo, consentimiento, aislamiento del contexto, exclusión de secretos, cambios de proveedor y transporte HTTP simulado.
- 14 pruebas Node aprobadas: puente, carpetas, selección de modo y ausencia de fallback HTTP desde el inventario local. TypeScript y bundle de producción aprobados; persisten advertencias de tamaño de bundle y antigüedad de Browserslist.
- Formularios comprobados en navegador con puente simulado: alta local RDP, puerto predeterminado y personalizado, habilitación solo tras aceptar el aviso, borrado del campo de clave después de guardar y desconexión del proveedor.

No se usó una clave real ni se hicieron solicitudes a proveedores externos. La compatibilidad con una cuenta/modelo concreto y las conexiones SSH/RDP a infraestructura real siguen pendientes de prueba integrada. La vista previa de navegador simula el host: no verifica DPAPI, transporte nativo o persistencia de Windows.

### Uso de la compilación de desarrollo

La salida está en [la carpeta Release del cliente Windows](../apps/windows/bin/Release/net8.0-windows/). Requiere .NET 8 Desktop Runtime y WebView2 Runtime; todavía no hay instalador ni firma de distribución. Si se usa el SDK local preparado en este proyecto, desde la raíz se puede iniciar con:

```powershell
& '.preview-tools/dotnet/dotnet.exe' 'apps/windows/bin/Release/net8.0-windows/AiSysadmin.dll'
```

Antes de publicar comercialmente sigue pendiente migrar el runtime a una versión con soporte suficiente, además del instalador, actualización y firma.

### Siguiente etapa

Diagnóstico local con evidencia seleccionada, historial por servidor, herramientas con aprobación y comprobación posterior; mejorar el árbol y la recuperación/exportación del inventario. Enterprise, gateway y licencias nuevas permanecen pendientes.

## Tercera entrega — evidencia, consultas aprobadas e historial

### Recorrido implementado

1. Abrir una conexión SSH local o pegar un fragmento de evidencia manualmente.
2. En Linux por SSH, preparar una de tres consultas: disco raíz, memoria o carga/actividad. El diálogo muestra el comando exacto y el destino antes de ejecutarlo.
3. Consultar el resultado, su código de salida y la fecha. Agregarlo al borrador no lo envía a la IA.
4. Revisar y marcar el fragmento que se quiere compartir; se puede editar o quitar antes de la consulta. Desde la terminal también se puede enviar únicamente la selección actual al borrador mediante «Revisar selección con IA».
5. Pedir análisis al proveedor configurado. La sugerencia permanece marcada como no ejecutada; su revisión permite copiarla sin ejecutarla.
6. Reabrir el servidor para consultar su historial protegido o borrar el historial activo de ese servidor.

### Consultas locales acotadas

Las consultas utilizan la sesión SSH ya abierta y validada, no una nueva conexión desde el backend. Los comandos están fijados en el host Windows y no provienen del modelo. Solo se aceptan los identificadores del catálogo; no se interpola texto del usuario en el shell.

La autorización es un ticket de un solo uso que vence en un minuto y está ligado al servidor, la sesión y la identidad de la conexión. Una sesión ajena, desconexión o cambio de dirección, puerto, protocolo, usuario o credenciales impide usar esa autorización. Preparar una consulta no la ejecuta.

El ejecutor limita el tiempo del comando a diez segundos, el plazo de la operación a doce segundos y cada canal de salida a 8000 bytes. Ante exceso se cierra el comando. La cancelación SSH intenta detener la operación remota; no se ofrece una garantía de terminación ni de rollback. Estas consultas están pensadas para Linux con las utilidades en `/usr/bin`; no implementan diagnóstico Windows/RDP.

### Contexto e historial privados

Los borradores permanecen en memoria, separados por servidor. Seleccionar texto de terminal no habilita captura continua. Cada evidencia tiene origen, fecha y un límite de 12000 caracteres; una selección mayor se rechaza sin truncarla silenciosamente. Cambiar el fragmento desmarca su revisión. Si llega un borrador nuevo mientras se responde a una consulta, la respuesta anterior no lo elimina.

La nueva capacidad amplía el alcance del consentimiento a `selected-server-evidence-v2`: quien hubiera aceptado la versión anterior debe volver a aceptar el aviso en Ajustes. La clave ya guardada se conserva para el mismo proveedor. Se siguen excluyendo automáticamente las credenciales del vault; los fragmentos y el texto que selecciona el técnico pueden contener secretos y deben revisarse.

Cada consulta completada conserva localmente proveedor, modelo, destino original, mensaje, evidencia, análisis y comando sugerido. El historial se cifra dentro del inventario DPAPI; retiene como máximo 20 consultas por servidor y 100 en total. No se incorpora automáticamente al contexto del proveedor. Por tanto, las consultas son independientes y deben incluir el contexto necesario; no se promete memoria conversacional cloud.

La revisión de un comando histórico muestra su destino original. Antes de enviar contexto se comprueba que dirección, protocolo y puerto coincidan con la conexión que el técnico tiene abierta. Una respuesta tardía no se agrega a un destino modificado o eliminado, y borrar historial invalida la incorporación de respuestas que estaban en vuelo. Si la respuesta llega pero no se puede persistir, la interfaz lo informa.

El formato interno del inventario pasa a versión 2; se admite lectura de versión 1 y la migración ocurre al escribir, sin descartar conexiones. El nombre del archivo protegido se conserva. Un cliente antiguo que solo conozca versión 1 debe rechazar el formato nuevo, en lugar de sobrescribir los campos que desconoce.

Borrar historial quita los registros activos; no borra lo recibido por el proveedor ni purga las copias cifradas anteriores.

### Aislamiento local reforzado

Se retiraron del modo local el fallback SSH a terminal web, el cambio RDP a Guacamole y el cambio implícito de RDP a SSH. El protocolo local se elige al configurar la conexión. Los modos empresariales conservan sus rutas existentes.

### Validación

- 41 pruebas Windows aprobadas: tickets de un solo uso, vencimiento, desconexión, destino/credenciales modificados, exclusión de comandos arbitrarios, revisión de evidencia previa al HTTP, persistencia cifrada, separación por servidor, retención, borrado durante una solicitud pendiente y migración del formato/consentimiento, además de las regresiones anteriores.
- 19 pruebas del cliente aprobadas: contenido exacto de la selección, límites sin truncamiento, separación de borradores y sesiones, destino visible en la petición y regresiones de carpetas/modos/puente.
- TypeScript, bundle de producción y cliente Windows Release compilados. Permanecen las advertencias de tamaño del bundle y antigüedad de Browserslist.
- En navegador con puente simulado se comprobó el diálogo previo a la consulta, el resultado local, el bloqueo de envío sin revisar evidencia, la sugerencia marcada como no ejecutada, la restauración del historial al reabrir un servidor, su borrado y la ausencia del botón de proxy SSH en modo local.

Las pruebas de transporte usan servicios simulados; no se ejecutaron comandos contra infraestructura real ni se consumió una API cloud. La selección desde xterm y el streaming/cancelación SSH requieren una prueba integrada con el cliente Windows y un servidor de laboratorio. La aprobación de comandos arbitrarios propuestos por la IA, su ejecución y la comprobación posterior a cambios siguen pendientes; esta entrega solo habilita las tres consultas acotadas.

## Cuarta entrega — acompañante contextual de terminal

La aclaración del usuario reemplaza el recorrido anterior: el técnico trabaja normalmente, pide ayuda en lenguaje común y la IA analiza el contexto ya registrado para proponer pruebas o posibles soluciones. Se retiraron del producto el catálogo de consultas, sus tickets de ejecución, el panel de evidencia y el botón de selección manual de terminal. Copiar una sugerencia no requiere un diálogo adicional y no ejecuta el comando.

### Registro local automático

El host Windows registra la salida de las sesiones SSH locales directamente desde el flujo PTY. La salida incluye los comandos que el servidor refleja, respuestas, errores, prompts y secuencias de terminal. No se capturan todas las pulsaciones: las contraseñas que el terminal no refleja no se agregan mediante un registro de teclado. Una contraseña o clave que aparezca en la salida sí puede quedar en el contexto.

Cada sesión tiene un diario de registros cifrados mediante DPAPI `CurrentUser`, en `%LOCALAPPDATA%/AiSysadmin/TerminalContext/`. No se escriben transcripciones en texto plano. Un trabajador de escritura desacopla el registro de la interfaz; mantiene el orden y admite reconstruir UTF-8 cuando un carácter llega dividido en varios bloques. El cierre normal deja una marca que permite recuperar sesiones cerradas después de reiniciar.

No hay solicitudes a la IA al recibir salida de terminal. Al pedir ayuda se obtiene una instantánea del registro de la sesión abierta o, si no se especifica una sesión, del registro más reciente del mismo destino. La identidad de conexión impide mezclar servidores, puertos, usuarios o credenciales diferentes. Las conexiones anteriores a esta implementación no cuentan con un registro retroactivo.

### Contexto enviado al pedir ayuda

Se envían la pregunta actual, metadata del servidor, la salida histórica disponible de esa sesión y hasta diez intercambios recientes del mismo destino. La IA recibe instrucciones para distinguir observaciones de hipótesis, interpretar salida histórica con posibles secuencias ANSI, proponer nuevas pruebas/soluciones y no afirmar que ejecutó comandos. No tiene herramientas de ejecución ni sigue un cuestionario fijo.

El consentimiento pasa a `terminal-companion-v3`, porque ahora se incorpora el registro de terminal y la conversación reciente automáticamente al preguntar. Se acepta una vez en la configuración del proveedor; no se solicitan aprobaciones de fragmentos en cada consulta. El aviso informa que ese contexto puede contener información sensible o secretos. No se adjuntan credenciales del almacén ni se leen archivos fuera de lo que el técnico haga aparecer en su terminal.

### Límites explícitos

- Esta integración captura SSH local del cliente Windows. No interpreta la imagen de una sesión RDP ni sustituye todavía la implementación legacy del modo empresa.
- La transcripción registra el flujo de salida, no reconstruye de forma exacta una interfaz TUI ni conoce entradas ocultas. La IA debe reconocer esas limitaciones.
- El diario admite hasta 32 MiB cifrados por sesión; se impide iniciar nuevos diarios cuando la carpeta ya ocupa 256 MiB. No hay purga automática ni panel de gestión de diarios en esta entrega.
- El transporte actual admite hasta 240000 caracteres de transcripción. Si se supera, informa el límite y no envía un recorte silencioso. El modelo/proveedor puede imponer un límite menor; queda pendiente configurar ventanas o resúmenes para sesiones muy extensas.
- Si la cola de captura se desborda, falla el almacenamiento, el registro está corrupto o una sesión anterior quedó interrumpida sin cierre válido, no se envía como si fuera un contexto completo.
- Borrar el historial del chat no borra los diarios de terminal. Son registros separados. Se mantienen las limitaciones de DPAPI y de las copias históricas ya documentadas.

### Verificación

43 pruebas Windows y 17 del cliente aprobadas. Se cubren registros cifrados y ordenados, caracteres UTF-8 divididos, recuperación tras reinicio, separación por destino, rechazo de registros corruptos o demasiado grandes, inclusión del contexto únicamente cuando se pide ayuda y conversación reciente sin mezclar puertos. Las pruebas del catálogo retirado se eliminaron junto con su implementación.

TypeScript, bundle y compilación Windows se verifican en esta entrega. Las pruebas de captura usan datos sintéticos y las del transporte IA usan un handler simulado: siguen pendientes la prueba integrada con SSH real y una cuenta/modelo de IA. No se debe confundir la simulación del navegador con la captura nativa.

## Quinta entrega — agente de tareas SSH

Se agrega **Ejecutar tarea** junto a **Conversar**. El técnico describe un objetivo libre y autoriza su ejecución sobre la conexión SSH local seleccionada. La IA recibe el contexto de terminal y conversación, elige un comando, observa salida/código de salida y decide el siguiente paso. No se restablece el catálogo de diagnósticos retirado. Conversar continúa proponiendo acciones sin ejecutarlas.

### Ejecución y controles

- El host Windows usa el cliente SSH ya conectado y su identidad validada. No usa el backend para ejecutar. Se vinculan servidor, sesión y huella de configuración/credenciales; se comprueban de nuevo después de cada respuesta del modelo y antes del siguiente comando.
- El consentimiento cloud se consulta en cada paso y antes de ejecutar. La autorización de la tarea incluye compartir comandos/resultados y realizar cambios relacionados con el objetivo con los permisos del usuario SSH.
- Una tarea activa por instancia, hasta diez comandos y cinco minutos; cada comando admite veinte segundos y 16000 bytes combinados de salida/error. No se admiten entradas interactivas. Cada comando abre un shell independiente; `cd` y variables no persisten entre pasos.
- Inicio, estado y cancelación son operaciones separadas del puente: una tarea no depende de mantener una petición de interfaz abierta durante minutos. Los identificadores de inicio evitan repetir una tarea si se pierde su respuesta. No hay reintentos automáticos de comandos.
- Se muestran explicación, comando, salida, código de salida y evaluación final. “Finalizada según la IA” requiere observaciones y un último comando exitoso; es una valoración del modelo, no una prueba formal de que se cumplió todo el objetivo.
- La cancelación intenta detener el comando remoto, no garantiza terminar procesos desacoplados ni revierte cambios. El cierre de la aplicación cancela el trabajo local. Un resultado incierto debe verificarse antes de repetir.

La herramienta permite comandos SSH arbitrarios autorizados por objetivo. Los límites de duración y cantidad no son un sandbox del servidor: los comandos conservan los permisos y acceso a red de ese usuario. La instrucción al modelo de ignorar órdenes insertadas en logs y no ampliar el objetivo reduce errores, pero no garantiza eliminar inyección de instrucciones. No se implementa todavía una política empresarial de permisos por herramienta, comandos o grupos.

### Continuación del plan: registro, recuperación y laboratorio

Cada paso se guarda antes de ejecutarse en un registro local cifrado DPAPI `CurrentUser`, dentro de `%LOCALAPPDATA%/AiSysadmin/Tasks/`. Si no se puede registrar el comando, no se emite. Los resultados también se incorporan al diario contextual de la sesión para consultas posteriores.

Al reiniciar se recupera el último registro. Una tarea activa al cerrar aparece como interrumpida y **no se reanuda automáticamente**. Un registro corrupto bloquea tareas, sin impedir usar el resto de la aplicación. La interfaz permite exportar el registro actual a JSON mediante descarga explícita; esa exportación es texto plano y puede contener información sensible. No es una copia portable del vault ni restaura credenciales. La exportación/restauración cifrada del inventario sigue pendiente.

Se incorpora un laboratorio SSH de loopback con AsyncSSH: autentica una sesión real, verifica su clave y prueba lectura de stdout/stderr, códigos de salida, exceso de salida y cancelación a través de SSH.NET. El servidor de prueba solo devuelve datos sintéticos; no ejecuta un shell del sistema. CI instala la dependencia de prueba y activa el laboratorio mediante `AI_AGENT_SSH_LAB_PYTHON`. Sin esa variable, la prueba integrada se marca como omitida explícitamente.

### Validación y alcance

56 pruebas Windows aprobadas con el laboratorio activado, además de 17 pruebas del cliente. Se verifican autorización, vinculación a sesión, cambios de destino, revocación del consentimiento, límite de pasos, cancelación, inicio repetido, registros cifrados, recuperación, JSON de decisiones y transporte HTTP simulado. TypeScript y bundle de producción compilados; la aplicación Windows incluye el nuevo bundle. Persisten las advertencias anteriores de tamaño del bundle y Browserslist.

Esta entrega ejecuta tareas SSH locales en Windows. No automatiza RDP, no ofrece reanudación autónoma tras reinicio, rollback, aprobaciones empresariales ni ejecución paralela. No se consumió una API IA real ni se modificó infraestructura real. La prueba de una tarea completa con el modelo y la infraestructura de laboratorio elegidos por el técnico sigue pendiente. La vista previa de navegador es una simulación visual, separada del ejecutor nativo.

Las próximas prioridades del plan continúan siendo exportación/restauración cifrada del inventario, gestión de diarios/contextos extensos y prueba de tareas con un proveedor real; después, runtime/instalador y las capacidades Enterprise.

## Sexta entrega — copias portables y carpetas protegidas

En Ajustes se incorpora una copia cifrada del inventario local: conexiones SSH/RDP, contraseñas y claves pegadas guardadas, carpetas y sus asignaciones. No incluye la configuración/clave del proveedor IA, chats, diarios de terminal, tareas ni huellas de confianza SSH. Los archivos externos de claves no se leen ni se adjuntan: se conserva su ruta y la revisión avisa cuántas conexiones dependen de ellos.

El archivo `.aisysbackup` usa AES-256-GCM con etiqueta de autenticación de 16 bytes, nonce aleatorio de 12 bytes y una clave derivada mediante PBKDF2-HMAC-SHA256, 600000 iteraciones y sal aleatoria de 16 bytes. La cabecera/versionado y los parámetros aleatorios se autentican junto al contenido. Se requiere una contraseña de entre 12 y 1024 caracteres, que no se persiste; perderla impide recuperar la copia. El tamaño máximo del contenido es 8 MiB. No se escribe una exportación intermedia en texto plano.

La restauración primero descifra y valida todo, muestra fecha, cantidades y destinos, y requiere confirmación en la interfaz. Comprueba el hash de la copia revisada antes de importar. Una contraseña incorrecta, etiqueta alterada, versión desconocida, campos inválidos o carpetas con ciclos/referencias ajenas no modifican el inventario. Se agregan conexiones y carpetas con identificadores nuevos, conservando lo existente; restaurar una copia puede crear conexiones equivalentes duplicadas. Los últimos cien identificadores de operación quedan registrados para evitar repetir una importación si se pierde su respuesta y se reintenta con el mismo identificador. No se promete deduplicación global por dirección o nombre.

Conexiones y carpetas se guardan juntas mediante el reemplazo atómico protegido existente, antes de confirmar la restauración. No se abren conexiones remotas ni se reanudan tareas como consecuencia de importar. La clave/proveedor IA del equipo de destino permanece intacta. La descarga requiere comprobar que el navegador o WebView2 haya guardado efectivamente el archivo; preparar la descarga no equivale a verificar una copia en disco.

Las carpetas del modo local pasan del almacenamiento del navegador al inventario DPAPI. Al cargar el explorador por primera vez se migra la organización anterior, filtrando asignaciones de conexiones ya eliminadas y conservando el valor anterior del navegador. Se usa una revisión para rechazar sobrescrituras desde una vista desactualizada. El modo Enterprise conserva su organización anterior. El inventario nativo escribe formato **3**, lee formatos 1/2/3 y conserva conexiones, credenciales, configuración IA e historial anteriores. Un cliente antiguo que solo admite formato 2 debe rechazarlo; no se debe reutilizar ese cliente para escribir la nueva copia local.

### Verificación y continuación

64 pruebas Windows aprobadas con laboratorio SSH activado y 17 pruebas del cliente. Las pruebas nuevas cubren recuperación de credenciales y árbol con remapeo de IDs, preservación del inventario/proveedor de destino, exclusión de claves IA e historial en el contenido descifrado, contraseña incorrecta, manipulación del archivo, revisión/confirmación, reintentos idempotentes, sal/nonce nuevos, revisiones de carpetas y migración desde formato 2. Las pruebas de recuperación usan distintos inventarios temporales bajo la misma cuenta Windows; no se realizó todavía una prueba manual en otro equipo/usuario.

La comprobación visual final de esta pantalla y la descarga/restauración desde el cliente Windows quedan pendientes: la apertura de la vista previa no respondió en esta sesión. Continúan como prioridades la gestión de diarios/contextos extensos, la prueba del agente con un proveedor real y la actualización de runtime/instalador antes de distribución comercial.

## Séptima entrega — gestión de registros y contexto extenso

En Ajustes se incorpora **Contexto y registros de terminal**: lista los diarios locales, el identificador de su conexión, fecha, tamaño cifrado, estado y espacio total ocupado. Los registros que no pueden descifrarse se muestran sin atribuirles un destino inventado. La lista solo inspecciona el encabezado; no certifica la integridad completa de cada transcripción.

El técnico puede borrar un registro cerrado después de confirmarlo. Las sesiones abiertas están bloqueadas, incluso si pertenecen a otra instancia de esta versión de la aplicación, mediante un archivo de bloqueo por sesión. Los bloqueos vacíos pueden permanecer en el directorio y no contienen salida de terminal. El borrado se limita al identificador GUID del diario, espera la escritura pendiente y evita que una escritura tardía lo recree. Una referencia explícita a una sesión borrada no se sustituye silenciosamente por otra.

El borrado quita el archivo local; no es una garantía de borrado forense, no afecta copias externas, chats o registros de tareas y no retira datos recibidos por el proveedor ni cancela consultas en curso. No hay purga automática. Los límites de captura existentes siguen aplicándose: 32 MiB por diario y control de admisión de nuevos diarios cuando la carpeta ya ocupa 256 MiB; esto no equivale a una cuota global estricta durante sesiones simultáneas.

### Ventana reciente opcional

El modo predeterminado conserva el comportamiento de contexto completo: hasta 240000 caracteres, con rechazo explícito de una sesión mayor. El usuario puede elegir en Ajustes enviar los últimos 8000, 32000 o 120000 caracteres. La preferencia se guarda en el inventario DPAPI y se aplica a próximas consultas y al inicio de nuevas tareas; no modifica una petición o tarea ya iniciada. El host valida también límites entre 4000 y 240000 caracteres para configuraciones compatibles.

La ventana recorta únicamente la transcripción que se envía, conserva el diario local completo y evita dividir un par sustituto Unicode. El modelo recibe `Truncated`, `TotalCharacters` e `IncludedCharacters`; el acompañante recibe además una instrucción de no afirmar que revisó lo omitido. El chat muestra una marca persistente de contexto parcial en su respuesta e historial, además del aviso inmediato. Una tarea deja esa condición en su registro antes de consultar al modelo.

Esto no resume sesiones ni establece un presupuesto de tokens de toda la petición: los intercambios recientes, metadata y observaciones de una tarea se agregan aparte y pueden contener información mencionada anteriormente. El proveedor puede imponer límites menores. Los registros corruptos o con fallos de captura siguen rechazándose; una ventana no se usa para esconder esos errores.

### Verificación

72 pruebas Windows aprobadas con laboratorio SSH y 17 del cliente, TypeScript, bundle y cliente Windows Release compilados. Se cubren ventanas explícitas sin alterar el diario, sesiones superiores al límite completo, caracteres Unicode, bloqueo de sesiones activas entre instancias, eliminación de registros corruptos, rutas inválidas, preferencia persistente y señalización de contexto parcial en la petición HTTP y respuesta. Se corrigió también una carrera del agente que mostraba una tarea finalizada antes de terminar su guardado local.

En navegador con puente simulado se verificaron guardado/recarga de la ventana elegida, confirmación/cancelación del borrado y protección del registro activo. Esta prueba no reemplaza la verificación de archivos Windows, cubierta por las pruebas nativas, ni una prueba con un proveedor IA real. La prueba manual de descarga/restauración de copias desde WebView2 continúa pendiente.

Próximas prioridades: prueba completa del agente con un proveedor real cuando se disponga de una configuración autorizada, actualización de runtime e instalador, y políticas/administración Enterprise. No se utilizó una clave IA real en esta entrega.

## Octava entrega — runtime e instalador Windows

El cliente y sus pruebas migran de `net8.0-windows` a `net10.0-windows`, con SDK 10.0.403 fijado en `global.json`. Se conserva VSTest/xUnit 2. La versión de escritorio pasa a `0.10.0-preview.1`, independiente del versionado legacy del backend. La política de Microsoft sitúa el fin de soporte de .NET 8 el 10 de noviembre de 2026 y mantiene .NET 10 como LTS hasta noviembre de 2028; se verificó en la [fuente oficial](https://dotnet.microsoft.com/en-us/platform/support/policy).

Se generaron un instalador por usuario y un ZIP portable para Windows x64, ambos autocontenidos con Microsoft.NETCore.App y Microsoft.WindowsDesktop.App 10.0.14. No exigen un runtime .NET global. Se deshabilitan trimming y empaquetado en un solo ejecutable para conservar WPF, COM/RDP y los assets WebView2 como archivos comprobables. El programa sigue necesitando WebView2 Evergreen; el instalador comprueba su registro e informa cómo instalarlo si falta.

El instalador Inno Setup guarda cada versión en su propio directorio, ofrece accesos directos y desinstalador, no solicita elevación y conserva `%LOCALAPPDATA%/AiSysadmin`. Se respeta `/NOICONS` para no sobrescribir accesos directos durante pruebas. No se implementa actualización ni rollback automático, ni compatibilidad garantizada de ejecutables antiguos con nuevos formatos del vault.

El script de empaquetado compila la interfaz de producción y valida ejecutable, runtime, WebView2Loader y assets; rechaza archivos `.env`, inventario y diarios dentro del paquete. Incluye los avisos/metadata disponibles de dependencias NuGet, un manifiesto por archivo y hashes SHA-256 de los artefactos. Rechaza sobrescribir paquetes existentes de la misma versión. Los hashes sirven para integridad; esta compilación no tiene firma comercial ni timestamp.

CI general pasa a .NET 10. Un flujo manual adicional genera, instala/desinstala en un directorio de prueba y adjunta los paquetes como artefactos; no publica automáticamente una release. La guía de uso y compilación está en [Distribución Windows](WINDOWS_DISTRIBUTION.md).

### Validación

- 72 pruebas Windows aprobadas sobre .NET 10, incluido el laboratorio SSH; 17 pruebas del cliente aprobadas, TypeScript y bundle de producción generados.
- ZIP portable e instalador compilados y hashes verificados. Se comprobaron 509 archivos del payload tanto al extraer el ZIP como después de instalar.
- Instalación silenciosa en una carpeta nueva dentro del proyecto, sin iniciar la aplicación ni crear iconos, seguida de desinstalación correcta. Se verificó que el inventario/backup protegido y los accesos directos previos no cambiaran y que la entrada de desinstalación de prueba desapareciera.
- No se probó aún la interfaz de la aplicación instalada, una actualización sobre una instalación previa, ARM64, otra cuenta Windows o un equipo limpio sin WebView2. Las carpetas de versiones no sustituyen esas pruebas.

Para distribución comercial siguen pendientes el certificado de firma, pruebas en sistemas soportados y equipos limpios, actualización/recuperación y revisión de licencias/titular; la licencia del repositorio conserva el marcador de empresa original. No se usó una API IA real ni se publicó una release externa.

## Novena entrega — experiencia de escritorio y arranque corregido

La captura del usuario reveló un fallo no cubierto por la prueba de instalación: el host abría `https://appassets.local/`, que apuntaba al directorio mapeado sin un archivo de entrada. El cliente **0.10.0-preview.2** navega explícitamente al `index.html` empaquetado. Conserva el aislamiento del origen y `DenyCors`; no se abre el acceso entre orígenes para resolver el error.

El arranque y la recuperación se presentan con controles WPF, fuera del contenido HTML. La superficie de interfaz permanece oculta hasta recibir la confirmación de montaje de React. La inicialización tiene tiempos máximos, y un fallo de navegación, proceso de renderizado, montaje o archivos ausentes muestra un mensaje propio con Reintentar y Copiar diagnóstico. La información diagnóstica incluye versión de aplicación/runtime/Windows y un código, sin URL, credenciales ni transcripciones. Reintentar recrea la superficie de interfaz; no vuelve a ejecutar tareas del agente.

Se deshabilita la página de error incorporada del motor, la barra de estado con direcciones, herramientas de desarrollo, atajos de navegador, navegación por deslizamiento, zoom por gestos y ventanas emergentes. Los menús contextuales conservan únicamente edición —cortar, copiar, pegar y seleccionar—. Las confirmaciones JavaScript existentes usan MessageBox de Windows. Las descargas solicitan destino con SaveFileDialog y suprimen el panel de descargas del navegador. Los permisos se deniegan salvo lectura de portapapeles del origen interno iniciada por el usuario; no se agregan permisos cloud o de ejecución de comandos.

La ventana usa la barra de título del sistema en oscuro y elimina la insignia técnica NATIVE. Se conserva WebView2 como motor interno de la interfaz híbrida; esto no es una reescritura completa de los controles en XAML. El objetivo es una experiencia de escritorio consistente, sin controles de navegación o pantallas de error de Edge dentro del producto.

### Comprobación

79 pruebas Windows y 18 del cliente aprobadas, TypeScript y bundle compilados. Las pruebas nuevas comprueban la entrada explícita, rechazo de archivos ausentes/orígenes externos, URLs de desarrollo y notificaciones de ciclo de vida sin solicitudes colgadas.

Se abrió el ejecutable autocontenido real desde su directorio de publicación, sin servidor Vite. Se observó el espacio de conexiones cargado y la barra de título oscura; Ctrl+P no abrió la impresión del navegador. En un directorio intermedio se retiró temporalmente el archivo de entrada conservando su contenido: apareció el panel WPF de error y, después de restaurarlo, Reintentar volvió a abrir el espacio de trabajo. El archivo se restituyó. No se ejecutaron comandos SSH/RDP ni se consumió una API IA.

Se genera un nuevo instalador y ZIP de la versión corregida con verificación del manifiesto y hashes. La instalación existente del usuario no se reemplaza automáticamente: debe actualizarse con el instalador nuevo. Las pruebas visuales de guardado/portapapeles y la matriz de equipos limpios requieren seguimiento; no se anuncia certificación de todas las interacciones nativas por estas comprobaciones de arranque.


## Décima entrega — navegación SFTP directa

El botón Archivos de las sesiones SSH Windows habilita el explorador lateral. Cada lectura abre una conexión SFTP desde el equipo del técnico con la identidad de la sesión SSH activa y la misma verificación de huella; no pasa por el backend Enterprise ni ejecuta `ls` o comandos de shell. Se exige que la sesión siga abierta antes y después de leer. El transporte temporal se desecha incluso ante errores.

El explorador empieza en el directorio inicial de la cuenta (`.`), recibe la ruta resuelta por el servidor y permite abrir carpetas con doble clic/Enter, subir, escribir una ruta y actualizar. Distingue archivos y directorios, muestra tamaños y ordena carpetas primero. Descarta respuestas de sesiones anteriores y separa la ruta editada de la carpeta cargada. Los nombres con espacios y caracteres de shell se tratan como datos SFTP.

Hay una sola lectura SFTP simultánea por instancia, espera de conexión de 20 segundos y tiempo de operación de 10 segundos. Los directorios con más de 10000 entradas se rechazan explícitamente, sin presentar una lista parcial como completa. El límite por operación no constituye un plazo total estricto para un servidor que entregue muchas entradas lentamente. Este bloque solo navega: no descarga, sube, elimina ni renombra archivos; esas operaciones siguen pendientes.

Validación: 79 pruebas Windows aprobadas con laboratorio activado y 18 del cliente. La prueba de transporte existente ahora también negocia SFTP real contra un directorio temporal aislado, comprueba rutas con espacios, nombres literales con `;` y `$`, tamaños, directorio vacío y errores, y continúa ejecutando pruebas SSH después de cerrar SFTP. No se conectó infraestructura real ni se probó visualmente el panel en una sesión de usuario. Los instaladores preview.2 publicados anteriormente no contienen esta entrega; el cambio queda en el código y la compilación de desarrollo.

## Undécima entrega — transferencias SFTP con progreso y cancelación

El cliente Windows `0.10.0-preview.3` incorpora subida de un archivo a la carpeta visible y descarga mediante botón, doble clic o Enter. Los archivos de origen/destino se eligen en diálogos de Windows; el puente solo recibe metadatos y progreso, sin cargar el contenido en JavaScript, en el backend Enterprise o en el acompañante IA. No se agregan permisos al agente IA.

Si se edita la ruta sin abrirla o falla su lectura, se bloquean las transferencias hasta cargar la carpeta escrita. Así una subida no utiliza silenciosamente la carpeta anterior mientras el campo muestra otra ruta.

Cada instancia admite una transferencia activa. El trabajo comienza con una respuesta inmediata y su estado se consulta por separado, evitando que una operación larga dependa del plazo de 35 segundos de una petición del puente. El panel muestra nombre, bytes, total, estado y Cancelar. Cerrar y reabrir el panel de la misma sesión recupera el estado en memoria y la operación continúa; desconectar SSH o cerrar la aplicación solicita cancelación. No hay cola, reanudación tras reinicio ni persistencia del estado.

Se escribe en un temporal aleatorio `.aisys-<guid>.part` del directorio de destino y se publica el nombre final después de cerrar los streams y comprobar los bytes esperados. La descarga permite reemplazar un archivo local después del aviso del diálogo; si el destino no existía cuando se eligió, no se permite reemplazar uno que aparezca durante la copia. La subida rechaza destinos existentes, vuelve a comprobarlos antes de un renombrado SFTP estándar y no usa la extensión POSIX de reemplazo. La semántica final depende del servidor SFTP; estas comprobaciones no equivalen a un bloqueo distribuido frente a escritores externos.

La cancelación se comprueba entre bloques de 64 KiB y antes de publicar el nombre final. Hay un plazo de trabajo de 30 minutos y tiempo de operación SFTP de 10 segundos, además de la conexión SSH de 20 segundos. No se promete cancelación instantánea de una operación bloqueada o de un diálogo abierto. Una cancelación posterior a la publicación no revierte el archivo ya completado. Se intenta retirar el temporal; si falla su eliminación remota se informa la ruta, y el resultado no se presenta como una cancelación limpia. Un cierre forzado del proceso o una caída de red puede dejar temporales; no se hace una purga automática del servidor.

La comprobación de tamaño detecta transferencias cortas o un cambio de tamaño, pero no verifica un hash remoto ni garantiza que un archivo remoto modificado manteniendo su tamaño sea una instantánea consistente. Se transfieren archivos individuales; carpetas recursivas, arrastrar y soltar, colas, reanudación y reemplazo remoto siguen pendientes.

El laboratorio SFTP aislado comprueba ida y vuelta binaria, progreso, nombres literales y rutas con espacios, archivos vacíos, preservación de destinos existentes, cancelación de subida y descarga, limpieza de temporales, destino remoto creado durante la copia, exclusividad de trabajos, aislamiento por sesión y cancelación tardía. No se utiliza infraestructura real ni un proveedor IA real. Los diálogos y el progreso visual en una conexión de usuario aún requieren prueba manual.

Validación de código: **86 pruebas Windows aprobadas, sin omisiones**, con el laboratorio SSH/SFTP habilitado; **18 pruebas del cliente aprobadas**, TypeScript correcto y sin errores del editor en los archivos modificados. La versión de escritorio pasa a `0.10.0-preview.3`; no cambia el formato del inventario protegido.

Se generaron instalador y ZIP portable de preview.3, con runtime incluido. Se verificaron los hashes de ambos artefactos y los **509 archivos** del manifiesto al extraer el ZIP en un directorio de prueba. No se ejecutó el instalador sobre la instalación existente del usuario ni se certificó una actualización sobre ella. Persisten las advertencias del bundle grande y Browserslist desactualizado.

### Pruebas del usuario en infraestructura real

El usuario confirmó conexión a servidores reales y funcionamiento del explorador; después confirmó que todo el flujo SFTP probado funcionaba correctamente. Se registra como validación manual reportada por el usuario, separada de las pruebas automatizadas de laboratorio. La validación de IA con un proveedor real sigue a cargo del usuario y no se da por completada por esta confirmación.

## Duodécima entrega — primera refactorización UI/UX

La versión `0.10.0-preview.4` incorpora una barra superior compacta con búsqueda de conexiones y acciones, controles visibles para los paneles y un menú de opciones. La barra lateral de herramientas ofrece conexiones, acompañante IA, ayuda y ajustes; el pie muestra el ámbito, el destino seleccionado y las sesiones SSH locales registradas, sin inventar estados de conectividad RDP.

La pantalla inicial ofrece acciones reales para crear conexión, crear carpeta, buscar y configurar IA. Las acciones del explorador se entregan mediante estado compartido: funcionan aunque el panel estuviera oculto, sin depender de un evento que se pierda antes de montarlo. El redimensionamiento de paneles se conserva en el perfil local de interfaz; no se persisten pestañas ni se reconectan servidores al iniciar.

Las pestañas incluyen roles accesibles, selección con flechas/Home/End y controles de cierre visibles. Cerrar la activa selecciona su vecina; las demás conservan sus componentes montados. Ajustes y documentación se presentan dentro del área central y no como una ventana flotante que cubre toda la aplicación. Se conservan las vistas administrativas Enterprise en el menú.

La búsqueda global se abre desde la barra o con Ctrl+Shift+P, y busca por nombre y dirección. Deja de capturar Ctrl+K/Ctrl+P, habituales en terminales. Ctrl+Alt+B y Ctrl+Alt+I alternan los paneles de conexiones e IA. Se quita la acción de recargar toda la ventana de la paleta, que podía interrumpir sesiones. Cambiar de espacio informa del cierre de conexiones antes de recargar.

El explorador resalta la conexión seleccionada, mantiene doble clic para conectar con ratón y admite Enter/espacio. La búsqueda expande ramas relevantes y oculta carpetas sin coincidencias; los destinos para mover una conexión muestran rutas completas para distinguir nombres repetidos bajo clientes diferentes. Se incorporan indicadores de foco y títulos accesibles para la paleta.

Validación: TypeScript y **21 pruebas del cliente aprobadas**, incluidas selección de pestaña vecina, conservación de sesiones, acciones al recuperar un explorador oculto y rutas de carpetas homónimas. El host Windows se compila en el empaquetado. No se modifica el transporte SSH/RDP, la ejecución de tareas IA ni el formato del inventario. El alcance y los siguientes bloques se detallan en [UI/UX V4](UI_UX_V4.md).

Se generaron instalador y ZIP preview.4 con el bundle actualizado y se verificaron hashes y **509 archivos** del paquete. El intento de inspección visual en navegador no abrió una página utilizable, y la autorización de la herramienta de inspección Windows venció antes de completar la apertura de la compilación. Por tanto, no se presenta esta entrega como validada visualmente: están pendientes mínimo de ventana, escalado y los flujos visuales descritos en el plan. No se instaló preview.4 sobre la versión usada por el usuario para validar IA.

## Decimotercera entrega — preferencias de escritorio a ancho completo

El usuario señaló que Ajustes parecía una web pequeña encapsulada entre los paneles. En `0.10.0-preview.5`, las herramientas se presentan sobre toda el área de trabajo, conservando los componentes de sesiones montados por debajo. Configuración dispone de cabecera propia con Volver y una navegación lateral de categorías: General, Inteligencia artificial, Copias de seguridad y Contexto y registros. Se elimina la cabecera genérica duplicada para esta vista.

Las preferencias usan tipografía Segoe UI, superficies neutras, separadores, controles compactos e indicador lateral de selección. Se retiran los contenedores de tarjetas dentro de las categorías y los controles ficticios de cambio de tema/idioma. General informa los valores actuales; no promete opciones no implementadas. Los formularios IA, copias y registros conservan sus operaciones y consentimiento. Las categorías locales permanecen montadas al cambiar entre ellas para conservar los campos mientras Configuración está abierta; salir de Configuración mantiene el comportamiento anterior de descarte de cambios sin guardar.

TypeScript, bundle de producción y **21 pruebas del cliente** aprobados. Se generaron instalador/ZIP preview.5 y se verificaron hashes y los **509 archivos** del manifiesto. No se modificó el formato del inventario ni los transportes o el agente IA.

Se recuperó la vista previa en `127.0.0.1:5177` y se inspeccionaron General e Inteligencia artificial con un puente simulado, inventario vacío y proveedor de ejemplo, sin claves, conexiones ni consultas reales. A 1008 píxeles de ancho se verificó que Configuración ocupa los 1008 píxeles disponibles, no hay desbordamiento horizontal y solo una categoría es visible. Esta verificación de navegador no certifica el escalado ni todas las interacciones en la aplicación Windows instalada. La instalación del usuario no se reemplazó.

## Decimocuarta entrega — ventana independiente de Configuración

En `0.10.0-preview.6`, Configuración se abre desde los accesos existentes en una ventana WPF propia, no modal, con marco del sistema, barra de título oscura, movimiento, redimensionamiento y controles de Windows. Se mantiene una ventana por instancia: abrirla de nuevo la activa y restaura si estaba minimizada. La principal conserva terminales y acompañante IA mientras se utilizan las preferencias. Al cerrar o recargar la principal se cierra la ventana dependiente.

La ventana aloja el formulario compartido de preferencias en WebView2; no es una conversión completa de campos a controles XAML. El contenedor y su ciclo de vida sí son ventanas Windows reales. El navegador conserva la presentación integrada porque carece de esa capacidad nativa. La capacidad se anuncia desde el host antes de cargar el cliente, de modo que la vista previa con puente simulado no se confunde con un cliente con ventanas nativas.

El puente de preferencias limita operaciones a configuración IA, política de contexto, gestión de registros y copias cifradas. Rechaza acceso a credenciales de servidores y herramientas SSH, RDP, SFTP o del agente. Mantiene confirmaciones y validación de importación/borrado del host existente. Los cambios de IA y restauraciones notifican a la ventana principal, incluso si una operación ya autorizada termina después de cerrar preferencias. Cerrar una ventana no revierte una escritura ya iniciada.

La nueva superficie bloquea navegación externa, ventanas emergentes y controles de navegador; usa confirmaciones y guardado de descargas con diálogos Windows. Un fallo de arranque o renderizado presenta un mensaje propio y permite cerrar/reabrir la ventana, sin alterar las sesiones principales. Reutiliza el entorno WebView2 existente y el origen interno con aislamiento DenyCors.

Validación de código: **99 pruebas Windows y 22 del cliente aprobadas**, con laboratorio SSH/SFTP activado. Incluye restricciones del puente y apertura de preferencias sin sustituir la pestaña activa o sus sesiones. Se corrigió el alto de la ruta independiente y los colores de campos en sistemas con tema claro. La comprobación de una ventana Windows real se registra aparte de estas pruebas.

Se generaron instalador y ZIP portable preview.6; se verificaron hashes y los **509 archivos** del manifiesto. Al retomar el 1 de noviembre, la inspección de Windows no pudo continuar: Computer Use devolvió `native pipe is unavailable` / `os error 2`. No se declara validación visual de apertura, redimensionamiento o convivencia de ambas ventanas. La instalación existente del usuario no se reemplazó. El paquete queda disponible para la prueba manual de esa experiencia.
