# AI Sysadmin Agent — identidad v1

- [Icono PNG](./ai-sysadmin-icon-v1.png): símbolo para la aplicación.
- [Logo PNG](./ai-sysadmin-logo-v1.png): composición horizontal para fondos oscuros.

Generados con la herramienta integrada de imágenes. Fondo transparente. Los originales son raster. La identidad está aplicada al cliente Windows y a su instalador.

## Integración

Ejecutar `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prepare-brand.ps1` desde la raíz del repositorio regenera el ICO de 16, 24, 32, 48, 64, 128 y 256 píxeles y copia los PNG a los recursos nativos y públicos del cliente. El empaquetado Windows ejecuta este paso automáticamente.

El ejecutable incorpora el icono; la ventana y la pantalla de inicio usan recursos WPF. El instalador incorpora el mismo ICO y los accesos directos apuntan al icono del ejecutable instalado. La interfaz muestra el símbolo en el menú y el logo en el espacio de sesiones vacío. El acceso directo al escritorio sigue siendo una opción del instalador.

## Concepto y prompts

Icono: marca geométrica de terminal con chevron y cursor, integrada en un marco hexagonal con dos nodos de conexión. Azul #0078D4, azul hielo #A3C9FF e interior azul marino. Silueta simple, centrada, sin texto ni mockup, fondo transparente.

Logo: conservar el símbolo generado como referencia y colocarlo a la izquierda. A la derecha, texto exacto “AI Sysadmin” en sans serif moderna y negrita; debajo, “AGENT” en mayúsculas espaciadas. Composición horizontal equilibrada, colores azules, fondo transparente, sin texto adicional.
