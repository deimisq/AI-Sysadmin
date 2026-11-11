# Solicitud de purga de datos sensibles en GitHub

Este texto es un borrador para enviar mediante [GitHub Support](https://support.github.com/contact?tags=rr-sensitive-data-removal). No es una solicitud enviada ni una confirmación de eliminación. No adjuntar valores de claves ni informes sin redactar. Mantener privado el repositorio durante la gestión.

## Texto de la solicitud

Solicito revisar y purgar objetos históricos con datos sensibles del repositorio **deimisq/AI-Sysadmin**, actualmente privado y en preparación para una publicación de código abierto.

Se reescribieron las ramas y etiquetas para retirar configuraciones reales de entorno, una clave privada TLS y scripts que contenían una clave de proveedor. Se verificaron las referencias publicadas y un clon nuevo mediante escaneo de secretos sin hallazgos. Sin embargo, la API de contenidos de GitHub sigue devolviendo un archivo sensible al consultar su commit antiguo; no se ha cambiado la visibilidad.

Solicitamos orientación y, si corresponde, la purga de objetos no alcanzables, vistas en caché y referencias internas que conserven los archivos eliminados. Podemos facilitar por este canal privado los identificadores afectados y la información de git-filter-repo. No se han probado credenciales contra proveedores ni se afirma que hayan sido revocadas. No podemos certificar la ausencia de copias externas.

La comprobación de referencias de pull requests del repositorio actual no devolvió referencias anunciadas en la revisión realizada. No se identificaron objetos LFS en el procedimiento ejecutado; no se afirma que se haya realizado una auditoría independiente de todo LFS. Indiquen qué información adicional necesitan para evaluar la solicitud.

## Información que debe completarse en el canal privado

- Identificadores de los commits y objetos afectados, sin pegar contenidos sensibles. Los datos de la reescritura están en el directorio local `.git/filter-repo`; no publicar sus enlaces a objetos antiguos en issues abiertos.
- Confirmación de identidad y titularidad de la cuenta propietaria, solicitada por GitHub.
- Estado real de las credenciales si GitHub lo solicita. No declarar una revocación que no ocurrió.

GitHub determina si presta la asistencia y puede indicar rotación de credenciales como medida necesaria. No se garantiza que acepte purgar objetos únicamente porque se solicite. Consultar el [procedimiento oficial](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

## Criterio de cierre

Registrar el número de solicitud, la respuesta y una verificación posterior que no recupere el contenido sensible. Repetir el control sobre las referencias y descargas finales. Solo entonces evaluar el cambio de visibilidad y las descargas sin autenticación. No enviar esta solicitud automáticamente como un issue público del proyecto.
