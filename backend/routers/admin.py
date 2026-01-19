from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import datetime, timedelta
import models
import schemas
from dependencies import get_db, get_current_active_user, get_current_superuser
from models import RoleType
from utils.permissions import has_permission, can_access_group, get_user_accessible_groups
from utils.auth import get_password_hash
from services.audit_service import audit_service
import io
import csv

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
    
    query = db.query(models.User)
    
    # Filter by organization for non-superusers
    if not current_user.is_superuser:
        if current_user.organization_id:
            query = query.filter(models.User.organization_id == current_user.organization_id)
        
    users = query.offset(skip).limit(limit).all()
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
    
    # Determine organization_id
    org_id = current_user.organization_id
    
    if current_user.is_superuser:
        if user_create.organization_id:
            # Check if org exists
            org = db.query(models.Organization).filter(models.Organization.id == user_create.organization_id).first()
            if not org:
                 raise HTTPException(status_code=400, detail="Organization not found")
            org_id = user_create.organization_id
    elif user_create.organization_id and user_create.organization_id != current_user.organization_id:
         raise HTTPException(status_code=403, detail="Cannot assign user to another organization")

    # Create user
    new_user = models.User(
        email=user_create.email,
        username=user_create.username,
        hashed_password=hashed_password,
        full_name=user_create.full_name,
        role=user_create.role if user_create.role else RoleType.USER.value,
        is_active=user_create.is_active if user_create.is_active is not None else True,
        organization_id=org_id
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    db.refresh(new_user)
    
    # Audit Log
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="create_user",
        resource_type="user",
        resource_id=new_user.id,
        details={"username": new_user.username, "email": new_user.email, "role": new_user.role}
    )

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
        
    # Check organization isolation
    if not current_user.is_superuser and user_id != current_user.id:
        if user.organization_id != current_user.organization_id:
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
        
    # Check organization isolation
    if not current_user.is_superuser and user_id != current_user.id:
        if user.organization_id != current_user.organization_id:
             raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is being activated (approved)
    was_inactive = not user.is_active
    
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
    
    # Send approval notification if user was just activated
    if was_inactive and user.is_active:
        try:
            from services.email_service import notify_user_approved
            notify_user_approved(db, user.email, user.username, user.preferred_language or 'en')
        except Exception as e:
            # Log error but don't fail the update
            import logging
            logging.error(f"Failed to send approval notification: {e}")
    
    # Audit Log
    safe_update = {k: v for k, v in update_data.items() if k not in ['password', 'hashed_password']}
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="update_user",
        resource_type="user",
        resource_id=user.id,
        details=safe_update
    )

    return user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: models.User = Depends(get_current_active_user), # Allow Org Admins to delete users
    db: Session = Depends(get_db)
):
    """Delete user (admin only)"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check organization isolation
    if not current_user.is_superuser:
        if user.organization_id != current_user.organization_id:
             raise HTTPException(status_code=404, detail="User not found")
             
    # Prevent Org Admin from deleting SuperAdmin (edge case if in same org somehow)
    if user.is_superuser and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Cannot delete superuser")
    
    db.delete(user)
    db.commit()
    
    # Audit Log
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="delete_user",
        resource_type="user",
        resource_id=user_id,
        details={"username": user.username}
    )

    return {"message": "User deleted successfully"}

@router.post("/users/{user_id}/send-approval-notification")
def send_approval_notification(
    user_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send approval notification to a user (admin only)"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=400, 
            detail="Cannot send approval notification to inactive user. Please activate the user first."
        )
    
    try:
        from services.email_service import notify_user_approved
        success = notify_user_approved(db, user.email, user.username, user.preferred_language or 'en')
        
        if success:
            return {
                "success": True,
                "message": f"Approval notification sent successfully to {user.email}"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to send notification. Please check SMTP configuration."
            )
    except Exception as e:
        import logging
        logging.error(f"Failed to send approval notification: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send notification: {str(e)}"
        )

# ==================== GROUP PERMISSIONS ====================

@router.post("/users/{user_id}/groups/{group_id}/grant")
def grant_group_access(
    user_id: int,
    group_id: int,
    role: str = "user",  # Can be "user" or "group_admin"
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Grant user access to a group with specific role"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Validate role
    if role not in ["user", "group_admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'user' or 'group_admin'")
        
    # Verify group and user exist and belong to org
    group = db.query(models.ServerGroup).filter(models.ServerGroup.id == group_id).first()
    if not group or (not current_user.is_superuser and group.organization_id is not None and group.organization_id != current_user.organization_id):
        raise HTTPException(status_code=404, detail="Group not found")
        
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user or (not current_user.is_superuser and target_user.organization_id is not None and target_user.organization_id != current_user.organization_id):
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if permission already exists
    existing = db.query(models.UserGroupPermission).filter(
        models.UserGroupPermission.user_id == user_id,
        models.UserGroupPermission.group_id == group_id
    ).first()
    
    if existing:
        # Update role if different
        if existing.role != role:
            existing.role = role
            db.commit()
            return {"message": f"Role updated to {role} successfully"}
        return {"message": "Permission already exists"}
    
    # Create new permission
    permission = models.UserGroupPermission(
        user_id=user_id,
        group_id=group_id,
        role=role
    )
    db.add(permission)
    db.commit()
    
    # Audit Log
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="grant_permission",
        resource_type="group_permission",
        resource_id=group_id,
        details={"target_user_id": user_id, "role": role}
    )

    return {"message": f"Access granted with role {role} successfully"}

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
    
    # Verify group exists and belongs to org
    group = db.query(models.ServerGroup).filter(models.ServerGroup.id == group_id).first()
    if not group or (not current_user.is_superuser and group.organization_id is not None and group.organization_id != current_user.organization_id):
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Find and delete permission
    permission = db.query(models.UserGroupPermission).filter(
        models.UserGroupPermission.user_id == user_id,
        models.UserGroupPermission.group_id == group_id
    ).first()
    
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    db.delete(permission)
    db.commit()
    
    # Audit Log
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="revoke_permission",
        resource_type="group_permission",
        resource_id=group_id,
        details={"target_user_id": user_id}
    )

    return {"message": "Access revoked successfully"}

@router.get("/users/{user_id}/groups")
def get_user_groups(
    user_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get groups a user has access to with their roles"""
    # Users can view their own groups, admins can view anyone's
    if user_id != current_user.id and current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not current_user.is_superuser and user.organization_id is not None and user.organization_id != current_user.organization_id:
         raise HTTPException(status_code=404, detail="User not found")
    
    # Get groups with role information
    permissions = db.query(models.UserGroupPermission).filter(
        models.UserGroupPermission.user_id == user_id
    ).all()
    
    result = []
    for perm in permissions:
        group = db.query(models.ServerGroup).filter(models.ServerGroup.id == perm.group_id).first()
        if group:
            result.append({
                "id": group.id,
                "name": group.name,
                "description": group.description,
                "color": group.color,
                "role": perm.role  # Include the role in the group
            })
    
    return result

