# Sistema de Control de Acceso Basado en Roles (RBAC)

## Resumen
El Agente Sysadmin AI ahora incluye un sistema RBAC completo que permite un control granular sobre los permisos de usuario y el acceso a servidores y grupos.

## Roles

### Roles Globales
1. **Superadmin** (`superadmin`)
   - Acceso total al sistema
   - Puede gestionar todos los usuarios, grupos y servidores
   - Puede acceder a la configuración del sistema
   - No puede ser restringido

2. **Admin** (`admin`)
   - Puede gestionar usuarios y grupos
   - Puede ver y gestionar todos los servidores
   - Puede ver registros de auditoría
   - No puede gestionar la configuración del sistema

3. **Group Admin** (`group_admin`)
   - Puede gestionar servidores dentro de los grupos asignados
   - Puede crear/editar servidores en sus grupos
   - Puede ejecutar comandos en sus servidores
   - No puede gestionar usuarios

4. **User** (`user`)
   - Puede ver servidores en los grupos asignados
   - Puede ejecutar comandos (si se permite)
   - No puede crear o modificar servidores
   - Acceso de solo lectura

## Permisos

### Permisos de Servidor
- `view_servers` - Ver lista y detalles de servidores
- `create_servers` - Agregar nuevos servidores
- `edit_servers` - Modificar configuración de servidores
- `delete_servers` - Eliminar servidores
- `execute_commands` - Ejecutar comandos en servidores

### Permisos de Grupo
- `view_groups` - Ver lista de grupos
- `create_groups` - Crear nuevos grupos
- `edit_groups` - Modificar configuración de grupos
- `delete_groups` - Eliminar grupos

### Permisos de Usuario
- `view_users` - Ver lista de usuarios
- `create_users` - Agregar nuevos usuarios
- `edit_users` - Modificar detalles de usuario
- `delete_users` - Eliminar usuarios

### Permisos del Sistema
- `view_logs` - Ver registros de operaciones y auditoría
- `manage_system` - Configuración del sistema

## Matriz de Permisos

| Permiso | Superadmin | Admin | Group Admin | User |
|-----------|-----------|-------|-------------|------|
| Ver Servidores | ✅ Todos | ✅ Todos | ✅ Asignados | ✅ Asignados |
| Crear Servidores | ✅ | ✅ | ✅ En grupos | ❌ |
| Editar Servidores | ✅ | ✅ | ✅ En grupos | ❌ |
| Eliminar Servidores | ✅ | ✅ | ❌ | ❌ |
| Ejecutar Comandos | ✅ | ✅ | ✅ | ✅ |
| Ver Grupos | ✅ | ✅ | ✅ Asignados | ✅ Asignados |
| Crear Grupos | ✅ | ✅ | ❌ | ❌ |
| Editar Grupos | ✅ | ✅ | ❌ | ❌ |
| Eliminar Grupos | ✅ | ✅ | ❌ | ❌ |
| Ver Usuarios | ✅ | ✅ | ❌ | ❌ |
| Crear Usuarios | ✅ | ✅ | ❌ | ❌ |
| Editar Usuarios | ✅ | ✅ | ❌ | ❌ |
| Eliminar Usuarios | ✅ | ❌ | ❌ | ❌ |
| Ver Logs | ✅ | ✅ | ❌ | ❌ |
| Gestionar Sistema | ✅ | ❌ | ❌ | ❌ |

## Permisos a Nivel de Grupo

Los usuarios pueden ser asignados a grupos de servidores específicos con diferentes roles:
- Un usuario puede tener acceso a múltiples grupos
- Cada asignación de grupo puede tener un rol diferente
- Los permisos a nivel de grupo anulan los permisos globales para ese grupo

### Escenarios de Ejemplo

1. **Acceso de Desarrollador**:
   - Rol Global: `user`
   - Asignación de Grupo: Servidores de Desarrollo (rol: `group_admin`)
   - Resultado: Puede gestionar servidores de desarrollo, solo lectura para otros

2. **Equipo de Operaciones**:
   - Rol Global: `admin`
   - Resultado: Acceso total a todos los servidores y grupos

3. **Consultor Externo**:
   - Rol Global: `user`
   - Asignación de Grupo: Servidores Cliente A (rol: `user`)
   - Resultado: Acceso de solo lectura a los servidores del Cliente A

## Endpoints de la API

### Gestión de Usuarios
```
GET    /api/v1/admin/users              # Listar todos los usuarios
GET    /api/v1/admin/users/{id}         # Obtener detalles de usuario
PUT    /api/v1/admin/users/{id}         # Actualizar usuario
DELETE /api/v1/admin/users/{id}         # Eliminar usuario (solo superadmin)
```

