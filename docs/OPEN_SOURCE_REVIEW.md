# Recomendación de licencia y donaciones

Fecha: 2026-11-11. Código revisado: línea Windows 0.11, base `3965f295`.

## Recomendación

Para distribuir AI Sysadmin gratis, recibir contribuciones y financiar su mantenimiento mediante aportes voluntarios, recomiendo **Apache License 2.0 para el código propio sobre el que el titular tenga derechos**. Aplicada al código original mediante LICENSE y NOTICE tras la autorización del usuario. Los derechos y licencias de terceros se conservan; la titularidad de aportes externos requiere revisión.

Apache 2.0 permite uso, modificación y distribución, también comercial; exige conservar los avisos aplicables y contempla una concesión explícita de patentes. No otorga por sí sola derechos de marca sobre Sentrait. Facilita adopción empresarial y permite mantener abierta la aplicación sin condicionar su uso a una donación.

La contrapartida debe aceptarse conscientemente: terceros pueden crear derivados cerrados y venderlos cumpliendo las condiciones. No se les puede imponer mantener el botón de donaciones de Sentrait como una condición adicional incompatible con la licencia. La conservación de avisos legales no equivale a publicidad obligatoria en la interfaz.

Si la prioridad fuera exigir reciprocidad en los derivados distribuidos, elegir GPLv3 en lugar de Apache 2.0. GPLv3 también permite vender y aceptar aportes; no sirve para prohibir usos comerciales. AGPLv3 responde especialmente al caso de modificaciones usadas para prestar servicio por red; no parece necesaria para financiar el cliente Windows por donaciones. MIT es válida, pero Apache 2.0 ofrece disposiciones explícitas adicionales de patentes y marca útiles para este proyecto.

