# Role-Based Access Control (RBAC) System

## Overview
The AI Sysadmin Agent now includes a comprehensive RBAC system that allows fine-grained control over user permissions and access to servers and groups.

## Roles

### Global Roles
1. **Superadmin** (`superadmin`)
   - Full system access
   - Can manage all users, groups, and servers
   - Can access system settings
   - Cannot be restricted

2. **Admin** (`admin`)
   - Can manage users and groups
   - Can view and manage all servers
   - Can view audit logs
   - Cannot manage system settings

3. **Group Admin** (`group_admin`)
   - Can manage servers within assigned groups
   - Can create/edit servers in their groups
   - Can execute commands on their servers
   - Cannot manage users

4. **User** (`user`)
   - Can view servers in assigned groups
   - Can execute commands (if permitted)
   - Cannot create or modify servers
   - Read-only access

## Permissions

### Server Permissions
- `view_servers` - View server list and details
- `create_servers` - Add new servers
- `edit_servers` - Modify server configuration
- `delete_servers` - Remove servers
- `execute_commands` - Run commands on servers

### Group Permissions
- `view_groups` - View group list
- `create_groups` - Create new groups
- `edit_groups` - Modify group settings
- `delete_groups` - Remove groups

### User Permissions
- `view_users` - View user list
- `create_users` - Add new users
- `edit_users` - Modify user details
- `delete_users` - Remove users

### System Permissions
- `view_logs` - View operation and audit logs
- `manage_system` - System configuration

## Permission Matrix

| Permission | Superadmin | Admin | Group Admin | User |
|-----------|-----------|-------|-------------|------|
| View Servers | ✅ All | ✅ All | ✅ Assigned | ✅ Assigned |
| Create Servers | ✅ | ✅ | ✅ In groups | ❌ |
| Edit Servers | ✅ | ✅ | ✅ In groups | ❌ |
| Delete Servers | ✅ | ✅ | ❌ | ❌ |
| Execute Commands | ✅ | ✅ | ✅ | ✅ |
| View Groups | ✅ | ✅ | ✅ Assigned | ✅ Assigned |
| Create Groups | ✅ | ✅ | ❌ | ❌ |
| Edit Groups | ✅ | ✅ | ❌ | ❌ |
| Delete Groups | ✅ | ✅ | ❌ | ❌ |
| View Users | ✅ | ✅ | ❌ | ❌ |
| Create Users | ✅ | ✅ | ❌ | ❌ |
| Edit Users | ✅ | ✅ | ❌ | ❌ |
| Delete Users | ✅ | ❌ | ❌ | ❌ |
| View Logs | ✅ | ✅ | ❌ | ❌ |
| Manage System | ✅ | ❌ | ❌ | ❌ |

## Group-Level Permissions

Users can be assigned to specific server groups with different roles:
- A user can have access to multiple groups
- Each group assignment can have a different role
- Group-level permissions override global permissions for that group

### Example Scenarios

1. **Developer Access**:
   - Global Role: `user`
   - Group Assignment: Development Servers (role: `group_admin`)
   - Result: Can manage dev servers, view-only for others

2. **Operations Team**:
   - Global Role: `admin`
   - Result: Full access to all servers and groups

3. **External Consultant**:
   - Global Role: `user`
   - Group Assignment: Client A Servers (role: `user`)
   - Result: View-only access to Client A servers

## API Endpoints

### User Management
```
GET    /api/v1/admin/users              # List all users
GET    /api/v1/admin/users/{id}         # Get user details
PUT    /api/v1/admin/users/{id}         # Update user
DELETE /api/v1/admin/users/{id}         # Delete user (superadmin only)
```

### Group Permissions
```
POST   /api/v1/admin/users/{id}/groups/{gid}/grant   # Grant group access
DELETE /api/v1/admin/users/{id}/groups/{gid}/revoke  # Revoke group access
GET    /api/v1/admin/users/{id}/groups                # Get user's groups
```

### Audit & Stats
```
GET    /api/v1/admin/audit-logs         # View audit logs
GET    /api/v1/admin/stats               # System statistics
```

## Audit Logging

All administrative actions are logged in the `audit_logs` table:
- User creation/modification/deletion
- Group permission changes
- Server modifications
- Role changes
- IP address tracking
- Detailed action context

### Audit Log Fields
- `user_id` - Who performed the action
- `action` - What was done
- `resource_type` - What was affected (user, server, group)
- `resource_id` - Specific resource ID
- `details` - JSON with additional context
- `ip_address` - Source IP
- `created_at` - Timestamp

## Database Schema

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

## Usage Examples

### Python Backend
```python
from utils.permissions import has_permission, can_access_server
from models import PermissionType

# Check permission
if has_permission(user, PermissionType.CREATE_SERVERS):
    # Allow server creation
    pass

# Check server access
if can_access_server(user, server, db):
    # Allow access to server
    pass
```

### Grant Group Access
```bash
curl -X POST http://localhost:8000/api/v1/admin/users/2/groups/1/grant \
  -H "Authorization: Bearer <admin_token>" \
  -d "role=group_admin"
```

### View User's Groups
```bash
curl http://localhost:8000/api/v1/admin/users/2/groups \
  -H "Authorization: Bearer <token>"
```

## Security Considerations

1. **Principle of Least Privilege**: Users should be assigned the minimum role necessary
2. **Regular Audits**: Review audit logs regularly for suspicious activity
3. **Role Separation**: Avoid giving users superadmin unless absolutely necessary
4. **Group Isolation**: Use groups to isolate sensitive servers
5. **Permission Review**: Periodically review user permissions

## Frontend Implementation

The RBAC system is fully integrated into the frontend interface:

### Admin Panel (`/admin`)
Accessible only to users with `admin` or `superadmin` roles.
- **User Management**: View, edit, and delete users.
- **Group Permissions**: Assign users to specific server groups with custom roles.
- **System Stats**: View real-time system statistics.
- **Audit Logs**: Browse detailed logs of administrative actions.

### User Profile (`/profile`)
Accessible to all authenticated users.
- **Personal Info**: Update email, username, and full name.
- **Security**: Change password.
- **Role & Status**: View current role and account status.
- **Assigned Groups**: View list of accessible server groups.

### Dashboard Integration
- **Role-Based Navigation**: 
  - "Admin" button only visible to administrators.
  - "Profile" button for quick access to settings.
- **Visual Indicators**: Role badges displayed in user lists and profiles.

## Future Enhancements

- [ ] Time-based permissions (temporary access)
- [ ] IP-based restrictions
- [ ] Multi-factor authentication for sensitive actions
- [ ] Permission templates
- [ ] Bulk permission management
- [ ] Custom roles with specific permission sets
- [ ] Approval workflows for sensitive operations
