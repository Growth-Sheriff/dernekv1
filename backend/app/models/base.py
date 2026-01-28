from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum
import uuid

# --- ENUMS ---
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"

class TenantStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"

class LicenseType(str, Enum):
    TRIAL = "trial"
    STANDARD = "standard"
    PRO = "pro"
    ENTERPRISE = "enterprise"
    HYBRID = "hybrid"

class TransactionType(str, Enum):
    INCOME = "income"  # Gelir
    EXPENSE = "expense"  # Gider

# --- TENANT / ORGANIZATION ---
class Tenant(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(index=True)
    slug: str = Field(unique=True, index=True)
    status: str = Field(default="active")  # Desktop uses is_active but we keep status for compatibility
    is_active: bool = Field(default=True)
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    # Limits
    max_users: int = Field(default=100)
    max_storage_mb: int = Field(default=1000)
    max_members: int = Field(default=10000)

    # Relationships
    users: List["User"] = Relationship(back_populates="tenant")
    licenses: List["License"] = Relationship(back_populates="tenant")

# --- LICENSE ---
class License(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: Optional[str] = Field(default=None, foreign_key="tenant.id")
    key: str = Field(unique=True, index=True)  # BADER-XXXX-XXXX-XXXX-XXXX
    
    # Platform Erişimleri (Modüler Lisanslama)
    desktop_enabled: bool = Field(default=False)
    web_enabled: bool = Field(default=False)
    mobile_enabled: bool = Field(default=False)
    sync_enabled: bool = Field(default=False)
    
    # Eski alanlar (geriye uyumluluk)
    plan: str = Field(default="standard")  # trial, standard, pro, enterprise, hybrid
    mode: str = Field(default="hybrid")  # local, hybrid, cloud - DEPRECATED, use platform flags
    license_type: str = Field(default="standard")
    features: str = Field(default="ALL")  # JSON string or comma-separated
    hardware_id: Optional[str] = None
    
    # Tarihler
    start_date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    end_date: str = Field(default_factory=lambda: (datetime.utcnow().replace(year=datetime.utcnow().year + 1)).isoformat())
    expires_at: Optional[str] = None
    
    # Durum
    is_active: bool = Field(default=True)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    tenant: Optional[Tenant] = Relationship(back_populates="licenses")
    
    def get_license_type_name(self) -> str:
        """Platform bitlerinden lisans tipi adını döndürür"""
        if self.desktop_enabled and self.web_enabled and self.mobile_enabled:
            return "HYBRID"
        elif not self.desktop_enabled and self.web_enabled and self.mobile_enabled:
            return "ONLINE"
        elif self.desktop_enabled and not self.web_enabled and not self.mobile_enabled:
            return "LOCAL"
        elif self.desktop_enabled and self.mobile_enabled and not self.web_enabled:
            return "DESKTOP+MOBIL"
        elif not self.desktop_enabled and self.web_enabled and not self.mobile_enabled:
            return "WEB_ONLY"
        elif not self.desktop_enabled and not self.web_enabled and self.mobile_enabled:
            return "MOBIL_ONLY"
        else:
            return "CUSTOM"

# --- USER ---
class User(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: Optional[str] = Field(default=None, foreign_key="tenant.id")
    username: Optional[str] = None
    email: str = Field(unique=True, index=True)
    hashed_password: str
    password_hash: Optional[str] = None  # Alias for desktop compatibility
    full_name: str
    role: str = Field(default="admin")
    phone: Optional[str] = None
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)
    last_login: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    tenant: Optional[Tenant] = Relationship(back_populates="users")

# --- KASA (CASH REGISTER) ---
class Kasa(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)
    kasa_adi: str
    bakiye: float = Field(default=0.0)
    para_birimi: str = Field(default="TRY")
    devir_bakiye: float = Field(default=0.0)
    toplam_gelir: float = Field(default=0.0)
    toplam_gider: float = Field(default=0.0)
    virman_giris: float = Field(default=0.0)
    virman_cikis: float = Field(default=0.0)
    fiziksel_bakiye: float = Field(default=0.0)
    tahakkuk_tutari: float = Field(default=0.0)
    serbest_bakiye: float = Field(default=0.0)
    is_active: bool = Field(default=True)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# --- GELIR TURU (INCOME TYPE) ---
class GelirTuru(SQLModel, table=True):
    __tablename__ = "gelir_turleri"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)
    ad: str
    kod: Optional[str] = None
    aciklama: Optional[str] = None
    varsayilan_makbuz_prefix: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# --- GIDER TURU (EXPENSE TYPE) ---
class GiderTuru(SQLModel, table=True):
    __tablename__ = "gider_turleri"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)
    ad: str
    kod: Optional[str] = None
    aciklama: Optional[str] = None
    varsayilan_fatura_prefix: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# --- GELIR (INCOME) ---
