"""
Aidat API Routes
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.db import get_session
from app.api.auth import get_current_user
from app.models.base import User, Aidat
from app.schemas.aidat import AidatCreate, AidatUpdate, AidatResponse

router = APIRouter()


@router.get("/", response_model=List[AidatResponse])
async def list_aidat(
    skip: int = 0,
    limit: int = 100,
    yil: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Aidat listesi
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
        
    query = select(Aidat).where(Aidat.tenant_id == current_user.tenant_id)
    if yil:
        query = query.where(Aidat.yil == yil)
        
    query = query.offset(skip).limit(limit)
    aidatlar = session.exec(query).all()
    return aidatlar


@router.post("/", response_model=AidatResponse, status_code=status.HTTP_201_CREATED)
async def create_aidat(
    data: AidatCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni aidat oluştur
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
        
    db_aidat = Aidat.from_orm(data)
    db_aidat.tenant_id = current_user.tenant_id
    
    session.add(db_aidat)
    session.commit()
    session.refresh(db_aidat)
    return db_aidat


@router.get("/{item_id}", response_model=AidatResponse)
async def get_aidat(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Aidat detayı
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
        
    aidat = session.get(Aidat, item_id)
    if not aidat:
        raise HTTPException(status_code=404, detail="Aidat not found")
        
    if aidat.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return aidat


@router.put("/{item_id}", response_model=AidatResponse)
async def update_aidat(
    item_id: str,
    data: AidatUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Aidat güncelle
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
        
    aidat = session.get(Aidat, item_id)
    if not aidat:
        raise HTTPException(status_code=404, detail="Aidat not found")
        
    if aidat.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    aidat_data = data.dict(exclude_unset=True)
    for key, value in aidat_data.items():
        setattr(aidat, key, value)
        
    session.add(aidat)
    session.commit()
    session.refresh(aidat)
    return aidat


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_aidat(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Aidat sil
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
        
    aidat = session.get(Aidat, item_id)
    if not aidat:
        raise HTTPException(status_code=404, detail="Aidat not found")
        
    if aidat.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    session.delete(aidat)
    session.commit()
