from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import dependencies
import models
from services.license_service import LicenseService

router = APIRouter()

class LicenseInfo(BaseModel):
    license_key: str
    license_type: str
    company_name: Optional[str] = None
    contact_email: Optional[str] = None
    max_servers: int
    max_users: int
    issued_at: datetime
    expires_at: datetime
    is_active: bool
    days_remaining: Optional[int] = None
    
    class Config:
        from_attributes = True

class LicenseStatus(BaseModel):
    valid: bool
    status: str
    message: str
    license: Optional[LicenseInfo] = None
    days_remaining: Optional[int] = None
    license_type: Optional[str] = None
    max_servers: Optional[int] = None
    max_users: Optional[int] = None
    current_servers: Optional[int] = None
    current_users: Optional[int] = None
    limits_ok: Optional[bool] = None
    warnings: Optional[list] = None

class PublicLicenseInfo(BaseModel):
    """Public license info for footer display - no sensitive data"""
    license_type: str
    days_remaining: int
    expires_at: datetime
    is_active: bool
    is_expired: bool
    max_servers: int
    max_users: int

# PUBLIC ENDPOINT - No authentication required for footer display
@router.get("/license/public-status")
def get_public_license_status(db: Session = Depends(dependencies.get_db)):
    """Get basic license status for public display (footer)"""
    license = LicenseService.get_active_license(db)
    
    if not license:
        # Check if any license exists (might be expired)
        license = db.query(models.License).order_by(models.License.created_at.desc()).first()
    
    if not license:
        return {
            "license_type": "none",
            "days_remaining": 0,
            "expires_at": None,
            "is_active": False,
            "is_expired": True,
            "max_servers": 0,
            "max_users": 0,
            "message": "No se encontró licencia"
        }
    
    from datetime import datetime
    # Handle timezone-aware datetimes
    expires_at = license.expires_at.replace(tzinfo=None) if license.expires_at.tzinfo else license.expires_at
    days_remaining = (expires_at - datetime.utcnow()).days
    is_expired = days_remaining <= 0
    
    return {
        "license_type": license.license_type,
        "days_remaining": max(0, days_remaining),
        "expires_at": license.expires_at.isoformat(),
        "is_active": license.is_active and not is_expired,
        "is_expired": is_expired,
        "max_servers": license.max_servers,
        "max_users": license.max_users,
        "message": "Licencia válida" if not is_expired else "Licencia expirada"
    }

@router.post("/license/activate-key")
def activate_new_license_key(
    license_key: str,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    """Activate a new license key (user provides key)"""
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Solo administradores pueden activar licencias")
    
    # Here we would validate against the external license server
    # For now, create a new license record
    import hashlib
    from datetime import timedelta
    
    # Validate license format (XXXX-XXXX-XXXX-XXXX-XXXX)
    if not license_key or len(license_key) != 24:
        raise HTTPException(status_code=400, detail="Formato de licencia inválido")
    
    # Check if license already exists
    existing = db.query(models.License).filter(
        models.License.license_key == license_key
    ).first()
    
    if existing:
        # Reactivate existing license
        db.query(models.License).update({"is_active": False})
        existing.is_active = True
        db.commit()
        return {"message": "Licencia reactivada exitosamente", "license_key": license_key}
    
    # In production, this would validate against external server
    # For now, return error
    raise HTTPException(
        status_code=400, 
        detail="Licencia no válida. Compra una licencia en agent.sentrait.com.uy/licenses.html"
    )

@router.get("/license/status", response_model=LicenseStatus)
def get_license_status(
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    """Get current license status"""
    # Only admins can view license status
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver el estado de la licencia")
    
    result = LicenseService.check_limits(db)
    return result

@router.post("/license/validate")
def validate_license_key(
    license_key: str,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    """Validate a specific license key"""
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para validar licencias")
    
    result = LicenseService.validate_license(db, license_key)
    return result

@router.post("/license/activate")
def activate_license(
    license_key: str,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    """Activate a new license (deactivates old ones)"""
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Solo superadmin puede activar licencias")
    
    # Deactivate all existing licenses
    db.query(models.License).update({"is_active": False})
    
    # Find and activate the new license
    license = db.query(models.License).filter(
        models.License.license_key == license_key
    ).first()
    
    if not license:
        raise HTTPException(status_code=404, detail="Licencia no encontrada")
    
    license.is_active = True
    db.commit()
    
    return {"message": "Licencia activada exitosamente", "license_key": license_key}

@router.get("/license/info", response_model=LicenseInfo)
def get_license_info(
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    """Get detailed license information"""
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver información de licencia")
    
    license = LicenseService.get_active_license(db)
    
    if not license:
        raise HTTPException(status_code=404, detail="No se encontró licencia activa")
    
    return license
