# Windows 0.11

- Versiones cortas `0.11.N`, con `N` igual al número de ejecución del workflow Windows. Rama y commit se muestran por separado. La versión base de desarrollo es `0.11.0`.
- Versión visible en la barra inferior y sección Ayuda con información de producto, instalación, sistema, runtime, arquitectura, repositorio, commit y ubicación de datos.
- Comprobación de versiones al abrir y búsqueda manual en Ayuda. Las descargas e instalaciones requieren aprobaciones nativas independientes. El instalador se ejecuta desde la app, sin abrirlo manualmente.
- Verificación de tamaño y SHA256 contra el digest del asset publicado por GitHub. No se instalan versiones antiguas, prereleases de otras ramas ni archivos sin hash válido.
- Instalación en segundo plano en la ubicación existente, conservando datos. La app continúa abierta y avisa cuando se puede reiniciar; el reinicio aprobado cierra las sesiones SSH/RDP y abre la nueva versión.
- Repositorio privado: acceso opcional mediante token restringido a `deimisq/AI-Sysadmin`, permiso `Contents: read`, guardado con DPAPI en el equipo. No se reutiliza la API key de IA ni se incluye este token en backups.
- Solo las instalaciones registradas permiten actualizarse en la app. El modo portable y de desarrollo permite consultar información y versiones, pero no sustituye una instalación registrada.

Compatibilidad: las versiones anteriores sin actualizador requieren instalar manualmente una primera versión `0.11.N`; desde ella se habilita este flujo. No se cambian formatos del inventario ni copias cifradas. Los binarios siguen sin firma de código; SHA256 verifica correspondencia con GitHub, no reemplaza una firma del publicador.

Validación: pruebas sintéticas de versiones, descarga, hash y protección de tokens; prueba de instalador con AppId y aplicación ficticios aislados. El acceso real a releases privados requiere configurar el token en la app del equipo de destino.
