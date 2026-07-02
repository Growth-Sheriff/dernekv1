"""
Sync API - Desktop'tan gelen verileri sunucuya senkronize eder
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import uuid

from app.core.db import get_session
from app.api.auth import get_current_user
from app.models.base import (
    Uye, Gelir, Gider, Kasa, GelirTuru, GiderTuru, 
    AidatTakip, Virman, SyncChange
)

router = APIRouter(prefix="/sync", tags=["Sync"])

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class UyeSync(BaseModel):
    id: str
    tenant_id: str
    ad: str
    soyad: str
    tc_no: Optional[str] = None
    email: Optional[str] = None
    telefon: Optional[str] = None
    adres: Optional[str] = None
    uye_no: Optional[str] = None
    uye_turu: Optional[str] = "Asil"
    durum: Optional[str] = "Aktif"
    kayit_tarihi: Optional[str] = None
    dogum_tarihi: Optional[str] = None
    cinsiyet: Optional[str] = None
    meslek: Optional[str] = None
    is_active: Optional[int] = 1
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class GelirSync(BaseModel):
    id: str
    tenant_id: str
    tutar: float
    tarih: str
    aciklama: Optional[str] = None
    gelir_turu: Optional[str] = None
    gelir_turu_id: Optional[str] = None
    kasa_id: Optional[str] = None
    uye_id: Optional[str] = None
    aidat_id: Optional[str] = None
    belge_no: Optional[str] = None
    is_active: Optional[int] = 1
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class GiderSync(BaseModel):
    id: str
    tenant_id: str
    tutar: float
    tarih: str
    aciklama: Optional[str] = None
    gider_turu: Optional[str] = None
    gider_turu_id: Optional[str] = None
    kasa_id: Optional[str] = None
    belge_no: Optional[str] = None
    is_active: Optional[int] = 1
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class KasaSync(BaseModel):
    id: str
    tenant_id: str
    ad: str
    bakiye: Optional[float] = 0.0
    para_birimi: Optional[str] = "TRY"
    kasa_tipi: Optional[str] = "Nakit"
    is_active: Optional[int] = 1
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class AidatSync(BaseModel):
    id: str
    tenant_id: str
    uye_id: str
    yil: int
    ay: int
    tutar: float
    odendi: Optional[int] = 0
    odeme_tarihi: Optional[str] = None
    kasa_id: Optional[str] = None
    is_active: Optional[int] = 1
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class SyncRequest(BaseModel):
    tenant_id: str
    uyeler: Optional[List[UyeSync]] = []
    gelirler: Optional[List[GelirSync]] = []
    giderler: Optional[List[GiderSync]] = []
    kasalar: Optional[List[KasaSync]] = []
    aidatlar: Optional[List[AidatSync]] = []

class SyncResponse(BaseModel):
    success: bool
    synced_counts: dict
    message: str

# ============================================================================
# SYNC ENDPOINTS
# ============================================================================

@router.post("/push", response_model=SyncResponse)
def push_data(
    data: SyncRequest,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_user),
):
    """
    Desktop'tan sunucuya veri gönder (push) — DEPRECATED, /sync/sync kullanın
    """
    if not current_user.is_superuser and current_user.tenant_id != data.tenant_id:
        raise HTTPException(status_code=403, detail="Bu tenant için yetkiniz yok")
    now = datetime.utcnow().isoformat()
    counts = {"uyeler": 0, "gelirler": 0, "giderler": 0, "kasalar": 0, "aidatlar": 0}
    
    try:
        # UYELER
        for uye_data in data.uyeler or []:
            existing = session.exec(select(Uye).where(Uye.id == uye_data.id)).first()
            if existing:
                # Update
                for key, value in uye_data.dict(exclude_unset=True).items():
                    setattr(existing, key, value)
                existing.updated_at = now
            else:
                # Insert
                uye = Uye(**uye_data.dict())
                uye.created_at = uye.created_at or now
                uye.updated_at = now
                session.add(uye)
            counts["uyeler"] += 1
        
        # KASALAR
        for kasa_data in data.kasalar or []:
            existing = session.exec(select(Kasa).where(Kasa.id == kasa_data.id)).first()
            if existing:
                for key, value in kasa_data.dict(exclude_unset=True).items():
                    setattr(existing, key, value)
                existing.updated_at = now
            else:
                kasa = Kasa(**kasa_data.dict())
                kasa.created_at = kasa.created_at or now
                kasa.updated_at = now
                session.add(kasa)
            counts["kasalar"] += 1
        
        # GELIRLER
        for gelir_data in data.gelirler or []:
            existing = session.exec(select(Gelir).where(Gelir.id == gelir_data.id)).first()
            if existing:
                for key, value in gelir_data.dict(exclude_unset=True).items():
                    setattr(existing, key, value)
                existing.updated_at = now
            else:
                gelir = Gelir(**gelir_data.dict())
                gelir.created_at = gelir.created_at or now
                gelir.updated_at = now
                session.add(gelir)
            counts["gelirler"] += 1
        
        # GIDERLER
        for gider_data in data.giderler or []:
            existing = session.exec(select(Gider).where(Gider.id == gider_data.id)).first()
            if existing:
                for key, value in gider_data.dict(exclude_unset=True).items():
                    setattr(existing, key, value)
                existing.updated_at = now
            else:
                gider = Gider(**gider_data.dict())
                gider.created_at = gider.created_at or now
                gider.updated_at = now
                session.add(gider)
            counts["giderler"] += 1
        
        # AIDATLAR
        for aidat_data in data.aidatlar or []:
            existing = session.exec(select(AidatTakip).where(AidatTakip.id == aidat_data.id)).first()
            if existing:
                for key, value in aidat_data.dict(exclude_unset=True).items():
                    setattr(existing, key, value)
                existing.updated_at = now
            else:
                aidat = AidatTakip(**aidat_data.dict())
                aidat.created_at = aidat.created_at or now
                aidat.updated_at = now
                session.add(aidat)
            counts["aidatlar"] += 1
        
        session.commit()
        
        return SyncResponse(
            success=True,
            synced_counts=counts,
            message="Veriler başarıyla senkronize edildi"
        )
        
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Sync hatası: {str(e)}")


@router.get("/pull/{tenant_id}")
def pull_data(
    tenant_id: str,
    since: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_user),
):
    if not current_user.is_superuser and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Bu tenant için yetkiniz yok")
    """
    Sunucudan desktop'a veri çek (pull)
    since: ISO format tarih - bu tarihten sonra güncellenen kayıtları getir
    """
    result = {
        "uyeler": [],
        "gelirler": [],
        "giderler": [],
        "kasalar": [],
        "aidatlar": []
    }
    
    # Uyeler
    query = select(Uye).where(Uye.tenant_id == tenant_id)
    if since:
        query = query.where(Uye.updated_at > since)
    uyeler = session.exec(query).all()
    result["uyeler"] = [{k: v for k, v in u.__dict__.items() if not k.startswith('_')} for u in uyeler]
    
    # Kasalar
    query = select(Kasa).where(Kasa.tenant_id == tenant_id)
    if since:
        query = query.where(Kasa.updated_at > since)
    kasalar = session.exec(query).all()
    result["kasalar"] = [{k: v for k, v in k.__dict__.items() if not k.startswith('_')} for k in kasalar]
    
    # Gelirler
    query = select(Gelir).where(Gelir.tenant_id == tenant_id)
    if since:
        query = query.where(Gelir.updated_at > since)
    gelirler = session.exec(query).all()
    result["gelirler"] = [{k: v for k, v in g.__dict__.items() if not k.startswith('_')} for g in gelirler]
    
    # Giderler
    query = select(Gider).where(Gider.tenant_id == tenant_id)
    if since:
        query = query.where(Gider.updated_at > since)
    giderler = session.exec(query).all()
    result["giderler"] = [{k: v for k, v in g.__dict__.items() if not k.startswith('_')} for g in giderler]
    
    # Aidatlar
    query = select(AidatTakip).where(AidatTakip.tenant_id == tenant_id)
    if since:
        query = query.where(AidatTakip.updated_at > since)
    aidatlar = session.exec(query).all()
    result["aidatlar"] = [{k: v for k, v in a.__dict__.items() if not k.startswith('_')} for a in aidatlar]
    
    return {
        "success": True,
        "data": result,
        "synced_at": datetime.utcnow().isoformat()
    }


@router.post("/uye")
def sync_single_uye(
    uye_data: UyeSync,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_user),
):
    if not current_user.is_superuser and current_user.tenant_id != uye_data.tenant_id:
        raise HTTPException(status_code=403, detail="Bu tenant için yetkiniz yok")
    """Tek bir üye senkronize et"""
    now = datetime.utcnow().isoformat()
    
    try:
        existing = session.exec(select(Uye).where(Uye.id == uye_data.id)).first()
        if existing:
            for key, value in uye_data.dict(exclude_unset=True).items():
                setattr(existing, key, value)
            existing.ad_soyad = f"{existing.ad} {existing.soyad}"
            existing.updated_at = now
            session.add(existing)
        else:
            data = uye_data.dict()
            # Auto-generate required fields
            data['ad_soyad'] = f"{data.get('ad', '')} {data.get('soyad', '')}"
            data['uye_no'] = data.get('uye_no') or data.get('tc_no', '')[:6] or str(uuid.uuid4())[:8]
            data['tc_no'] = data.get('tc_no') or '00000000000'
            data['giris_tarihi'] = data.get('kayit_tarihi') or data.get('giris_tarihi') or now
            data['uyelik_tipi'] = data.get('uye_turu') or 'Asil'
            
            uye = Uye(**data)
            uye.created_at = uye.created_at or now
            uye.updated_at = now
            session.add(uye)
        
        session.commit()
        return {"success": True, "message": "Üye senkronize edildi", "id": uye_data.id}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": f"Sync hatası: {str(e)}", "id": uye_data.id}


@router.post("/gelir")
def sync_single_gelir(
    gelir_data: GelirSync,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_user),
):
    if not current_user.is_superuser and current_user.tenant_id != gelir_data.tenant_id:
        raise HTTPException(status_code=403, detail="Bu tenant için yetkiniz yok")
    """Tek bir gelir senkronize et"""
    now = datetime.utcnow().isoformat()
    
    existing = session.exec(select(Gelir).where(Gelir.id == gelir_data.id)).first()
    if existing:
        for key, value in gelir_data.dict(exclude_unset=True).items():
            setattr(existing, key, value)
        existing.updated_at = now
        session.add(existing)
    else:
        gelir = Gelir(**gelir_data.dict())
        gelir.created_at = gelir.created_at or now
        gelir.updated_at = now
        session.add(gelir)
    
    session.commit()
    return {"success": True, "message": "Gelir senkronize edildi", "id": gelir_data.id}


@router.post("/gider")
def sync_single_gider(
    gider_data: GiderSync,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_user),
):
    if not current_user.is_superuser and current_user.tenant_id != gider_data.tenant_id:
        raise HTTPException(status_code=403, detail="Bu tenant için yetkiniz yok")
    """Tek bir gider senkronize et"""
    now = datetime.utcnow().isoformat()
    
    existing = session.exec(select(Gider).where(Gider.id == gider_data.id)).first()
    if existing:
        for key, value in gider_data.dict(exclude_unset=True).items():
            setattr(existing, key, value)
        existing.updated_at = now
        session.add(existing)
    else:
        gider = Gider(**gider_data.dict())
        gider.created_at = gider.created_at or now
        gider.updated_at = now
        session.add(gider)
    
    session.commit()
    return {"success": True, "message": "Gider senkronize edildi", "id": gider_data.id}


@router.post("/kasa")
def sync_single_kasa(
    kasa_data: KasaSync,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_user),
):
    if not current_user.is_superuser and current_user.tenant_id != kasa_data.tenant_id:
        raise HTTPException(status_code=403, detail="Bu tenant için yetkiniz yok")
    """Tek bir kasa senkronize et"""
    now = datetime.utcnow().isoformat()
    
    existing = session.exec(select(Kasa).where(Kasa.id == kasa_data.id)).first()
    if existing:
        for key, value in kasa_data.dict(exclude_unset=True).items():
            setattr(existing, key, value)
        existing.updated_at = now
        session.add(existing)
    else:
        kasa = Kasa(**kasa_data.dict())
        kasa.created_at = kasa.created_at or now
        kasa.updated_at = now
        session.add(kasa)
    
    session.commit()
    return {"success": True, "message": "Kasa senkronize edildi", "id": kasa_data.id}

# ============================================================================
# SYNC v3 — BİRLEŞİK ENDPOINT (POST /sync/sync)
# Desktop syncService'in kullandığı tek çağrılık push+pull.
# Çatışma tespiti: optimistic locking (version), silmeler tombstone.
# ============================================================================
from app.api.auth import get_current_user
from app.models.base import User, Etkinlik

# Sync yüzeyi: tablo adı -> model. Desktop outbox'ıyla birebir aynı liste.
SYNC_TABLE_MODELS = {
    "uyeler": Uye,
    "gelirler": Gelir,
    "giderler": Gider,
    "kasalar": Kasa,
    "aidat_takip": AidatTakip,
    "aidatlar": AidatTakip,  # eski istemci uyumluluğu
    "virmanlar": Virman,
    "gelir_turleri": GelirTuru,
    "gider_turleri": GiderTuru,
    "etkinlikler": Etkinlik,
}

# Türetilmiş alanlar: istemciler yerelde baz kayıtlardan hesaplar,
# sunucu bunları push'tan almaz ve delta'da göndermesi zararsızdır ama
# istemci tarafı zaten yok sayar. Push'ta kesinlikle uygulanmaz.
SYNC_DERIVED_FIELDS = {
    "kasalar": {
        "bakiye", "toplam_gelir", "toplam_gider", "virman_giris",
        "virman_cikis", "fiziksel_bakiye", "tahakkuk_tutari", "serbest_bakiye",
    },
}

# İstemcinin belirleyemeyeceği alanlar
SYNC_PROTECTED_FIELDS = {"id", "tenant_id", "version", "created_at", "updated_at"}


class SyncChangeItem(BaseModel):
    table: str
    id: str
    operation: str  # insert | update | delete
    data: dict = {}
    version: int = 1
    changed_at: Optional[str] = None
    change_id: Optional[str] = None


class UnifiedSyncRequest(BaseModel):
    tenant_id: str
    device_id: Optional[str] = None
    client_version: Optional[str] = None
    last_sync_at: Optional[str] = None
    changes: List[SyncChangeItem] = []


class SyncItemResult(BaseModel):
    table: str
    id: str
    status: str  # applied | rejected | conflict
    reason: Optional[str] = None
    version: Optional[int] = None
    change_id: Optional[str] = None
    server_version: Optional[int] = None
    server_data: Optional[dict] = None


class UnifiedSyncResponse(BaseModel):
    status: str  # ok | partial | error
    server_time: str
    applied: List[SyncItemResult] = []
    rejected: List[SyncItemResult] = []
    conflicts: List[SyncItemResult] = []
    changes: List[SyncChangeItem] = []


def _row_to_dict(row) -> dict:
    return {k: v for k, v in row.__dict__.items() if not k.startswith("_")}


def _apply_change(
    session: Session,
    tenant_id: str,
    item: SyncChangeItem,
    now: str,
) -> SyncItemResult:
    model = SYNC_TABLE_MODELS.get(item.table)
    if model is None:
        return SyncItemResult(
            table=item.table, id=item.id, status="rejected",
            reason=f"Bilinmeyen tablo: {item.table}", change_id=item.change_id,
        )

    row = session.get(model, item.id)
    if row is not None and row.tenant_id != tenant_id:
        return SyncItemResult(
            table=item.table, id=item.id, status="rejected",
            reason="tenant_mismatch", change_id=item.change_id,
        )

    model_fields = set(model.model_fields.keys())
    derived = SYNC_DERIVED_FIELDS.get(item.table, set())
    has_version = "version" in model_fields
    has_tombstone = "is_deleted" in model_fields

    is_delete = item.operation == "delete" or bool(item.data.get("is_deleted"))

    # --- SİLME (tombstone) ---
    if is_delete:
        if row is None:
            # Sunucu bu kaydı hiç görmemiş: silinmiş kabul, no-op.
            return SyncItemResult(
                table=item.table, id=item.id, status="applied",
                reason="not_found_noop", change_id=item.change_id,
            )
        if has_version and row.version != item.version:
            return SyncItemResult(
                table=item.table, id=item.id, status="conflict",
                reason="version_mismatch", change_id=item.change_id,
                server_version=row.version, server_data=_row_to_dict(row),
            )
        if has_tombstone:
            row.is_deleted = 1
        new_version = (row.version + 1) if has_version else None
        if has_version:
            row.version = new_version
        row.updated_at = now
        session.add(row)
        return SyncItemResult(
            table=item.table, id=item.id, status="applied",
            version=new_version, change_id=item.change_id,
        )

    # --- INSERT / UPDATE ---
    payload = {
        k: v for k, v in item.data.items()
        if k in model_fields and k not in SYNC_PROTECTED_FIELDS and k not in derived
    }

    if row is None:
        # Yeni kayıt (update gelse bile sunucuda yoksa insert edilir —
        # sunucu DB'si sıfırlanmış olabilir, veri kaybetmeyiz).
        values = dict(payload)
        values["id"] = item.id
        values["tenant_id"] = tenant_id
        values["created_at"] = item.data.get("created_at") or now
        values["updated_at"] = now
        if has_version:
            values["version"] = 1
        try:
            row = model(**values)
        except Exception as e:
            return SyncItemResult(
                table=item.table, id=item.id, status="rejected",
                reason=f"validation: {e}", change_id=item.change_id,
            )
        session.add(row)
        return SyncItemResult(
            table=item.table, id=item.id, status="applied",
            version=1 if has_version else None, change_id=item.change_id,
        )

    # Sunucuda tombstone'lanmış kaydın update ile dirilmesini reddet.
    if has_tombstone and getattr(row, "is_deleted", 0):
        return SyncItemResult(
            table=item.table, id=item.id, status="conflict",
            reason="deleted_on_server", change_id=item.change_id,
            server_version=getattr(row, "version", None),
            server_data=_row_to_dict(row),
        )

    if has_version and row.version != item.version:
        return SyncItemResult(
            table=item.table, id=item.id, status="conflict",
            reason="version_mismatch", change_id=item.change_id,
            server_version=row.version, server_data=_row_to_dict(row),
        )

    for k, v in payload.items():
        setattr(row, k, v)
    new_version = (row.version + 1) if has_version else None
    if has_version:
        row.version = new_version
    row.updated_at = now
    session.add(row)
    return SyncItemResult(
        table=item.table, id=item.id, status="applied",
        version=new_version, change_id=item.change_id,
    )


def _collect_server_delta(
    session: Session,
    tenant_id: str,
    last_sync_at: Optional[str],
    exclude: set,
) -> List[SyncChangeItem]:
    """updated_at > last_sync_at olan kayıtları döndürür (tombstone dahil).

    updated_at damgaları HER ZAMAN sunucu saatiyle atıldığı için istemcinin
    sakladığı server_time ile karşılaştırma tutarlıdır.
    """
    delta: List[SyncChangeItem] = []
    seen_models = set()
    for table_name, model in SYNC_TABLE_MODELS.items():
        if model in seen_models:
            continue  # aidatlar/aidat_takip alias'ı tek kez taransın
        seen_models.add(model)
        canonical = "aidat_takip" if model is AidatTakip else table_name
        query = select(model).where(model.tenant_id == tenant_id)
        if last_sync_at:
            query = query.where(model.updated_at > last_sync_at)
        for row in session.exec(query).all():
            if (canonical, row.id) in exclude:
                continue
            data = _row_to_dict(row)
            is_deleted = bool(data.get("is_deleted"))
            delta.append(
                SyncChangeItem(
                    table=canonical,
                    id=row.id,
                    operation="delete" if is_deleted else "update",
                    data=data,
                    version=data.get("version") or 1,
                    changed_at=data.get("updated_at"),
                )
            )
    return delta


@router.post("/sync", response_model=UnifiedSyncResponse)
async def unified_sync(
    request: UnifiedSyncRequest,
    session: Session = Depends(get_session),
    current_user: "User" = Depends(get_current_user),
):
    """Tek çağrılık push + pull.

    - Push: her değişiklik için optimistic locking (version) kontrolü.
      Eşleşmeyen versiyon -> conflict (server_data ile birlikte döner,
      istemci sunucu kopyasını uygular ve yerel bekleyen kaydı düşürür).
    - Silme: tombstone (is_deleted=1). Silinmiş kaydın update ile
      dirilmesi reddedilir.
    - Pull: last_sync_at'ten beri değişen kayıtlar (tombstone dahil),
      bu istekte uygulananlar hariç.
    """
    if not current_user.is_superuser and current_user.tenant_id != request.tenant_id:
        raise HTTPException(status_code=403, detail="Bu tenant için yetkiniz yok")

    now = datetime.utcnow().isoformat()
    applied: List[SyncItemResult] = []
    rejected: List[SyncItemResult] = []
    conflicts: List[SyncItemResult] = []

    try:
        for item in request.changes:
            result = _apply_change(session, request.tenant_id, item, now)
            if result.status == "applied":
                applied.append(result)
            elif result.status == "conflict":
                conflicts.append(result)
            else:
                rejected.append(result)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Sync hatası: {e}")

    exclude = {(r.table, r.id) for r in applied}
    server_changes = _collect_server_delta(
        session, request.tenant_id, request.last_sync_at, exclude
    )

    status = "ok" if not rejected and not conflicts else "partial"
    return UnifiedSyncResponse(
        status=status,
        server_time=now,
        applied=applied,
        rejected=rejected,
        conflicts=conflicts,
        changes=server_changes,
    )
