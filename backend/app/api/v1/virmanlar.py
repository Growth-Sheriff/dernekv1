"""
Virmanlar API Routes (CRUD - web istemcisi)
"""
from typing import List, Optional
from datetime import datetime
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select, or_, col

from app.core.db import get_session
from app.api.auth import get_current_user
from app.models.base import User, Virman, Kasa

router = APIRouter()


# ========== SCHEMAS ==========
class VirmanCreate(BaseModel):
    kaynak_kasa_id: str
    hedef_kasa_id: str
    tarih: str
    tutar: float
    aciklama: Optional[str] = None
    kaynak_para_birimi: Optional[str] = None
    hedef_para_birimi: Optional[str] = None
    kaynak_tutar: Optional[float] = None
    hedef_tutar: Optional[float] = None
    uygulanan_kur: Optional[float] = None
    kur_id: Optional[str] = None


class VirmanUpdate(BaseModel):
    tarih: Optional[str] = None
    tutar: Optional[float] = None
    aciklama: Optional[str] = None
    kaynak_para_birimi: Optional[str] = None
    hedef_para_birimi: Optional[str] = None
    kaynak_tutar: Optional[float] = None
    hedef_tutar: Optional[float] = None
    uygulanan_kur: Optional[float] = None
    kur_id: Optional[str] = None


class VirmanResponse(BaseModel):
    id: str
    tenant_id: str
    kaynak_kasa_id: str
    hedef_kasa_id: str
    tarih: str
    tutar: float
    aciklama: Optional[str] = None
    kaynak_para_birimi: Optional[str] = None
    hedef_para_birimi: Optional[str] = None
    kaynak_tutar: Optional[float] = None
    hedef_tutar: Optional[float] = None
    uygulanan_kur: Optional[float] = None
    kur_id: Optional[str] = None
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


def _get_virman_or_404(session: Session, item_id: str, tenant_id: str) -> Virman:
    obj = session.exec(
        select(Virman).where(
            Virman.id == item_id,
            Virman.tenant_id == tenant_id,
            Virman.is_deleted == 0,
        )
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Virman bulunamadı")
    return obj


def _validate_kasa(session: Session, kasa_id: str, tenant_id: str, alan: str) -> None:
    kasa = session.exec(
        select(Kasa).where(
            Kasa.id == kasa_id,
            Kasa.tenant_id == tenant_id,
            Kasa.is_deleted == 0,
        )
    ).first()
    if not kasa:
        raise HTTPException(status_code=400, detail=f"Geçersiz {alan}")


# ========== ENDPOINTS ==========
@router.get("/", response_model=List[VirmanResponse])
async def list_virmanlar(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    kasa_id: Optional[str] = None,
    baslangic: Optional[str] = None,
    bitis: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Virman listesi (arama: açıklama; kasa_id kaynak veya hedef eşleşir)"""
    tenant_id = _require_tenant(current_user)

    query = select(Virman).where(
        Virman.tenant_id == tenant_id,
        Virman.is_deleted == 0,
    )
    if search:
        query = query.where(col(Virman.aciklama).like(f"%{search}%"))
    if kasa_id:
        query = query.where(
            or_(
                Virman.kaynak_kasa_id == kasa_id,
                Virman.hedef_kasa_id == kasa_id,
            )
        )
    if baslangic:
        query = query.where(Virman.tarih >= baslangic)
    if bitis:
        query = query.where(Virman.tarih <= bitis)

    query = query.order_by(col(Virman.tarih).desc()).offset(skip).limit(limit)
    return session.exec(query).all()


@router.post("/", response_model=VirmanResponse, status_code=status.HTTP_201_CREATED)
async def create_virman(
    data: VirmanCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Yeni virman oluştur (kasalar arası aktarım)"""
    tenant_id = _require_tenant(current_user)

    if data.tutar <= 0:
        raise HTTPException(status_code=400, detail="Tutar 0'dan büyük olmalı")
    if data.kaynak_kasa_id == data.hedef_kasa_id:
        raise HTTPException(status_code=400, detail="Kaynak ve hedef kasa aynı olamaz")
    _validate_kasa(session, data.kaynak_kasa_id, tenant_id, "kaynak_kasa_id")
    _validate_kasa(session, data.hedef_kasa_id, tenant_id, "hedef_kasa_id")

    now = datetime.utcnow().isoformat()
    obj = Virman(
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


@router.get("/{item_id}", response_model=VirmanResponse)
async def get_virman(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Virman detayı"""
    tenant_id = _require_tenant(current_user)
    return _get_virman_or_404(session, item_id, tenant_id)


@router.put("/{item_id}", response_model=VirmanResponse)
async def update_virman(
    item_id: str,
    data: VirmanUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Virman güncelle (kasa değişikliği için sil + yeniden oluştur kullanın)"""
    tenant_id = _require_tenant(current_user)
    obj = _get_virman_or_404(session, item_id, tenant_id)

    changes = data.dict(exclude_unset=True)
    if "tutar" in changes and changes["tutar"] is not None and changes["tutar"] <= 0:
        raise HTTPException(status_code=400, detail="Tutar 0'dan büyük olmalı")

    for key, value in changes.items():
        setattr(obj, key, value)

    obj.updated_at = datetime.utcnow().isoformat()
    obj.version = (obj.version or 1) + 1

    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_virman(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Virman sil (soft delete)"""
    tenant_id = _require_tenant(current_user)
    obj = _get_virman_or_404(session, item_id, tenant_id)

    obj.is_deleted = 1
    obj.updated_at = datetime.utcnow().isoformat()
    obj.version = (obj.version or 1) + 1

    session.add(obj)
    session.commit()
