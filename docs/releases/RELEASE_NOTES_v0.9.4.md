# Versión v0.9.4-beta: notificaciones y correos multilingües

Fecha histórica de publicación: 20 de diciembre de 2025. Etiqueta: v0.9.4-beta.

Estas notas corresponden a la plataforma anterior y no describen la distribución Windows 0.11 actual. Consultar las [notas vigentes](WINDOWS_0.11.md).

## Cambios registrados en esa versión

Se incorporó Sonner para notificaciones de éxito, error e información en los flujos de usuarios, servidores, inicio de sesión, perfil, grupos, informes, ajustes de seguridad e importación CSV. Las notificaciones no bloquean la interfaz y se adaptan al tema. Las autorizaciones de seguridad conservan sus confirmaciones: un aviso no concede permisos.

Los correos incorporaron plantillas en español e inglés y la preferencia de idioma del usuario. Se añadió preferred_language al modelo, manteniendo compatibilidad con registros anteriores que no tenían ese dato.

## Correcciones históricas

- La eliminación de usuarios por administradores globales pasó a comprobar el rol superadmin en lugar del indicador anterior is_superuser.
- El campo de idioma se hizo opcional en el esquema para evitar errores de validación con usuarios existentes.
- La compilación del contenedor de interfaz se ajustó para instalar sus dependencias, incluida Sonner.

## Compatibilidad y validación

Los conteos y estados de esta etapa son antecedentes históricos, no resultados de pruebas de la versión actual. Antes de desplegar el backend deben revisarse las migraciones, configuración y dependencias realmente resueltas. No usar instrucciones antiguas de instalación para sustituir el cliente WPF vigente.

La política actual mantiene documentación propia en español y español/inglés en la app. Las credenciales, el contenido de terminal y los textos oficiales de terceros no se traducen ni se publican como ejemplos.
