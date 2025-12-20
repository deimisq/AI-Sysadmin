"""
Scheduler Service - Manages scheduled health check jobs using APScheduler
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.jobstores.memory import MemoryJobStore
from datetime import datetime, timedelta
from typing import Optional
import logging
import asyncio
import pytz

from sqlalchemy.orm import Session
from database import SessionLocal
import models
from services.report_service import report_service

logger = logging.getLogger(__name__)

# Timezone for scheduled tasks (Uruguay)
DEFAULT_TIMEZONE = pytz.timezone('America/Montevideo')


class SchedulerService:
    """Service for managing scheduled health check jobs"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler(
            jobstores={'default': MemoryJobStore()},
            job_defaults={
                'coalesce': True,  # Combine missed executions
                'max_instances': 1,  # Only one instance at a time
                'misfire_grace_time': 3600  # 1 hour grace for misfires
            }
        )
        self._started = False
    
    def start(self):
        """Start the scheduler"""
        if not self._started:
            self.scheduler.start()
            self._started = True
            logger.info("Scheduler started")
            # Load existing jobs from database
            self._load_jobs_from_db()
    
    def shutdown(self):
        """Shutdown the scheduler"""
        if self._started:
            self.scheduler.shutdown(wait=False)
            self._started = False
            logger.info("Scheduler shutdown")
    
    def _load_jobs_from_db(self):
        """Load all active scheduled checks from database"""
        db = SessionLocal()
        try:
            checks = db.query(models.ScheduledHealthCheck).filter(
                models.ScheduledHealthCheck.is_active == True
            ).all()
            
            for check in checks:
                self.add_job(check)
                logger.info(f"Loaded scheduled check: {check.name} (ID: {check.id})")
        except Exception as e:
            logger.error(f"Failed to load jobs from database: {e}")
        finally:
            db.close()
    
    def _get_cron_trigger(self, check: models.ScheduledHealthCheck) -> CronTrigger:
        """Create a CronTrigger from schedule configuration"""
        if check.schedule_type == "custom" and check.cron_expression:
            # Parse custom cron expression
            parts = check.cron_expression.split()
            if len(parts) >= 5:
                return CronTrigger(
                    minute=parts[0],
                    hour=parts[1],
                    day=parts[2],
                    month=parts[3],
                    day_of_week=parts[4],
                    timezone=DEFAULT_TIMEZONE
                )
        
        hour = check.schedule_hour or 9
        minute = check.schedule_minute or 0
        
        if check.schedule_type == "daily":
            return CronTrigger(hour=hour, minute=minute, timezone=DEFAULT_TIMEZONE)
        
        elif check.schedule_type == "weekly":
            day_of_week = check.schedule_day_of_week or 0  # Default Monday
            return CronTrigger(
                day_of_week=day_of_week,
                hour=hour,
                minute=minute,
                timezone=DEFAULT_TIMEZONE
            )
        
        elif check.schedule_type == "monthly":
            day = check.schedule_day_of_month or 1
            return CronTrigger(
                day=day,
                hour=hour,
                minute=minute,
                timezone=DEFAULT_TIMEZONE
            )
        
        # Default: daily at specified time
        return CronTrigger(hour=hour, minute=minute, timezone=DEFAULT_TIMEZONE)
    
    def add_job(self, check: models.ScheduledHealthCheck):
        """Add a scheduled health check job"""
        job_id = f"health_check_{check.id}"
        
        # Remove existing job if any
        try:
            self.scheduler.remove_job(job_id)
        except:
            pass
        
        trigger = self._get_cron_trigger(check)
        
        self.scheduler.add_job(
            func=self._execute_health_check,
            trigger=trigger,
            id=job_id,
            args=[check.id],
            replace_existing=True
        )
        
        # Update next run time
        job = self.scheduler.get_job(job_id)
        if job and job.next_run_time:
            db = SessionLocal()
            try:
                check_obj = db.query(models.ScheduledHealthCheck).filter(
                    models.ScheduledHealthCheck.id == check.id
                ).first()
                if check_obj:
                    check_obj.next_run = job.next_run_time
                    db.commit()
            finally:
                db.close()
        
        logger.info(f"Added job {job_id} with trigger {trigger}")
    
    def remove_job(self, check_id: int):
        """Remove a scheduled health check job"""
        job_id = f"health_check_{check_id}"
        try:
            self.scheduler.remove_job(job_id)
            logger.info(f"Removed job {job_id}")
        except Exception as e:
            logger.warning(f"Job {job_id} not found: {e}")
    
    def update_job(self, check: models.ScheduledHealthCheck):
        """Update a scheduled job (remove and re-add)"""
        self.remove_job(check.id)
        if check.is_active:
            self.add_job(check)
    
    async def _execute_health_check(self, check_id: int):
        """Execute a scheduled health check"""
        db = SessionLocal()
        try:
            check = db.query(models.ScheduledHealthCheck).filter(
                models.ScheduledHealthCheck.id == check_id
            ).first()
            
            if not check:
                logger.error(f"Scheduled check {check_id} not found")
                return
            
            logger.info(f"Executing scheduled health check: {check.name}")
            
            # Update status
            check.last_run = datetime.now()
            check.last_status = "running"
            db.commit()
            
            # Get target servers
            servers = []
            if check.server_id:
                server = db.query(models.Server).filter(
                    models.Server.id == check.server_id
                ).first()
                if server:
                    servers.append(server)
                    logger.info(f"Check '{check.name}' targeting SPECIFIC server: {server.hostname} (ID: {server.id})")
                else:
                    logger.error(f"Server ID {check.server_id} not found for check '{check.name}'")
            elif check.group_id:
                servers = db.query(models.Server).filter(
                    models.Server.group_id == check.group_id
                ).all()
                logger.info(f"Check '{check.name}' targeting GROUP (ID: {check.group_id}) with {len(servers)} servers")
                if servers:
                    logger.info(f"  Servers in group: {[s.hostname for s in servers]}")
            
            if not servers:
                logger.warning(f"No servers found for check {check.name}")
                check.last_status = "failed"
                db.commit()
                return
            
            # Process each server
            recipients = [e.strip() for e in check.email_recipients.split(",") if e.strip()]
            
            logger.info(f"Will process {len(servers)} server(s) for check '{check.name}':")
            for idx, srv in enumerate(servers):
                logger.info(f"  [{idx+1}/{len(servers)}] Server ID:{srv.id} Hostname:{srv.hostname}")
            
            for server in servers:
                logger.info(f"🔄 Processing Server ID:{server.id} ({server.hostname}) for Check ID:{check.id} ({check.name})")
                try:
                    await self._process_server_check(db, check, server, recipients)
                    logger.info(f"✅ Completed Server ID:{server.id} ({server.hostname})")
                except Exception as e:
                    logger.error(f"❌ Failed to process server {server.hostname} (ID:{server.id}): {e}")
            
            # Update status
            check.last_status = "success"
            
            # Update next run time
            job = self.scheduler.get_job(f"health_check_{check_id}")
            if job and job.next_run_time:
                check.next_run = job.next_run_time
            
            db.commit()
            logger.info(f"Completed scheduled health check: {check.name}")
            
        except Exception as e:
            logger.error(f"Failed to execute health check {check_id}: {e}")
            try:
                check.last_status = "failed"
                db.commit()
            except:
                pass
        finally:
            db.close()
    
    async def _process_server_check(
        self,
        db: Session,
        check: models.ScheduledHealthCheck,
        server: models.Server,
        recipients: list
    ):
        """Process health check for a single server"""
        logger.info(f"Processing health check for server: {server.hostname}")
        
        # Gather diagnostics (run in thread to avoid blocking)
        loop = asyncio.get_event_loop()
        diagnostics = await loop.run_in_executor(
            None,
            report_service.gather_comprehensive_diagnostics,
            server,
            db
        )
        
        # Get previous report for comparison
        previous_report = db.query(models.HealthCheckReport).filter(
            models.HealthCheckReport.scheduled_check_id == check.id,
            models.HealthCheckReport.server_id == server.id
        ).order_by(models.HealthCheckReport.created_at.desc()).first()
        
        # Generate AI analysis
        ai_analysis = await loop.run_in_executor(
            None,
            report_service.generate_ai_analysis,
            diagnostics,
            db,
            "es"
        )
        
        # Compare with previous
        comparison = report_service.compare_with_previous(diagnostics, previous_report)
        
        # Extract metrics
        metrics = report_service.extract_metrics(diagnostics)
        
        # Create report record
        report = models.HealthCheckReport(
            scheduled_check_id=check.id,
            server_id=server.id,
            server_hostname=server.hostname,
            report_data=diagnostics,
            ai_analysis=ai_analysis,
            comparison_summary=comparison,
            cpu_usage=metrics.get("cpu_usage"),
            memory_usage=metrics.get("memory_usage"),
            disk_usage=metrics.get("disk_usage"),
            services_status=metrics.get("services_status"),
            status="completed"
        )
        db.add(report)
        db.flush()  # Get the ID
        
        # Generate PDF
        try:
            pdf_filename = report_service.generate_pdf_report(
                server_hostname=server.hostname,
                diagnostics=diagnostics,
                ai_analysis=ai_analysis,
                comparison=comparison,
                report_id=report.id
            )
            report.pdf_filename = pdf_filename
        except Exception as e:
            logger.error(f"Failed to generate PDF: {e}")
            report.error_message = f"PDF generation failed: {str(e)}"
        
        db.commit()
        
        # Send email
        if recipients and report.pdf_filename:
            try:
                await loop.run_in_executor(
                    None,
                    report_service.send_report_email,
                    db,
                    recipients,
                    server.hostname,
                    report.pdf_filename,
                    ai_analysis[:500] if ai_analysis else "No analysis available"
                )
            except Exception as e:
                logger.error(f"Failed to send email: {e}")
        
        logger.info(f"Completed health check for {server.hostname}")
    
    def run_now(self, check_id: int):
        """Trigger immediate execution of a health check"""
        asyncio.create_task(self._execute_health_check(check_id))


# Singleton instance
scheduler_service = SchedulerService()
