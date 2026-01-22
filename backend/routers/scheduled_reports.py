"""
Scheduled Reports Router - API endpoints for scheduled health check management
with Organization Isolation and Role-Based Access Control
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import os

from database import get_db
from models import ScheduledHealthCheck, HealthCheckReport, Server, ServerGroup, User, RoleType, UserGroupPermission
from dependencies import get_current_active_user
from services.scheduler_service import scheduler_service
from services.report_service import REPORTS_DIR

router = APIRouter(tags=["scheduled-reports"])


# Pydantic schemas
class ScheduledCheckCreate(BaseModel):
    name: str
    server_id: Optional[int] = None
    group_id: Optional[int] = None
    schedule_type: str = "daily"  # daily, weekly, monthly, custom
    cron_expression: Optional[str] = None
    schedule_hour: int = 9
    schedule_minute: int = 0
    schedule_day_of_week: Optional[int] = None
    schedule_day_of_month: Optional[int] = None
    email_recipients: str  # Comma-separated
    is_active: bool = True


class ScheduledCheckUpdate(BaseModel):
    name: Optional[str] = None
    server_id: Optional[int] = None
    group_id: Optional[int] = None
    schedule_type: Optional[str] = None
    cron_expression: Optional[str] = None
    schedule_hour: Optional[int] = None
    schedule_minute: Optional[int] = None
    schedule_day_of_week: Optional[int] = None
    schedule_day_of_month: Optional[int] = None
    email_recipients: Optional[str] = None
    is_active: Optional[bool] = None


class ScheduledCheckResponse(BaseModel):
    id: int
    name: str
    server_id: Optional[int]
    group_id: Optional[int]
    server_name: Optional[str] = None
    group_name: Optional[str] = None
    schedule_type: str
    cron_expression: Optional[str]
    schedule_hour: int
    schedule_minute: int
    schedule_day_of_week: Optional[int]
    schedule_day_of_month: Optional[int]
    email_recipients: str
    is_active: bool
    last_run: Optional[datetime]
    next_run: Optional[datetime]
    last_status: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ReportResponse(BaseModel):
    id: int
    server_hostname: str
    cpu_usage: Optional[str]
    memory_usage: Optional[str]
    disk_usage: Optional[str]
    services_status: Optional[str]
    status: str
    pdf_filename: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# --- Permission Helpers ---

def get_user_managed_group_ids(db: Session, user: User) -> List[int]:
    """Get list of group IDs where user has admin/manage role"""
    perms = db.query(UserGroupPermission).filter(
        UserGroupPermission.user_id == user.id,
        UserGroupPermission.role.in_([RoleType.ADMIN.value, RoleType.GROUP_ADMIN.value])
    ).all()
    return [p.group_id for p in perms]

def verify_write_access(db: Session, user: User, server_id: Optional[int] = None, group_id: Optional[int] = None):
    """
    Verify user can modify resources related to server_id or group_id.
    - Superadmin: Allow all.
    - Org Admin: Allow if resource belongs to Org.
    - Group Admin: Allow if resource belongs to managed Group.
    - User: Deny write.
    """
    if user.is_superuser:
        return True

    if not user.organization_id:
        raise HTTPException(403, "User must belong to an organization")

    # 1. Resolve Target Organization and Group Context
    target_org_id = None
    target_group_id = None
    
    if server_id:
        server = db.query(Server).filter(Server.id == server_id).first()
        if not server:
            raise HTTPException(404, "Server not found")
        target_org_id = server.organization_id
        target_group_id = server.group_id
    elif group_id:
        group = db.query(ServerGroup).filter(ServerGroup.id == group_id).first()
        if not group:
            raise HTTPException(404, "Group not found")
        target_org_id = group.organization_id
        target_group_id = group.id
    else:
        # No target specified (should happen only in creation logic handling)
        return True

    # 2. Check Org Isolation
    if target_org_id != user.organization_id:
         raise HTTPException(403, "Access denied to resource from another organization")

    # 3. Check Role Permissions
    if user.role == RoleType.ADMIN.value:
        return True # Org Admin has full write access within Org

    # Group Admin Logic
    managed_groups = get_user_managed_group_ids(db, user)
    
    if target_group_id and target_group_id in managed_groups:
        return True
    
    # If explicit Group Admin role set globally but manages specific groups logic...
    # Assuming 'role' column on User might be 'group_admin'
    if user.role == RoleType.GROUP_ADMIN.value:
         if target_group_id and target_group_id in managed_groups:
             return True
         raise HTTPException(403, "You do not have permission to manage this group's reports")

    raise HTTPException(403, "Insufficient permissions to modify reports")


@router.get("/scheduled-reports", response_model=List[ScheduledCheckResponse])
async def list_scheduled_checks(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List scheduled health checks visible to the user.
    """
    query = db.query(ScheduledHealthCheck)
    
    # Superuser sees all
    if current_user.is_superuser:
        checks = query.all()
        return [map_response(c) for c in checks]

    if not current_user.organization_id:
        return []

    # Org Admin sees all for their Org
    if current_user.role == RoleType.ADMIN.value:
        # Join Server/Group to filter by Org
        # This is complex because ScheduledCheck can point to Server OR Group
        # We fetch all check IDs that match criteria
        
        # Checks linked to user's org servers
        server_checks = db.query(ScheduledHealthCheck.id).join(Server, ScheduledHealthCheck.server_id == Server.id).filter(
            Server.organization_id == current_user.organization_id
        )
        # Checks linked to user's org groups
        group_checks = db.query(ScheduledHealthCheck.id).join(ServerGroup, ScheduledHealthCheck.group_id == ServerGroup.id).filter(
            ServerGroup.organization_id == current_user.organization_id
        )
        
        checks = query.filter(
            or_(
                ScheduledHealthCheck.id.in_(server_checks),
                ScheduledHealthCheck.id.in_(group_checks)
            )
        ).all()
        return [map_response(c) for c in checks]

    # Group Admin or User
    # Can see checks for Groups they belong to or manage?
    # Requirement: "only puedan ver... los admins de los grupos" (implies restrictions for normal users?)
    # Requirement: "User normal pueda ver informes programados de servidores de esa organización" (Wait, user prompt says:
    # "solo los puedan modificar los administradores... y solo puedan ver o crear/modificar informes los admins de los grupos")
    
    # INTERPRETATION:
    # Org Admin: CRUD ALL in Org.
    # Group Admin: CRUD in their Groups.
    # Regular User: View ONLY (ReadOnly) in Org? Or maybe NO access?
    # User prompt says: "que solo los puedan modificar los administradores de la organización" -> user can't modify. 
    # "y solo puedan ver o crear/modificar informes los admins de los grupos" -> This implies Group Admin is the lowest level that can VIEW/CREATE/MODIFY specific subset.
    # Suggests Regular User CANNOT see reports? 
    # Let's assume Regular User can VIEW reports for Org (Read Only), but Group Admin can VIEW/EDIT specific groups.
    
    # Let's start restrictive: User can see nothing unless Admin/GroupAdmin?
    # Actually, standard behavior is User sees status. I will allow User to VIEW all in Org for now, unless restrictive requested.
    # Re-reading: "que los informes... que puedan ver los miembros de una organización sean solo los de los servidores de esa organización" -> Members limit to Org.
    # "y solo puedan ver o crear/modificar informes los admins de los grupos" -> This part is tricky. It might mean "Group Admins are the only ones who can view/edit specific group reports if they are not Org Admins".
    
    # Let's go with:
    # 1. Filter by Organization (Base Security)
    # 2. If Group Admin, no extra filter for VIEW (can view all in Org? Or strict?). Strict interpretation of prompt: "Admins de grupos ... solo pdran modificar o crear informes para servidores dentro de su grupo".
    
    # Implementation: All members of Org can VIEW all reports of Org (Transparency).
    # Only Admins can WRITE.
    
    # Check IDs linked to user's org servers
    server_checks = db.query(ScheduledHealthCheck.id).join(Server, ScheduledHealthCheck.server_id == Server.id).filter(
        Server.organization_id == current_user.organization_id
    )
    group_checks = db.query(ScheduledHealthCheck.id).join(ServerGroup, ScheduledHealthCheck.group_id == ServerGroup.id).filter(
        ServerGroup.organization_id == current_user.organization_id
    )
    
    checks = query.filter(
        or_(
            ScheduledHealthCheck.id.in_(server_checks),
            ScheduledHealthCheck.id.in_(group_checks)
        )
    ).all()
    
    return [map_response(c) for c in checks]


