"""
Tenants API - Super Admin Only
CRUD operations for tenant (dernek) management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid

from app.db import get_session
from app.models.base import Tenant, User
from app.api.auth import get_current_user

router = APIRouter()

# ==================== MODELS ====================
class TenantCreate(BaseModel):
    name: str
    slug: str
    contact_email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    max_users: int = 10
    max_storage_mb: int = 1024
    status: str = "active"

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    max_users: Optional[int] = None
    max_storage_mb: Optional[int] = None
    status: Optional[str] = None

class TenantResponse(BaseModel):
    id: str
    name: str
    slug: str
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    status: str
    max_users: int
    max_storage_mb: int
    created_at: Optional[str] = None

# ==================== AUTH CHECK ====================
def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Only super_admin can access these endpoints"""
    if current_user.role.upper() != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin yetkisi gerekli"
        )
    return current_user

# ==================== ENDPOINTS ====================
@router.get("", response_model=List[TenantResponse])
async def list_tenants(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """List all tenants"""
    tenants = session.exec(select(Tenant)).all()
    return [
        TenantResponse(
            id=str(t.id),
            name=t.name,
            slug=t.slug,
            contact_email=t.contact_email,
            phone=getattr(t, 'phone', None),
            status=getattr(t, 'status', 'active'),
            max_users=getattr(t, 'max_users', 10),
            max_storage_mb=getattr(t, 'max_storage_mb', 1024),
            created_at=str(t.created_at) if t.created_at else None
        )
        for t in tenants
    ]

@router.post("", response_model=TenantResponse)
async def create_tenant(
    data: TenantCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """Create a new tenant"""
    # Check if slug already exists
    existing = session.exec(select(Tenant).where(Tenant.slug == data.slug)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu slug zaten kullanılıyor"
        )
    
    tenant = Tenant(
        id=str(uuid.uuid4()),
        name=data.name,
        slug=data.slug,
        contact_email=data.contact_email,
        phone=data.phone,
        address=data.address,
        status=data.status,
        max_users=data.max_users,
        max_storage_mb=data.max_storage_mb,
        created_at=datetime.utcnow()
    )
    
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    
    return TenantResponse(
        id=str(tenant.id),
        name=tenant.name,
        slug=tenant.slug,
        contact_email=tenant.contact_email,
        phone=getattr(tenant, 'phone', None),
        status=getattr(tenant, 'status', 'active'),
        max_users=getattr(tenant, 'max_users', 10),
        max_storage_mb=getattr(tenant, 'max_storage_mb', 1024),
        created_at=str(tenant.created_at) if tenant.created_at else None
    )

@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """Get a specific tenant"""
    tenant = session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dernek bulunamadı"
        )
    
    return TenantResponse(
        id=str(tenant.id),
        name=tenant.name,
        slug=tenant.slug,
        contact_email=tenant.contact_email,
        phone=getattr(tenant, 'phone', None),
        status=getattr(tenant, 'status', 'active'),
        max_users=getattr(tenant, 'max_users', 10),
        max_storage_mb=getattr(tenant, 'max_storage_mb', 1024),
        created_at=str(tenant.created_at) if tenant.created_at else None
    )

@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: str,
    data: TenantUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """Update a tenant"""
    tenant = session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dernek bulunamadı"
        )
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tenant, key, value)
    
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    
    return TenantResponse(
        id=str(tenant.id),
        name=tenant.name,
        slug=tenant.slug,
        contact_email=tenant.contact_email,
        phone=getattr(tenant, 'phone', None),
        status=getattr(tenant, 'status', 'active'),
        max_users=getattr(tenant, 'max_users', 10),
        max_storage_mb=getattr(tenant, 'max_storage_mb', 1024),
        created_at=str(tenant.created_at) if tenant.created_at else None
    )

@router.delete("/{tenant_id}")
async def delete_tenant(
    tenant_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """Delete a tenant"""
    tenant = session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dernek bulunamadı"
        )
    
    session.delete(tenant)
    session.commit()
    
    return {"success": True, "message": "Dernek silindi"}
