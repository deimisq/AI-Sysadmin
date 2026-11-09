# Adaptación selectiva del prototipo Stitch

## Objetivo

Usar el prototipo entregado como referencia de jerarquía, densidad y estilo Windows, preservando los flujos funcionales del producto. No incorporar su HTML, datos de ejemplo, dependencias CDN, marca WinConnect ni funciones representadas sin implementación.

## Etapas y aceptación

1. **Espacio principal:** superficies neutras, Segoe UI con fuentes locales del sistema, árbol compacto, etiquetas de protocolo/puerto, pestañas claras y cabecera IA con destino/modelo reales. Mantener ventanas Windows y sesiones montadas. Validar compilación, teclado y ausencia de telemetría ficticia.
2. **Conexiones:** formulario compacto con secciones, validaciones junto a campos y rutas de carpetas claras. Conservar credenciales protegidas y distinguir cambios guardados de conexión iniciada.
3. **IA:** conversación libre prioritaria, contexto y modelo identificables, bloques de comandos legibles y estados de tarea claros. Conservar consentimiento, autorización por objetivo y cancelación. No añadir escaneo automático ni catálogo obligatorio de diagnósticos.
4. **SFTP:** tabla con tamaño y fecha, acciones explícitas y progreso visible. Mantener transferencia individual, temporales y políticas de reemplazo actuales; colas y sincronización requieren otra implementación.
5. **Consistencia y entrega:** aplicar los componentes compartidos a preferencias y diálogos, revisar escalado Windows y teclado, generar versión instalable y verificar paquete.

## Límites

No implementar como parte del cambio visual VPN, Ollama, TPM/Windows Hello, métricas de infraestructura, auditoría empresarial ni ejecución RDP. Mica/Acrylic reales y controles de ventana dependen del host; CSS no se presentará como integración nativa del sistema. No declarar conexión activa solo porque exista una pestaña o una entrada de inventario.

## Primera intervención

Se comienza por las etapas 1 y la cabecera de la etapa 3, sin modificar transportes o ejecución IA. El resultado se verifica como código y bundle de desarrollo; la versión instalada preview.6 permanece aparte hasta producir un nuevo paquete.

Cambios aplicados: superficies neutras y tipografía del sistema en el espacio principal; indicador inferior para la pestaña activa; etiquetas de protocolo en pestañas y de protocolo/puerto en el árbol; cabecera IA compacta con modelo configurado, destino y detalle desplegable de privacidad. No se cambia el consentimiento ni se envían consultas automáticamente.

Validación inicial: TypeScript correcto y 24 pruebas del cliente aprobadas, incluidas SSH explícito sobre Windows y puertos personalizados. Los archivos modificados no presentan diagnósticos del editor. Pendientes: revisión visual con distintas anchuras y escalados, siguiente bloque de formularios y nuevo instalador. La instalación preview.6 no incluye estos cambios.

## Segunda intervención — propiedades de conexión

El formulario se compacta con tipografía Segoe UI, campos de 32 píxeles, cabecera y pie fijos, separadores y desplazamiento en el cuerpo. Guardar usa un formulario semántico y validación visible junto a nombre, dirección, usuario y puerto; enfoca el primer campo inválido. Admite IP/DNS e IPv6 y rechaza URLs pegadas con esquema o espacios. Se normalizan los espacios exteriores del nombre, dirección y usuario, conservando contraseñas y claves sin recortar.

Mientras se guarda se deshabilitan los campos y se bloquean cierres y envíos repetidos dentro del mismo diálogo. El clic exterior no descarta el formulario. No es idempotencia persistente del servidor: un reintento después de una respuesta perdida todavía requiere revisar el inventario. Se mantienen las credenciales vacías en edición para conservar el comportamiento existente y no se abren conexiones al guardar.

Validación: TypeScript y 26 pruebas del cliente aprobadas, incluidas validaciones de direcciones/puertos y compatibilidad de requisitos Enterprise. No se presenta como un diálogo WPF nativo: es el formulario compartido adaptado a la estética de escritorio. Siguen pendientes la creación dentro de una carpeta elegida, revisión visual y paquete instalable actualizado.

## Tercera intervención — crear desde una carpeta

