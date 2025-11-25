from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
import models
import schemas
from dependencies import get_db, get_current_active_user, get_current_superuser
from models import RoleType
from utils.permissions import has_permission, can_access_group, get_user_accessible_groups
from utils.auth import get_password_hash

router = APIRouter()

# ==================== USER MANAGEMENT ====================

@router.get("/users", response_model=List[schemas.User])
def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all users (admin only)"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@router.post("/users", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(
    user_create: schemas.UserCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new user (admin only)"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(
        (models.User.email == user_create.email) | (models.User.username == user_create.username)
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email or username already exists")
    
    # Hash password
    hashed_password = get_password_hash(user_create.password)
    
    # Create user
    new_user = models.User(
        email=user_create.email,
        username=user_create.username,
        hashed_password=hashed_password,
        full_name=user_create.full_name,
        role=user_create.role if user_create.role else RoleType.USER.value,
        is_active=user_create.is_active if user_create.is_active is not None else True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.get("/users/{user_id}", response_model=schemas.User)
def get_user(
    user_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user details"""
    # Users can view their own profile, admins can view anyone
    if user_id != current_user.id and current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@router.put("/users/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update user details"""
    # Users can update their own profile (except role), admins can update anyone
    if user_id != current_user.id and current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.dict(exclude_unset=True)
    
    # Only admins can change roles
    if 'role' in update_data and user_id != current_user.id:
        if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
            del update_data['role']
    elif 'role' in update_data and user_id == current_user.id:
        # Users cannot change their own role
        del update_data['role']
    
    # Hash password if provided
    if 'password' in update_data:
        update_data['hashed_password'] = get_password_hash(update_data['password'])
        del update_data['password']
    
    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: models.User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """Delete user (superadmin only)"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

# ==================== GROUP PERMISSIONS ====================

@router.post("/users/{user_id}/groups/{group_id}/grant")
def grant_group_access(
    user_id: int,
    group_id: int,
    role: str = RoleType.USER.value,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Grant user access to a group"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if user and group exist
    user = db.query(models.User).filter(models.User.id == user_id).first()
    group = db.query(models.ServerGroup).filter(models.ServerGroup.id == group_id).first()
    
    if not user or not group:
        raise HTTPException(status_code=404, detail="User or group not found")
    
    # Check if permission already exists
    existing = db.query(models.user_group_permissions).filter(
        and_(
            models.user_group_permissions.c.user_id == user_id,
            models.user_group_permissions.c.group_id == group_id
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Permission already exists")
    
    # Insert permission
    stmt = models.user_group_permissions.insert().values(
        user_id=user_id,
        group_id=group_id,
        role=role
    )
    db.execute(stmt)
    db.commit()
    
    return {"message": "Access granted successfully"}

@router.delete("/users/{user_id}/groups/{group_id}/revoke")
def revoke_group_access(
    user_id: int,
    group_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Revoke user access to a group"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Delete permission
    stmt = models.user_group_permissions.delete().where(
        and_(
            models.user_group_permissions.c.user_id == user_id,
            models.user_group_permissions.c.group_id == group_id
        )
    )
    result = db.execute(stmt)
    db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    return {"message": "Access revoked successfully"}

@router.get("/users/{user_id}/groups")
def get_user_groups(
    user_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get groups a user has access to"""
    # Users can view their own groups, admins can view anyone's
    if user_id != current_user.id and current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    groups = get_user_accessible_groups(user, db)
    return groups

# ==================== AUDIT LOGS ====================

@router.get("/audit-logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get audit logs (admin only)"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    logs = db.query(models.AuditLog).order_by(
        models.AuditLog.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return logs

# ==================== SYSTEM STATS ====================

@router.get("/stats")
def get_system_stats(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get system statistics"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    total_users = db.query(models.User).count()
    total_servers = db.query(models.Server).count()
    total_groups = db.query(models.ServerGroup).count()
    total_operations = db.query(models.OperationLog).count()
    
    return {
        "total_users": total_users,
        "total_servers": total_servers,
        "total_groups": total_groups,
        "total_operations": total_operations
    }

# ==================== SERVER MANAGEMENT ====================

@router.get("/servers", response_model=List[schemas.Server])
def list_all_servers(
    skip: int = 0,
    limit: int = 1000,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all servers (admin only)"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    servers = db.query(models.Server).offset(skip).limit(limit).all()
    return servers

# ==================== SECURITY SETTINGS ====================

@router.get("/allowed-domains", response_model=List[schemas.AllowedDomain])
def list_allowed_domains(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List allowed domains (admin only)"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    domains = db.query(models.AllowedDomain).offset(skip).limit(limit).all()
    return domains

@router.post("/allowed-domains", response_model=schemas.AllowedDomain)
def create_allowed_domain(
    domain: schemas.AllowedDomainCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add allowed domain (admin only)"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = db.query(models.AllowedDomain).filter(models.AllowedDomain.domain == domain.domain).first()
    if existing:
        raise HTTPException(status_code=400, detail="Domain already exists")
        
    new_domain = models.AllowedDomain(**domain.dict())
    db.add(new_domain)
    db.commit()
    db.refresh(new_domain)
    return new_domain

@router.delete("/allowed-domains/{domain_id}")
def delete_allowed_domain(
    domain_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete allowed domain (admin only)"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    domain = db.query(models.AllowedDomain).filter(models.AllowedDomain.id == domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
        
    db.delete(domain)
    db.commit()
    return {"message": "Domain deleted successfully"}
