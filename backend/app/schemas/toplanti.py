"""
Toplanti Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class ToplantiBase(BaseModel):
    """Base Toplanti schema"""
    pass


class ToplantiCreate(ToplantiBase):
    """Create Toplanti schema"""
    pass


class ToplantiUpdate(BaseModel):
    """Update Toplanti schema"""
    pass


class ToplantiInDB(ToplantiBase):
    """Database Toplanti schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ToplantiResponse(ToplantiInDB):
    """Response Toplanti schema"""
    pass
