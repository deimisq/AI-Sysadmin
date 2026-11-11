# Integración RDP anterior: resumen de la fase 2

Este documento describe la integración anterior basada en Tauri/Rust y Guacamole. No describe el cliente Windows vigente, que usa WPF/WebView2 y el control RDP nativo del sistema. Consultar la [arquitectura actual](architecture/SYSTEM_ARCHITECTURE.md) y la [implementación vigente](IMPLEMENTACION_V3.md).

La fase anterior incorporó un gestor de procesos Guacamole, la detección de guacd o guacamole-lite y un componente de representación del escritorio con entrada de teclado y ratón. Los comandos del puente permitían iniciar, detener y consultar el servicio.

No interpretar el título histórico de fase completada como una prueba actual de funcionamiento en todos los sistemas. Las dependencias y binarios de esa integración requieren su propia revisión antes de reutilizarlos o distribuirlos. El cliente Windows vigente no instala esos servicios para abrir RDP.

Las pruebas de esa implementación deben seguir la [guía Guacamole](TESTING_GUACAMOLE_RDP.md) y usar un laboratorio autorizado. No se debe probar contra equipos reales ni cambiar cortafuegos, credenciales o servicios del usuario como verificación rutinaria.
