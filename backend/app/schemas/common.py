"""
Common Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class CommonBase(BaseModel):
    """Base Common schema"""
    pass


class CommonCreate(CommonBase):
    """Create Common schema"""
    pass


class CommonUpdate(BaseModel):
    """Update Common schema"""
    pass


class CommonInDB(CommonBase):
    """Database Common schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CommonResponse(CommonInDB):
    """Response Common schema"""
    pass
