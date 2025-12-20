# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [0.9.4-beta] - 2025-12-20

### 🎊 Mejoras de UX y Multi-idioma

#### Agregado
- **Toast Notifications Modernas**: Reemplazo completo de alertas bloqueantes del navegador con notificaciones toast elegantes y no-bloqueantes
  - Sistema de notificaciones usando biblioteca `sonner`
  - Toasts verdes para éxitos, rojos para errores
  - Confirmaciones interactivas con botones Confirm/Cancel
  - Auto-desaparición configurable (3-5 segundos)
  - Soporte para cierre manual con botón X
  - Diseño responsive y compatible con tema oscuro/claro
  - 46 instancias reemplazadas en 11 componentes del frontend
- **Emails de Aprobación Multi-idioma**: Los emails de aprobación ahora se envían en el idioma preferido del usuario
  - Detección automática del idioma del navegador en registro
  - Campo `preferred_language` en modelo de usuario
  - Plantillas de email en español e inglés
  - Variable de entorno `FRONTEND_URL` para links dinámicos de login
  - Preservación del idioma en actualizaciones de usuario

#### Corregido
- **Error 403 en eliminación de usuarios**: Corregida dependencia `get_current_superuser` para verificar campo `role` en lugar del boolean deprecado `is_superuser`
- **Error 500 en panel de admin**: Campo `preferred_language` ahora es opcional en schema de usuario para compatibilidad con usuarios existentes
- **Compilación de frontend en Docker**: Mejorado proceso de build para incluir dependencias de toast correctamente

#### Cambiado
- **Experiencia de usuario mejorada**: Eliminadas todas las alertas bloqueantes del navegador para mejor fluidez
- **Internacionalización de comunicaciones**: Sistema completamente multi-idioma incluye emails automáticos

### Componentes Actualizados con Toast Notifications
- `user-management.tsx` (13 reemplazos)
- `server-management.tsx` (8 reemplazos)
- `login/page.tsx` (2 reemplazos)
- `profile/page.tsx` (4 reemplazos)
- `server-list.tsx` (2 reemplazos)
- `add-server-form.tsx` (2 reemplazos)
- `group-manager.tsx` (2 reemplazos)
- `scheduled-reports.tsx` (1 reemplazo)
- `security-settings.tsx` (2 reemplazos)
- `csv-import.tsx` (2 reemplazos)
- `admin/page.tsx` (1 reemplazo)

### Infraestructura
- Nueva dependencia frontend: `sonner@^2.0.7` para toast notifications
- Schema de BD actualizado: columna `preferred_language` en tabla `users`
- Componente global `Toaster` integrado en layout raíz del frontend

## [0.9.3-beta] - 2025-12-19

### 🚀 Mejoras Principales

#### Agregado
- **Informes de Salud Programados**: Nueva funcionalidad para programar chequeos de salud automáticos de servidores con generación de reportes PDF y envío por email.
  - Soporte para programación diaria, semanal, mensual o expresiones cron personalizadas
  - Selección de servidor individual o grupo de servidores
  - Generación automática de PDF con análisis de IA
  - Comparación con reportes anteriores
  - Envío automático por email con PDF adjunto
- **Navegación desde Sidebar**: Nuevo acceso directo a "Informes Programados" desde el menú lateral del dashboard
- **Demo en Línea**: Los usuarios pueden probar el sistema en testing.sentrait.com.uy sin necesidad de despliegue

#### Corregido
- **Formato de reportes PDF**: El análisis de IA en reportes ahora usa un formato de informe formal sin preguntas interactivas
- **Carga de servidores/grupos**: Corregidos endpoints de API con slashes finales requeridos
- **Conectividad de Docker**: Mejorado manejo de resolución DNS entre contenedores nginx y backend

#### Cambiado
- Servicio de IA con token dinámico: El sistema ahora detecta cambios de token y recarga la configuración automáticamente
- Reportes PDF con estructura profesional: Resumen Ejecutivo, Análisis Detallado, Alertas y Conclusión

### Infraestructura
- Nuevas dependencias: `apscheduler` para tareas programadas, `reportlab` para generación de PDF
- Nuevas tablas de base de datos: `scheduled_health_checks`, `health_check_reports`
- Directorio `/app/reports` para almacenamiento de PDFs generados

## [0.9.2-beta] - 2025-12-17

### 🚀 Mejoras Principales

#### Agregado
- **Interfaz Modular Redimensionable**: Nuevo layout tipo IDE con paneles ajustables (Sidebar, Consola, AI Copilot) para máxima eficiencia de espacio.
- **Bucle de Retroalimentación de IA**: La IA ahora puede ejecutar comandos y leer automáticamente su salida para continuar el diagnóstico sin intervención del usuario.
- **Sidebar Global Redimensionable**: Navegación mejorada con un panel lateral ajustable que optimiza el área de trabajo en todo el sistema.
- **Terminal Interactiva Mejorada**: Soporte optimizado para comandos interactivos y redimensionamiento dinámico de la terminal.

#### Corregido
- **Error de compilación de frontend**: Corregida referencia a función `handleFileClick` faltante y componente `Separator`.
- **Sincronización de Sesión SSH**: Mejorada la estabilidad de las conexiones WebSocket en la consola.
- **Layout en Dashboard**: Eliminada redundancia de elementos de navegación global tras la implementación del nuevo Sidebar.

