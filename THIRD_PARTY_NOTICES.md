# Componentes y avisos de terceros

Apache 2.0 se aplica al código original de AI Sysadmin sobre el que sus titulares conceden esos derechos. No relicencia código de terceros ni elimina sus obligaciones.

- Cliente Windows: SSH.NET, BouncyCastle y Microsoft.Extensions.* declaran MIT en los paquetes resueltos revisados. WebView2 incluye sus archivos LICENSE/NOTICE propios. El runtime .NET incluido y los componentes Windows mantienen sus términos.
- Interfaz: React, Radix, xterm y otras dependencias usan principalmente MIT/Apache/BSD/ISC. Las licencias exactas de versiones resueltas están en los paquetes y locks. Lightning CSS y algunos componentes de desarrollo usan MPL-2.0; caniuse-lite usa CC-BY-4.0. No se debe sustituir esa atribución por la licencia del proyecto.
- Backend opcional: Ansible usa GPLv3; Ansible, herramientas, servicios externos y dependencias se distribuyen bajo sus propios términos. Revisar su resolución y forma de combinación antes de distribuir un backend empaquetado. La publicación del código original con Apache no certifica que cualquier combinación binaria sea compatible.
- Componentes legacy: no forman parte del instalador Windows vigente. Sus dependencias y avisos deben evaluarse al distribuirlos, aunque estén presentes en el repositorio.

El empaquetador Windows conserva los avisos NuGet y runtime disponibles bajo `ThirdParty`, además de LICENSE-PROJECT.txt, NOTICE y este documento. Las herramientas de compilación no se incorporan al instalador por el hecho de aparecer en un lock. Mantener una revisión del contenido efectivamente redistribuido.

Los avisos originales de las dependencias npm de producción instaladas se conservan en `ThirdParty/npm`, junto con un inventario de nombres, versiones, licencias y procedencia. Es un inventario conservador: no afirma que todo el árbol npm esté presente en el bundle. Los textos que faltan en el tarball npm se conservan bajo `assets/licenses/npm` con referencias explícitas en `sources.json`; el empaquetado falla si aparece un paquete sin aviso original y sin una copia revisada para esa versión. Para react-remove-scroll-bar, el gitHead declarado por npm no está disponible en upstream: se documenta la referencia pública del aviso MIT, consistente con la licencia declarada por la versión.

Alcance y pendientes: [revisión de licencias](docs/OPEN_SOURCE_REVIEW.md). Este documento no reemplaza los textos completos de licencia de los componentes.
