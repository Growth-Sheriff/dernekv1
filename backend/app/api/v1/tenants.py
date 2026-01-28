"""
Tenants API Routes
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.db import get_session
from app.api.auth import get_current_user
from app.models.base import User, Tenant, UserRole
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse

router = APIRouter()


@router.get("/", response_model=List[TenantResponse])
async def list_tenants(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Kullanıcının erişebildiği tenant'ları listeler.
    Super Admin tüm tenantları görür.
    Diğerleri sadece kendi tenantını görür.
    """
    if current_user.role == UserRole.SUPER_ADMIN:
        statement = select(Tenant).offset(skip).limit(limit)
        return session.exec(statement).all()
    
    if current_user.tenant_id:
        # Tek bir tenant dönecek ama liste formatında
        tenant = session.get(Tenant, current_user.tenant_id)
        if tenant:
            return [tenant]
            
    return []


@router.post("/", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    data: TenantCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni tenant oluştur (Sadece Super Admin).
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Yetersiz yetki")
        
    # Slug check
    existing = session.exec(select(Tenant).where(Tenant.slug == data.slug)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug zaten kullanımda")
        
    new_tenant = Tenant.from_orm(data)
    session.add(new_tenant)
    session.commit()
    session.refresh(new_tenant)
    return new_tenant


@router.get("/{item_id}", response_model=TenantResponse)
async def get_tenant(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Tenant detayı
    """
    # Yetki kontrolü
    if current_user.role != UserRole.SUPER_ADMIN and str(current_user.tenant_id) != item_id:
        raise HTTPException(status_code=403, detail="Erişim reddedildi")

    tenant = session.get(Tenant, item_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant bulunamadı")
        
    return tenant


@router.put("/{item_id}", response_model=TenantResponse)
async def update_tenant(
    item_id: str,
    data: TenantUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Tenant güncelle
    """
    # Yetki kontrolü
    if current_user.role != UserRole.SUPER_ADMIN and str(current_user.tenant_id) != item_id:
        raise HTTPException(status_code=403, detail="Erişim reddedildi")

    tenant = session.get(Tenant, item_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant bulunamadı")
        
    tenant_data = data.dict(exclude_unset=True)
    for key, value in tenant_data.items():
        setattr(tenant, key, value)
        
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return tenant


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Tenant sil (Sadece Super Admin)
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Yetersiz yetki")

    tenant = session.get(Tenant, item_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant bulunamadı")
        
    session.delete(tenant)
    session.commit()
