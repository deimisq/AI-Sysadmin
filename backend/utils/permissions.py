from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
import models
from models import RoleType, PermissionType

def has_permission(user: models.User, permission: PermissionType, resource_id: int = None, db: Session = None) -> bool:
    """Check if user has a specific permission"""
    
    # Superusers have all permissions
    if user.is_superuser or user.role == RoleType.SUPERADMIN.value:
        return True
    
    # Admin role has most permissions except system management
    if user.role == RoleType.ADMIN.value:
        admin_permissions = [
            PermissionType.VIEW_SERVERS, PermissionType.CREATE_SERVERS,
            PermissionType.EDIT_SERVERS, PermissionType.DELETE_SERVERS,
            PermissionType.VIEW_GROUPS, PermissionType.CREATE_GROUPS,
            PermissionType.EDIT_GROUPS, PermissionType.DELETE_GROUPS,
            PermissionType.VIEW_USERS, PermissionType.CREATE_USERS,
            PermissionType.EDIT_USERS, PermissionType.VIEW_LOGS,
            PermissionType.EXECUTE_COMMANDS
        ]
        return permission in admin_permissions
    
    # Group admin permissions
    if user.role == RoleType.GROUP_ADMIN.value:
        group_admin_permissions = [
            PermissionType.VIEW_SERVERS, PermissionType.CREATE_SERVERS,
            PermissionType.EDIT_SERVERS, PermissionType.VIEW_GROUPS,
            PermissionType.EXECUTE_COMMANDS
        ]
        return permission in group_admin_permissions
    
    # Regular users can only view
    if user.role == RoleType.USER.value:
        user_permissions = [
            PermissionType.VIEW_SERVERS, PermissionType.VIEW_GROUPS,
            PermissionType.EXECUTE_COMMANDS
        ]
        return permission in user_permissions
    
    return False

def can_access_server(user: models.User, server: models.Server, db: Session) -> bool:
    """Check if user can access a specific server"""
    
    # Superusers and admins can access all servers
    if user.is_superuser or user.role in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        return True
    
    # If server has no group, only admins can access
    if not server.group_id:
        return False
    
    # Check if user has permission for this server's group
    user_group = db.query(models.UserGroupPermission).filter(
        and_(
            models.UserGroupPermission.user_id == user.id,
            models.UserGroupPermission.group_id == server.group_id
        )
    ).first()
    
    return user_group is not None

def can_access_group(user: models.User, group_id: int, db: Session) -> bool:
    """Check if user can access a specific group"""
    
    # Superusers and admins can access all groups
    if user.is_superuser or user.role in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        return True
    
    # Check if user has permission for this group
    user_group = db.query(models.UserGroupPermission).filter(
        and_(
            models.UserGroupPermission.user_id == user.id,
            models.UserGroupPermission.group_id == group_id
        )
    ).first()
    
    return user_group is not None

def require_permission(permission: PermissionType):
    """Decorator to require a specific permission"""
    def decorator(func):
        async def wrapper(*args, current_user: models.User = None, db: Session = None, **kwargs):
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated"
                )
            
            if not has_permission(current_user, permission, db=db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {permission.value}"
                )
            
            return await func(*args, current_user=current_user, db=db, **kwargs)
        return wrapper
    return decorator

def require_role(required_role: RoleType):
    """Decorator to require a specific role"""
    def decorator(func):
        async def wrapper(*args, current_user: models.User = None, **kwargs):
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated"
                )
            
            if current_user.role != required_role.value and not current_user.is_superuser:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role required: {required_role.value}"
                )
            
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

def get_user_accessible_groups(user: models.User, db: Session) -> list:
    """Get all groups a user has access to"""
    
    # Superusers and admins can access all groups
    if user.is_superuser or user.role in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        return db.query(models.ServerGroup).all()
    
    # Get groups user has explicit permission for
    user_groups = db.query(models.ServerGroup).join(
        models.UserGroupPermission,
        models.ServerGroup.id == models.UserGroupPermission.group_id
    ).filter(
        models.UserGroupPermission.user_id == user.id
    ).all()
    
    return user_groups

def get_user_accessible_servers(user: models.User, db: Session) -> list:
    """Get all servers a user has access to"""
    
    # Superusers and admins can access all servers
    if user.is_superuser or user.role in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        return db.query(models.Server).all()
    
    # Get accessible groups
    accessible_groups = get_user_accessible_groups(user, db)
    group_ids = [g.id for g in accessible_groups]
    
    # Get servers in those groups
    servers = db.query(models.Server).filter(
        models.Server.group_id.in_(group_ids)
    ).all()
    
    return servers
