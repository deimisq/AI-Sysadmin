from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta, timezone
import secrets
import models
import schemas
from dependencies import get_db, get_current_active_user
from models import RoleType
from utils.auth import get_password_hash

router = APIRouter()

@router.post("/", response_model=schemas.Invitation)
def create_invitation(
    invitation: schemas.InvitationCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new user invitation"""
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Org check
    org_id = current_user.organization_id
    if current_user.is_superuser:
        if invitation.organization_id:
             org_id = invitation.organization_id
    else:
        # Non-superusers can only invite to their org
        if invitation.organization_id and invitation.organization_id != current_user.organization_id:
             raise HTTPException(status_code=403, detail="Cannot invite to another organization")
        org_id = current_user.organization_id # Enforce

    # generate token
    token = secrets.token_urlsafe(32)
    # Use timezone aware UTC
    expires_at = datetime.now(timezone.utc) + timedelta(days=7) # 7 days validity
    
    db_invitation = models.Invitation(
        email=invitation.email,
        role=invitation.role,
        organization_id=org_id,
        token=token,
        expires_at=expires_at,
        created_by_id=current_user.id
    )
    db.add(db_invitation)
    db.commit()
    db.refresh(db_invitation)
    
    # Send invitation email
    try:
        from services.email_service import send_invitation_email
        
        # Get inviter info
        inviter_name = current_user.full_name or current_user.username
        
        # Get organization name if applicable
        org_name = None
        if org_id:
            org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
            if org:
                org_name = org.name
        
        send_invitation_email(
            db=db,
            invitation_email=invitation.email,
            invitation_token=token,
            inviter_name=inviter_name,
            organization_name=org_name
        )
    except Exception as e:
        # Log error but don't fail the invitation creation
        print(f"Failed to send invitation email: {e}")
    
    return db_invitation

@router.get("/", response_model=List[schemas.Invitation])
def list_invitations(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    query = db.query(models.Invitation).filter(models.Invitation.accepted == False)
    
    if not current_user.is_superuser:
        if current_user.organization_id:
            query = query.filter(models.Invitation.organization_id == current_user.organization_id)
        
    return query.all()

@router.delete("/{invitation_id}")
def delete_invitation(
    invitation_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    query = db.query(models.Invitation).filter(models.Invitation.id == invitation_id)
    if not current_user.is_superuser:
         if current_user.organization_id:
            query = query.filter(models.Invitation.organization_id == current_user.organization_id)
        
    invitation = query.first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
        
    db.delete(invitation)
    db.commit()
    return {"message": "Invitation deleted"}


# Public endpoint - no authentication required
@router.post("/accept/{token}")
def accept_invitation(
    token: str,
    user_data: dict,  # {username, password, full_name}
    db: Session = Depends(get_db)
):
    """Accept an invitation and create user account (public endpoint)"""
    
    # Find invitation by token
    invitation = db.query(models.Invitation).filter(
        models.Invitation.token == token,
        models.Invitation.accepted == False
    ).first()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation")
    
    # Check if expired (use timezone aware UTC)
    if invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation has expired")
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(
        (models.User.email == invitation.email) | 
        (models.User.username == user_data.get("username"))
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create user
    new_user = models.User(
        email=invitation.email,
        username=user_data.get("username"),
        hashed_password=get_password_hash(user_data.get("password")),
        full_name=user_data.get("full_name"),
        role=invitation.role,
        is_active=True,
        organization_id=invitation.organization_id
    )
    
    db.add(new_user)
    
    # Mark invitation as accepted
    invitation.accepted = True
    
    db.commit()
    db.refresh(new_user)
    
    return {
        "message": "Account created successfully",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email
        }
    }


# Public endpoint to get invitation details (for pre-filling form)
@router.get("/details/{token}")
def get_invitation_details(
    token: str,
    db: Session = Depends(get_db)
):
    """Get invitation details by token (public endpoint)"""
    
    invitation = db.query(models.Invitation).filter(
        models.Invitation.token == token,
        models.Invitation.accepted == False
    ).first()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation")
    
    # Check if expired
    if invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation has expired")
    
    # Get organization name
    org_name = None
    if invitation.organization_id:
        org = db.query(models.Organization).filter(
            models.Organization.id == invitation.organization_id
        ).first()
        if org:
            org_name = org.name
    
    return {
        "email": invitation.email,
        "role": invitation.role,
        "organization_name": org_name,
        "expires_at": invitation.expires_at
    }
