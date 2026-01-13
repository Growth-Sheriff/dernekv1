"""
Belge Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class BelgeBase(BaseModel):
    """Base Belge schema"""
    pass


class BelgeCreate(BelgeBase):
    """Create Belge schema"""
    pass


class BelgeUpdate(BaseModel):
    """Update Belge schema"""
    pass


class BelgeInDB(BelgeBase):
    """Database Belge schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class BelgeResponse(BelgeInDB):
    """Response Belge schema"""
    pass