Cada carpeta ofrece «Nueva conexión en esta carpeta». El formulario muestra la ruta completa del destino; crear desde la barra general o la pantalla inicial continúa usando el grupo original. Editar una conexión no cambia su carpeta de forma implícita.

Tras guardar la conexión se asigna su identificador a la carpeta usando el guardado y revisión existentes. Son dos escrituras, no una transacción atómica. Si la carpeta desapareció o su guardado falla por una revisión desactualizada, se conserva la conexión en el inventario y se informa cómo moverla después. Una excepción posterior al guardado no deja abierto el formulario invitando a repetir la creación. Se mantiene el límite previo: una respuesta perdida de la propia creación no tiene deduplicación persistente.

TypeScript, bundle y las 26 pruebas existentes del cliente pasan. La comprobación visual de crear en una carpeta y la prueba manual de conflicto de revisión quedan pendientes. Los cambios continúan en desarrollo y aún no se incluyen en preview.6.

## Cuarta intervención — presentación SFTP

El panel muestra «Archivos remotos · SFTP», botón de subida con texto y filtro por nombre aplicado solo al directorio ya leído. Cada entrada muestra nombre, fecha de modificación y tamaño o indicador de carpeta; la fecha se presenta en la zona y formato del equipo. Fechas ausentes o inválidas se identifican explícitamente. El pie distingue errores de lectura del estado Listo.

Se adapta la tabla del prototipo a una lista compacta de dos líneas por entrada para conservar el ancho de terminal en el panel estrecho actual. No se incorpora un explorador local adicional, cola, sincronización, permisos ni análisis automático de archivos. Se mantienen las acciones existentes de descarga, progreso/cancelación y controles de destino confirmado. El filtro no busca recursivamente ni hace nuevas solicitudes remotas.

Pendientes de aceptación visual: legibilidad de nombres largos, fechas, filtro y progreso en Windows a distintos escalados. El paquete preview.6 permanece sin estos cambios; la entrega instalable y revisión integral corresponden a la etapa 5.

## Quinta intervención — consolidación y paquete preview.7

Se prepara `0.10.0-preview.7` para reunir las cuatro intervenciones anteriores en un instalador Windows y ZIP portable, manteniendo la ventana independiente de Configuración de preview.6. Se unifica además la detección de protocolo del icono y la etiqueta de pestañas. El instalador anterior no contiene los cambios de Stitch.

TypeScript y **26 pruebas del cliente** aprobados. El bundle se genera con advertencias existentes de tamaño y Browserslist; no hay errores del editor en los componentes revisados. No se alteran transportes ni formato del inventario. No se sustituye la instalación actual ni se abren conexiones remotas como parte del empaquetado.

### Aceptación pendiente

- Revisar la nueva compilación en Windows a 100 %, 125 % y 150 % de escala, incluida la ventana mínima.
- Crear/editar una conexión, verificar errores de campos, guardar desde una subcarpeta y comprobar que quede en ella.
- Simular conflicto de revisión de carpetas: la conexión debe conservarse aunque falle la asignación.
- Alternar pestañas y abrir Configuración sin reiniciar las sesiones.
- Revisar cabecera IA, comandos y tareas con contexto real; no se da por validada la IA por compilar la interfaz.
- Abrir SFTP, filtrar, verificar fecha/tamaño y probar una transferencia con cancelación.

El intento de abrir la vista previa de navegador durante esta consolidación devolvió `openBrowserPage failed`. Por tanto, el empaquetado y las pruebas no se anuncian como aceptación visual completa. El resto de la etapa 3 —legibilidad de comandos y estados detallados de tarea— y la revisión integral de escalado quedan abiertos.

Entrega generada: instalador y ZIP portable en `dist/windows/0.10.0-preview.7/`. Se verificaron los hashes de los artefactos y los **509 archivos** del manifiesto al extraer el ZIP en un directorio de prueba. No se probó una actualización sobre la instalación existente ni se reemplazó dicha instalación.

## Corrección de enfoque — preview.8

El usuario indicó que preview.7 seguía viéndose prácticamente igual. Su captura mostraba las etiquetas y cabecera actualizadas, por lo que no se atribuye a caché: los cambios anteriores eran demasiado sutiles y conservaban la misma composición de bienvenida.

