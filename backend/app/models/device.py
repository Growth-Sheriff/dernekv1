"""
Device Activation Model - Cihaz Aktivasyon Takibi

Bu model hangi lisansın hangi cihazlarda aktif olduğunu takip eder.
Fingerprinting ile cihaz benzersiz olarak tanımlanır.
"""
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
import uuid


class DeviceActivation(SQLModel, table=True):
    """
    Cihaz aktivasyon kaydı - Her login'de güncellenir
    """
    __tablename__ = "device_activations"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    
    # Bağlantılar
    tenant_id: str = Field(index=True)
    license_id: Optional[str] = Field(default=None, index=True)
    user_id: str = Field(index=True)
    
    # Cihaz Kimliği (Fingerprint)
    device_id: str = Field(index=True)  # Benzersiz cihaz kimliği
    device_fingerprint: Optional[str] = None  # Detaylı fingerprint hash
    
    # Cihaz Bilgileri
    device_name: Optional[str] = None  # "MacBook Pro", "Windows PC" vb.
    device_type: Optional[str] = None  # "desktop", "web", "mobile"
    platform: Optional[str] = None  # "macos", "windows", "linux", "web", "ios", "android"
    os_version: Optional[str] = None  # "Windows 11", "macOS 14.2"
    app_version: Optional[str] = None  # "1.0.0"
    
    # Hardware Fingerprint Bileşenleri
    cpu_info: Optional[str] = None  # CPU modeli
    ram_size: Optional[str] = None  # RAM miktarı
    screen_resolution: Optional[str] = None  # Ekran çözünürlüğü
    hostname: Optional[str] = None  # Bilgisayar adı
    username: Optional[str] = None  # Sistem kullanıcı adı
    mac_address: Optional[str] = None  # MAC adresi (hash'lenmiş)
    disk_serial: Optional[str] = None  # Disk seri no (hash'lenmiş)
    
    # Network Bilgileri
    ip_address: Optional[str] = None  # Son bağlantı IP'si
    user_agent: Optional[str] = None  # Browser user agent (web için)
    
    # Tarihler
    first_seen: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    last_seen: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    last_login: Optional[str] = None
    
    # İstatistikler
    login_count: int = Field(default=0)
    session_count: int = Field(default=0)
    
    # Durum
    is_active: bool = Field(default=True)
    is_blocked: bool = Field(default=False)  # Super admin tarafından bloklanmış mı
    block_reason: Optional[str] = None
    
    # Meta
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class DeviceSession(SQLModel, table=True):
    """
    Aktif oturum takibi - Her login'de oluşturulur
    """
    __tablename__ = "device_sessions"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    
    device_activation_id: str = Field(index=True)
    user_id: str = Field(index=True)
    tenant_id: str = Field(index=True)
    
    # Oturum bilgileri
    token_hash: Optional[str] = None  # Token'ın hash'i (güvenlik için)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Tarihler
    started_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    last_activity: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    ended_at: Optional[str] = None
    
    # Durum
    is_active: bool = Field(default=True)
    end_reason: Optional[str] = None  # "logout", "expired", "kicked"
