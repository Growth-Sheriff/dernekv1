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
    session: Session = Depends(get_session)
):
    """
    Desktop'tan sunucuya veri gönder (push)
    """
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
    session: Session = Depends(get_session)
):
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
    session: Session = Depends(get_session)
):
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
    session: Session = Depends(get_session)
):
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
    session: Session = Depends(get_session)
):
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
    session: Session = Depends(get_session)
):
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
