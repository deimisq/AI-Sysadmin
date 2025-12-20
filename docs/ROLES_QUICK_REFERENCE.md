# 🔐 Referencia Rápida de Roles

## Comparación Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPERADMIN 👑                                │
│  ✅ TODO sin restricciones                                      │
│  ✅ Gestión de licencias                                        │
│  ✅ Crear otros superadmins                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN ⚡                                    │
│  ✅ Gestión de usuarios (excepto superadmin)                    │
│  ✅ Gestión completa de servidores                              │
│  ✅ Informes programados                                        │
│  ✅ Logs de auditoría                                           │
│  ✅ Configuración del sistema                                   │
│  ✅ Documentación (crear/editar)                                │
│  ❌ Gestión de licencias                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   GROUP_ADMIN 👥                                │
│  ⚠️  ROL PARCIALMENTE IMPLEMENTADO                             │
│  ✅ Gestión de su grupo específico                              │
│  ✅ Servidores de su grupo                                      │
│  ❌ Crear usuarios                                              │
│  ❌ Panel de administración                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       USER 👤                                   │
│  ✅ Ver servidores de sus grupos                                │
│  ✅ Usar AI Copilot                                             │
│  ✅ Consola SSH (comandos de lectura)                           │
│  ✅ Ver documentación publicada                                 │
│  ❌ Crear/editar/eliminar servidores                            │
│  ❌ Panel de administración                                     │
│  ❌ Informes programados                                        │
│  ❌ Logs de auditoría                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Acceso Rápido por Módulo

| Módulo | SUPER | ADMIN | GROUP_ADMIN | USER |
|--------|:-----:|:-----:|:-----------:|:----:|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ |
| **Agregar Servidores** | ✅ | ✅ | ❌ | ❌ |
| **Gestión Usuarios** | ✅ | ✅ | ❌ | ❌ |
| **Informes Programados** | ✅ | ✅ | ❌ | ❌ |
| **Logs Auditoría** | ✅ | ✅ | ❌ | ❌ |
| **Documentación (editar)** | ✅ | ✅ | ❌ | ❌ |
| **AI Copilot** | ✅ | ✅ | ✅ | ✅ |
| **Consola SSH** | ✅ | ✅ | ✅ | ✅ |
| **Licencias** | ✅ | Ver | ❌ | ❌ |
| **Configuración** | ✅ | ✅ | ❌ | ❌ |

## Cuándo Usar Cada Rol

### 👤 USER
**Para**: Desarrolladores, Operadores, Técnicos  
**Uso**: Monitoreo y diagnóstico de servidores

### 👥 GROUP_ADMIN
**Para**: Team Leads, Project Managers  
**Uso**: Gestión de equipos específicos  
**⚠️ Nota**: Implementación parcial

### ⚡ ADMIN
**Para**: IT Managers, DevOps Leads  
**Uso**: Gestión completa del sistema

### 👑 SUPERADMIN
**Para**: CTO, System Owner  
**Uso**: Gestión total + Licencias

## Endpoints de API Protegidos

### Solo SUPERADMIN
- `POST /api/v1/license/activate`
- `POST /api/v1/license/deactivate`
- `POST /api/v1/license/reactivate`

### SUPERADMIN + ADMIN
- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users`
- `GET /api/v1/audit-logs`
- `GET /api/v1/scheduled-reports`
- `POST /api/v1/documentation/articles` (crear)
- `PUT /api/v1/documentation/articles/:id` (editar)

### Todos los Usuarios Autenticados
- `GET /api/v1/servers` (limitado a sus grupos)
- `POST /api/v1/agent/chat`
- `GET /api/v1/documentation/articles` (solo publicados para users)
- `GET /api/v1/profile`

---

**Ver documentación completa**: [ROLES_AND_PERMISSIONS.md](./ROLES_AND_PERMISSIONS.md)
