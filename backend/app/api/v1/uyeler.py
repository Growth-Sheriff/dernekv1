"""
Uyeler API Routes (CRUD - web istemcisi)
"""
from typing import List, Optional
from datetime import datetime
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select, or_, col

from app.core.db import get_session
from app.api.auth import get_current_user
from app.models.base import User, Uye

router = APIRouter()


# ========== SCHEMAS ==========
class UyeCreate(BaseModel):
    uye_no: str
    tc_no: str
    ad: str
    soyad: str
    telefon: Optional[str] = None
    telefon2: Optional[str] = None
    email: Optional[str] = None
    cinsiyet: Optional[str] = None
    dogum_tarihi: Optional[str] = None
    dogum_yeri: Optional[str] = None
    kan_grubu: Optional[str] = None
    aile_durumu: Optional[str] = None
    cocuk_sayisi: Optional[int] = None
    egitim_durumu: Optional[str] = None
    meslek: Optional[str] = None
    is_yeri: Optional[str] = None
    adres: Optional[str] = None
    il: Optional[str] = None
    ilce: Optional[str] = None
    mahalle: Optional[str] = None
    posta_kodu: Optional[str] = None
    uyelik_tipi: Optional[str] = "Asil"
    ozel_aidat_tutari: Optional[float] = None
    aidat_indirimi_yuzde: Optional[float] = None
    giris_tarihi: Optional[str] = None
    durum: str = "Aktif"
    referans_uye_id: Optional[str] = None
    notlar: Optional[str] = None


class UyeUpdate(BaseModel):
    uye_no: Optional[str] = None
    tc_no: Optional[str] = None
    ad: Optional[str] = None
    soyad: Optional[str] = None
    telefon: Optional[str] = None
    telefon2: Optional[str] = None
    email: Optional[str] = None
    cinsiyet: Optional[str] = None
    dogum_tarihi: Optional[str] = None
    dogum_yeri: Optional[str] = None
    kan_grubu: Optional[str] = None
    aile_durumu: Optional[str] = None
    cocuk_sayisi: Optional[int] = None
    egitim_durumu: Optional[str] = None
    meslek: Optional[str] = None
    is_yeri: Optional[str] = None
    adres: Optional[str] = None
    il: Optional[str] = None
    ilce: Optional[str] = None
    mahalle: Optional[str] = None
    posta_kodu: Optional[str] = None
    uyelik_tipi: Optional[str] = None
    ozel_aidat_tutari: Optional[float] = None
    aidat_indirimi_yuzde: Optional[float] = None
    giris_tarihi: Optional[str] = None
    cikis_tarihi: Optional[str] = None
    durum: Optional[str] = None
    referans_uye_id: Optional[str] = None
    ayrilma_nedeni: Optional[str] = None
    notlar: Optional[str] = None


class UyeResponse(BaseModel):
    id: str
    tenant_id: str
    uye_no: str
    tc_no: str
    ad: str
    soyad: str
    ad_soyad: str
    telefon: Optional[str] = None
    telefon2: Optional[str] = None
    email: Optional[str] = None
    cinsiyet: Optional[str] = None
    dogum_tarihi: Optional[str] = None
    dogum_yeri: Optional[str] = None
    kan_grubu: Optional[str] = None
    aile_durumu: Optional[str] = None
    cocuk_sayisi: Optional[int] = None
    egitim_durumu: Optional[str] = None
    meslek: Optional[str] = None
    is_yeri: Optional[str] = None
    adres: Optional[str] = None
    il: Optional[str] = None
    ilce: Optional[str] = None
    mahalle: Optional[str] = None
    posta_kodu: Optional[str] = None
    uyelik_tipi: Optional[str] = None
    ozel_aidat_tutari: Optional[float] = None
    aidat_indirimi_yuzde: Optional[float] = None
    giris_tarihi: Optional[str] = None
    cikis_tarihi: Optional[str] = None
    durum: str
    referans_uye_id: Optional[str] = None
    ayrilma_nedeni: Optional[str] = None
    notlar: Optional[str] = None
    version: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


# ========== HELPERS ==========
def _get_uye_or_404(session: Session, item_id: str, tenant_id: str) -> Uye:
    obj = session.exec(
        select(Uye).where(
            Uye.id == item_id,
            Uye.tenant_id == tenant_id,
            Uye.is_deleted == 0,
        )
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Üye bulunamadı")
    return obj


def _require_tenant(current_user: User) -> str:
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
    return current_user.tenant_id


# ========== ENDPOINTS ==========
@router.get("/", response_model=List[UyeResponse])
async def list_uyeler(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    durum: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Üye listesi (arama: ad_soyad / tc_no / uye_no)"""
    tenant_id = _require_tenant(current_user)

    query = select(Uye).where(
        Uye.tenant_id == tenant_id,
        Uye.is_deleted == 0,
    )
    if search:
        term = f"%{search}%"
        query = query.where(
            or_(
                col(Uye.ad_soyad).like(term),
                col(Uye.tc_no).like(term),
                col(Uye.uye_no).like(term),
            )
        )
    if durum:
        query = query.where(Uye.durum == durum)

    query = query.order_by(col(Uye.ad_soyad)).offset(skip).limit(limit)
    return session.exec(query).all()


@router.post("/", response_model=UyeResponse, status_code=status.HTTP_201_CREATED)
async def create_uye(
    data: UyeCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Yeni üye oluştur"""
    tenant_id = _require_tenant(current_user)
    now = datetime.utcnow().isoformat()

    values = data.dict()
    if not values.get("giris_tarihi"):
        values["giris_tarihi"] = now

    obj = Uye(
        **values,
        id=str(uuid_lib.uuid4()),
        tenant_id=tenant_id,
        ad_soyad=f"{data.ad} {data.soyad}".strip(),
        version=1,
        is_deleted=0,
        created_at=now,
        updated_at=now,
    )
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.get("/{item_id}", response_model=UyeResponse)
async def get_uye(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Üye detayı"""
    tenant_id = _require_tenant(current_user)
    return _get_uye_or_404(session, item_id, tenant_id)


@router.put("/{item_id}", response_model=UyeResponse)
async def update_uye(
    item_id: str,
    data: UyeUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Üye güncelle"""
    tenant_id = _require_tenant(current_user)
    obj = _get_uye_or_404(session, item_id, tenant_id)

    changes = data.dict(exclude_unset=True)
    for key, value in changes.items():
        setattr(obj, key, value)

    # ad / soyad değiştiyse ad_soyad'ı yeniden hesapla
    if "ad" in changes or "soyad" in changes:
        obj.ad_soyad = f"{obj.ad} {obj.soyad}".strip()

    obj.updated_at = datetime.utcnow().isoformat()
    obj.version = (obj.version or 1) + 1

    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_uye(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Üye sil (soft delete)"""
    tenant_id = _require_tenant(current_user)
    obj = _get_uye_or_404(session, item_id, tenant_id)

    obj.is_deleted = 1
    obj.updated_at = datetime.utcnow().isoformat()
    obj.version = (obj.version or 1) + 1

    session.add(obj)
    session.commit()
