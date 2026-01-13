"""
Mali Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class MaliBase(BaseModel):
    """Base Mali schema"""
    pass


class MaliCreate(MaliBase):
    """Create Mali schema"""
    pass


class MaliUpdate(BaseModel):
    """Update Mali schema"""
    pass


class MaliInDB(MaliBase):
    """Database Mali schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class MaliResponse(MaliInDB):
    """Response Mali schema"""
    pass
