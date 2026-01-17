from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import models
import schemas_documentation
from dependencies import get_db, get_current_active_user
from models import RoleType, PermissionType
from utils.permissions import has_permission
from datetime import datetime
import os
import uuid
from pathlib import Path

router = APIRouter()

# Helper function to check documentation permissions
def can_edit_documentation(user: models.User) -> bool:
    """Check if user can edit documentation"""
    return user.role in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]

def can_create_documentation(user: models.User) -> bool:
    """Check if user can create documentation"""
    return user.role in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]

def can_delete_documentation(user: models.User) -> bool:
    """Check if user can delete documentation"""
    return user.role in [RoleType.SUPERADMIN.value, RoleType.ADMIN.value]

# ==================== DOCUMENTATION CRUD ====================

@router.get("/articles", response_model=List[schemas_documentation.DocumentationArticleResponse])
def list_articles(
    published_only: bool = False,
    category: Optional[str] = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all documentation articles. Regular users only see published ones."""
    query = db.query(models.DocumentationArticle)
    
    # Regular users only see published articles
    if not can_edit_documentation(current_user) or published_only:
        query = query.filter(models.DocumentationArticle.published == True)
    
    # Filter by category
    if category:
        query = query.filter(models.DocumentationArticle.category == category)
    
    # Order by order field, then by title
    articles = query.order_by(
        models.DocumentationArticle.order,
        models.DocumentationArticle.title
    ).all()
    
    # Enrich with author names
    result = []
    for article in articles:
        article_dict = {
            "id": article.id,
            "slug": article.slug,
            "title": article.title,
            "description": article.description,
            "content": article.content,
            "icon": article.icon,
            "category": article.category,
            "order": article.order,
            "published": article.published,
            "author_id": article.author_id,
            "last_edited_by_id": article.last_edited_by_id,
            "created_at": article.created_at,
            "updated_at": article.updated_at,
            "author_name": article.author.username if article.author else None,
            "last_edited_by_name": article.last_edited_by.username if article.last_edited_by else None
        }
        result.append(article_dict)
    
    return result

@router.get("/articles/{slug}", response_model=schemas_documentation.DocumentationArticleResponse)
def get_article(
    slug: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific documentation article by slug"""
    article = db.query(models.DocumentationArticle).filter(
        models.DocumentationArticle.slug == slug
    ).first()
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Check if user can see unpublished articles
    if not article.published and not can_edit_documentation(current_user):
        raise HTTPException(status_code=404, detail="Article not found")
    
    return {
        "id": article.id,
        "slug": article.slug,
        "title": article.title,
        "description": article.description,
        "content": article.content,
        "icon": article.icon,
        "category": article.category,
        "order": article.order,
        "published": article.published,
        "author_id": article.author_id,
        "last_edited_by_id": article.last_edited_by_id,
        "created_at": article.created_at,
        "updated_at": article.updated_at,
        "author_name": article.author.username if article.author else None,
        "last_edited_by_name": article.last_edited_by.username if article.last_edited_by else None
    }

@router.post("/articles", response_model=schemas_documentation.DocumentationArticleResponse)
def create_article(
    article: schemas_documentation.DocumentationArticleCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new documentation article (admin only)"""
    if not can_create_documentation(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to create documentation")
    
    # Check if slug already exists
    existing = db.query(models.DocumentationArticle).filter(
        models.DocumentationArticle.slug == article.slug
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Article with this slug already exists")
    
    # Create new article
    new_article = models.DocumentationArticle(
        slug=article.slug,
        title=article.title,
        description=article.description,
        content=article.content,
        icon=article.icon,
        category=article.category,
        order=article.order,
        published=article.published,
        author_id=current_user.id,
        last_edited_by_id=current_user.id
    )
    
    db.add(new_article)
    db.commit()
    db.refresh(new_article)
    
    return {
        **article.dict(),
        "id": new_article.id,
        "author_id": current_user.id,
        "last_edited_by_id": current_user.id,
        "created_at": new_article.created_at,
        "updated_at": new_article.updated_at,
        "author_name": current_user.username,
        "last_edited_by_name": current_user.username
    }

@router.put("/articles/{article_id}", response_model=schemas_documentation.DocumentationArticleResponse)
def update_article(
    article_id: int,
    article_update: schemas_documentation.DocumentationArticleUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a documentation article (admin only)"""
    if not can_edit_documentation(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to edit documentation")
    
    # Get existing article
    article = db.query(models.DocumentationArticle).filter(
        models.DocumentationArticle.id == article_id
    ).first()
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Update fields
    update_data = article_update.dict(exclude_unset=True)
    
    # Check if slug already exists (if changing slug)
    if "slug" in update_data and update_data["slug"] != article.slug:
        existing = db.query(models.DocumentationArticle).filter(
            models.DocumentationArticle.slug == update_data["slug"]
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Article with this slug already exists")
    
    for field, value in update_data.items():
        setattr(article, field, value)
    
    # Update last_edited_by
    article.last_edited_by_id = current_user.id
    
    db.commit()
    db.refresh(article)
    
    return {
        "id": article.id,
        "slug": article.slug,
        "title": article.title,
        "description": article.description,
        "content": article.content,
        "icon": article.icon,
        "category": article.category,
        "order": article.order,
        "published": article.published,
        "author_id": article.author_id,
        "last_edited_by_id": article.last_edited_by_id,
        "created_at": article.created_at,
        "updated_at": article.updated_at,
        "author_name": article.author.username if article.author else None,
        "last_edited_by_name": article.last_edited_by.username if article.last_edited_by else None
    }

@router.delete("/articles/{article_id}")
def delete_article(
    article_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a documentation article (admin only)"""
    if not can_delete_documentation(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to delete documentation")
    
    article = db.query(models.DocumentationArticle).filter(
        models.DocumentationArticle.id == article_id
    ).first()
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    db.delete(article)
    db.commit()
    
    return {"message": "Article deleted successfully"}

# ==================== IMAGE UPLOAD ====================

from desktop_config import get_desktop_data_dir, DESKTOP_MODE

# Directory for article images
if DESKTOP_MODE:
    UPLOAD_DIR = get_desktop_data_dir() / "uploads" / "documentation"
else:
    UPLOAD_DIR = Path("/app/uploads/documentation")

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload an image for documentation articles (admin only)"""
    if not can_edit_documentation(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to upload images")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only images allowed.")
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Return URL
    image_url = f"/api/v1/documentation/images/{unique_filename}"
    
    return {"url": image_url, "filename": unique_filename}

@router.get("/images/{filename}")
async def get_image(filename: str):
    """Serve uploaded images"""
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    from fastapi.responses import FileResponse
    return FileResponse(file_path)

# ==================== CATEGORIES ====================

@router.get("/categories")
def get_categories(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all documentation categories"""
    # Get distinct categories
    categories = db.query(models.DocumentationArticle.category).distinct().all()
    
    return [cat[0] for cat in categories if cat[0]]
