# Seguridad

No publiques vulnerabilidades con secretos, accesos reales o datos de clientes en issues abiertos. Contactá primero al mantenimiento a través del [sitio oficial de Sentra IT](https://sentrait.com.uy/) para coordinar un canal privado antes de compartir detalles sensibles. No hay un correo de seguridad o programa de recompensas anunciado.

Incluí versión/commit, impacto y una reproducción con datos sintéticos. No ejecutes pruebas contra equipos de terceros sin autorización.

Los avisos de seguridad y correcciones se comunicarán en releases. No se promete un plazo de respuesta ni se requiere una donación para reportar o recibir correcciones.

## Historial saneado

El historial fue reescrito para retirar configuraciones reales de entorno, claves TLS, scripts con una clave de proveedor y el entorno virtual que se había versionado. Se sustituyeron también coincidencias de credenciales dentro del contenido y los mensajes de Git. Las plantillas sin secretos y los ejemplos sintéticos se conservan.

Después de actualizar las referencias remotas, quienes tengan clones anteriores deben clonarlo de nuevo. No mezclar ni subir ramas antiguas; trasladar únicamente cambios propios revisados. Las firmas de etiquetas afectadas por la reescritura dejan de validar los objetos anteriores. Las descargas ya publicadas y copias externas no se modifican por reescribir Git.

Validación local: `gitleaks git . --redact --log-opts="--all"`, complementada con el escáner de patrones del proyecto. Un resultado sin hallazgos no certifica ausencia absoluta de secretos. La limpieza no revoca credenciales, no borra cachés de GitHub ni invalida claves descargadas previamente.

GitHub puede conservar objetos anteriores accesibles por identificador aunque no aparezcan en un clon nuevo. La comprobación previa a publicar confirmó un archivo sensible todavía recuperable; el repositorio debe permanecer privado hasta gestionar y verificar su purga con GitHub. No incluir valores de claves en solicitudes de soporte.
