"""
Aidat Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional



class AidatBase(BaseModel):
    """Base Aidat schema"""
    uye_id: UUID4
    yil: int
    ay: int
    tutar: float = 0.0
    odenen: float = 0.0
    odeme_tarihi: Optional[datetime] = None
    durum: str = "beklemede"


class AidatCreate(AidatBase):
    """Create Aidat schema"""
    pass


class AidatUpdate(BaseModel):
    """Update Aidat schema"""
    uye_id: Optional[UUID4] = None
    yil: Optional[int] = None
    ay: Optional[int] = None
    tutar: Optional[float] = None
    odenen: Optional[float] = None
    odeme_tarihi: Optional[datetime] = None
    durum: Optional[str] = None


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

