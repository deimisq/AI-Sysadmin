# Refactorización UI/UX — espacio de trabajo Windows

El objetivo es un gestor de conexiones de escritorio, con carpetas de clientes y entornos, sesiones persistentes mientras la ventana esté abierta y un acompañante IA que trabaja sobre el destino seleccionado. La interfaz debe priorizar la infraestructura y la tarea del técnico.

## Primer bloque implementado — preview.4

- **Navegación:** barra superior compacta, búsqueda global, herramientas laterales y pie con ámbito/destino.
- **Espacio inicial:** crear conexión, organizar carpetas, buscar y configurar IA mediante acciones conectadas al producto.
- **Sesiones:** pestañas con controles visibles, navegación de teclado y selección vecina al cerrar. El contenido de sesiones no seleccionadas sigue montado.
- **Organización:** filtro de ramas y rutas de carpetas completas al mover conexiones. Resaltado del servidor de la pestaña seleccionada.
- **Paneles:** controles para ocultar o mostrar explorador e IA y guardado de proporciones en el perfil de interfaz.
- **Herramientas:** ajustes/documentación en el centro, conservando el resto del espacio disponible. Acceso Enterprise conservado en opciones.
- **Atajos:** Ctrl+Shift+P para buscar; Ctrl+Alt+B para conexiones; Ctrl+Alt+I para IA. Ctrl+K y Ctrl+P se dejan a la terminal.

Este bloque mantiene los diálogos y el comportamiento de conexiones existentes. No es la finalización de toda la refactorización ni una reescritura de controles WebView2 a XAML.

## Ajuste posterior — preview.5

Configuración ocupa toda el área de trabajo con categorías laterales, botón Volver, tipografía Segoe UI y controles compactos. Se retiran las tarjetas interiores y las opciones de tema/idioma que no tenían implementación. Las sesiones permanecen montadas por debajo y las categorías conservan sus campos mientras la vista está abierta. La estructura se comprobó en navegador con datos simulados; la aceptación visual en Windows sigue pendiente del usuario.

## Ventana de preferencias — preview.6

El cliente Windows abre Configuración en una ventana WPF independiente y no modal, con marco del sistema y una única instancia por ventana principal. Mantiene los formularios compartidos dentro de WebView2 y un puente limitado a preferencias; los controles internos no se han reescrito en XAML. Los menús rápidos permanecen en el espacio de trabajo. El navegador sigue usando la vista integrada.

## Siguientes bloques

1. **Conexiones y carpetas:** formulario más compacto, validaciones junto al campo, creación dentro de una carpeta elegida y selección de destino con ruta visible. Evaluar favoritos y recientes sin guardar credenciales en preferencias de presentación. El arrastre debe usar el guardado revisado de carpetas y respetar permisos.
2. **IA como acompañante:** mejorar legibilidad de conversación y tareas, indicar siempre destino/proveedor y distinguir pensando, ejecutando, cancelando y resultado incierto. Priorizar la petición libre y el contexto de terminal, sin volver a un catálogo de diagnósticos prefijados. La validación de IA real sigue pendiente del usuario.
3. **Ajustes:** reorganizar por Conexiones, IA y privacidad, copias, registros y apariencia. Sustituir controles sin implementación por estados explícitos o retirarlos hasta implementarlos. Evitar anunciar idiomas o temas que no se apliquen a toda la interfaz.
4. **Archivos:** mejorar tamaño/fecha, selección, accesibilidad y recuperación de errores. Diseñar colas y transferencias múltiples antes de añadirlas; conservar confirmaciones de reemplazo y estados de resultado incierto.
5. **Consistencia:** consolidar colores, espaciado, tipografía y componentes de estado compartidos entre terminal, explorador, IA, formularios y ajustes. Comprobar pantallas pequeñas, escalado Windows, teclado y contraste.

## Comprobaciones de aceptación

- Abrir varias conexiones y alternar pestañas sin reconectar las no seleccionadas.
- Abrir y cerrar ajustes sin perder la terminal; volver desde la herramienta Conexiones.
- Crear una carpeta desde la pantalla inicial con el explorador oculto.
- Buscar un servidor dentro de una rama cerrada y distinguir carpetas homónimas.
- Usar búsqueda y navegación mediante teclado; mantener los atajos habituales del shell.
- Redimensionar y alternar paneles; comprobar mínimo de ventana y escalados de Windows.
- Revisar destino y contexto al cambiar entre servidores antes de pedir ayuda a la IA.

Las pruebas del estado compartido y la compilación no sustituyen la comprobación visual de estos flujos en Windows. Se conserva la instalación preview.3 del usuario para su validación de IA; preview.4 se entrega aparte.