Se sustituye la bienvenida con cuatro tarjetas por un catálogo funcional de conexiones guardadas: tabla de servidores/direcciones, protocolo y puerto, acción explícita Conectar, búsqueda por nombre/dirección/descripción, filtros SSH/RDP con cantidades y acciones de crear conexión/carpeta. La tabla no inventa disponibilidad ni métricas. Crear, editar o eliminar desde el explorador notifica la actualización del catálogo; las sesiones mantienen su apertura habitual en pestañas.

El catálogo aparece cuando no hay pestañas abiertas; no sustituye una terminal activa ni cierra conexiones para mostrar el inventario. Esta corrección cambia de forma concreta la pantalla de la captura. La adaptación completa del resto del espacio permanece en desarrollo. TypeScript, bundle y 26 pruebas existentes pasan; no hay pruebas visuales automatizadas del catálogo incluidas en ese número.

Se generaron instalador y ZIP preview.8 y se verificaron hashes y 509 archivos del manifiesto. Se reinició la vista previa 5177 y se comprobó en navegador, con dos conexiones simuladas, la presencia de la tabla y la selección RDP que reduce la lista a una fila. No se abrieron conexiones reales ni se reemplazó la instalación del usuario. La navegación inicial del navegador agotó su plazo de carga, pero la lectura posterior mostró la interfaz montada y el filtro respondió correctamente.

## Cambio de estructura aprobado — contenedor IDE

El usuario aprobó orientar la aplicación como un IDE. Se reemplaza la barra superior anterior por menús Archivo, Conexiones, Ver, Herramientas y Ayuda, con acciones conectadas al producto. El área central pasa a un espacio de sesiones vacío con accesos de teclado cuando no hay terminales; el catálogo permanece como herramienta opcional desde Conexiones.

La distribución conserva árbol izquierdo y acompañante derecho e incorpora un panel inferior redimensionable y ocultable desde Ver. En esta primera implementación contiene una lista funcional de pestañas abiertas, dirección y protocolo, con selección de sesión. «Pestaña abierta» no implica conexión activa: solo se identifica una sesión SSH registrada cuando el host la registró. Transferencias, registros y tareas todavía no se trasladaron al panel; no se muestran pestañas de herramientas sin implementación. Tampoco se implementa división simultánea de terminales en este bloque.

Las proporciones verticales/horizontales del contenedor IDE usan claves nuevas para no reutilizar configuraciones incompatibles del diseño anterior. Se mantienen componentes de terminal al alternar pestañas. Los menús son controles accesibles de la interfaz compartida, no menús Win32; el marco y Configuración independiente siguen a cargo de Windows.

TypeScript, bundle y 26 pruebas existentes aprobados. En la vista previa con inventario simulado se comprobaron menús, estructura y ocultación del panel inferior. No se abrieron conexiones reales. El instalador preview.8 no incluye este bloque; falta empaquetado nuevo y aceptación visual en Windows.

## Panel inferior — seguimiento de tareas IA

Se añade la sección Tareas IA junto a Sesiones. Consulta el estado real del último trabajo de la instancia mediante el puente nativo, muestra destino/objetivo, estados diferenciados y eventos desplegables con hora y código de salida. Permite solicitar cancelación por identificador del trabajo. No inicia tareas ni amplía la autorización existente: el objetivo sigue autorizándose desde el acompañante.

El monitor no atribuye la tarea al servidor de la pestaña seleccionada: muestra el destino del registro del agente. Si falla la consulta conserva el resultado anterior con aviso de posible desactualización y deshabilita la cancelación mientras no hay comunicación fiable. Solo consulta mientras la sección está montada. Cambiar de sección o cerrar el panel no cancela el trabajo. En navegador sin host local informa que el seguimiento requiere Windows.

TypeScript, bundle y 26 pruebas existentes aprobados; sin diagnósticos del editor en los componentes nuevos. No se ejecutó una tarea real ni se consumió una API IA para esta comprobación. Falta prueba visual con un trabajo activo, integración de transferencias y un instalador nuevo; preview.8 aún no incluye el contenedor IDE.

## Panel inferior — transferencias SFTP

Se añade Transferencias con consulta global de la última operación SFTP de la instancia, incluso después de cerrar el explorador. La nueva orden del host es de lectura y devuelve metadatos/progreso del trabajo existente; no abre conexiones ni inicia transferencias. Cancelar conserva la comprobación por identificador y sesión del ejecutor actual.

