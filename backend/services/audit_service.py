from sqlalchemy.orm import Session
from models import AuditLog
import logging

logger = logging.getLogger(__name__)

class AuditService:
    @staticmethod
    def log_action(
        db: Session, 
        user_id: int, 
        action: str, 
        resource_type: str, 
        resource_id: int = None, 
        details: dict = None, 
        ip_address: str = None
    ):
        """
        Create a new audit log entry.
        Does not raise exceptions to prevent blocking main business logic.
        """
        try:
            log_entry = AuditLog(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details,
                ip_address=ip_address
            )
            db.add(log_entry)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")
            db.rollback()

audit_service = AuditService()