# ==================== AUDIT LOGS ====================

@router.get("/audit-logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get audit logs with advanced filtering (admin only)"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Build query with joins to get user information
    query = db.query(models.AuditLog).join(
        models.User, 
        models.AuditLog.user_id == models.User.id,
        isouter=True  # Left join in case user was deleted
    )
    
    # Apply filters
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(models.AuditLog.created_at >= start_dt)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(models.AuditLog.created_at <= end_dt)
        except ValueError:
            pass
    
    if action:
        query = query.filter(models.AuditLog.action == action)
    
    if resource_type:
        query = query.filter(models.AuditLog.resource_type == resource_type)
    
    if user_id:
        query = query.filter(models.AuditLog.user_id == user_id)
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    logs = query.order_by(
        models.AuditLog.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    # Enrich logs with user data
    enriched_logs = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "user_id": log.user_id,
            "username": log.user.username if log.user else "Unknown User",
            "user_email": log.user.email if log.user else None,
            "user_role": log.user.role if log.user else None,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at
        }
        enriched_logs.append(log_dict)
    
    return {"logs": enriched_logs, "total": total}

@router.get("/audit-logs/stats")
def get_audit_log_stats(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get audit log statistics (admin only)"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get date ranges
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)
    
    # Total logs
    total_logs = db.query(models.AuditLog).count()
    
    # Logs today
    logs_today = db.query(models.AuditLog).filter(
        models.AuditLog.created_at >= today_start
    ).count()
    
    # Logs this week
    logs_this_week = db.query(models.AuditLog).filter(
        models.AuditLog.created_at >= week_start
    ).count()
    
    # Logs this month
    logs_this_month = db.query(models.AuditLog).filter(
        models.AuditLog.created_at >= month_start
    ).count()
    
    # Most active users (top 5)
    top_users = db.query(
        models.AuditLog.user_id,
        models.User.username,
        func.count(models.AuditLog.id).label('count')
    ).join(models.User).group_by(
        models.AuditLog.user_id,
        models.User.username
    ).order_by(func.count(models.AuditLog.id).desc()).limit(5).all()
    
    # Most common actions (top 5)
    top_actions = db.query(
        models.AuditLog.action,
        func.count(models.AuditLog.id).label('count')
    ).group_by(models.AuditLog.action).order_by(
        func.count(models.AuditLog.id).desc()
    ).limit(5).all()
    
    # Action breakdown
    action_breakdown = {}
    for action, count in top_actions:
        action_breakdown[action] = count
    
    # User breakdown
    user_breakdown = []
    for user_id, username, count in top_users:
        user_breakdown.append({
            "user_id": user_id,
            "username": username,
            "count": count
        })
    
    return {
        "total_logs": total_logs,
        "logs_today": logs_today,
        "logs_this_week": logs_this_week,
        "logs_this_month": logs_this_month,
        "top_users": user_breakdown,
        "top_actions": action_breakdown
    }

@router.get("/audit-logs/export/csv")
def export_audit_logs_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export audit logs to CSV (admin only)"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Build query with same filters as main endpoint
    query = db.query(models.AuditLog).join(
        models.User, 
        models.AuditLog.user_id == models.User.id,
        isouter=True
    )
    
    # Apply filters
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(models.AuditLog.created_at >= start_dt)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(models.AuditLog.created_at <= end_dt)
        except ValueError:
            pass
    
    if action:
        query = query.filter(models.AuditLog.action == action)
    
    if resource_type:
        query = query.filter(models.AuditLog.resource_type == resource_type)
    
    if user_id:
        query = query.filter(models.AuditLog.user_id == user_id)
    
    # Get all logs (limit to reasonable number)
    logs = query.order_by(
        models.AuditLog.created_at.desc()
    ).limit(10000).all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'ID', 'Date/Time', 'User ID', 'Username', 'User Email', 'Role',
        'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Details'
    ])
    
    # Write data
    for log in logs:
        writer.writerow([
            log.id,
            log.created_at.isoformat() if log.created_at else '',
            log.user_id,
            log.user.username if log.user else 'Unknown',
            log.user.email if log.user else '',
            log.user.role if log.user else '',
            log.action,
            log.resource_type,
            log.resource_id or '',
            log.ip_address or '',
            str(log.details) if log.details else ''
        ])
    
    # Prepare response
    output.seek(0)
    filename = f"audit_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


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

