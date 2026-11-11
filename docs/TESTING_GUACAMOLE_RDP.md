# Pruebas de la integración Guacamole anterior

Esta guía corresponde al componente anterior Tauri/Guacamole. El cliente Windows vigente usa RDP nativo y no necesita guacd ni guacamole-lite. Consultar [arquitectura](architecture/SYSTEM_ARCHITECTURE.md).

## Preparación

Usar una máquina de laboratorio autorizada y credenciales sintéticas. Revisar los manifiestos de la implementación anterior y las versiones resueltas de sus dependencias. No asumir que los servicios estén instalados ni habilitar puertos en un equipo real del usuario.

## Comprobaciones

- Confirmar que el servicio Guacamole de laboratorio inicia y escucha únicamente donde corresponde.
- Comprobar la conexión WebSocket y el estado informado al componente de escritorio.
- Verificar la representación de pantalla, teclado, ratón, cambio de tamaño y desconexión.
- Probar credenciales incorrectas y servidor no disponible sin mostrar contraseñas en logs.
- Cerrar la sesión y comprobar que los procesos auxiliares propios se detienen; no finalizar procesos ajenos.

Registrar plataforma, versiones y resultados observados. La existencia de cuadros simulados o una compilación satisfactoria no demuestra una conexión RDP real. No publicar registros con nombres de clientes, direcciones privadas ni capturas sensibles.

## Cliente vigente

Las pruebas automáticas del cliente actual están en [apps/windows.Tests](../apps/windows.Tests). La IA en RDP no recibe pantalla automáticamente: cada imagen debe revisarse y autorizarse para una consulta concreta. La cancelación de una captura no debe recurrir a capturar el monitor local.
