"""
Scheduled Reports Router - API endpoints for scheduled health check management
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
import os

from database import get_db
from models import ScheduledHealthCheck, HealthCheckReport, Server, ServerGroup, User, RoleType
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


def check_admin_role(user: User):
    """Check if user has admin or superadmin role"""
    if user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")


@router.get("/scheduled-reports", response_model=List[ScheduledCheckResponse])
async def list_scheduled_checks(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all scheduled health checks"""
    check_admin_role(current_user)
    
    checks = db.query(ScheduledHealthCheck).all()
    
    result = []
    for check in checks:
        response = ScheduledCheckResponse(
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
        result.append(response)
    
    return result


@router.post("/scheduled-reports", response_model=ScheduledCheckResponse)
async def create_scheduled_check(
    data: ScheduledCheckCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new scheduled health check"""
    check_admin_role(current_user)
    
    # Validate: either server_id or group_id, not both
    if data.server_id and data.group_id:
        raise HTTPException(status_code=400, detail="Specify either server_id or group_id, not both")
    
    if not data.server_id and not data.group_id:
        raise HTTPException(status_code=400, detail="Must specify either server_id or group_id")
    
    # Validate targets exist
    if data.server_id:
        server = db.query(Server).filter(Server.id == data.server_id).first()
        if not server:
            raise HTTPException(status_code=404, detail="Server not found")
    
    if data.group_id:
        group = db.query(ServerGroup).filter(ServerGroup.id == data.group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
    
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


@router.put("/scheduled-reports/{check_id}", response_model=ScheduledCheckResponse)
async def update_scheduled_check(
    check_id: int,
    data: ScheduledCheckUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a scheduled health check"""
    check_admin_role(current_user)
    
    check = db.query(ScheduledHealthCheck).filter(ScheduledHealthCheck.id == check_id).first()
    if not check:
        raise HTTPException(status_code=404, detail="Scheduled check not found")
    
    # Update fields
    if data.name is not None:
        check.name = data.name
    if data.server_id is not None:
        check.server_id = data.server_id
        check.group_id = None  # Clear group if setting server
    if data.group_id is not None:
        check.group_id = data.group_id
        check.server_id = None  # Clear server if setting group
    if data.schedule_type is not None:
        check.schedule_type = data.schedule_type
    if data.cron_expression is not None:
        check.cron_expression = data.cron_expression
    if data.schedule_hour is not None:
        check.schedule_hour = data.schedule_hour
    if data.schedule_minute is not None:
        check.schedule_minute = data.schedule_minute
    if data.schedule_day_of_week is not None:
        check.schedule_day_of_week = data.schedule_day_of_week
    if data.schedule_day_of_month is not None:
        check.schedule_day_of_month = data.schedule_day_of_month
    if data.email_recipients is not None:
        check.email_recipients = data.email_recipients
    if data.is_active is not None:
        check.is_active = data.is_active
    
    db.commit()
    db.refresh(check)
    
    # Update scheduler
    scheduler_service.update_job(check)
    
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


@router.delete("/scheduled-reports/{check_id}")
async def delete_scheduled_check(
    check_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a scheduled health check"""
    check_admin_role(current_user)
    
    check = db.query(ScheduledHealthCheck).filter(ScheduledHealthCheck.id == check_id).first()
    if not check:
        raise HTTPException(status_code=404, detail="Scheduled check not found")
    
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
    """Trigger immediate execution of a scheduled health check"""
    check_admin_role(current_user)
    
    check = db.query(ScheduledHealthCheck).filter(ScheduledHealthCheck.id == check_id).first()
    if not check:
        raise HTTPException(status_code=404, detail="Scheduled check not found")
    
    # Run in background
    scheduler_service.run_now(check_id)
    
    return {"message": f"Health check '{check.name}' triggered. Results will be sent via email."}


@router.get("/scheduled-reports/{check_id}/history", response_model=List[ReportResponse])
async def get_report_history(
    check_id: int,
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get report history for a scheduled check"""
    check_admin_role(current_user)
    
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
    check_admin_role(current_user)
    
    report = db.query(HealthCheckReport).filter(HealthCheckReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if not report.pdf_filename:
        raise HTTPException(status_code=404, detail="No PDF available for this report")
    
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
    check_admin_role(current_user)
    
    report = db.query(HealthCheckReport).filter(HealthCheckReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
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