class Gelir(SQLModel, table=True):
    __tablename__ = "gelirler"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)
    kasa_id: str
    gelir_turu: Optional[str] = None
    gelir_turu_id: Optional[str] = None
    alt_kategori: Optional[str] = None
    tarih: str
    tutar: float
    aciklama: Optional[str] = None
    makbuz_no: Optional[str] = None
    belge_no: Optional[str] = None
    tahsil_eden: Optional[str] = None
    aidat_id: Optional[str] = None
    uye_id: Optional[str] = None
    ait_oldugu_yil: Optional[int] = None
    tahakkuk_durumu: Optional[str] = None
    notlar: Optional[str] = None
    belge_id: Optional[str] = None
    is_deleted: int = Field(default=0)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# --- GIDER (EXPENSE) ---
class Gider(SQLModel, table=True):
    __tablename__ = "giderler"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)
    kasa_id: str
    gider_turu: Optional[str] = None
    gider_turu_id: Optional[str] = None
    alt_kategori: Optional[str] = None
    tarih: str
    tutar: float
    aciklama: Optional[str] = None
    fatura_no: Optional[str] = None
    islem_no: Optional[str] = None
    odeyen: Optional[str] = None
    notlar: Optional[str] = None
    belge_id: Optional[str] = None
    is_deleted: int = Field(default=0)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# --- UYE (MEMBER) ---
class Uye(SQLModel, table=True):
    __tablename__ = "uyeler"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)
    uye_no: str
    tc_no: str
    ad: str
    soyad: str
    ad_soyad: str = Field(index=True)
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
    uyelik_tipi: Optional[str] = Field(default="Asil")
    ozel_aidat_tutari: Optional[float] = None
    aidat_indirimi_yuzde: Optional[float] = None
    giris_tarihi: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    cikis_tarihi: Optional[str] = None
    durum: str = Field(default="Aktif")
    referans_uye_id: Optional[str] = None
    ayrilma_nedeni: Optional[str] = None
    notlar: Optional[str] = None
    sync_id: Optional[str] = None
    version: int = Field(default=1)
    is_deleted: int = Field(default=0)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# --- AIDAT TAKIP (DUES TRACKING) ---
class AidatTakip(SQLModel, table=True):
    __tablename__ = "aidat_takip"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)
    uye_id: str
    yil: int
    ay: int
    tutar: float = Field(default=0.0)
    odenen: float = Field(default=0.0)
    kalan: Optional[float] = None
    odeme_tarihi: Optional[str] = None
    durum: str = Field(default="beklemede")
    gecikme_gun: Optional[int] = None
    gecikme_faiz: Optional[float] = None
    tahsilat_turu: Optional[str] = None
    banka_sube: Optional[str] = None
    dekont_no: Optional[str] = None
    aciklama: Optional[str] = None
    notlar: Optional[str] = None
    gelir_id: Optional[str] = None
    aktarim_durumu: Optional[str] = None
    version: int = Field(default=1)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# --- VIRMAN (TRANSFER) ---
class Virman(SQLModel, table=True):
    __tablename__ = "virmanlar"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)
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
    is_deleted: int = Field(default=0)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# --- SYNC CHANGES (for offline/online sync) ---
class SyncChange(SQLModel, table=True):
    __tablename__ = "sync_changes"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(index=True)
    table_name: str
    record_id: str
    operation: str  # INSERT, UPDATE, DELETE
    data: str  # JSON string
    synced: bool = Field(default=False)
    sync_version: int = Field(default=1)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