@router.post("/scheduled-reports", response_model=ScheduledCheckResponse)
async def create_scheduled_check(
    data: ScheduledCheckCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new scheduled health check"""
    # Verify Write Permission
    verify_write_access(db, current_user, server_id=data.server_id, group_id=data.group_id)
    
    # Validate: either server_id or group_id, not both
    if data.server_id and data.group_id:
        raise HTTPException(status_code=400, detail="Specify either server_id or group_id, not both")
    
    if not data.server_id and not data.group_id:
        raise HTTPException(status_code=400, detail="Must specify either server_id or group_id")
    
    # Validate email
    if not data.email_recipients or not data.email_recipients.strip():
        raise HTTPException(status_code=400, detail="At least one email recipient is required")
    
    # Create
    check = ScheduledHealthCheck(
        name=data.name,
        server_id=data.server_id,
        group_id=data.group_id,
        schedule_type=data.schedule_type,
        cron_expression=data.cron_expression,
        schedule_hour=data.schedule_hour,
        schedule_minute=data.schedule_minute,
        schedule_day_of_week=data.schedule_day_of_week,
        schedule_day_of_month=data.schedule_day_of_month,
        email_recipients=data.email_recipients,
        is_active=data.is_active,
        created_by=current_user.id
    )
    
    db.add(check)
    db.commit()
    db.refresh(check)
    
    # Add to scheduler
    if check.is_active:
        scheduler_service.add_job(check)
    
    return map_response(check)


@router.put("/scheduled-reports/{check_id}", response_model=ScheduledCheckResponse)
async def update_scheduled_check(
    check_id: int,
    data: ScheduledCheckUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a scheduled health check"""
    check = db.query(ScheduledHealthCheck).filter(ScheduledHealthCheck.id == check_id).first()
    if not check:
        raise HTTPException(status_code=404, detail="Scheduled check not found")
        
    # Verify Permissions on EXISTING resource
    verify_write_access(db, current_user, server_id=check.server_id, group_id=check.group_id)
    
    # Verify Permissions on NEW target if changing
    if data.server_id or data.group_id:
        verify_write_access(db, current_user, server_id=data.server_id, group_id=data.group_id)

    # Update fields
    if data.name is not None: check.name = data.name
    if data.server_id is not None:
        check.server_id = data.server_id
        check.group_id = None
    if data.group_id is not None:
        check.group_id = data.group_id
        check.server_id = None
    if data.schedule_type is not None: check.schedule_type = data.schedule_type
    if data.cron_expression is not None: check.cron_expression = data.cron_expression
    if data.schedule_hour is not None: check.schedule_hour = data.schedule_hour
    if data.schedule_minute is not None: check.schedule_minute = data.schedule_minute
    if data.schedule_day_of_week is not None: check.schedule_day_of_week = data.schedule_day_of_week
    if data.schedule_day_of_month is not None: check.schedule_day_of_month = data.schedule_day_of_month
    if data.email_recipients is not None: check.email_recipients = data.email_recipients
    if data.is_active is not None: check.is_active = data.is_active
    
    db.commit()
    db.refresh(check)
    
    # Update scheduler
    scheduler_service.update_job(check)
    
    return map_response(check)


@router.delete("/scheduled-reports/{check_id}")
async def delete_scheduled_check(
    check_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a scheduled health check"""
    check = db.query(ScheduledHealthCheck).filter(ScheduledHealthCheck.id == check_id).first()
    if not check:
        raise HTTPException(status_code=404, detail="Scheduled check not found")
    
    # Verify Permissions
    verify_write_access(db, current_user, server_id=check.server_id, group_id=check.group_id)
    
    # Remove from scheduler
    scheduler_service.remove_job(check_id)
    
    # Delete from database
    db.delete(check)
    db.commit()
    
    return {"message": "Scheduled check deleted successfully"}


@router.post("/scheduled-reports/{check_id}/run")
async def run_scheduled_check(
    check_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Trigger immediate execution"""
    check = db.query(ScheduledHealthCheck).filter(ScheduledHealthCheck.id == check_id).first()
    if not check:
        raise HTTPException(status_code=404, detail="Scheduled check not found")
        
    # Verify Permissions (Treat run as Write/Execute)
    verify_write_access(db, current_user, server_id=check.server_id, group_id=check.group_id)
    
    # Run in background
    scheduler_service.run_now(check_id)
    
    return {"message": f"Health check triggered."}


@router.get("/scheduled-reports/{check_id}/history", response_model=List[ReportResponse])
async def get_report_history(
    check_id: int,
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get report history"""
    check = db.query(ScheduledHealthCheck).filter(ScheduledHealthCheck.id == check_id).first()
    if not check:
        raise HTTPException(404, "Scheduled check not found")
        
    # Permission check (Read access verified implicitly by Org isolation logic in check retrieval, 
    # but here we access direct ID. Must verify Org match)
    
    if not current_user.is_superuser:
        if not current_user.organization_id: raise HTTPException(403)
        
        # Check if resource belongs to Org
        org_id = None
        if check.server: org_id = check.server.organization_id
        elif check.group: org_id = check.group.organization_id
        
        if org_id != current_user.organization_id:
            raise HTTPException(403, "Access denied")
            
    reports = db.query(HealthCheckReport).filter(
        HealthCheckReport.scheduled_check_id == check_id
    ).order_by(HealthCheckReport.created_at.desc()).limit(limit).all()
    
    return [ReportResponse(
        id=r.id,
        server_hostname=r.server_hostname,
        cpu_usage=r.cpu_usage,
        memory_usage=r.memory_usage,
        disk_usage=r.disk_usage,
        services_status=r.services_status,
        status=r.status,
        pdf_filename=r.pdf_filename,
        created_at=r.created_at
    ) for r in reports]


@router.get("/scheduled-reports/report/{report_id}/download")
async def download_report(
    report_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Download a report PDF"""
    report = db.query(HealthCheckReport).filter(HealthCheckReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    # Verify Access (Via Parent Check)
    check = report.scheduled_check
    if not current_user.is_superuser:
        if not current_user.organization_id: raise HTTPException(403)
        org_id = None
        if check.server: org_id = check.server.organization_id
        elif check.group: org_id = check.group.organization_id
        if org_id != current_user.organization_id:
             raise HTTPException(403, "Access denied")

    if not report.pdf_filename:
        raise HTTPException(status_code=404, detail="No PDF available")
    
    pdf_path = os.path.join(REPORTS_DIR, report.pdf_filename)
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    return FileResponse(
        path=pdf_path,
        filename=report.pdf_filename,
        media_type="application/pdf"
    )


@router.get("/scheduled-reports/report/{report_id}")
async def get_report_detail(
    report_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed report data"""
    report = db.query(HealthCheckReport).filter(HealthCheckReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Verify Access
    check = report.scheduled_check
    if not current_user.is_superuser:
        if not current_user.organization_id: raise HTTPException(403)
        org_id = None
        if check.server: org_id = check.server.organization_id
        elif check.group: org_id = check.group.organization_id
        if org_id != current_user.organization_id:
             raise HTTPException(403, "Access denied")
             
    return {
        "id": report.id,
        "server_hostname": report.server_hostname,
        "report_data": report.report_data,
        "ai_analysis": report.ai_analysis,
        "comparison_summary": report.comparison_summary,
        "cpu_usage": report.cpu_usage,
        "memory_usage": report.memory_usage,
        "disk_usage": report.disk_usage,
        "services_status": report.services_status,
        "status": report.status,
        "error_message": report.error_message,
        "pdf_filename": report.pdf_filename,
        "created_at": report.created_at.isoformat() if report.created_at else None
    }

def map_response(check: ScheduledHealthCheck) -> ScheduledCheckResponse:
    return ScheduledCheckResponse(
        id=check.id,
        name=check.name,
        server_id=check.server_id,
        group_id=check.group_id,
        server_name=check.server.hostname if check.server else None,
        group_name=check.group.name if check.group else None,
        schedule_type=check.schedule_type,
        cron_expression=check.cron_expression,
        schedule_hour=check.schedule_hour or 9,
        schedule_minute=check.schedule_minute or 0,
        schedule_day_of_week=check.schedule_day_of_week,
        schedule_day_of_month=check.schedule_day_of_month,
        email_recipients=check.email_recipients,
        is_active=check.is_active,
        last_run=check.last_run,
        next_run=check.next_run,
        last_status=check.last_status,
        created_at=check.created_at
    )
