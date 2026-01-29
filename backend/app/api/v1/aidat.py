"""
Aidat API Routes
"""
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.db import get_session
from app.api.auth import get_current_user
from app.models.base import User, AidatTakip

router = APIRouter()

# ========== SCHEMAS ==========
class AidatCreate(BaseModel):
    uye_id: str
    yil: int
    ay: int
    tutar: float = 0.0
    odenen: float = 0.0
    durum: str = "beklemede"
    odeme_tarihi: Optional[str] = None
    aciklama: Optional[str] = None

class AidatUpdate(BaseModel):
    tutar: Optional[float] = None
    odenen: Optional[float] = None
    durum: Optional[str] = None
    odeme_tarihi: Optional[str] = None
    aciklama: Optional[str] = None

class AidatResponse(BaseModel):
    id: str
    tenant_id: str
    uye_id: str
    yil: int
    ay: int
    tutar: float
    odenen: float
    durum: str
    odeme_tarihi: Optional[str] = None
    aciklama: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True


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
        
    query = select(AidatTakip).where(AidatTakip.tenant_id == current_user.tenant_id)
    if yil:
        query = query.where(AidatTakip.yil == yil)
        
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
        
    db_aidat = AidatTakip(
        id=str(uuid_lib.uuid4()),
        tenant_id=current_user.tenant_id,
        uye_id=data.uye_id,
        yil=data.yil,
        ay=data.ay,
        tutar=data.tutar,
        odenen=data.odenen,
        durum=data.durum,
        odeme_tarihi=data.odeme_tarihi,
        aciklama=data.aciklama
    )
    
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
        
    aidat = session.get(AidatTakip, item_id)
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
        
    aidat = session.get(AidatTakip, item_id)
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
        
    aidat = session.get(AidatTakip, item_id)
    if not aidat:
        raise HTTPException(status_code=404, detail="Aidat not found")
        
    if aidat.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    session.delete(aidat)
    session.commit()
