"""
Sync Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class SyncBase(BaseModel):
    """Base Sync schema"""
    pass


class SyncCreate(SyncBase):
    """Create Sync schema"""
    pass


class SyncUpdate(BaseModel):
    """Update Sync schema"""
    pass


class SyncInDB(SyncBase):
    """Database Sync schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SyncResponse(SyncInDB):
    """Response Sync schema"""
    pass
