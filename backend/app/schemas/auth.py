"""
Auth Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class AuthBase(BaseModel):
    """Base Auth schema"""
    pass


class AuthCreate(AuthBase):
    """Create Auth schema"""
    pass


class AuthUpdate(BaseModel):
    """Update Auth schema"""
    pass


class AuthInDB(AuthBase):
    """Database Auth schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AuthResponse(AuthInDB):
    """Response Auth schema"""
    pass
