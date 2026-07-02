"""
Giderler API Routes (CRUD - web istemcisi)
"""
from typing import List, Optional
from datetime import datetime
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select, or_, col

from app.core.db import get_session
from app.api.auth import get_current_user
from app.models.base import User, Gider, Kasa

router = APIRouter()


# ========== SCHEMAS ==========
class GiderCreate(BaseModel):
    kasa_id: str
    tarih: str
    tutar: float
    gider_turu: Optional[str] = None
    gider_turu_id: Optional[str] = None
    alt_kategori: Optional[str] = None
    aciklama: Optional[str] = None
    fatura_no: Optional[str] = None
    islem_no: Optional[str] = None
    odeyen: Optional[str] = None
    notlar: Optional[str] = None


class GiderUpdate(BaseModel):
    kasa_id: Optional[str] = None
    tarih: Optional[str] = None
    tutar: Optional[float] = None
    gider_turu: Optional[str] = None
    gider_turu_id: Optional[str] = None
    alt_kategori: Optional[str] = None
    aciklama: Optional[str] = None
    fatura_no: Optional[str] = None
    islem_no: Optional[str] = None
    odeyen: Optional[str] = None
    notlar: Optional[str] = None


class GiderResponse(BaseModel):
    id: str
    tenant_id: str
    kasa_id: str
    tarih: str
    tutar: float
    gider_turu: Optional[str] = None
    gider_turu_id: Optional[str] = None
    alt_kategori: Optional[str] = None
    aciklama: Optional[str] = None
    fatura_no: Optional[str] = None
    islem_no: Optional[str] = None
    odeyen: Optional[str] = None
    notlar: Optional[str] = None
    version: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


# ========== HELPERS ==========
def _require_tenant(current_user: User) -> str:
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
    return current_user.tenant_id


def _get_gider_or_404(session: Session, item_id: str, tenant_id: str) -> Gider:
    obj = session.exec(
        select(Gider).where(
            Gider.id == item_id,
            Gider.tenant_id == tenant_id,
            Gider.is_deleted == 0,
        )
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Gider kaydı bulunamadı")
    return obj


def _validate_kasa(session: Session, kasa_id: str, tenant_id: str) -> None:
    kasa = session.exec(
        select(Kasa).where(
            Kasa.id == kasa_id,
            Kasa.tenant_id == tenant_id,
            Kasa.is_deleted == 0,
        )
    ).first()
    if not kasa:
        raise HTTPException(status_code=400, detail="Geçersiz kasa_id")


# ========== ENDPOINTS ==========
@router.get("/", response_model=List[GiderResponse])
async def list_giderler(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    kasa_id: Optional[str] = None,
    gider_turu_id: Optional[str] = None,
    baslangic: Optional[str] = None,
    bitis: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Gider listesi (arama: açıklama / fatura_no / islem_no)"""
    tenant_id = _require_tenant(current_user)

    query = select(Gider).where(
        Gider.tenant_id == tenant_id,
        Gider.is_deleted == 0,
    )
    if search:
        term = f"%{search}%"
        query = query.where(
            or_(
                col(Gider.aciklama).like(term),
                col(Gider.fatura_no).like(term),
                col(Gider.islem_no).like(term),
            )
        )
    if kasa_id:
        query = query.where(Gider.kasa_id == kasa_id)
    if gider_turu_id:
        query = query.where(Gider.gider_turu_id == gider_turu_id)
    if baslangic:
        query = query.where(Gider.tarih >= baslangic)
    if bitis:
        query = query.where(Gider.tarih <= bitis)

    query = query.order_by(col(Gider.tarih).desc()).offset(skip).limit(limit)
    return session.exec(query).all()


@router.post("/", response_model=GiderResponse, status_code=status.HTTP_201_CREATED)
async def create_gider(
    data: GiderCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Yeni gider oluştur"""
    tenant_id = _require_tenant(current_user)
    if data.tutar <= 0:
        raise HTTPException(status_code=400, detail="Tutar 0'dan büyük olmalı")
    _validate_kasa(session, data.kasa_id, tenant_id)

    now = datetime.utcnow().isoformat()
    obj = Gider(
        **data.dict(),
        id=str(uuid_lib.uuid4()),
        tenant_id=tenant_id,
        version=1,
        is_deleted=0,
        created_at=now,
        updated_at=now,
    )
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.get("/{item_id}", response_model=GiderResponse)
async def get_gider(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Gider detayı"""
    tenant_id = _require_tenant(current_user)
    return _get_gider_or_404(session, item_id, tenant_id)


@router.put("/{item_id}", response_model=GiderResponse)
async def update_gider(
    item_id: str,
    data: GiderUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Gider güncelle"""
    tenant_id = _require_tenant(current_user)
    obj = _get_gider_or_404(session, item_id, tenant_id)

    changes = data.dict(exclude_unset=True)
    if "tutar" in changes and changes["tutar"] is not None and changes["tutar"] <= 0:
        raise HTTPException(status_code=400, detail="Tutar 0'dan büyük olmalı")
    if "kasa_id" in changes and changes["kasa_id"]:
        _validate_kasa(session, changes["kasa_id"], tenant_id)

    for key, value in changes.items():
        setattr(obj, key, value)

    obj.updated_at = datetime.utcnow().isoformat()
    obj.version = (obj.version or 1) + 1

    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gider(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Gider sil (soft delete)"""
    tenant_id = _require_tenant(current_user)
    obj = _get_gider_or_404(session, item_id, tenant_id)

    obj.is_deleted = 1
    obj.updated_at = datetime.utcnow().isoformat()
    obj.version = (obj.version or 1) + 1

    session.add(obj)
    session.commit()
