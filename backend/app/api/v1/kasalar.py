"""
Kasalar API Routes (CRUD - web istemcisi)

Not: bakiye/toplam_gelir/toplam_gider/virman_giris/virman_cikis türetilmiş
alanlardır (bkz. sync.py SYNC_DERIVED_FIELDS). Bu endpoint'ler list/get
yanıtlarında bu alanları baz kayıtlardan (gelirler/giderler/virmanlar)
anlık hesaplar; DB'deki değerlere yazmaz.
"""
from typing import List, Optional
from datetime import datetime
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Session, select, col

from app.core.db import get_session
from app.api.auth import get_current_user
from app.models.base import User, Kasa, Gelir, Gider, Virman

router = APIRouter()


# ========== SCHEMAS ==========
class KasaCreate(BaseModel):
    kasa_adi: str
    para_birimi: str = "TRY"
    devir_bakiye: float = 0.0
    is_active: bool = True


class KasaUpdate(BaseModel):
    kasa_adi: Optional[str] = None
    para_birimi: Optional[str] = None
    devir_bakiye: Optional[float] = None
    is_active: Optional[bool] = None


class KasaResponse(BaseModel):
    id: str
    tenant_id: str
    kasa_adi: str
    para_birimi: str
    devir_bakiye: float
    bakiye: float
    toplam_gelir: float
    toplam_gider: float
    virman_giris: float
    virman_cikis: float
    is_active: bool
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


