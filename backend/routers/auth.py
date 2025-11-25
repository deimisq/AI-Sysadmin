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
        is_active=is_active
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
