from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# Documentation Schemas
class DocumentationArticleBase(BaseModel):
    title: str
    description: Optional[str] = None
    content: str
    icon: Optional[str] = "FileText"
    category: str = "general"
    order: int = 0
    published: bool = False

class DocumentationArticleCreate(DocumentationArticleBase):
    slug: str  # URL-friendly identifier

class DocumentationArticleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    order: Optional[int] = None
    published: Optional[bool] = None
    slug: Optional[str] = None

class DocumentationArticleResponse(DocumentationArticleBase):
    id: int
    slug: str
    author_id: Optional[int]
    last_edited_by_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    # Optional author info
    author_name: Optional[str] = None
    last_edited_by_name: Optional[str] = None
    
    class Config:
        from_attributes = True
