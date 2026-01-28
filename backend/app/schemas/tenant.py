"""
Tenant Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class TenantBase(BaseModel):
    """Base Tenant schema"""
    name: str
    slug: str
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    max_users: int = 100
    max_storage_mb: int = 1000
    status: str = "active"


class TenantCreate(TenantBase):
    """Create Tenant schema"""
    pass


class TenantUpdate(BaseModel):
    """Update Tenant schema"""
    name: Optional[str] = None
    slug: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    max_users: Optional[int] = None
    max_storage_mb: Optional[int] = None
    status: Optional[str] = None


class TenantInDB(TenantBase):
    """Database Tenant schema"""
    id: UUID4
    created_at: datetime
    
    class Config:
        from_attributes = True


class TenantResponse(TenantInDB):
    """Response Tenant schema"""
    pass