### Permisos de Grupo
```
POST   /api/v1/admin/users/{id}/groups/{gid}/grant   # Otorgar acceso a grupo
DELETE /api/v1/admin/users/{id}/groups/{gid}/revoke  # Revocar acceso a grupo
GET    /api/v1/admin/users/{id}/groups                # Obtener grupos del usuario
```

### Auditoría y Estadísticas
```
GET    /api/v1/admin/audit-logs         # Ver logs de auditoría
GET    /api/v1/admin/stats               # Estadísticas del sistema
```

## Registro de Auditoría

Todas las acciones administrativas se registran en la tabla `audit_logs`:
- Creación/modificación/eliminación de usuarios
- Cambios de permisos de grupo
- Modificaciones de servidores
- Cambios de rol
- Rastreo de dirección IP
- Contexto detallado de la acción

### Campos del Log de Auditoría
- `user_id` - Quién realizó la acción
- `action` - Qué se hizo
- `resource_type` - Qué fue afectado (usuario, servidor, grupo)
- `resource_id` - ID del recurso específico
- `details` - JSON con contexto adicional
- `ip_address` - IP de origen
- `created_at` - Marca de tiempo

## Esquema de Base de Datos

### user_group_permissions
```sql
CREATE TABLE user_group_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES server_groups(id) ON DELETE CASCADE,
    role VARCHAR DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### audit_logs
```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR NOT NULL,
    resource_type VARCHAR NOT NULL,
    resource_id INTEGER,
    details JSON,
    ip_address VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Ejemplos de Uso

### Backend Python
```python
from utils.permissions import has_permission, can_access_server
from models import PermissionType

# Verificar permiso
if has_permission(user, PermissionType.CREATE_SERVERS):
    # Permitir creación de servidor
    pass

# Verificar acceso a servidor
if can_access_server(user, server, db):
    # Permitir acceso al servidor
    pass
```

### Otorgar Acceso a Grupo
```bash
curl -X POST http://localhost:8000/api/v1/admin/users/2/groups/1/grant \
  -H "Authorization: Bearer <admin_token>" \
  -d "role=group_admin"
```

### Ver Grupos del Usuario
```bash
curl http://localhost:8000/api/v1/admin/users/2/groups \
  -H "Authorization: Bearer <token>"
```

## Consideraciones de Seguridad

1. **Principio de Mínimo Privilegio**: A los usuarios se les debe asignar el rol mínimo necesario
2. **Auditorías Regulares**: Revisar los logs de auditoría regularmente en busca de actividad sospechosa
3. **Separación de Roles**: Evitar dar superadmin a usuarios a menos que sea absolutamente necesario
4. **Aislamiento de Grupos**: Usar grupos para aislar servidores sensibles
5. **Revisión de Permisos**: Revisar periódicamente los permisos de usuario

## Implementación Frontend

El sistema RBAC está completamente integrado en la interfaz frontend:

### Panel de Administración (`/admin`)
Accesible solo para usuarios con roles `admin` o `superadmin`.
- **Gestión de Usuarios**: Ver, editar y eliminar usuarios.
- **Permisos de Grupo**: Asignar usuarios a grupos de servidores específicos con roles personalizados.
- **Estadísticas del Sistema**: Ver estadísticas del sistema en tiempo real.
- **Logs de Auditoría**: Explorar registros detallados de acciones administrativas.

### Perfil de Usuario (`/profile`)
Accesible para todos los usuarios autenticados.
- **Información Personal**: Actualizar email, nombre de usuario y nombre completo.
- **Seguridad**: Cambiar contraseña.
- **Rol y Estado**: Ver rol actual y estado de la cuenta.
- **Grupos Asignados**: Ver lista de grupos de servidores accesibles.

### Integración en Dashboard
- **Navegación Basada en Roles**: 
  - Botón "Admin" solo visible para administradores.
  - Botón "Perfil" para acceso rápido a la configuración.
- **Indicadores Visuales**: Insignias de rol mostradas en listas de usuarios y perfiles.

## Mejoras Futuras

- [ ] Permisos basados en tiempo (acceso temporal)
- [ ] Restricciones basadas en IP
- [ ] Autenticación multifactor para acciones sensibles
- [ ] Plantillas de permisos
- [ ] Gestión de permisos en masa
- [ ] Roles personalizados con conjuntos de permisos específicos
- [ ] Flujos de aprobación para operaciones sensibles