#### Cambiado
- Estructura de navegación global: Movidos controles de perfil, administración y cerrado de sesión al Sidebar redimensionable.
- Visualización de comandos en chat: Los comandos sugeridos y ejecutados ahora se muestran con mejor contraste y feedback de estado.

## [0.9.1-beta] - 2025-12-05

### 🚀 Mejoras Principales

#### Agregado
- **Soporte para Anthropic API directa**: Configuración simplificada para Claude 3.5 Sonnet usando solo API Key (sin necesidad de AWS)
- **Bedrock con API Key única**: Simplificado el uso de AWS Bedrock para aceptar solo Bearer Token en lugar de Access Key + Secret
- **Textarea multilínea en chat de IA**: Soporte para Shift+Enter (nueva línea) y Enter (enviar mensaje)
- **Adjuntar imágenes en diagnóstico**: Posibilidad de subir capturas de pantalla para dar más contexto a la IA
- **Recarga dinámica de configuración de IA**: Los cambios en la configuración de IA se aplican inmediatamente sin reiniciar

#### Corregido
- **Error 422 al actualizar servidores**: Corregida conversión de `group_id` vacío que causaba validación fallida
- **Error 500 al ejecutar comandos**: Corregido schema `CommandExecutionResponse` para coincidir con el uso real
- **SSH faltante en contenedor**: Instalado `openssh-client` en Docker para permitir conexiones Ansible
- **IA respondiendo sobre temas incorrectos**: Corregido orden de parámetros en `analyze_problem` para priorizar pregunta del usuario
- **Dimensiones de embeddings incorrectas**: Ajustado mock de embeddings de 768 a 1536 dimensiones para compatibilidad con PGVector
- **Validación restrictiva de claves SSH**: Removida validación que impedía guardar claves privadas raw en campo `ssh_key_path`

#### Cambiado
- Frontend: Campo de texto de chat convertido a `textarea` con placeholder mejorado
- Frontend: Interfaz de configuración de IA reorganizada para claridad (Bedrock API Key en lugar de Access + Secret)
- Backend: Servicio de IA ahora soporta configuración dinámica desde base de datos
- Backend: Mejorado manejo de errores de autenticación LLM (401) con mensajes amigables

### Seguridad
- Claves SSH privadas ahora se pueden guardar de forma segura como contenido raw o como ruta de archivo

### Infraestructura
- Instalación de `openssh-client` en imagen Docker del backend
- Agregada librería `langchain-anthropic` para soporte de API directa

## [0.9.0-beta] - 2025-12-03

### 🎉 Primera Release Beta Pública

#### Agregado
- Sistema completo de autenticación con JWT
- Soporte para Microsoft OAuth (configurable)
- Panel de administración con gestión de usuarios
- Sistema RBAC (Control de Acceso Basado en Roles)
- Integración con Gemini AI para diagnósticos inteligentes
- Gestión de servidores vía SSH
- Grupos de servidores para organización
- Chat conversacional con IA para diagnósticos
- Logs de auditoría y operaciones
- Sistema de notificaciones (email SMTP)
- Interfaz multi-idioma (ES/EN)
- Tema claro/oscuro
- Panel de estadísticas del sistema
- Configuración dinámica vía base de datos

#### Seguridad
- Compilación de código Python a bytecode en distribución
- Eliminación de código fuente en imágenes Docker
- Headers de seguridad en Nginx
- Encriptación de credenciales sensibles
- CORS configurado correctamente
- SSL/TLS 1.2+ únicamente

#### Infraestructura
- Docker Compose para despliegue
- PostgreSQL con extensión pgvector
- Migraciones de BD con Alembic
- Nginx como reverse proxy
- Frontend Next.js con standalone build
- Backend FastAPI optimizado

#### Documentación
- Guía de producción completa
- Script de instalación interactivo
- Sitio web de distribución profesional
- README con instrucciones claras

### Conocidos Issues (Para 1.0.0)
- [ ] Integración con Ansible pendiente de testing extensivo
- [ ] Métricas y monitoreo en tiempo real (próxima versión)
- [ ] Soporte para más proveedores OAuth
- [ ] API pública documentada con ejemplos
- [ ] Tests automatizados end-to-end

---

## Roadmap hacia 1.0.0

### [0.9.5-rc] - Release Candidate
- Testing exhaustivo en producción
- Documentación completa de API
- Guías de troubleshooting
- Benchmarks de rendimiento

### [1.0.0] - Stable Release
- Primera versión estable para producción
- Garantía de compatibilidad hacia atrás
- Soporte LTS (Long Term Support)
- Certificación de seguridad

---

## Formato de Versiones

- **MAJOR.MINOR.PATCH-STAGE**
  - MAJOR: Cambios incompatibles con versiones anteriores
  - MINOR: Nueva funcionalidad compatible
  - PATCH: Correcciones de bugs
  - STAGE: alpha | beta | rc | (vacío para stable)

## Tipos de Cambios

- **Agregado**: Nueva funcionalidad
- **Cambiado**: Cambios en funcionalidad existente
- **Deprecado**: Funcionalidad que será removida
- **Removido**: Funcionalidad eliminada
- **Corregido**: Corrección de bugs
- **Seguridad**: Cambios relacionados con vulnerabilidades
