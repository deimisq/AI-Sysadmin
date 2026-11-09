from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
import models
from models import RoleType, PermissionType
from utils.access import require_server_access, require_group_access, server_query, is_global_admin

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
    try:
        require_server_access(user, server, db)
        return True
    except HTTPException:
        return False

def can_access_group(user: models.User, group_id: int, db: Session) -> bool:
    try:
        require_group_access(user, group_id, db)
        return True
    except HTTPException:
        return False

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
    query = db.query(models.ServerGroup)
    if is_global_admin(user):
        return query.all()
    query = query.filter(models.ServerGroup.organization_id == user.organization_id)
    if user.role == RoleType.ADMIN.value:
        return query.all()
    return query.join(models.UserGroupPermission).filter(models.UserGroupPermission.user_id == user.id).all()

def get_user_accessible_servers(user: models.User, db: Session) -> list:
    return server_query(user, db).all()
