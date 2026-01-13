"""
Koy Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class KoyBase(BaseModel):
    """Base Koy schema"""
    pass


class KoyCreate(KoyBase):
    """Create Koy schema"""
    pass


class KoyUpdate(BaseModel):
    """Update Koy schema"""
    pass


class KoyInDB(KoyBase):
    """Database Koy schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class KoyResponse(KoyInDB):
    """Response Koy schema"""
    pass
