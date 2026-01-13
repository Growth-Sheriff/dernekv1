"""
Uye Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class UyeBase(BaseModel):
    """Base Uye schema"""
    pass


class UyeCreate(UyeBase):
    """Create Uye schema"""
    pass


class UyeUpdate(BaseModel):
    """Update Uye schema"""
    pass


class UyeInDB(UyeBase):
    """Database Uye schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UyeResponse(UyeInDB):
    """Response Uye schema"""
    pass
