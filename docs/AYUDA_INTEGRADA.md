# Ayuda integrada de Windows

La sección **Ayuda → Documentación** contiene las guías de uso de la app instalada. El catálogo está en [documentation.ts](../frontend-desktop-ui/src/lib/documentation.ts) y la navegación en [DocsView.tsx](../frontend-desktop-ui/src/components/views/DocsView.tsx). Los artículos tienen identificadores estables, categoría, resumen, secciones y guías relacionadas. Hay contenido completo en español e inglés, elegido según el idioma de la app.

## Alcance y fuentes de revisión

Se revisó el contenido contra los controles y servicios actuales, sin utilizar conexiones reales como prueba:

| Temas | Implementación de referencia |
| --- | --- |
| Inicio, carpetas, paneles y accesos | `IdeMenu`, `DesktopLayout`, `WorkspaceChrome` y preferencias de presentación |
| SSH, RDP y transferencias | terminal, `AIChatPanel`, `FileExplorer` y servicio SFTP Windows |
| Proveedores y modelos | `LocalAiSettings` y descubrimiento nativo de modelos |
| Conversación, permisos, tareas y limpieza | `AIChatPanel`, agente de tareas y controles por destino |
| Contexto y privacidad | `TerminalContextSettings` y `TerminalContextStore` |
| Exportación e importación | `LocalBackupSettings` y almacén cifrado de conexiones |
| Versión, actualizaciones y apoyo | `HelpView`, `AppUpdates`, instalador y documentación de distribución |
| Modo empresarial | vistas de informes/administración y dependencia del backend independiente |

La ayuda distingue datos declarados de evidencia comprobada, capturas RDP autorizadas de observación continua, retorno del prompt de código de salida y limpieza del chat de borrado de registros. No promete resolución automática, roles empresariales en modo local ni correo configurado por instalar Windows.

## Mantenimiento

Usar español neutro, sin voseo ni regionalismos, en los artículos y sus controles. Conservar el contenido completo en inglés y no alterar comandos, identificadores técnicos ni contenido del usuario.

Al cambiar una función, revisar su artículo en ambos idiomas, los nombres visibles de los controles y los enlaces relacionados. Mantener pasos, resultados y límites concretos; no insertar instrucciones de compilación en las guías del usuario instalado. No fijar una «última versión» que caduque con cada compilación.

La búsqueda consulta categoría, título, resumen y cuerpo, sin distinguir mayúsculas ni tildes. Todas las palabras deben coincidir en el artículo. Si la selección no coincide con la búsqueda, se muestra el primer resultado; sin coincidencias se ofrece limpiar el filtro. Los enlaces relacionados restablecen el filtro. Cada artículo nuevo comienza arriba y el diseño utiliza desplazamiento por panel sin calcular alturas a partir del viewport.

`npm test` en el frontend verifica paridad de artículos entre idiomas, identificadores y referencias, búsqueda y coherencia de las opciones de contexto documentadas. `npm run build` valida tipos y empaquetado. Estas pruebas no sustituyen probar proveedores, RDP o actualizaciones en sus entornos específicos.
