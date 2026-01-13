"""
License Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class LicenseBase(BaseModel):
    """Base License schema"""
    pass


class LicenseCreate(LicenseBase):
    """Create License schema"""
    pass


class LicenseUpdate(BaseModel):
    """Update License schema"""
    pass


class LicenseInDB(LicenseBase):
    """Database License schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class LicenseResponse(LicenseInDB):
    """Response License schema"""
    pass
