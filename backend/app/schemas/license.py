"""
License Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


from app.models.base import LicenseType

class LicenseBase(BaseModel):
    """Base License schema"""
    key: str
    license_type: LicenseType = LicenseType.STANDARD
    start_date: datetime
    end_date: datetime
    is_active: bool = True

class LicenseCreate(LicenseBase):
    """Create License schema"""
    tenant_id: str

class LicenseUpdate(BaseModel):
    """Update License schema"""
    license_type: Optional[LicenseType] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None

class LicenseInDB(LicenseBase):
    """Database License schema"""
    id: UUID4
    tenant_id: UUID4
    
    class Config:
        from_attributes = True

class LicenseResponse(LicenseInDB):
    """Response License schema"""
    pass
