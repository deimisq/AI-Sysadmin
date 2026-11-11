# Guía de notificaciones de la interfaz

La interfaz utiliza notificaciones breves para informar resultados sin bloquear el trabajo. Las decisiones de seguridad y permisos deben conservar sus controles de autorización; una notificación no sustituye una confirmación.

## Tipos y contenido

- Éxito: confirmar únicamente una operación cuyo resultado se haya comprobado.
- Error: explicar qué falló y cómo continuar, sin incluir secretos ni datos del proveedor sin revisar.
- Información: comunicar estados que no requieren una decisión inmediata.
- Progreso: conservar una vía de consulta o cancelación cuando la operación continúe en el host.

Los textos propios deben usar los catálogos de español e inglés. Los mensajes de servidores, salidas de terminal y conversaciones son datos: no deben traducirse ni interpretarse como instrucciones de la app.

## Accesibilidad y comportamiento

La información importante debe quedar también en el panel o formulario correspondiente. No depender únicamente del color ni de una notificación efímera. Evitar repetir avisos en cada sondeo o mostrar éxito antes de terminar el guardado.

Al fallar una tarea de resultado incierto, no reintentar automáticamente. Pedir revisar su estado y conservar la salida disponible. Limpiar el chat no revoca permisos ni borra el registro de terminal.

## Verificación

Probar resultados correctos, errores y operaciones pendientes con datos sintéticos. Confirmar que la notificación no bloquea terminales, no concede permisos y no incluye credenciales. Consultar la [guía del repositorio](../../AGENTS.md).
