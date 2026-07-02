"""
Etkinlikler API Routes (CRUD - web istemcisi)
Desktop şemasıyla hizalı yeni alan adları: baslik, baslangic_tarihi,
bitis_tarihi, yer, etkinlik_tipi, durum, katilimci_sayisi, tahmini_butce,
gerceklesen_butce, sorumlu_uye_id, notlar, created_by
"""
from typing import List, Optional
from datetime import datetime
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select, or_, col

from app.core.db import get_session
from app.api.auth import get_current_user
from app.models.base import User, Etkinlik

router = APIRouter()


# ========== SCHEMAS ==========
class EtkinlikCreate(BaseModel):
    baslik: str
    baslangic_tarihi: str
    bitis_tarihi: Optional[str] = None
    aciklama: Optional[str] = None
    yer: Optional[str] = None
    etkinlik_tipi: Optional[str] = None
    durum: Optional[str] = "planlandi"
    katilimci_sayisi: Optional[int] = None
    tahmini_butce: Optional[float] = None
    gerceklesen_butce: Optional[float] = None
    sorumlu_uye_id: Optional[str] = None
    notlar: Optional[str] = None


class EtkinlikUpdate(BaseModel):
    baslik: Optional[str] = None
    baslangic_tarihi: Optional[str] = None
    bitis_tarihi: Optional[str] = None
    aciklama: Optional[str] = None
    yer: Optional[str] = None
    etkinlik_tipi: Optional[str] = None
    durum: Optional[str] = None
    katilimci_sayisi: Optional[int] = None
    tahmini_butce: Optional[float] = None
    gerceklesen_butce: Optional[float] = None
    sorumlu_uye_id: Optional[str] = None
    notlar: Optional[str] = None


class EtkinlikResponse(BaseModel):
    id: str
    tenant_id: str
    baslik: str
    baslangic_tarihi: str
    bitis_tarihi: Optional[str] = None
    aciklama: Optional[str] = None
    yer: Optional[str] = None
    etkinlik_tipi: Optional[str] = None
    durum: Optional[str] = None
    katilimci_sayisi: Optional[int] = None
    tahmini_butce: Optional[float] = None
    gerceklesen_butce: Optional[float] = None
    sorumlu_uye_id: Optional[str] = None
    notlar: Optional[str] = None
    created_by: Optional[str] = None
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


def _get_etkinlik_or_404(session: Session, item_id: str, tenant_id: str) -> Etkinlik:
    obj = session.exec(
        select(Etkinlik).where(
            Etkinlik.id == item_id,
            Etkinlik.tenant_id == tenant_id,
            Etkinlik.is_deleted == 0,
        )
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
    return obj


# ========== ENDPOINTS ==========
@router.get("/", response_model=List[EtkinlikResponse])
async def list_etkinlikler(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    durum: Optional[str] = None,
    etkinlik_tipi: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Etkinlik listesi (arama: baslik / yer)"""
    tenant_id = _require_tenant(current_user)

    query = select(Etkinlik).where(
        Etkinlik.tenant_id == tenant_id,
        Etkinlik.is_deleted == 0,
    )
    if search:
        term = f"%{search}%"
        query = query.where(
            or_(
                col(Etkinlik.baslik).like(term),
                col(Etkinlik.yer).like(term),
            )
        )
    if durum:
        query = query.where(Etkinlik.durum == durum)
    if etkinlik_tipi:
        query = query.where(Etkinlik.etkinlik_tipi == etkinlik_tipi)

    query = query.order_by(col(Etkinlik.baslangic_tarihi).desc()).offset(skip).limit(limit)
    return session.exec(query).all()


@router.post("/", response_model=EtkinlikResponse, status_code=status.HTTP_201_CREATED)
async def create_etkinlik(
    data: EtkinlikCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Yeni etkinlik oluştur"""
    tenant_id = _require_tenant(current_user)
    now = datetime.utcnow().isoformat()

    obj = Etkinlik(
        **data.dict(),
        id=str(uuid_lib.uuid4()),
        tenant_id=tenant_id,
        created_by=current_user.id,
        version=1,
        is_deleted=0,
        created_at=now,
        updated_at=now,
    )
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.get("/{item_id}", response_model=EtkinlikResponse)
async def get_etkinlik(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Etkinlik detayı"""
    tenant_id = _require_tenant(current_user)
    return _get_etkinlik_or_404(session, item_id, tenant_id)


@router.put("/{item_id}", response_model=EtkinlikResponse)
async def update_etkinlik(
    item_id: str,
    data: EtkinlikUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Etkinlik güncelle"""
    tenant_id = _require_tenant(current_user)
    obj = _get_etkinlik_or_404(session, item_id, tenant_id)

    for key, value in data.dict(exclude_unset=True).items():
        setattr(obj, key, value)

    obj.updated_at = datetime.utcnow().isoformat()
    obj.version = (obj.version or 1) + 1

    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_etkinlik(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Etkinlik sil (soft delete)"""
    tenant_id = _require_tenant(current_user)
    obj = _get_etkinlik_or_404(session, item_id, tenant_id)

    obj.is_deleted = 1
    obj.updated_at = datetime.utcnow().isoformat()
    obj.version = (obj.version or 1) + 1

    session.add(obj)
    session.commit()
