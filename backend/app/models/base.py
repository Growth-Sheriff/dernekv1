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

class TransactionType(str, Enum):
    INCOME = "income"  # Gelir
    EXPENSE = "expense"  # Gider

# --- TENANT / ORGANIZATION ---
class Tenant(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(index=True)
    slug: str = Field(unique=True, index=True)
    status: TenantStatus = Field(default=TenantStatus.ACTIVE)
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Limits
    max_users: int = Field(default=100)
    max_storage_mb: int = Field(default=1000)

    # Relationships
    users: List["User"] = Relationship(back_populates="tenant")
    members: List["Member"] = Relationship(back_populates="tenant")
    transactions: List["Transaction"] = Relationship(back_populates="tenant")
    licenses: List["License"] = Relationship(back_populates="tenant")

# --- LICENSE ---
class License(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(foreign_key="tenant.id")
    key: str = Field(unique=True, index=True)
    license_type: LicenseType = Field(default=LicenseType.STANDARD)
    start_date: datetime
    end_date: datetime
    is_active: bool = Field(default=True)
    
    tenant: Tenant = Relationship(back_populates="licenses")

# --- USER ---
class User(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str
    is_active: bool = Field(default=True)
    role: UserRole = Field(default=UserRole.ADMIN)
    
    # Nullable for Super Admins (no specific tenant)
    tenant_id: Optional[str] = Field(default=None, foreign_key="tenant.id")
    
    tenant: Optional[Tenant] = Relationship(back_populates="users")

# --- APP DATA: MEMBERS (UYELER) ---
class Member(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(foreign_key="tenant.id", index=True)
    
    tc_no: Optional[str] = Field(default=None, index=True)
    uye_no: Optional[str] = Field(default=None)
    ad_soyad: str = Field(index=True)
    telefon: Optional[str] = None
    email: Optional[str] = None
    kan_grubu: Optional[str] = None
    cinsiyet: Optional[str] = None
    dogum_tarihi: Optional[datetime] = None
    giris_tarihi: datetime = Field(default_factory=datetime.utcnow)
    
    durum: str = Field(default="Aktif") # Aktif, Pasif, vb.
    uyelik_tipi: str = Field(default="Asil")
    
    address: Optional[str] = None
    city: Optional[str] = None
    
    # Sync Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    sync_id: Optional[str] = Field(default=None) # Desktop ID mapping

    tenant: Tenant = Relationship(back_populates="members")

# --- APP DATA: FINANCE (GELIR/GIDER) ---
class Transaction(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    tenant_id: str = Field(foreign_key="tenant.id", index=True)
    
    type: TransactionType
    amount: float
    currency: str = Field(default="TRY")
    description: Optional[str] = None
    
    date: datetime = Field(default_factory=datetime.utcnow)
    
    category_id: Optional[str] = None
    account_id: Optional[str] = None # Kasa ID
    
    member_id: Optional[str] = Field(default=None, foreign_key="member.id")
    
    # Sync Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sync_id: Optional[str] = Field(default=None)

    tenant: Tenant = Relationship(back_populates="transactions")