def _get_kasa_or_404(session: Session, item_id: str, tenant_id: str) -> Kasa:
    obj = session.exec(
        select(Kasa).where(
            Kasa.id == item_id,
            Kasa.tenant_id == tenant_id,
            Kasa.is_deleted == 0,
        )
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Kasa bulunamadı")
    return obj


def _aggregate_sums(session: Session, tenant_id: str) -> dict:
    """Kasa başına gelir/gider/virman toplamlarını tek seferde hesaplar."""
    gelir_rows = session.exec(
        select(Gelir.kasa_id, func.coalesce(func.sum(Gelir.tutar), 0.0))
        .where(Gelir.tenant_id == tenant_id, Gelir.is_deleted == 0)
        .group_by(Gelir.kasa_id)
    ).all()
    gider_rows = session.exec(
        select(Gider.kasa_id, func.coalesce(func.sum(Gider.tutar), 0.0))
        .where(Gider.tenant_id == tenant_id, Gider.is_deleted == 0)
        .group_by(Gider.kasa_id)
    ).all()
    virman_in_rows = session.exec(
        select(Virman.hedef_kasa_id, func.coalesce(func.sum(Virman.tutar), 0.0))
        .where(Virman.tenant_id == tenant_id, Virman.is_deleted == 0)
        .group_by(Virman.hedef_kasa_id)
    ).all()
    virman_out_rows = session.exec(
        select(Virman.kaynak_kasa_id, func.coalesce(func.sum(Virman.tutar), 0.0))
        .where(Virman.tenant_id == tenant_id, Virman.is_deleted == 0)
        .group_by(Virman.kaynak_kasa_id)
    ).all()
    return {
        "gelir": dict(gelir_rows),
        "gider": dict(gider_rows),
        "virman_in": dict(virman_in_rows),
        "virman_out": dict(virman_out_rows),
    }


def _to_response(kasa: Kasa, sums: dict) -> KasaResponse:
    toplam_gelir = float(sums["gelir"].get(kasa.id, 0.0))
    toplam_gider = float(sums["gider"].get(kasa.id, 0.0))
    virman_giris = float(sums["virman_in"].get(kasa.id, 0.0))
    virman_cikis = float(sums["virman_out"].get(kasa.id, 0.0))
    bakiye = (kasa.devir_bakiye or 0.0) + toplam_gelir - toplam_gider + virman_giris - virman_cikis
    return KasaResponse(
        id=kasa.id,
        tenant_id=kasa.tenant_id,
        kasa_adi=kasa.kasa_adi,
        para_birimi=kasa.para_birimi,
        devir_bakiye=kasa.devir_bakiye or 0.0,
        bakiye=bakiye,
        toplam_gelir=toplam_gelir,
        toplam_gider=toplam_gider,
        virman_giris=virman_giris,
        virman_cikis=virman_cikis,
        is_active=kasa.is_active,
        version=kasa.version or 1,
        created_at=kasa.created_at,
        updated_at=kasa.updated_at,
    )


# ========== ENDPOINTS ==========
@router.get("/", response_model=List[KasaResponse])
async def list_kasalar(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Kasa listesi (arama: kasa_adi) — bakiyeler anlık hesaplanır"""
    tenant_id = _require_tenant(current_user)

    query = select(Kasa).where(
        Kasa.tenant_id == tenant_id,
        Kasa.is_deleted == 0,
    )
    if search:
        query = query.where(col(Kasa.kasa_adi).like(f"%{search}%"))

    query = query.order_by(col(Kasa.kasa_adi)).offset(skip).limit(limit)
    kasalar = session.exec(query).all()

    sums = _aggregate_sums(session, tenant_id)
    return [_to_response(k, sums) for k in kasalar]


@router.post("/", response_model=KasaResponse, status_code=status.HTTP_201_CREATED)
async def create_kasa(
    data: KasaCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Yeni kasa oluştur"""
    tenant_id = _require_tenant(current_user)
    now = datetime.utcnow().isoformat()

    obj = Kasa(
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

    sums = _aggregate_sums(session, tenant_id)
    return _to_response(obj, sums)


@router.get("/{item_id}", response_model=KasaResponse)
async def get_kasa(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Kasa detayı — bakiye anlık hesaplanır"""
    tenant_id = _require_tenant(current_user)
    obj = _get_kasa_or_404(session, item_id, tenant_id)
    sums = _aggregate_sums(session, tenant_id)
    return _to_response(obj, sums)


@router.put("/{item_id}", response_model=KasaResponse)
async def update_kasa(
    item_id: str,
    data: KasaUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Kasa güncelle"""
    tenant_id = _require_tenant(current_user)
    obj = _get_kasa_or_404(session, item_id, tenant_id)

    for key, value in data.dict(exclude_unset=True).items():
        setattr(obj, key, value)

    obj.updated_at = datetime.utcnow().isoformat()
    obj.version = (obj.version or 1) + 1

    session.add(obj)
    session.commit()
    session.refresh(obj)

    sums = _aggregate_sums(session, tenant_id)
    return _to_response(obj, sums)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kasa(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Kasa sil (soft delete) — üzerinde hareket varsa engellenir"""
    tenant_id = _require_tenant(current_user)
    obj = _get_kasa_or_404(session, item_id, tenant_id)

    # Kasa üzerinde aktif hareket varsa silme
    gelir_count = session.exec(
        select(func.count()).select_from(Gelir).where(
            Gelir.tenant_id == tenant_id,
            Gelir.kasa_id == item_id,
            Gelir.is_deleted == 0,
        )
    ).one()
    gider_count = session.exec(
        select(func.count()).select_from(Gider).where(
            Gider.tenant_id == tenant_id,
            Gider.kasa_id == item_id,
            Gider.is_deleted == 0,
        )
    ).one()
    virman_count = session.exec(
        select(func.count()).select_from(Virman).where(
            Virman.tenant_id == tenant_id,
            Virman.is_deleted == 0,
            (Virman.kaynak_kasa_id == item_id) | (Virman.hedef_kasa_id == item_id),
        )
    ).one()
    if gelir_count or gider_count or virman_count:
        raise HTTPException(
            status_code=400,
            detail="Kasa üzerinde gelir/gider/virman hareketi var, silinemez",
        )

    obj.is_deleted = 1
    obj.updated_at = datetime.utcnow().isoformat()
    obj.version = (obj.version or 1) + 1

    session.add(obj)
    session.commit()