Se muestran archivo, subida/descarga, estado, bytes y error. El destino se relaciona con la sesión registrada; si ya no hay relación disponible se muestra el identificador de sesión, sin asumir que pertenece a la pestaña activa. Cerrar el panel no cancela la transferencia. Ante fallo de consulta el último estado queda advertido como desactualizado y la cancelación se deshabilita hasta recuperar comunicación.

Se conserva una sola transferencia y último resultado en memoria, sin cola ni historial persistente. TypeScript, bundle y 26 pruebas existentes pasan; falta comprobar progreso/cancelación desde el panel con un servidor real. La validación del transporte anterior no sustituye esa prueba de interfaz. El instalador preview.8 no incluye estos cambios del IDE.

## Entrega conjunta IDE — preview.9

Se prepara instalador y ZIP portable `0.10.0-preview.9` con el contenedor IDE, menús de aplicación, explorador, pestañas, acompañante IA, Configuración independiente y panel inferior con Sesiones, Tareas IA y Transferencias. La pantalla inicial ya no es el catálogo: muestra el área de sesiones y accesos de teclado; el catálogo queda en Conexiones.

Validación previa al empaquetado: **99 pruebas Windows aprobadas sin omisiones**, con laboratorio SSH/SFTP, y **26 pruebas del cliente aprobadas**, TypeScript correcto. La verificación no equivale a prueba visual completa de los monitores con infraestructura real.

Pendientes de esta entrega: probar tareas/transferencias desde el panel inferior, escalado y tamaño mínimo en Windows, división simultánea de terminales, historial de transferencias y consolidación de los estados de monitor en una fuente compartida. Los monitores consultan al host mientras están montados; no ejecutan trabajo al abrirlos. No se instala automáticamente sobre la versión del usuario.

Paquetes preview.9 generados y verificados: hashes de instalador/ZIP y **509 archivos** del manifiesto del portable. Verificación completada al retomar el 3 de noviembre. No se ejecutó el instalador sobre la instalación existente. Esta entrega permite evaluar por primera vez el conjunto IDE empaquetado; las pruebas funcionales/visuales pendientes anteriores siguen abiertas.

## Densidad del espacio de trabajo — preview.10

Tras la revisión del usuario en una pantalla 2K, se prioriza la consola. El explorador inicia con un ancho cercano a 240 px y la IA a 320 px, limitado proporcionalmente en ventanas pequeñas; ambos siguen siendo redimensionables y ocultables. Se cambia la clave de persistencia del diseño para no recuperar los anchos anteriores. Las proporciones guardadas vuelven a aplicarse después de este cambio inicial.

El árbol usa filas de 28 px con nombre en una línea, icono y protocolo; dirección y puerto se consultan pasando el cursor por el nombre. Se eliminan la segunda línea por servidor, la leyenda de organización local y separaciones innecesarias. Veinte servidores requieren unos 560 px de filas, más las carpetas. La búsqueda por nombre o dirección se conserva.

El panel inferior inicia cerrado y se abre desde Ver. Sus tres secciones comparten una barra. Se reduce el tamaño inicial al abrirlo y se compacta la cabecera de IA, dejando privacidad y configuración en un desplegable, sin modificar consentimiento ni envío de contexto.

TypeScript y 26 pruebas del cliente aprobados; bundle generado. Falta aceptación visual en Windows con 20 servidores, escalado y tamaños de ventana reales. No se han modificado conexiones ni datos guardados.

## Consola sin barra adicional — preview.11

Se elimina la fila SSH con usuario, dirección y Desconectar. El acceso Archivos se integra en el extremo derecho de la fila de pestañas existente y se muestra únicamente para la sesión SSH activa y conectada. Conserva el estado de su explorador por sesión. Cerrar la pestaña mantiene la desconexión del transporte mediante la limpieza existente del componente. No se añade ningún elemento superpuesto al contenido de la consola.

TypeScript y diagnósticos del editor sin errores. Pendiente aceptación visual en Windows del nuevo acceso SFTP y cambio entre pestañas.

## Pestañas compactas y conexión rápida — preview.12

