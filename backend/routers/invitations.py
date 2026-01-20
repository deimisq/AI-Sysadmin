from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import secrets
import models
import schemas
from dependencies import get_db, get_current_active_user
from models import RoleType

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
    expires_at = datetime.utcnow() + timedelta(days=7) # 7 days validity
    
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
