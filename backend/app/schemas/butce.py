"""
Butce Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class ButceBase(BaseModel):
    """Base Butce schema"""
    pass


class ButceCreate(ButceBase):
    """Create Butce schema"""
    pass


class ButceUpdate(BaseModel):
    """Update Butce schema"""
    pass


class ButceInDB(ButceBase):
    """Database Butce schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ButceResponse(ButceInDB):
    """Response Butce schema"""
    pass
