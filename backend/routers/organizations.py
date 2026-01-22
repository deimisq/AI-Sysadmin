from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from database import get_db
from models import Organization, User, RoleType
from schemas import Organization as OrganizationSchema, OrganizationCreate, OrganizationUpdate, OrganizationRegisterRequest
from dependencies import get_current_active_user, get_current_superuser
from utils.auth import get_password_hash

router = APIRouter(
    prefix="/organizations",
    tags=["organizations"]
)

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_organization(
    data: OrganizationRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to register a new organization and its first admin user.
    """
    # 1. Check if user email already exists
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )
    
    # 2. Check if organization name exists
    if db.query(Organization).filter(Organization.name == data.org_name).first():
         raise HTTPException(
            status_code=400,
            detail="Organization with this name already exists"
        )
        
    # 3. Create Organization
    # Generate slug from name (simple version)
    slug = data.org_name.lower().replace(" ", "-")
    # Ensure unique slug
    base_slug = slug
    counter = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
        
    org = Organization(
        name=data.org_name,
        slug=slug,
        subscription_tier=data.plan
    )
    db.add(org)
    db.flush() # flush to get org.id
    
    # 4. Create Admin User
    hashed_password = get_password_hash(data.password)
    
    # Generate verification token
    from datetime import datetime, timedelta
    verification_token = str(uuid.uuid4())
    verification_token_expires = datetime.utcnow() + timedelta(days=7)
    
    user = User(
        email=data.email,
        username=data.email.split("@")[0], # Simple username generation
        hashed_password=hashed_password,
        full_name=data.admin_name,
        role=RoleType.ADMIN.value, # Organization Admin
        organization_id=org.id,
        is_active=False, # Wait for verification
        verification_token=verification_token,
        verification_token_expires_at=verification_token_expires
    )
    db.add(user)
    
    try:
        db.commit()
        db.refresh(org)
        
        # Trigger verification email
        try:
            from services.email_service import send_verification_email
            send_verification_email(db, user.email, user.full_name, user.verification_token)
        except Exception as email_error:
            # Don't fail registration if email fails
            print(f"Failed to send verification email: {email_error}")
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Organization registered successfully", "organization_id": org.id}

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
