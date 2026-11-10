# Windows 0.10.0-preview.39

- El formulario de conexiones permite elegir Windows 11, Windows 10 y Windows Server 2025, además de las opciones existentes y el sistema personalizado.
- La IA distingue el perfil configurado de la evidencia observada. El nombre del equipo y el campo de sistema operativo no verifican la versión real ni permiten inferir virtualización. Ante discrepancias debe priorizar la evidencia reciente y señalar la incertidumbre.
- Los errores HTTP de IA distinguen autenticación (401), permisos (403), cuota (429), modelo o endpoint (404) e indisponibilidad del proveedor (500/502/503/504). Un fallo de red o proveedor no elimina la clave guardada. No hay reintento automático de acciones.
- Pruebas con datos sintéticos comprueban conservación de la clave después de errores, reapertura del almacén y cambio de modelo del mismo proveedor.

No cambia el formato de almacenamiento. En RDP, la versión y los recursos reales siguen requiriendo evidencia compartida por el técnico; no hay captura ni detección automática del escritorio.
