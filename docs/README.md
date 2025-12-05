# Documentación del Proyecto - AI Sysadmin Agent

Este directorio contiene toda la documentación técnica y operativa del proyecto.

## 📚 Índice de Documentación

### Desarrollo y Arquitectura

- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Guía completa para desarrolladores
  - Estructura del proyecto
  - Cómo contribuir
  - Convenciones de código
  - Setup de entorno de desarrollo

- **[API_REFERENCE.md](./API_REFERENCE.md)** - Referencia completa de la API REST
  - Endpoints disponibles
  - Esquemas de request/response
  - Ejemplos de uso

- **[AUTHENTICATION.md](./AUTHENTICATION.md)** - Sistema de autenticación
  - JWT tokens
  - OAuth (Microsoft)
  - Flujo de autenticación

- **[RBAC.md](./RBAC.md)** - Control de Acceso Basado en Roles
  - Roles disponibles (Superadmin, Admin, SysOps, Viewer)
  - Permisos por rol
  - Gestión de usuarios

### Producción y Despliegue

- **[PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md)** - Guía para desplegar en producción
  - Requisitos del servidor
  - Configuración de seguridad
  - SSL/TLS
  - Variables de entorno

- **[RELEASE_PROCESS.md](./RELEASE_PROCESS.md)** - Proceso completo de release
  - Versionado semántico
  - Compilación y empaquetado
  - Publicación en sitio de distribución
  - Checklist de release

### Instalación y Actualización

- **[INSTALLER_CHANGELOG.md](./INSTALLER_CHANGELOG.md)** - Historial de cambios del instalador
  - Mejoras por versión
  - Bugs corregidos
  - Nuevas funcionalidades

- **[INSTALLER_TROUBLESHOOTING.md](./INSTALLER_TROUBLESHOOTING.md)** - Troubleshooting del instalador
  - Errores comunes
  - Soluciones paso a paso
  - FAQ

### Troubleshooting y Soporte

- **[TROUBLESHOOTING_REPORT.md](](./TROUBLESHOOTING_REPORT.md)** - Reporte de troubleshooting
  - Problemas conocidos
  - Soluciones aplicadas
  - Tips de debugging

### Planificación

- **[ROADMAP.md](./ROADMAP.md)** - Roadmap del proyecto
  - Funcionalidades planificadas
  - Prioridades
  - Timeline estimado

- **[technical_requirements.md](./technical_requirements.md)** - Requisitos técnicos originales
  - Especificaciones funcionales
  - Requisitos no funcionales
  - Casos de uso

### Sitio de Distribución

- **[DISTRIBUTION_SITE.md](./DISTRIBUTION_SITE.md)** - Documentación del sitio de distribución
  - Estructura del sitio
  - Actualización de versiones
  - CDN y hosting

### Sesiones y Fixes

- **[SESSION_SUMMARY.md](./SESSION_SUMMARY.md)** - Resumen de sesiones de desarrollo
- **[FIXES_SUMMARY.md](./FIXES_SUMMARY.md)** - Resumen de fixes aplicados

---

## 🗂️ Estructura del Proyecto

```
ai_agent/
├── backend/              # Backend FastAPI
├── frontend/             # Frontend Next.js
├── nginx/                # Configuración de Nginx
├── docs/                 # Documentación (este directorio)
├── scripts/              # Scripts de automatización
│   ├── package_release.sh
│   └── setup.sh
├── .github/              # GitHub Actions y configuración
├── CHANGELOG.md          # Historial de cambios por versión
├── README.md             # README principal del proyecto
├── LICENSE               # Licencia del proyecto
└── VERSION.json          # Versión actual
```

---

## 🔄 Mantener la Documentación

### Al Agregar Nueva Funcionalidad

1. Actualizar `CHANGELOG.md` en la raíz del proyecto
2. Actualizar `API_REFERENCE.md` si añades nuevos endpoints
3. Actualizar `DEVELOPER_GUIDE.md` si cambias la arquitectura
4. Actualizar `README.md` si afecta la instalación o uso básico

### Al Hacer un Release

1. Actualizar `VERSION.json` en la raíz
2. Actualizar `CHANGELOG.md`
3. Seguir el proceso documentado en `RELEASE_PROCESS.md`

### Al Encontrar un Bug

1. Documentar en `TROUBLESHOOTING_REPORT.md` si es un problema conocido
2. Actualizar `FIXES_SUMMARY.md` cuando lo resuelvas

---

## 📖 Lectura Recomendada para Nuevos Desarrolladores

1. **Primero**: [README.md](../README.md) - Descripción general del proyecto
2. **Segundo**: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Setup y convenciones
3. **Tercero**: [PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md) - Entender el despliegue
4. **Cuarto**: [API_REFERENCE.md](./API_REFERENCE.md) - Familiarizarte con la API

---

## 📝 Contacto y Contribuciones

Para contribuir al proyecto, consulta `DEVELOPER_GUIDE.md`.

Para reportar bugs o sugerir mejoras, crea un issue en GitHub.

---

**Última actualización**: 2025-12-05  
**Versión del proyecto**: 0.9.1-beta10