Las pestañas pasan a 32 px de alto y 80–160 px de ancho, con nombre truncado y destino completo en el título al pasar el cursor. Se mantiene cierre individual y navegación por teclado.

Entre Ayuda y Buscar se añade Usuario, Servidor, selector SSH/RDP/SFTP y Conectar. El destino admite DNS/IP, puerto opcional y dirección IPv6 con puerto entre corchetes. La autenticación se pide en un diálogo posterior, con contraseña o ruta de clave privada SSH. Las conexiones usan el puente nativo del equipo; en navegador se informa que hace falta la app de escritorio.

Se abren pestañas temporales con identificadores negativos de instancia, sin escribir el inventario ni guardar las credenciales en almacenamiento del navegador. Estas permanecen en memoria durante la sesión. SSH abre consola, RDP usa el control nativo y SFTP abre el explorador a todo el ancho sin crear una shell interactiva. Se conservan las verificaciones de identidad del host SSH del transporte existente. Cerrar una sesión temporal RDP no recarga toda la aplicación.

Limitación explícita: el contexto protegido y las tareas IA requieren una conexión guardada, porque el host los vincula al identificador y huella del inventario. El panel informa esta condición para las sesiones temporales, sin intentar consultar historiales ni tareas con identificadores inventados. No se han cambiado las capacidades IA de las conexiones guardadas.

TypeScript y 29 pruebas del cliente aprobados, incluidas tres pruebas de destinos y puertos. Bundle generado; falta validar autenticación y experiencia de las tres opciones desde la barra con servidores reales y revisar escalado/ancho mínimo. El transporte nativo se reutiliza; las pruebas de análisis de destino no demuestran conectividad real.

## Verificación SSH y cursor nativo — preview.13

El usuario informa que el cursor desaparece al abrir el MessageBox de primera conexión sobre WebView2. Se reemplaza por una ventana modal WPF propiedad de la ventana principal, sin contenido web, con flecha explícita, ForceCursor y tratamiento nativo de WM_SETCURSOR mediante el cursor estándar IDC_ARROW. Se limita Mouse.OverrideCursor al tiempo del diálogo y se restaura su valor anterior al cerrarlo.

La ventana presenta destino, huella seleccionable y botones Confiar y conectar / Cancelar. Cancelar recibe foco y es la opción predeterminada; Escape o cerrar la ventana rechazan la conexión. La huella solo se persiste tras aceptación explícita. La lógica existente de rechazo por huella cambiada no se modifica.

Compilación y 99 pruebas Windows aprobadas, sin omisiones. No se ha reproducido ni verificado visualmente la desaparición del cursor en este entorno; queda pendiente probar una primera conexión desde la nueva compilación. No se eliminan entradas de confianza ni se provocan conexiones reales para forzar el diálogo.

## Cursor oculto y activación RDP — preview.14

El usuario confirma que preview.13 sigue sin mostrar el puntero, aunque los botones reaccionan al pasar por encima. Se añade comprobación nativa GetCursorInfo después de seleccionar la flecha; si Windows sigue marcando el cursor como oculto, se normaliza su contador con ShowCursor, con un máximo de 32 intentos. Solo se modifica ante estado oculto, no en cada movimiento ni ante supresión por entrada táctil. Se aplica al activar el diálogo, recibir WM_SETCURSOR y salir de la confirmación. La corrección visual aún requiere aceptación en el equipo afectado.

