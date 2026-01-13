"""
Aidat Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class AidatBase(BaseModel):
    """Base Aidat schema"""
    pass


class AidatCreate(AidatBase):
    """Create Aidat schema"""
    pass


class AidatUpdate(BaseModel):
    """Update Aidat schema"""
    pass


class AidatInDB(AidatBase):
    """Database Aidat schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AidatResponse(AidatInDB):
    """Response Aidat schema"""
    pass