Fuentes: [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.html), [resumen GPLv3](https://choosealicense.com/licenses/gpl-3.0/), [preguntas frecuentes GNU](https://www.gnu.org/licenses/gpl-faq.en.html).

## Qué se revisó y qué se encontró

Esta es una revisión técnica de licencias declaradas y arquitectura, no una autorización jurídica para relicenciar aportes ajenos ni una auditoría completa de seguridad del historial.

| Área | Evidencia revisada | Resultado y acción |
|---|---|---|
| Licencia propia | [LICENSE](../LICENSE) y README | Apache 2.0 para código original; NOTICE distingue mantenimiento, titulares respectivos y dependencias. El instalador incluye los avisos. |
| Cliente Windows | Proyecto y cinco paquetes NuGet resueltos en el entorno | SSH.NET 2026.0.0, BouncyCastle.Cryptography 2.7.0 y Microsoft.Extensions.* declaran MIT. WebView2 1.0.2957.106 referencia LICENSE.txt; el archivo instalado contiene condiciones permisivas de tres cláusulas y avisos Microsoft. Conservar los avisos y comprobar también los del runtime redistribuido. |
| Interfaz de escritorio | package.json, metadatos locales y 440 entradas del package-lock | Predominan MIT, Apache y BSD/ISC. Lightning CSS y once paquetes de plataforma declaran MPL-2.0 y aparecen como dependencias de desarrollo. caniuse-lite declara CC-BY-4.0 y es de desarrollo en este lock. No convertir sus licencias a Apache: distinguir herramientas de compilación de contenido realmente distribuido y conservar atribuciones aplicables. |
| Interfaz web | 658 entradas de frontend-web/package-lock.json | Predominan licencias permisivas; axe-core declara MPL-2.0 como dependencia de desarrollo. caniuse-lite declara CC-BY-4.0. busboy y streamsearch no declaran licencia en este lock: comprobar sus archivos/licencias de las versiones exactas antes de dar por cerrada su revisión. Un campo ausente no prueba incompatibilidad. |
| Backend Python | requirements generales, desktop y uso de ansible_runner | Existe Ansible, cuyo upstream es GPLv3. Muchas dependencias no están fijadas a versiones exactas: no se puede certificar una distribución concreta solo con estos requirements. Revisar resolución y empaquetado; Apache para código propio no reemplaza obligaciones GPL de componentes distribuidos. |
| Implementaciones legacy | Manifiestos Tauri/Rust y estructura | Conservan implementaciones y dependencias propias. Falta una revisión resuelta de todas sus dependencias, de archivos copiados y de autoría. No extender el visto bueno del cliente Windows a todo el monorepo. |
| RDP, Windows y servicios IA | Arquitectura nativa y transporte | El control RDP del sistema, WebView2 Runtime y APIs externas mantienen sus condiciones. Liberar el código propio no convierte Windows ni los modelos en software libre ni vuelve gratuitas las APIs de terceros. |
| Autoría e historial | Resumen de autores de Git y procedencia del repositorio | Hay distintos nombres de autor; las identidades de agentes de código no prueban titularidad. Confirmar derechos del titular, aportes de otras personas/organizaciones, gráficos y código incorporado antes de relicenciar. |

Los conteos corresponden a entradas de los locks, incluyendo dependencias transitivas, desarrollo y plataformas opcionales; no equivalen a paquetes distribuidos en el instalador. No se revisó línea por línea la autoría de todo el código ni se escanearon todos los commits buscando secretos.

Referencias adicionales: [Ansible COPYING GPLv3](https://github.com/ansible/ansible/blob/devel/COPYING), [SSH.NET](https://github.com/sshnet/SSH.NET), [guacamole-lite Apache 2.0](https://github.com/vadimpronin/guacamole-lite). Las licencias y avisos de terceros deben acompañar las distribuciones según corresponda.

## Donaciones: un destino común en tres lugares

Crear una página canónica de apoyo bajo **sentrait.com.uy**, con ruta y medio de cobro por definir. La app y GitHub deben apuntar al mismo destino, para poder cambiar medios de pago sin recompilar el programa.

- **App:** botón discreto «Apoyar el proyecto» en Ayuda/Acerca de y una opción en el menú Ayuda. Abrir la página oficial en el navegador predeterminado, con una ruta HTTPS permitida expresamente. La navegación del WebView está restringida actualmente; un enlace HTML sin adaptación nativa puede no funcionar. No pedir datos de tarjetas ni incorporar secretos del procesador de pago en la app.
- **Presentación en Sentrait:** explicar uso gratuito, licencia, descargas oficiales, costos externos de proveedores IA y carácter voluntario del aporte. Separar «Descargar gratis» de «Apoyar el proyecto». No condicionar funciones, actualizaciones o seguridad a donar. Se verificó https://sentrait.com.uy/ en el navegador y su repositorio React/Vite. Se preparó una ficha en borrador en el repositorio web; no se modificó el contenido persistido de producción ni se verificó un checkout de donaciones.
- **GitHub:** configurar `.github/FUNDING.yml` en la rama predeterminada usando una URL custom o una cuenta de financiación real; añadir un enlace en README. No crear enlaces de pago ficticios ni asumir una cuenta GitHub Sponsors habilitada. [Documentación de GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository).

Texto sugerido: «AI Sysadmin es gratuito. Si te resulta útil, podés apoyar su desarrollo con un aporte voluntario. Donar no es necesario para usarlo.» El tratamiento administrativo y los comprobantes del cobro deben definirse con el responsable de Sentrait según su situación real; no prometer deducibilidad fiscal.

## Antes de abrir el repositorio

1. Confirmar titular legal y autorización para relicenciar; elegir Apache 2.0 aceptando sus permisos sobre derivados, o GPLv3 si se prioriza reciprocidad.
2. Terminar el inventario de componentes realmente distribuidos, atribuciones, runtime y dependencias Python/Rust no cerradas. Si hace falta, delimitar la publicación inicial al cliente Windows sin afirmar que el backend completo quedó certificado.
3. Revisar todas las ramas, tags, historial, releases, artefactos y logs de Actions por secretos, datos de clientes o archivos privados. Revocar cualquier secreto expuesto; borrarlo del último commit no elimina el historial. No reescribir historial ni cambiar visibilidad sin una tarea explícita para esa operación.
4. Actualizar licencia, avisos de terceros, README, documentación y metadatos del instalador. Añadir guía de contribución y un canal privado para reportar vulnerabilidades.
5. Definir la página y cuenta de cobro reales e integrar los tres accesos de apoyo, sin cambiar la licencia ni la gratuidad según el aporte.
6. Hacer pública la distribución aprobada y comprobar descargas y actualizaciones anónimas. El actualizador ya permite solicitudes sin token, pero la interfaz y documentación todavía hablan de repositorio privado y deben ajustarse cuando cambie la visibilidad.

Se aplicó Apache 2.0 al código original y se prepararon los accesos de apoyo desde Ayuda y GitHub hacia https://sentrait.com.uy/. No se cambió la visibilidad ni se habilitaron cobros. Falta confirmar el titular legal específico y el medio de aporte.

## Control de publicación ejecutado

El escáner de patrones `scripts/audit-publication.mjs` recorrió las 25 referencias locales y 29.264 blobs disponibles: 42 coincidencias y ningún objeto omitido por tamaño. Incluye ejemplos y fixtures, por lo que no son 42 secretos confirmados ni constituye una auditoría completa. No se comprobaron vigencia de credenciales, referencias remotas no descargadas, logs, releases ni artefactos.

Se encontró una clave privada en `nginx/certs/server.key`; se retiraron del seguimiento la clave y su certificado conservando los archivos locales, y se excluyeron de Git. El historial además contiene patrones de clave Google en `test_gemini.py` y `list_models.py`. No se imprimen valores ni se prueban credenciales. Revocar/rotar las claves si fueron utilizadas y revisar las coincidencias antes de abrir el repositorio. Quitar archivos actuales no sanea commits anteriores.

**Publicación bloqueada:** mantener el repositorio privado. La limpieza del historial requiere una operación coordinada que contemple ramas, tags, clones y los remotos antiguos; esta tarea no reescribe ni fuerza pushes. Revisar también autoría, obligaciones de terceros y artefactos antes de cambiar visibilidad.

La ficha web `ai-sysadmin` está preparada con `published: false` en el repositorio Sentra-IT. Los datos por defecto no sustituyen el contenido persistido del sitio: requiere incorporación y publicación editorial. No anunciarla como disponible en producción ni ofrecer enlaces públicos al repositorio privado.