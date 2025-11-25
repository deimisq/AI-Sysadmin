from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from database import get_db
from models import SystemConfig, User
from dependencies import get_current_active_user
from utils.permissions import require_role
from models import RoleType
import json

router = APIRouter(prefix="/config", tags=["configuration"])

@router.get("/{category}")
@require_role([RoleType.SUPERADMIN, RoleType.ADMIN])
async def get_config_by_category(
    category: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all configuration for a specific category"""
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
@require_role([RoleType.SUPERADMIN, RoleType.ADMIN])
async def get_all_config(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all configuration grouped by category"""
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
@require_role([RoleType.SUPERADMIN, RoleType.ADMIN])
async def update_config_category(
    category: str,
    config_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update multiple configuration values for a category"""
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
@require_role([RoleType.SUPERADMIN])
async def delete_config(
    category: str,
    key: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a specific configuration value"""
    config = db.query(SystemConfig).filter(
        SystemConfig.key == key,
        SystemConfig.category == category
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    db.delete(config)
    db.commit()
    
    return {"message": "Configuration deleted successfully"}
