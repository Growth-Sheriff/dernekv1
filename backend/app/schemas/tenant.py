"""
Tenant Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class TenantBase(BaseModel):
    """Base Tenant schema"""
    pass


class TenantCreate(TenantBase):
    """Create Tenant schema"""
    pass


class TenantUpdate(BaseModel):
    """Update Tenant schema"""
    pass


class TenantInDB(TenantBase):
    """Database Tenant schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TenantResponse(TenantInDB):
    """Response Tenant schema"""
    pass
