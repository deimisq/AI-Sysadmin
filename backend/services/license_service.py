import secrets
import hashlib
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
import models
import uuid

class LicenseService:
    """Service for managing system licenses"""
    
    @staticmethod
    def generate_license_key(installation_id: str, license_type: str = "trial") -> str:
        """Generate a unique license key"""
        # Create a unique identifier
        unique_string = f"{installation_id}-{license_type}-{datetime.utcnow().isoformat()}-{secrets.token_hex(8)}"
        
        # Generate SHA256 hash
        hash_object = hashlib.sha256(unique_string.encode())
        hash_hex = hash_object.hexdigest()
        
        # Format as XXXX-XXXX-XXXX-XXXX-XXXX
        formatted_key = '-'.join([hash_hex[i:i+4].upper() for i in range(0, 20, 4)])
        
        return formatted_key
    
    @staticmethod
    def create_trial_license(db: Session, installation_id: str = None) -> models.License:
        """Create a 180-day trial license"""
        if not installation_id:
            installation_id = str(uuid.uuid4())
        
        license_key = LicenseService.generate_license_key(installation_id, "trial")
        expires_at = datetime.utcnow() + timedelta(days=180)
        
        license = models.License(
            license_key=license_key,
            license_type="trial",
            max_servers=10,
            max_users=5,
            expires_at=expires_at,
            installation_id=installation_id,
            is_active=True
        )
        
        db.add(license)
        db.commit()
        db.refresh(license)
        
        return license
    
    @staticmethod
    def get_active_license(db: Session) -> models.License:
        """Get the current active license"""
        return db.query(models.License).filter(
            and_(
                models.License.is_active == True,
                models.License.expires_at > datetime.utcnow()
            )
        ).order_by(models.License.created_at.desc()).first()
    
    @staticmethod
    def validate_license(db: Session, license_key: str = None) -> dict:
        """Validate a license and return status"""
        if license_key:
            license = db.query(models.License).filter(
                models.License.license_key == license_key
            ).first()
        else:
            license = LicenseService.get_active_license(db)
        
        if not license:
            return {
                "valid": False,
                "status": "no_license",
                "message": "No se encontró licencia activa"
            }
        
        # Check if expired
        if license.expires_at < datetime.utcnow():
            return {
                "valid": False,
                "status": "expired",
                "message": f"Licencia expirada el {license.expires_at.strftime('%Y-%m-%d')}",
                "license": license
            }
        
        # Check if active
        if not license.is_active:
            return {
                "valid": False,
                "status": "inactive",
                "message": "Licencia desactivada",
                "license": license
            }
        
        # Update validation tracking
        license.last_validated = datetime.utcnow()
        license.validation_count += 1
        db.commit()
        
        # Calculate days remaining
        days_remaining = (license.expires_at - datetime.utcnow()).days
        
        return {
            "valid": True,
            "status": "active",
            "message": "Licencia válida",
            "license": license,
            "days_remaining": days_remaining,
            "license_type": license.license_type,
            "max_servers": license.max_servers,
            "max_users": license.max_users
        }
    
    @staticmethod
    def check_limits(db: Session) -> dict:
        """Check if current usage is within license limits"""
        validation = LicenseService.validate_license(db)
        
        if not validation["valid"]:
            return validation
        
        license = validation["license"]
        
        # Count current servers
        server_count = db.query(models.Server).count()
        user_count = db.query(models.User).count()
        
        limits_ok = True
        warnings = []
        
        if license.max_servers != -1 and server_count > license.max_servers:
            limits_ok = False
            warnings.append(f"Límite de servidores excedido: {server_count}/{license.max_servers}")
        
        if license.max_users != -1 and user_count > license.max_users:
            limits_ok = False
            warnings.append(f"Límite de usuarios excedido: {user_count}/{license.max_users}")
        
        return {
            **validation,
            "limits_ok": limits_ok,
            "warnings": warnings,
            "current_servers": server_count,
            "current_users": user_count
        }