RDP fallaba al buscar un ProgID que no está registrado, pese a existir el control COM. Se verificó en ambas vistas de registro que el CLSID apunta a mstscax.dll. La carga ahora utiliza directamente el [CLSID documentado por Microsoft](https://learn.microsoft.com/es-es/windows/win32/termserv/msrdpclient9notsafeforscripting), sin registrar DLL ni cambiar Windows. Una prueba STA inicializa AxHost, accede a AdvancedSettings9, cambia el puerto y verifica que continúa desconectado. Pasan las 100 pruebas Windows, sin omisiones.

Se elimina también la barra grande superior de RDP. La sesión ocupa el área bajo las pestañas y se cierra con la X de su pestaña. TypeScript y bundle correctos. Quedan pendientes la comprobación visual del cursor y una conexión RDP completa contra un servidor real; la activación COM aprobada no demuestra autenticación ni interacción remota.

## Superficie y estado real de RDP — preview.15

El usuario informa una pantalla negra tras introducir la contraseña. El texto Active (PID: 1) provenía de una respuesta ficticia del puente, no de confirmación del escritorio remoto. Se elimina ese indicador y el cliente espera OnLoginComplete para marcar la sesión activa. Los eventos nativos de desconexión/error muestran su código en la interfaz, conservando la pestaña para poder leerlo; un redimensionamiento posterior no vuelve a tapar ese error con el control nativo.

El host ActiveX se hace visible explícitamente, se acopla al contenedor, se configuran dimensiones del escritorio antes de Connect y se aplica el orden de ventanas nativas con SetWindowPos después de cargar/redimensionar. Esto aborda la posible superposición de HWND de WebView2 y WindowsFormsHost; no se atribuye el fallo remoto a una causa demostrada por la captura. El navegador principal conserva su control WebView2 actual.

Referencias: [superposición de WebView2 en WPF](https://learn.microsoft.com/en-us/microsoft-edge/webview2/platforms/wpf) y [evento OnLoginComplete](https://learn.microsoft.com/en-us/windows/win32/termserv/imstscaxevents-onlogincomplete).

Las 100 pruebas Windows pasan. Se amplió la prueba RDP para alojar el ActiveX en un panel, comprobar visibilidad y tamaño y conectar/desconectar sus suscripciones COM sin acceder a la red; esa prueba enfocada también pasa. TypeScript correcto. Sigue pendiente verificar el escritorio, autenticación y uso remoto en el servidor real del usuario. No se cambiaron credenciales ni políticas del servidor.

## Composición de la ventana principal — preview.16

El usuario confirma que preview.15 sigue mostrando Conectando. La inspección accesible de esa instancia identifica RdpHost, Input Capture Window, Output Painter Window y Output Painter DX Child Window; la captura automática de la herramienta devuelve otra superficie y no permite verificar visualmente el escritorio. No se automatizó autenticación, aceptación de certificados ni nuevas conexiones.

Se cambia la ventana principal y su ruta de recuperación a WebView2CompositionControl, recomendado por Microsoft para evitar que el HWND de WebView2 tape las superficies WPF/nativas. Se actualiza exclusivamente el SDK WebView2 de 1.0.2903.40 a 1.0.2957.106 para obtener la API pública. El destino de ambos proyectos se explicita como net10.0-windows10.0.17763.0 para incluir Windows SDK .NET y sus dependencias; compilar sin ese destino no detectaba la dependencia faltante en ejecución. La ventana de preferencias conserva su WebView2 independiente.

Se añade una prueba de ejecución STA que abre una ventana de composición, inicializa WebView2 con perfil temporal independiente y completa navegación HTML local. No accede a servidores ni a las credenciales del usuario. Pasan **101 pruebas Windows sin omisiones**, incluida esta prueba y la activación/alojamiento de RDP. La validación del escritorio remoto real sigue pendiente.

Referencias: [WebView2 en WPF y composición](https://learn.microsoft.com/en-us/microsoft-edge/webview2/platforms/wpf) y [API pública WebView2CompositionControl](https://learn.microsoft.com/en-us/dotnet/api/microsoft.web.webview2.wpf.webview2compositioncontrol).

## Doble clic en el host de composición — preview.17

El usuario confirma que RDP funciona en preview.16, pero informa regresión del doble clic para abrir servidores SSH y RDP. Se aplica en un control derivado WorkspaceWebView la mitigación del [problema reportado de WebView2CompositionControl](https://github.com/MicrosoftEdge/WebView2Feedback/issues/5099): no reenviar el manejador WPF OnMouseDoubleClick de la clase base, dejando que Chromium reconozca su secuencia de entrada. Se usa tanto en el arranque como al recuperar la ventana principal. No se modifica el evento doble clic del explorador ni se simula con temporizadores.

Compilación sin errores y dos pruebas enfocadas aprobadas: arranque/navegación local con el host personalizado e inicialización/alojamiento ActiveX RDP. La confirmación del gesto real con ratón y de la selección de texto queda pendiente en Windows; estas pruebas no simulan el dispositivo físico.

## Aislamiento y ciclo de vida de sesiones — preview.18

El usuario confirma RDP y doble clic operativos en preview.17 y autoriza continuar con estabilización de sesiones. Se sustituye el ActiveX global por un conjunto de sesiones: cada intento tiene UUID propio, control RDP y WindowsFormsHost independientes. Iniciar, cambiar límites, ocultar y cerrar requieren ese identificador. El cierre tardío de un intento anterior no puede cerrar su reconexión ni otra pestaña. Ocultar conserva el transporte; cerrar libera exclusivamente sus recursos. Al salir se cierran todas las sesiones.

La pestaña activa se propaga hasta NativeRdpCanvas. Los controles inactivos permanecen montados y conectados, con su superficie oculta. Los paneles laterales/inferiores notifican ajustes de límites; abrir una vista superpuesta oculta temporalmente el escritorio nativo. No se prometen múltiples escritorios visibles simultáneamente: la división sigue pendiente.

Los eventos COM se enrutan por UUID en lugar de dirección, corrigiendo además una comparación equivocada entre dirección y objeto bridge que impedía actualizar estados. Una reconexión usa otro UUID y no recarga toda la app. Reintentar la lectura de credenciales tampoco recarga la ventana. Se eliminan PID ficticio, cierre global de RDP desde una pestaña y temporizadores de redimensionado sin cancelación. Se conserva el host de composición con la corrección de doble clic.

Validación: 104 pruebas Windows y 29 del cliente aprobadas; después se añadió y pasó una prueba enfocada que crea dos ActiveX simultáneos y comprueba que destruir uno mantiene operativo el otro. Las cinco pruebas enfocadas de RDP pasan y TypeScript no presenta errores. Estas pruebas no autentican sesiones remotas; falta aceptación manual con dos RDP reales, alternar con SSH, cambiar tamaño y cerrar/reconectar una sesión. La estabilidad del transporte SSH conserva su cobertura anterior.

Siguiente bloque después de validar esta entrega: contexto y asistencia IA en conexiones temporales, actualmente limitado al inventario protegido.

## IA en conexiones temporales — preview.19

Se habilita el acompañante para conexiones rápidas del espacio local Windows. El destino temporal se mantiene en memoria, fuera del inventario, y se vincula al UUID de su conexión nativa mediante una huella aleatoria de intento. La identidad usada para IA se toma del destino del host nativo; no se incorporan contraseña ni clave privada a este registro. Los identificadores temporales negativos no se escriben como servidores guardados ni se recuperan en otra instancia.

SSH registra su salida cifrada como las sesiones guardadas. El acompañante espera la conexión antes de habilitar la consulta y recibe exclusivamente el registro vinculado al destino y sesión. SFTP usa su conexión SSH autenticada: puede conversar y autorizar tareas SSH, pero abrir archivos no genera por sí solo un transcript de shell ni envía contenido de archivos. RDP temporal admite conversación sobre la consulta y los datos del destino; no captura pantalla ni habilita tareas SSH sobre RDP.

La conversación temporal conserva hasta 20 turnos en memoria y comparte los últimos 10 como contexto reciente. Cerrar la pestaña elimina su destino e historial en memoria; reconectar genera otra huella, de modo que respuestas o cierres tardíos no modifican la conversación nueva. Borrar historial invalida respuestas pendientes mediante una época de historial. El registro cifrado de terminal y las auditorías de tareas conservan su retención existente: no se promete que todo dato temporal desaparezca del disco al cerrar.

Las tareas reutilizan autorización por objetivo, sesión autenticada, límites y auditoría existentes. Comprueban la vigencia del destino/consentimiento antes de cada decisión y ejecución; cerrar el destino durante una decisión impide emitir el siguiente comando. No se introducen diagnósticos preestablecidos ni consultas automáticas a la nube.

Validación: **111 pruebas Windows y 29 del cliente aprobadas**, TypeScript correcto. Seis pruebas nuevas cubren ausencia de persistencia en inventario, separación tras reconexión, cierre/respuesta tardíos, consentimiento, evidencia revisada, borrado de historial, aislamiento de transcript y bloqueo de ejecución después de cerrar. La solicitud IA de integración usa un HttpMessageHandler simulado, sin API real. Falta validar conversación/tarea con proveedor real y las tres opciones de conexión rápida desde Windows.
