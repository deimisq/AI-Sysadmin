from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Organization, User, RoleType
from schemas import Organization as OrganizationSchema, OrganizationCreate, OrganizationUpdate
from dependencies import get_current_active_user, get_current_superuser

router = APIRouter(
    prefix="/organizations",
    tags=["organizations"]
)

@router.post("/", response_model=OrganizationSchema)
def create_organization(
    org: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """
    Create a new organization (Superuser only).
    """
    # Verify uniqueness
    if db.query(Organization).filter(Organization.slug == org.slug).first():
        raise HTTPException(status_code=400, detail="Organization slug already registered")
    if db.query(Organization).filter(Organization.name == org.name).first():
        raise HTTPException(status_code=400, detail="Organization name already registered")

    db_org = Organization(**org.dict())
    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return db_org

@router.get("/", response_model=List[OrganizationSchema])
def list_organizations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List organizations.
    Superusers see all.
    Normal users see only their own organization.
    """
    if current_user.is_superuser:
        return db.query(Organization).offset(skip).limit(limit).all()
    
    if current_user.organization_id:
        org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
        return [org] if org else []
        
    return []

@router.get("/{org_id}", response_model=OrganizationSchema)
def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get organization details.
    """
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    # Permission check
    if not current_user.is_superuser and current_user.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    return org

@router.put("/{org_id}", response_model=OrganizationSchema)
def update_organization(
    org_id: int,
    org_update: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update organization details.
    Restricted to Superuser or Organization Admin.
    """
    db_org = db.query(Organization).filter(Organization.id == org_id).first()
    if not db_org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check permissions
    if not current_user.is_superuser:
        # Must belong to org AND be an ADMIN
        if current_user.organization_id != org_id:
             raise HTTPException(status_code=403, detail="Not enough permissions")
        
        # Check role
        if current_user.role != RoleType.ADMIN.value and current_user.role != RoleType.SUPERADMIN.value:
            raise HTTPException(status_code=403, detail="Only admins can update organization settings")

    update_data = org_update.dict(exclude_unset=True)
    
    # Prevent normal admins from changing sensitive fields like subscription_tier if we wanted
    # But for now allow all in schema
    
    for key, value in update_data.items():
        setattr(db_org, key, value)

    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return db_org
