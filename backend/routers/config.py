from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import Dict, Any
from database import get_db
from models import SystemConfig, User, RoleType, License
from dependencies import get_current_active_user
import json
from datetime import datetime

router = APIRouter(tags=["configuration"])

@router.get("/license")
async def get_license_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current license status"""
    check_admin_role(current_user)
    
    license = db.query(License).first()
    
    if not license:
        raise HTTPException(status_code=404, detail="No license found")
    
    # Calculate days remaining
    now = datetime.now()
    days_remaining = (license.expiration_date - now).days if license.expiration_date > now else 0
    
    # Update status if expired
    if days_remaining <= 0 and license.status == "ACTIVE":
        license.status = "EXPIRED"
        db.commit()
    
    return {
        "type": license.type,
        "status": license.status,
        "start_date": license.start_date.isoformat(),
        "expiration_date": license.expiration_date.isoformat(),
        "days_remaining": days_remaining,
        "installation_id": license.installation_id
    }

def check_admin_role(user: User):
    """Check if user has admin or superadmin role"""
    if user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

@router.get("/{category}")
async def get_config_by_category(
    category: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all configuration for a specific category"""
    check_admin_role(current_user)
    
    configs = db.query(SystemConfig).filter(SystemConfig.category == category).all()
    
    result = {}
    for config in configs:
        try:
            # Parse JSON value
            result[config.key] = json.loads(config.value) if config.value else None
        except json.JSONDecodeError:
            # If not JSON, return as string
            result[config.key] = config.value
    
    return result

@router.get("/")
async def get_all_config(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all configuration grouped by category"""
    check_admin_role(current_user)
    
    configs = db.query(SystemConfig).all()
    
    result = {}
    for config in configs:
        if config.category not in result:
            result[config.category] = {}
        
        try:
            result[config.category][config.key] = json.loads(config.value) if config.value else None
        except json.JSONDecodeError:
            result[config.category][config.key] = config.value
    
    return result

@router.put("/{category}")
async def update_config_category(
    category: str,
    config_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update multiple configuration values for a category"""
    check_admin_role(current_user)
    
    updated_keys = []
    
    for key, value in config_data.items():
        # Check if config exists
        config = db.query(SystemConfig).filter(
            SystemConfig.key == key,
            SystemConfig.category == category
        ).first()
        
        # Convert value to JSON string
        json_value = json.dumps(value) if not isinstance(value, str) else value
        
        if config:
            config.value = json_value
            config.updated_at = func.now()
        else:
            # Create new config
            config = SystemConfig(
                key=key,
                value=json_value,
                category=category,
                is_secret=False
            )
            db.add(config)
        
        updated_keys.append(key)
    
    db.commit()
    
    return {
        "message": f"Updated {len(updated_keys)} configuration values",
        "category": category,
        "updated_keys": updated_keys
    }

@router.delete("/{category}/{key}")
async def delete_config(
    category: str,
    key: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a specific configuration value"""
    # Only superadmin can delete config
    if current_user.role != RoleType.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only superadmin can delete configuration")
    
    config = db.query(SystemConfig).filter(
        SystemConfig.key == key,
        SystemConfig.category == category
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    db.delete(config)
    db.commit()
    
    return {"message": "Configuration deleted successfully"}
