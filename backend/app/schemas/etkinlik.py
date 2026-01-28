"""
Etkinlik Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional



class EtkinlikBase(BaseModel):
    """Base Etkinlik schema"""
    etkinlik_tipi: Optional[str] = "DİĞER"
    baslik: str
    aciklama: Optional[str] = None
    baslangic_tarihi: datetime
    bitis_tarihi: Optional[datetime] = None
    yer: Optional[str] = None
    durum: str = "Planlandı"
    katilimci_sayisi: Optional[int] = 0
    tahmini_butce: Optional[float] = 0.0
    gerceklesen_butce: Optional[float] = 0.0
    notlar: Optional[str] = None
    sorumlu_uye_id: Optional[UUID4] = None


class EtkinlikCreate(EtkinlikBase):
    """Create Etkinlik schema"""
    pass


class EtkinlikUpdate(BaseModel):
    """Update Etkinlik schema"""
    etkinlik_tipi: Optional[str] = None
    baslik: Optional[str] = None
    aciklama: Optional[str] = None
    baslangic_tarihi: Optional[datetime] = None
    bitis_tarihi: Optional[datetime] = None
    yer: Optional[str] = None
    durum: Optional[str] = None
    katilimci_sayisi: Optional[int] = None
    tahmini_butce: Optional[float] = None
    gerceklesen_butce: Optional[float] = None
    notlar: Optional[str] = None
    sorumlu_uye_id: Optional[UUID4] = None


class EtkinlikInDB(EtkinlikBase):
    """Database Etkinlik schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class EtkinlikResponse(EtkinlikInDB):
    """Response Etkinlik schema"""
    pass

