"""
User Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    """Base User schema"""
    pass


class UserCreate(UserBase):
    """Create User schema"""
    pass


class UserUpdate(BaseModel):
    """Update User schema"""
    pass


class UserInDB(UserBase):
    """Database User schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserResponse(UserInDB):
    """Response User schema"""
    pass
