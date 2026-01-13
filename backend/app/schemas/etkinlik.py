"""
Etkinlik Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class EtkinlikBase(BaseModel):
    """Base Etkinlik schema"""
    pass


class EtkinlikCreate(EtkinlikBase):
    """Create Etkinlik schema"""
    pass


class EtkinlikUpdate(BaseModel):
    """Update Etkinlik schema"""
    pass


class EtkinlikInDB(EtkinlikBase):
    """Database Etkinlik schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class EtkinlikResponse(EtkinlikInDB):
    """Response Etkinlik schema"""
    pass
