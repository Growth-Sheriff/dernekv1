"""
Role Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class RoleBase(BaseModel):
    """Base Role schema"""
    pass


class RoleCreate(RoleBase):
    """Create Role schema"""
    pass


class RoleUpdate(BaseModel):
    """Update Role schema"""
    pass


class RoleInDB(RoleBase):
    """Database Role schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class RoleResponse(RoleInDB):
    """Response Role schema"""
    pass
