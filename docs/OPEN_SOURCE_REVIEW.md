# Revisión para publicar AI Sysadmin

Revisión: 11 de noviembre de 2026. Alcance: **deimisq/AI-Sysadmin**, cliente Windows 0.11 y código de este repositorio. No certifica seguridad absoluta ni autoriza modificar otros repositorios.

## Licencia y aportes

El código propio adopta Apache License 2.0 mediante [LICENSE](../LICENSE) y [NOTICE](../NOTICE), conservando licencias y derechos de terceros. Permite uso gratuito, contribuciones y aportes voluntarios, pero también derivados comerciales y cerrados. No concede derechos de marca ni obliga a conservar un botón de donaciones en los derivados. Véase el [texto oficial](https://www.apache.org/licenses/LICENSE-2.0.html).

La app, README y financiación de GitHub apuntan al [sitio oficial de Sentra IT](https://sentrait.com.uy/). El uso es gratuito. No se facilitó un destino de cobro específico: no se inventaron cuentas ni se habilitaron pagos. La presentación web requiere publicación editorial y queda fuera de las modificaciones de este repositorio.

## Licencias y distribución

El cliente WPF/WebView2 con React incorpora licencia propia, NOTICE, avisos NuGet y del runtime. El empaquetado agrega ahora avisos originales npm y un inventario conservador de dependencias de producción instaladas; falla si falta un aviso requerido. Los avisos recuperados de upstream registran procedencia y versiones, incluyendo una excepción de referencia histórica documentada. Véanse [avisos de terceros](../THIRD_PARTY_NOTICES.md) y [distribución Windows](WINDOWS_DISTRIBUTION.md).

Las implementaciones Python/Rust y despliegues legacy no forman parte del instalador Windows vigente. No se certificó una distribución completa con todas sus dependencias opcionales. Ansible conserva sus obligaciones GPL; las APIs IA, Windows y WebView2 mantienen sus condiciones externas. Publicar el código propio no libera modelos ni vuelve gratuitas las APIs.

No se realizó una comprobación jurídica de la titularidad de cada aporte histórico. Los autores Git, incluidos agentes, no bastan para demostrar derechos: el mantenimiento debe conservar autorizaciones y avisos de aportes ajenos.

## Verificaciones realizadas

La revisión anterior completó 200 pruebas Windows, incluidas dos integraciones SSH/SFTP en laboratorio; 79 pruebas backend; compilaciones de ambas interfaces y pruebas de idioma del instalador con registro sintético. Los workflows de seguridad, compatibilidad y distribución del commit `2292209` finalizaron correctamente. No se usaron equipos reales del usuario como fixtures.

Las auditorías npm de ambas interfaces y la restauración NuGet auditada no informaron vulnerabilidades conocidas. El entorno Python resuelto para pruebas pasó pip-audit tras sustituir python-jose por PyJWT; no comprende todas las dependencias opcionales o despliegues legacy.

La revisión de avisos agregó tres pruebas del recolector: el frontend pasa ahora 39 pruebas y compila. Se retiraron cabeceras PEM de los placeholders, que generaban una coincidencia sin contener una clave. El bundle regenerado y el paquete extraído pasaron Gitleaks. Se generó una distribución local de validación `0.11.60040`: sus 692 archivos y hashes pasaron la comprobación del paquete, con avisos para 169 dependencias npm. No se instaló sobre el equipo del usuario ni se publicó esa versión local.

La documentación propia está en español. La app y el instalador ofrecen español e inglés mediante catálogos; preservan textos legales oficiales, identificadores técnicos y contenido del usuario. Las pruebas no sustituyen una revisión visual exhaustiva de todos los recorridos.

## Secretos históricos: publicación bloqueada

A solicitud del usuario se reescribieron ramas y etiquetas para retirar entornos reales, claves TLS, scripts con credenciales y un entorno virtual versionado. Las referencias saneadas y un clon nuevo pasaron Gitleaks sin hallazgos. Los clones anteriores deben reemplazarse para no reintroducir objetos eliminados.

**GitHub todavía devuelve contenido sensible al consultar un commit anterior por identificador.** Se comprobó en memoria, sin imprimir ni probar la credencial. El repositorio permanece privado: un clon limpio no demuestra que GitHub haya purgado objetos y cachés.

Se preparó la [solicitud de purga](GITHUB_PURGA_SOLICITUD.md). No se ha enviado: GitHub Support requiere iniciar sesión en el navegador. GitHub decide si presta asistencia y puede requerir medidas adicionales. No se probaron ni revocaron credenciales. Limpiar Git no invalida credenciales ni elimina copias externas.

El inventario remoto contiene 35 releases y 96 ejecuciones de Actions al iniciar esta revisión. Se descargaron los 35 ZIP portables y se verificaron tamaños y SHA256 contra sus metadatos de GitHub. En sus 1.145 archivos de texto no aparecieron los patrones buscados de claves Google, tokens GitHub o bloques completos de claves privadas; tampoco nombres de archivos de almacén local contemplados por el control. El ZIP `0.11.39` también pasó revisión con Gitleaks salvo una cabecera PEM de ejemplo, sin una clave completa, retirada de los formularios nuevos. Sus avisos npm faltaban y se incorporaron al empaquetado siguiente. Esto no es una auditoría de todos los binarios, instaladores o logs. Los assets antiguos no se modificaron ni sobrescribieron.

## Pendientes antes de cambiar la visibilidad

1. Iniciar sesión en GitHub Support, enviar la solicitud privada y obtener respuesta. Comprobar después que los objetos sensibles ya no son recuperables. No publicar enlaces a objetos antiguos en issues abiertos.
2. Cerrar la revisión de artefactos históricos y resultados de seguridad. Distinguir ZIP, instaladores y logs; no extender comprobaciones parciales a todos los archivos de GitHub.
3. Verificar los workflows del commit final y sus descargas con avisos de terceros. No anunciar una compilación exitosa antes de terminar CI.
4. Solo tras resolver los bloqueos, cambiar la visibilidad y verificar descargas y actualizaciones sin autenticación. El actualizador admite acceso anónimo, pero no puede verificarse una descarga pública mientras el repositorio siga privado.

Un escáner sin hallazgos no permite prometer seguridad al 100%. La firma de código y las pruebas en más equipos siguen siendo mejoras de distribución; no deben presentarse como realizadas.
