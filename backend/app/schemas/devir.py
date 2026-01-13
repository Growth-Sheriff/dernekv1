"""
Devir Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class DevirBase(BaseModel):
    """Base Devir schema"""
    pass


class DevirCreate(DevirBase):
    """Create Devir schema"""
    pass


class DevirUpdate(BaseModel):
    """Update Devir schema"""
    pass


class DevirInDB(DevirBase):
    """Database Devir schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DevirResponse(DevirInDB):
    """Response Devir schema"""
    pass
