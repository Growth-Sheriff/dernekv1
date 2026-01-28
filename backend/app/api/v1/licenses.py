"""
Licenses API Routes
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.db import get_session
from app.api.auth import get_current_user
from app.models.base import User, License, UserRole
from app.schemas.license import LicenseCreate, LicenseUpdate, LicenseResponse

router = APIRouter()

@router.get("/my-license", response_model=LicenseResponse)
async def get_my_license(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Mevcut kullanıcının tenant'ına ait lisansı döndürür.
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=404, detail="No tenant associated")
        
    license = session.exec(select(License).where(License.tenant_id == current_user.tenant_id, License.is_active == True)).first()
    if not license:
         raise HTTPException(status_code=404, detail="No active license found")
    return license

@router.get("/", response_model=List[LicenseResponse])
async def list_licenses(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Licenses listesi (Super Admin)
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return session.exec(select(License).offset(skip).limit(limit)).all()


@router.post("/", response_model=LicenseResponse, status_code=status.HTTP_201_CREATED)
async def create_license(
    data: LicenseCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni license oluştur (Super Admin)
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db_obj = License.from_orm(data)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


@router.get("/{item_id}", response_model=LicenseResponse)
async def get_license(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    License detayı
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    obj = session.get(License, item_id)
    if not obj:
        raise HTTPException(status_code=404, detail="License not found")
    return obj


@router.put("/{item_id}", response_model=LicenseResponse)
async def update_license(
    item_id: str,
    data: LicenseUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    License güncelle
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    obj = session.get(License, item_id)
    if not obj:
        raise HTTPException(status_code=404, detail="License not found")
        
    obj_data = data.dict(exclude_unset=True)
    for key, value in obj_data.items():
        setattr(obj, key, value)
        
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_license(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    License sil
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    obj = session.get(License, item_id)
    if not obj:
        raise HTTPException(status_code=404, detail="License not found")
        
    session.delete(obj)
    session.commit()
