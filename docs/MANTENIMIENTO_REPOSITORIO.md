# Revisión de estructura y limpieza

## Componentes que se conservan

- `apps/windows` y `frontend-desktop-ui`: cliente Windows vigente y sus dos entradas Vite, espacio de trabajo y preferencias.
- `apps/windows.Tests` y `apps/windows.SmokeTests`: pruebas nativas, integración sintética y comprobaciones de empaquetado.
- `backend` y `frontend-web`: servicios e interfaz empresarial con workflows propios. No son dependencias del inventario local, pero tampoco archivos sobrantes.
- `legacy-tauri-desktop`: implementación anterior identificada como tal; no se distribuye con el instalador Windows. Retirarla por completo requiere una decisión de compatibilidad separada.
- `docs/archive` y guías históricas: referencias de decisiones anteriores; no certifican el comportamiento actual.

## Limpieza realizada

Se comprobó la resolución de imports estáticos y dinámicos con TypeScript desde `src/main.tsx` y `src/preferences.tsx`, las dos entradas declaradas en Vite. Los antiguos envoltorios de rutas de administración, consola, dashboard, documentación, perfil e informes no eran alcanzables. Se retiraron junto con el contexto y la barra de pestañas antiguos, utilizados solo por aquella consola. Las vistas actuales siguen accesibles desde `OverlayContainer`; la documentación integrada no se elimina.

Se retiraron las pantallas manuales de prueba SSH/RDP y el acceso de prueba del dashboard. Su botón de consola ahora utiliza `workspaceStore.openTab`, como el catálogo vigente, en lugar de navegar a una ruta no registrada.

También se retiraron siete esquemas generados de Tauri que eran los únicos archivos versionados de `frontend` y `frontend-desktop`, y el script de migración V2 sin referencias vigentes, que copiaba y movía rutas de una migración ya terminada. Git excluye los esquemas regenerados y la caché de pytest. No se eliminaron datos locales, entornos, credenciales ni paquetes del usuario.

## Criterio para siguientes revisiones

Antes de retirar código, comprobar imports, rutas, entradas de compilación, workflows, scripts y consumidores compartidos. No confundir nombres antiguos con falta de uso: por ejemplo, `LegacyTerminal` sigue siendo el fallback del cliente y `admin-layout` contiene controles usados por Administración.

La limpieza no equivale a una auditoría completa de seguridad, rendimiento o compatibilidad con todos los servidores y proveedores. Las verificaciones proporcionadas para esta entrega son las pruebas frontend, el análisis de tipos y el empaquetado Vite; CI ejecuta además las comprobaciones y distribución Windows.
