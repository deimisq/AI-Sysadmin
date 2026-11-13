# Windows 0.11

- Instalación en una ruta fija `AI Sysadmin Agent/AiSysadmin.exe`, sustituyendo los archivos en cada actualización y retirando carpetas legacy `versions` y assets antiguos. La migración inicial requiere ejecutar el nuevo instalador con la app cerrada porque el actualizador anterior espera directorios por versión. Las actualizaciones siguientes se preparan con la app abierta y reemplazan archivos solo después de aprobar el reinicio; el auxiliar verifica de nuevo el instalador y no reinicia Windows.

- El instalador actualiza los accesos anclados a la barra de tareas que apuntan a versiones anteriores de esa misma instalación. Evita reabrir una versión antigua tras actualizar, que puede no incluir la persistencia de ventana, carpetas y paneles. No crea anclajes ni cambia accesos de otras instalaciones.

- Persistencia de presentación: tamaño normal y estado maximizado de la ventana principal, visibilidad del explorador, acompañante IA y panel inferior, y expansión de carpetas, subcarpetas y grupos por usuario/espacio de trabajo. La búsqueda no altera la expansión guardada. No se restauran sesiones remotas ni se guardan credenciales en estas preferencias.

- Ayuda incorpora un acceso a GitHub Sponsors de @deimisq en el navegador predeterminado, con textos en español e inglés. Los aportes son voluntarios y no se solicitan datos de pago en la app.

- Distribución con inventario y avisos originales de dependencias npm, además de NuGet y .NET. El empaquetado rechaza dependencias de producción sin avisos revisados. Los ejemplos de campos de clave privada no contienen cabeceras PEM para evitar falsos positivos del escáner de los paquetes.

- Selección explícita de español e inglés en el instalador; la elección se guarda para la interfaz y los diálogos nativos. Catálogos compartidos para controles, permisos, copias, ajustes y mensajes con parámetros; no se traduce la salida del servidor ni el contenido del usuario.
- Actualización de dependencias de interfaz para corregir avisos conocidos. Revisión automática de secretos y dependencias en CI, además de las pruebas de distribución. La interfaz web independiente migra a Next.js 16/React 19 y requiere Node.js 22.
- El backend independiente sustituye python-jose por PyJWT y valida sujeto y caducidad obligatorios. Las sesiones antiguas sin esos campos deberán iniciar sesión nuevamente. El almacén y las credenciales locales de Windows no cambian.

- Mantenimiento de seguridad del repositorio: retirada de secretos históricos y configuraciones reales de entorno; no modifica credenciales guardadas en la app ni revoca claves de proveedores. Los clones antiguos requieren reemplazo tras la reescritura.

- Código original bajo Apache 2.0; distribución acompañada de LICENSE, NOTICE y avisos de terceros. Ayuda incorpora el acceso al sitio oficial de Sentra IT para apoyo voluntario, sin pagos integrados ni funciones condicionadas a donar. La publicación pública del repositorio sigue pendiente de sanear secretos históricos.

- Versiones cortas `0.11.N`, con `N` igual al número de ejecución del workflow Windows. Rama y commit se muestran por separado. La versión base de desarrollo es `0.11.0`.
- Versión visible en la barra inferior y sección Ayuda con información de producto, instalación, sistema, runtime, arquitectura, repositorio, commit y ubicación de datos.
- Comprobación de versiones al abrir y búsqueda manual en Ayuda. Las descargas e instalaciones requieren aprobaciones nativas independientes. El instalador se ejecuta desde la app, sin abrirlo manualmente.
- Verificación de tamaño y SHA256 contra el digest del asset publicado por GitHub. No se instalan versiones antiguas, prereleases de otras ramas ni archivos sin hash válido.
- Preparación de la instalación conservando datos. El reinicio aprobado cierra las sesiones SSH/RDP, reemplaza los archivos de la ruta fija y abre la nueva versión si la instalación finaliza correctamente.
- Repositorio privado: acceso opcional mediante token restringido a `deimisq/AI-Sysadmin`, permiso `Contents: read`, guardado con DPAPI en el equipo. No se reutiliza la API key de IA ni se incluye este token en backups.
- Solo las instalaciones registradas permiten actualizarse en la app. El modo portable y de desarrollo permite consultar información y versiones, pero no sustituye una instalación registrada.

Compatibilidad: las versiones anteriores sin actualizador requieren instalar manualmente una primera versión `0.11.N`; desde ella se habilita este flujo. No se cambian formatos del inventario ni copias cifradas. Los binarios siguen sin firma de código; SHA256 verifica correspondencia con GitHub, no reemplaza una firma del publicador.

Validación: pruebas sintéticas de versiones, descarga, hash y protección de tokens; prueba de instalador con AppId y aplicación ficticios aislados. El acceso real a releases privados requiere configurar el token en la app del equipo de destino.
