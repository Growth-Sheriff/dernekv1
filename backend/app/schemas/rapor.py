"""
Rapor Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class RaporBase(BaseModel):
    """Base Rapor schema"""
    pass


class RaporCreate(RaporBase):
    """Create Rapor schema"""
    pass


class RaporUpdate(BaseModel):
    """Update Rapor schema"""
    pass


class RaporInDB(RaporBase):
    """Database Rapor schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class RaporResponse(RaporInDB):
    """Response Rapor schema"""
    pass
