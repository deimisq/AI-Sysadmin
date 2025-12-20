# 🔐 Árbol de Roles y Permisos - AI Sysadmin Agent

## 📋 Índice
1. [Resumen de Roles](#resumen-de-roles)
2. [Árbol Jerárquico](#árbol-jerárquico)
3. [Permisos por Módulo](#permisos-por-módulo)
4. [Matriz de Permisos Detallada](#matriz-de-permisos-detallada)
5. [Casos de Uso por Rol](#casos-de-uso-por-rol)

---

## Resumen de Roles

El sistema implementa **4 roles** con jerarquía decreciente:

```
SUPERADMIN (👑)
    ↓
ADMIN (⚡)
    ↓
GROUP_ADMIN (👥) [No implementado completamente]
    ↓
USER (👤)
```

### 👑 SUPERADMIN (Super Administrador)
**Acceso**: Control total del sistema
- Único rol que puede activar licencias
- Gestión completa de todos los recursos
- Acceso a todos los módulos sin restricciones

### ⚡ ADMIN (Administrador)
**Acceso**: Gestión del sistema (excepto licencias)
- Puede gestionar usuarios (excepto otros admins)
- Gestión completa de servidores y grupos
- Acceso a logs de auditoría
- Configuración de reportes programados

### 👥 GROUP_ADMIN (Administrador de Grupo)
**Acceso**: Gestión de grupos específicos
- **⚠️ ROL DEFINIDO PERO NO IMPLEMENTADO COMPLETAMENTE**
- Permisos limitados a grupos asignados
- No puede crear/eliminar usuarios

### 👤 USER (Usuario)
**Acceso**: Operaciones básicas de lectura
- Ver servidores de sus grupos
- Usar AI Copilot
- Ver documentación publicada
- Ejecutar comandos de solo lectura

---

## Árbol Jerárquico

```
AI Sysadmin Agent
│
├── 👑 SUPERADMIN
│   ├── ✅ Todo lo que puede hacer ADMIN
│   ├── ✅ Activar/Desactivar licencias del sistema
│   ├── ✅ Gestionar otros SUPERADMIN
│   ├── ✅ Reactivar licencias expiradas
│   └── ✅ Acceso completo a configuración global
│
├── ⚡ ADMIN
│   ├── ✅ Todo lo que puede hacer USER
│   ├── ✅ Gestión de Usuarios
│   │   ├── ✅ Crear usuarios (rol: user, group_admin, admin)
│   │   ├── ✅ Editar usuarios (excepto superadmin)
│   │   ├── ✅ Eliminar usuarios (excepto superadmin, admin)
│   │   └── ✅ Ver todos los usuarios
│   │
│   ├── ✅ Gestión de Servidores
│   │   ├── ✅ Crear servidores
│   │   ├── ✅ Editar cualquier servidor
│   │   ├── ✅ Eliminar cualquier servidor
│   │   └── ✅ Ver todos los servidores
│   │
│   ├── ✅ Gestión de Grupos
│   │   ├── ✅ Crear grupos
│   │   ├── ✅ Editar grupos
│   │   ├── ✅ Eliminar grupos
│   │   └── ✅ Asignar usuarios a grupos
│   │
│   ├── ✅ Reportes Programados
│   │   ├── ✅ Crear reportes programados
│   │   ├── ✅ Editar reportes
│   │   ├── ✅ Eliminar reportes
│   │   ├── ✅ Ejecutar reportes manualmente
│   │   └── ✅ Descargar reportes PDF
│   │
│   ├── ✅ Documentación
│   │   ├── ✅ Crear artículos
│   │   ├── ✅ Editar artículos
│   │   ├── ✅ Eliminar artículos
│   │   ├── ✅ Subir imágenes
│   │   └── ✅ Ver borradores
│   │
│   ├── ✅ Logs de Auditoría
│   │   ├── ✅ Ver todos los logs
│   │   ├── ✅ Filtrar por usuario/acción/fecha
│   │   ├── ✅ Exportar a CSV
│   │   └── ✅ Ver estadísticas
│   │
│   ├── ✅ Configuración
│   │   ├── ✅ Parámetros de AI
│   │   ├── ✅ Configuración de Backend
│   │   ├── ✅ Configuración de Frontend
│   │   ├── ✅ Configuración de Comunicaciones
│   │   └── ✅ Configuración de Seguridad
│   │
│   └── ❌ Gestión de Licencias
│       ├── ❌ Activar licencias (solo SUPERADMIN)
│       ├── ✅ Ver estado de licencia
│       └── ✅ Validar licencia
│
├── 👥 GROUP_ADMIN (⚠️ Parcialmente implementado)
│   ├── ⚠️ Ver servidores de grupos asignados
│   ├── ⚠️ Editar servidores de grupos asignados
│   ├── ⚠️ Gestionar su grupo específico
│   ├── ❌ No puede crear usuarios
│   └── ❌ No puede ver logs de auditoría
│
└── 👤 USER
    ├── ✅ Ver Servidores
    │   ├── ✅ Ver servidores de sus grupos
    │   ├── ❌ No puede ver todos los servidores
    │   ├── ❌ No puede crear servidores
    │   └── ❌ No puede eliminar servidores
    │
    ├── ✅ AI Copilot
    │   ├── ✅ Usar AI Copilot en servidores permitidos
    │   ├── ✅ Chat con AI para diagnósticos
    │   └── ✅ Ejecutar comandos sugeridos (con permisos)
    │
    ├── ✅ Consola SSH
    │   ├── ✅ Acceder a consola web
    │   ├── ✅ Ejecutar comandos de lectura
    │   └── ❌ Comandos destructivos bloqueados
    │
    ├── ✅ Documentación
    │   ├── ✅ Ver artículos publicados
    │   ├── ❌ No puede ver borradores
    │   ├── ❌ No puede crear/editar
    │   └── ❌ No puede subir imágenes
    │
    ├── ✅ Perfil
    │   ├── ✅ Ver su perfil
    │   ├── ✅ Editar sus preferencias
    │   └── ✅ Cambiar idioma
    │
    └── ❌ Acceso Denegado
        ├── ❌ Panel de administración
        ├── ❌ Gestión de usuarios
        ├── ❌ Logs de auditoría
        ├── ❌ Reportes programados
        ├── ❌ Configuración del sistema
        └── ❌ Gestión de licencias
```

---

## Permisos por Módulo

### 📊 Dashboard

| Acción | SUPERADMIN | ADMIN | GROUP_ADMIN | USER |
|--------|:----------:|:-----:|:-----------:|:----:|
| Ver dashboard | ✅ | ✅ | ✅ | ✅ |
| Ver todos los servidores | ✅ | ✅ | ⚠️ Solo su grupo | ❌ Solo sus grupos |
| Agregar servidor | ✅ | ✅ | ❌ | ❌ |
| Editar servidor | ✅ | ✅ | ⚠️ Solo su grupo | ❌ |
| Eliminar servidor | ✅ | ✅ | ❌ | ❌ |
| Gestionar grupos | ✅ | ✅ | ⚠️ Solo su grupo | ❌ |

### 👥 Gestión de Usuarios

| Acción | SUPERADMIN | ADMIN | GROUP_ADMIN | USER |
|--------|:----------:|:-----:|:-----------:|:----:|
| Ver usuarios | ✅ | ✅ | ❌ | ❌ |
| Crear usuario | ✅ | ✅ | ❌ | ❌ |
| Editar usuario | ✅ | ✅ Excepto superadmin | ❌ | ❌ |
| Eliminar usuario | ✅ | ✅ Excepto admin/superadmin | ❌ | ❌ |
| Cambiar rol | ✅ | ✅ Limitado | ❌ | ❌ |
| Ver logs de actividad | ✅ | ✅ | ❌ | ❌ |

### 🖥️ Servidores

| Acción | SUPERADMIN | ADMIN | GROUP_ADMIN | USER |
|--------|:----------:|:-----:|:-----------:|:----:|
| Ver servidores | ✅ Todos | ✅ Todos | ⚠️ Su grupo | ✅ Sus grupos |
| Crear servidor | ✅ | ✅ | ❌ | ❌ |
| Editar servidor | ✅ | ✅ | ⚠️ Su grupo | ❌ |
| Eliminar servidor | ✅ | ✅ | ❌ | ❌ |
| Acceder consola SSH | ✅ | ✅ | ✅ | ✅ |
| Ejecutar comandos | ✅ Todos | ✅ Todos | ⚠️ Limitados | ✅ Solo lectura |

### 🤖 AI Copilot

| Acción | SUPERADMIN | ADMIN | GROUP_ADMIN | USER |
|--------|:----------:|:-----:|:-----------:|:----:|
| Usar AI Copilot | ✅ | ✅ | ✅ | ✅ |
| Diagnosticar servidores | ✅ Todos | ✅ Todos | ⚠️ Su grupo | ✅ Sus grupos |
| Ejecutar comandos sugeridos | ✅ | ✅ | ⚠️ Conpermisos | ⚠️ Con permisos |
| Ver historial de chat | ✅ Todos | ✅ Todos | ✅ Propio | ✅ Propio |

### 📅 Informes Programados

| Acción | SUPERADMIN | ADMIN | GROUP_ADMIN | USER |
|--------|:----------:|:-----:|:-----------:|:----:|
| Ver informes | ✅ Todos | ✅ Todos | ✅ Propios | ✅ Propios |
| Crear informe | ✅ | ✅ | ✅ | ✅ |
| Editar informe | ✅ Todos | ✅ Todos | ⚠️ Propios | ⚠️ Propios |
| Eliminar informe | ✅ Todos | ✅ Todos | ⚠️ Propios | ⚠️ Propios |
| Ejecutar manualmente | ✅ Todos | ✅ Todos | ⚠️ Propios | ⚠️ Propios |
| Descargar PDF | ✅ Todos | ✅ Todos | ✅ Propios | ✅ Propios |
| Ver historial | ✅ Todos | ✅ Todos | ✅ Propios | ✅ Propios |

**Nota**: 
- **Dashboard > Informes Programados**: Usuarios ven SOLO sus propios informes
- **Admin > Informes**: Admins ven TODOS los informes del sistema

### 📚 Documentación

| Acción | SUPERADMIN | ADMIN | GROUP_ADMIN | USER |
|--------|:----------:|:-----:|:-----------:|:----:|
| Ver publicados | ✅ | ✅ | ✅ | ✅ |
| Ver borradores | ✅ | ✅ | ❌ | ❌ |
| Crear artículo | ✅ | ✅ | ❌ | ❌ |
| Editar artículo | ✅ | ✅ | ❌ | ❌ |
| Eliminar artículo | ✅ | ✅ | ❌ | ❌ |
| Subir imágenes | ✅ | ✅ | ❌ | ❌ |
| Publicar/Despublicar | ✅ | ✅ | ❌ | ❌ |

### 📝 Logs de Auditoría

| Acción | SUPERADMIN | ADMIN | GROUP_ADMIN | USER |
|--------|:----------:|:-----:|:-----------:|:----:|
| Ver logs | ✅ | ✅ | ❌ | ❌ |
| Filtrar logs | ✅ | ✅ | ❌ | ❌ |
| Exportar CSV | ✅ | ✅ | ❌ | ❌ |
| Ver estadísticas | ✅ | ✅ | ❌ | ❌ |
| Eliminar logs | ❌ | ❌ | ❌ | ❌ |

### ⚙️ Configuración del Sistema

| Acción | SUPERADMIN | ADMIN | GROUP_ADMIN | USER |
|--------|:----------:|:-----:|:-----------:|:----:|
| Ver configuración | ✅ | ✅ | ❌ | ❌ |
| Editar parámetros AI | ✅ | ✅ | ❌ | ❌ |
| Editar backend | ✅ | ✅ | ❌ | ❌ |
| Editar frontend | ✅ | ✅ | ❌ | ❌ |
| Configurar email | ✅ | ✅ | ❌ | ❌ |
| Configurar seguridad | ✅ | ✅ | ❌ | ❌ |

### 🔑 Licencias

| Acción | SUPERADMIN | ADMIN | GROUP_ADMIN | USER |
|--------|:----------:|:-----:|:-----------:|:----:|
| Ver estado | ✅ | ✅ | ❌ | ❌ |
| Activar licencia | ✅ | ❌ | ❌ | ❌ |
| Desactivar licencia | ✅ | ❌ | ❌ | ❌ |
| Reactivar expirada | ✅ | ❌ | ❌ | ❌ |
| Validar licencia | ✅ | ✅ | ❌ | ❌ |

---

## Matriz de Permisos Detallada

### Permisos Definidos en el Sistema

```python
# Permisos de Servidores
VIEW_SERVERS        # Ver servidores
CREATE_SERVERS      # Crear servidores
EDIT_SERVERS        # Editar servidores
DELETE_SERVERS      # Eliminar servidores
EXECUTE_COMMANDS    # Ejecutar comandos

# Permisos de Grupos
VIEW_GROUPS         # Ver grupos
CREATE_GROUPS       # Crear grupos
EDIT_GROUPS         # Editar grupos
DELETE_GROUPS       # Eliminar grupos

# Permisos de Usuarios
VIEW_USERS          # Ver usuarios
CREATE_USERS        # Crear usuarios
EDIT_USERS          # Editar usuarios
DELETE_USERS        # Eliminar usuarios

# Permisos de Documentación
VIEW_DOCUMENTATION     # Ver documentación
CREATE_DOCUMENTATION   # Crear documentación
EDIT_DOCUMENTATION     # Editar documentación
DELETE_DOCUMENTATION   # Eliminar documentación

# Permisos de Sistema
VIEW_LOGS           # Ver logs de auditoría
MANAGE_SYSTEM       # Gestionar sistema
```

### Asignación Automática por Rol

| Permiso | SUPERADMIN | ADMIN | GROUP_ADMIN | USER |
|---------|:----------:|:-----:|:-----------:|:----:|
| **Servidores** |
| VIEW_SERVERS | ✅ Todos | ✅ Todos | ⚠️ Grupo | ⚠️ Grupos |
| CREATE_SERVERS | ✅ | ✅ | ❌ | ❌ |
| EDIT_SERVERS | ✅ | ✅ | ⚠️ Grupo | ❌ |
| DELETE_SERVERS | ✅ | ✅ | ❌ | ❌ |
| EXECUTE_COMMANDS | ✅ Todos | ✅ Todos | ⚠️ Limitado | ⚠️ Lectura |
| **Grupos** |
| VIEW_GROUPS | ✅ | ✅ | ⚠️ Propios | ⚠️ Asignados |
| CREATE_GROUPS | ✅ | ✅ | ❌ | ❌ |
| EDIT_GROUPS | ✅ | ✅ | ⚠️ Propios | ❌ |
| DELETE_GROUPS | ✅ | ✅ | ❌ | ❌ |
| **Usuarios** |
| VIEW_USERS | ✅ | ✅ | ❌ | ❌ |
| CREATE_USERS | ✅ | ✅ | ❌ | ❌ |
| EDIT_USERS | ✅ | ⚠️ No admin/super | ❌ | ❌ |
| DELETE_USERS | ✅ | ⚠️ Solo users | ❌ | ❌ |
| **Documentación** |
| VIEW_DOCUMENTATION | ✅ | ✅ | ✅ | ✅ |
| CREATE_DOCUMENTATION | ✅ | ✅ | ❌ | ❌ |
| EDIT_DOCUMENTATION | ✅ | ✅ | ❌ | ❌ |
| DELETE_DOCUMENTATION | ✅ | ✅ | ❌ | ❌ |
| **Sistema** |
| VIEW_LOGS | ✅ | ✅ | ❌ | ❌ |
| MANAGE_SYSTEM | ✅ | ✅ | ❌ | ❌ |

---

## Casos de Uso por Rol

### 👤 Usuario Normal (USER)

**Escenario**: Desarrollador que necesita monitorear servidores

**Puede hacer**:
- ✅ Ver estado de servidores de su equipo
- ✅ Usar AI Copilot para diagnósticos
- ✅ Acceder a consola SSH (comandos de lectura)
- ✅ Ver documentación del sistema
- ✅ Cambiar idioma de la interfaz

**No puede hacer**:
- ❌ Agregar o eliminar servidores
- ❌ Ver servidores de otros equipos
- ❌ Acceder a configuración del sistema
- ❌ Ver logs de auditoría
- ❌ Crear reportes programados

### 👥 Administrador de Grupo (GROUP_ADMIN)

**Escenario**: Team Lead que gestiona su equipo

**Puede hacer**:
- ✅ Ver y gestionar servidores de su grupo
- ✅ Asignar usuarios a su grupo
- ✅ Configurar permisos dentro de su grupo
- ✅ Usar todas las funciones de usuario

**No puede hacer**:
- ❌ Ver servidores de otros grupos
- ❌ Crear nuevos usuarios en el sistema
- ❌ Acceder a panel de admin
- ❌ Gestionar licencias

⚠️ **Nota**: Este rol está parcialmente implementado

### ⚡ Administrador (ADMIN)

**Escenario**: IT Manager que gestiona la infraestructura

**Puede hacer**:
- ✅ Gestión completa de usuarios (excepto superadmin)
- ✅ Gestión completa de servidores y grupos
- ✅ Configurar reportes programados
- ✅ Acceder a logs de auditoría
- ✅ Configurar parámetros del sistema
- ✅ Crear y editar documentación

**No puede hacer**:
- ❌ Activar/desactivar licencias
- ❌ Modificar otros administradores
- ❌ Eliminar superadministradores

### 👑 Super Administrador (SUPERADMIN)

**Escenario**: CTO o responsable del sistema completo

**Puede hacer**:
- ✅ **TODO** lo que puede hacer un ADMIN
- ✅ Activar y gestionar licencias del sistema
- ✅ Crear otros superadministradores
- ✅ Modificar cualquier usuario incluyendo admins
- ✅ Acceso sin restricciones a toda la configuración

**Responsabilidades especiales**:
- Gestión de licencias
- Configuración crítica del sistema
- Auditoría de seguridad
- Backup y recuperación

---

## Recomendaciones de Asignación de Roles

### ✅ Mejores Prácticas

1. **Principio de Menor Privilegio**
   - Asigna el rol mínimo necesario
   - Revisa permisos periódicamente

2. **Asignación Típica**:
   - **1-2 SUPERADMIN**: Fundadores, CTO
   - **2-5 ADMIN**: IT Managers, DevOps Leads
   - **5-10 GROUP_ADMIN**: Team Leads, Project Managers
   - **Resto USER**: Desarrolladores, Operadores

3. **Rotación de Roles**:
   - Revisar trimestralmente
   - Revocar al cambiar de puesto
   - Auditar accesos regularmente

4. **Seguridad**:
   - No compartir credenciales de admin
   - Activar 2FA para admins (cuando esté disponible)
   - Revisar logs de auditoría semanalmente

---

## Notas Importantes

⚠️ **Limitaciones Actuales**:
1. El rol `GROUP_ADMIN` está definido pero no completamente implementado
2. No hay control granular de permisos por grupo todavía
3. Los permisos son a nivel de aplicación, no de base de datos

✨ **Mejoras Futuras**:
1. Implementación completa de GROUP_ADMIN
2. Permisos granulares por servidor
3. Roles personalizados
4. Sistema de aprobaciones para acciones críticas

---

**Última actualización**: 2025-12-20  
**Versión del sistema**: 0.9.4-beta14
