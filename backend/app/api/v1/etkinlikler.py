"""
Etkinlikler API Routes
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.db import get_session
from app.api.auth import get_current_user
from app.models.base import User, Etkinlik
from app.schemas.etkinlik import EtkinlikCreate, EtkinlikUpdate, EtkinlikResponse

router = APIRouter()


@router.get("/", response_model=List[EtkinlikResponse])
async def list_etkinlikler(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Etkinlikler listesi
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
        
    statement = select(Etkinlik).where(Etkinlik.tenant_id == current_user.tenant_id).offset(skip).limit(limit)
    etkinlikler = session.exec(statement).all()
    return etkinlikler


@router.post("/", response_model=EtkinlikResponse, status_code=status.HTTP_201_CREATED)
async def create_etkinlikler(
    data: EtkinlikCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni etkinlik oluştur
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
        
    db_etkinlik = Etkinlik.from_orm(data)
    db_etkinlik.tenant_id = current_user.tenant_id
    
    session.add(db_etkinlik)
    session.commit()
    session.refresh(db_etkinlik)
    return db_etkinlik


@router.get("/{item_id}", response_model=EtkinlikResponse)
async def get_etkinlikler(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Etkinlik detayı
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
        
    etkinlik = session.get(Etkinlik, item_id)
    if not etkinlik:
        raise HTTPException(status_code=404, detail="Etkinlik not found")
        
    if etkinlik.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return etkinlik


@router.put("/{item_id}", response_model=EtkinlikResponse)
async def update_etkinlikler(
    item_id: str,
    data: EtkinlikUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Etkinlik güncelle
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
        
    etkinlik = session.get(Etkinlik, item_id)
    if not etkinlik:
        raise HTTPException(status_code=404, detail="Etkinlik not found")
        
    if etkinlik.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    etkinlik_data = data.dict(exclude_unset=True)
    for key, value in etkinlik_data.items():
        setattr(etkinlik, key, value)
        
    session.add(etkinlik)
    session.commit()
    session.refresh(etkinlik)
    return etkinlik


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_etkinlikler(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Etkinlik sil
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
        
    etkinlik = session.get(Etkinlik, item_id)
    if not etkinlik:
        raise HTTPException(status_code=404, detail="Etkinlik not found")
        
    if etkinlik.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    session.delete(etkinlik)
    session.commit()
