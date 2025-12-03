# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

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

### [0.9.1-beta] - Próximo
- Corrección de bugs reportados
- Mejoras en la UI/UX
- Optimización de rendimiento
- Tests unitarios críticos

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
