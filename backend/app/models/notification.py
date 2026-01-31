"""
Notification & Presence Model - Bildirim ve Aktiflik Takibi

Super Admin'den müşterilere mesaj gönderme ve online durumu takibi.
"""
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
import uuid


class Notification(SQLModel, table=True):
    """
    Bildirimler - Super Admin'den müşterilere gönderilen mesajlar
    """
    __tablename__ = "notifications"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    
    # Hedef
    tenant_id: Optional[str] = Field(default=None, index=True)  # None = Tüm tenant'lar
    user_id: Optional[str] = Field(default=None, index=True)  # None = Tüm kullanıcılar
    device_id: Optional[str] = Field(default=None, index=True)  # None = Tüm cihazlar
    
    # İçerik
    title: str
    message: str
    notification_type: str = Field(default="info")  # info, warning, error, success, announcement
    priority: str = Field(default="normal")  # low, normal, high, urgent
    
    # Eylem (opsiyonel)
    action_url: Optional[str] = None  # Tıklandığında gidilecek URL
    action_label: Optional[str] = None  # Buton metni
    
    # Meta
    sender_id: Optional[str] = None  # Gönderen Super Admin
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    expires_at: Optional[str] = None  # Bitiş tarihi
    
    # Durum
    is_active: bool = Field(default=True)


class NotificationRead(SQLModel, table=True):
    """
    Okunmuş bildirimler - Hangi kullanıcı hangi bildirimi okudu
    """
    __tablename__ = "notification_reads"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    notification_id: str = Field(index=True)
    user_id: str = Field(index=True)
    device_id: Optional[str] = None
    
    read_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class UserPresence(SQLModel, table=True):
    """
    Kullanıcı online durumu - Heartbeat sistemi ile güncellenir
    """
    __tablename__ = "user_presence"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    
    user_id: str = Field(index=True, unique=True)
    tenant_id: str = Field(index=True)
    device_id: Optional[str] = None
    
    # Durum
    status: str = Field(default="online")  # online, away, offline
    last_seen: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    # Konum bilgisi
    current_page: Optional[str] = None  # Hangi sayfada
    ip_address: Optional[str] = None
    platform: Optional[str] = None  # desktop, web, mobile
    
    # Session bilgisi
    session_started: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    # Meta
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
