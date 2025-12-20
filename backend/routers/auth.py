from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import models
import schemas
from dependencies import get_db, get_current_active_user
from utils.auth import verify_password, get_password_hash, create_access_token
from settings import settings

router = APIRouter()

@router.post("/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    db_user = db.query(models.User).filter(
        (models.User.email == user.email) | (models.User.username == user.username)
    ).first()
    
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Email or username already registered"
        )
    
    # Check allowed domains
    email_domain = user.email.split('@')[-1]
    allowed_domain = db.query(models.AllowedDomain).filter(
        models.AllowedDomain.domain == email_domain,
        models.AllowedDomain.is_active == True
    ).first()
    
    is_active = False
    if allowed_domain:
        is_active = True
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=hashed_password,
        is_active=is_active,
        preferred_language=user.preferred_language or 'en'
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Notify superadmins if user needs approval
    if not is_active:
        # Create in-app notifications
        superadmins = db.query(models.User).filter(models.User.role == models.RoleType.SUPERADMIN.value).all()
        for admin in superadmins:
            notification = models.Notification(
                user_id=admin.id,
                title="New User Registration",
                message=f"User {user.username} ({user.email}) has registered and requires approval.",
                type="warning"
            )
            db.add(notification)
        db.commit()
        
        # Send email notifications
        try:
            from services.email_service import notify_superadmins_new_user
            notify_superadmins_new_user(db, user.email, user.username)
        except Exception as e:
            # Log error but don't fail registration
            import logging
            logging.error(f"Failed to send email notifications: {e}")
    
    return db_user

@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login and get access token"""
    # Authenticate user
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user

@router.put("/me/preferences")
def update_preferences(
    preferences: schemas.NotificationPreferences,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user notification preferences"""
    current_user.notify_new_users = preferences.notify_new_users
    current_user.notify_security_alerts = preferences.notify_security_alerts
    current_user.notify_new_servers = preferences.notify_new_servers
    current_user.notify_system_events = preferences.notify_system_events
    current_user.notify_version_updates = preferences.notify_version_updates
    
    db.commit()
    return {"status": "success"}

# ==================== MICROSOFT OAUTH ====================

import httpx
import json
from typing import Optional
from pydantic import BaseModel

class MicrosoftAuthRequest(BaseModel):
    code: str
    redirect_uri: str

@router.get("/microsoft/config")
def get_microsoft_config(db: Session = Depends(get_db)):
    """Get Microsoft OAuth configuration status"""
    client_id = db.query(models.SystemConfig).filter(
        models.SystemConfig.key == "microsoft_client_id"
    ).first()
    
    tenant_id = db.query(models.SystemConfig).filter(
        models.SystemConfig.key == "microsoft_tenant_id"
    ).first()
    
    return {
        "enabled": bool(client_id and client_id.value),
        "clientId": client_id.value if client_id else None,
        "tenantId": tenant_id.value if tenant_id else "common"
    }

@router.post("/microsoft/callback", response_model=schemas.Token)
async def microsoft_callback(
    auth_data: MicrosoftAuthRequest,
    db: Session = Depends(get_db)
):
    """Handle Microsoft OAuth callback"""
    # Get configuration
    client_id = db.query(models.SystemConfig).filter(models.SystemConfig.key == "microsoft_client_id").first()
    client_secret = db.query(models.SystemConfig).filter(models.SystemConfig.key == "microsoft_client_secret").first()
    tenant_id = db.query(models.SystemConfig).filter(models.SystemConfig.key == "microsoft_tenant_id").first()
    
    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Microsoft OAuth not configured")
        
    tenant = tenant_id.value if tenant_id else "common"
    
    # Exchange code for token
    token_url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
    data = {
        "client_id": client_id.value,
        "client_secret": client_secret.value,
        "code": auth_data.code,
        "redirect_uri": auth_data.redirect_uri,
        "grant_type": "authorization_code"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=data)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to authenticate with Microsoft")
        
        token_data = response.json()
        access_token = token_data.get("access_token")
        
        # Get user info
        user_info_response = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if user_info_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info from Microsoft")
            
        user_info = user_info_response.json()
        
    # Process user
    microsoft_id = user_info.get("id")
    email = user_info.get("mail") or user_info.get("userPrincipalName")
    full_name = user_info.get("displayName")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Microsoft")
        
    # Check if user exists
    user = db.query(models.User).filter(
        (models.User.microsoft_id == microsoft_id) | (models.User.email == email)
    ).first()
    
    if user:
        # Update existing user
        if not user.microsoft_id:
            user.microsoft_id = microsoft_id
        if not user.full_name and full_name:
            user.full_name = full_name
        db.commit()
    else:
        # Create new user
        # Check allowed domains
        email_domain = email.split('@')[-1]
        allowed_domain = db.query(models.AllowedDomain).filter(
            models.AllowedDomain.domain == email_domain,
            models.AllowedDomain.is_active == True
        ).first()
        
        is_active = True if allowed_domain else False
        
        # Generate random username from email
        username = email.split('@')[0]
        # Ensure username uniqueness
        counter = 1
        original_username = username
        while db.query(models.User).filter(models.User.username == username).first():
            username = f"{original_username}{counter}"
            counter += 1
            
        user = models.User(
            email=email,
            username=username,
            full_name=full_name,
            microsoft_id=microsoft_id,
            is_active=is_active,
            role=models.RoleType.USER.value
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Notify admins if inactive
        if not is_active:
            from services.email_service import notify_superadmins_new_user
            try:
                notify_superadmins_new_user(db, email, username)
            except:
                pass

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account pending approval")

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