# ==================== EMAIL TESTING ====================

@router.post("/test-email")
async def send_test_email(
    request: dict,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send a test email using provided SMTP configuration (admin only)"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        from services.email_service import email_service
        
        # Extract configuration
        recipient = request.get("recipient")
        smtp_config = request.get("smtp_config", {})
        
        if not recipient:
            raise HTTPException(status_code=400, detail="Recipient email is required")
        
        # Get SMTP settings
        smtp_host = smtp_config.get("smtp_host")
        smtp_port = int(smtp_config.get("smtp_port", 587))
        smtp_username = smtp_config.get("smtp_username")
        smtp_password = smtp_config.get("smtp_password")
        smtp_from_email = smtp_config.get("smtp_from_email", smtp_username)
        smtp_from_name = smtp_config.get("smtp_from_name", "AI Sysadmin Agent")
        smtp_use_tls = smtp_config.get("smtp_use_tls", "true") == "true"
        
        if not all([smtp_host, smtp_username, smtp_password]):
            raise HTTPException(status_code=400, detail="SMTP configuration incomplete")
        
        # Create test email content
        subject = "Test Email from AI Sysadmin Agent"
        body_html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #2563eb;">Test Email Successful!</h2>
                <p>This is a test email from your AI Sysadmin Agent.</p>
                <p>If you're reading this, your SMTP configuration is working correctly.</p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px;">
                    Sent by: {current_user.username}<br>
                    Configuration: {smtp_host}:{smtp_port}
                </p>
            </body>
        </html>
        """
        
        body_text = f"""
Test Email Successful!

This is a test email from your AI Sysadmin Agent.
If you're reading this, your SMTP configuration is working correctly.

---
Sent by: {current_user.username}
Configuration: {smtp_host}:{smtp_port}
        """
        
        # Send email
        email_service.send_email(
            smtp_host=smtp_host,
            smtp_port=smtp_port,
            smtp_username=smtp_username,
            smtp_password=smtp_password,
            from_email=smtp_from_email,
            from_name=smtp_from_name,
            to_email=recipient,
            subject=subject,
            body_html=body_html,
            body_text=body_text,
            use_tls=smtp_use_tls
        )
        
        return {
            "success": True,
            "message": f"Test email sent successfully to {recipient}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
