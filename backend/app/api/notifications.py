"""
Notification & Presence API - Bildirim ve Aktiflik Endpointleri

Super Admin için:
- Tüm kullanıcılara veya belirli tenant'a bildirim gönderme
- Online kullanıcıları görme

Kullanıcılar için:
- Bildirimlerini alma
- Heartbeat gönderme (online durumu)
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select, func, or_
from pydantic import BaseModel

from app.core.db import get_session
from app.models.base import User, Tenant
from app.models.notification import Notification, NotificationRead, UserPresence
from app.api.auth import get_current_user

router = APIRouter()


# ==================== SCHEMAS ====================

class SendNotificationRequest(BaseModel):
    """Bildirim gönderme isteği"""
    title: str
    message: str
    notification_type: str = "info"  # info, warning, error, success, announcement
    priority: str = "normal"  # low, normal, high, urgent
    tenant_id: Optional[str] = None  # None = Tüm tenant'lar
    user_id: Optional[str] = None  # None = Tüm kullanıcılar
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    expires_hours: Optional[int] = None  # Kaç saat sonra expire olsun


class NotificationResponse(BaseModel):
    """Bildirim response"""
    id: str
    title: str
    message: str
    notification_type: str
    priority: str
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    created_at: str
    is_read: bool = False


class HeartbeatRequest(BaseModel):
    """Heartbeat isteği"""
    device_id: Optional[str] = None
    current_page: Optional[str] = None
    platform: str = "web"


class OnlineUserResponse(BaseModel):
    """Online kullanıcı bilgisi"""
    user_id: str
    user_email: str
    user_name: str
    tenant_id: str
    tenant_name: str
    device_id: Optional[str] = None
    platform: Optional[str] = None
    current_page: Optional[str] = None
    status: str
    last_seen: str
    session_duration_minutes: int


class PresenceStatsResponse(BaseModel):
    """Aktiflik istatistikleri"""
    total_online: int
    total_away: int
    by_tenant: List[dict]
    by_platform: dict
    online_users: List[OnlineUserResponse]


# ==================== HELPER FUNCTIONS ====================

def get_client_ip(request: Request) -> str:
    """Request'ten IP adresini al"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Super admin kontrolü"""
    if current_user.role.upper() != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super Admin yetkisi gerekli")
    return current_user


# ==================== USER ENDPOINTS ====================

@router.get("/my-notifications", response_model=List[NotificationResponse])
async def get_my_notifications(
    unread_only: bool = False,
    limit: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Kullanıcının bildirimlerini getir
    """
    now = datetime.utcnow().isoformat()
    
    # Kullanıcıya ait bildirimleri bul
    query = select(Notification).where(
        Notification.is_active == True,
        or_(
            Notification.expires_at == None,
            Notification.expires_at > now
        ),
        or_(
            Notification.tenant_id == None,  # Herkese
            Notification.tenant_id == current_user.tenant_id
        ),
        or_(
            Notification.user_id == None,  # Herkese
            Notification.user_id == current_user.id
        )
    ).order_by(Notification.created_at.desc()).limit(limit)
    
    notifications = session.exec(query).all()
    
    # Okunmuş bildirimleri bul
    read_ids = set()
    if notifications:
        reads = session.exec(
            select(NotificationRead.notification_id)
            .where(NotificationRead.user_id == current_user.id)
        ).all()
        read_ids = set(reads)
    
    result = []
    for n in notifications:
        is_read = n.id in read_ids
        
        if unread_only and is_read:
            continue
        
        result.append(NotificationResponse(
            id=n.id,
            title=n.title,
            message=n.message,
            notification_type=n.notification_type,
            priority=n.priority,
            action_url=n.action_url,
            action_label=n.action_label,
            created_at=n.created_at,
            is_read=is_read,
        ))
    
    return result


@router.get("/unread-count")
async def get_unread_count(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Okunmamış bildirim sayısını getir
    """
    now = datetime.utcnow().isoformat()
    
    # Kullanıcıya ait bildirimleri say
    notifications = session.exec(
        select(Notification.id).where(
            Notification.is_active == True,
            or_(
                Notification.expires_at == None,
                Notification.expires_at > now
            ),
            or_(
                Notification.tenant_id == None,
                Notification.tenant_id == current_user.tenant_id
            ),
            or_(
                Notification.user_id == None,
                Notification.user_id == current_user.id
            )
        )
    ).all()
    
    # Okunmuş olanları çıkar
    read_count = session.exec(
        select(func.count(NotificationRead.id))
        .where(NotificationRead.user_id == current_user.id)
        .where(NotificationRead.notification_id.in_(notifications))
    ).one()
    
    unread = len(notifications) - read_count
    
    return {"unread_count": max(0, unread)}


@router.post("/{notification_id}/mark-read")
async def mark_notification_read(
    notification_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Bildirimi okundu olarak işaretle
    """
    # Zaten okunmuş mu kontrol et
    existing = session.exec(
        select(NotificationRead)
        .where(NotificationRead.notification_id == notification_id)
        .where(NotificationRead.user_id == current_user.id)
    ).first()
    
    if existing:
        return {"status": "already_read"}
    
    read = NotificationRead(
        notification_id=notification_id,
        user_id=current_user.id,
    )
    session.add(read)
    session.commit()
    
    return {"status": "marked_read"}


@router.post("/mark-all-read")
async def mark_all_notifications_read(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Tüm bildirimleri okundu olarak işaretle
    """
    now = datetime.utcnow().isoformat()
    
    # Kullanıcıya ait bildirimleri bul
    notifications = session.exec(
        select(Notification.id).where(
            Notification.is_active == True,
            or_(
                Notification.expires_at == None,
                Notification.expires_at > now
            ),
            or_(
                Notification.tenant_id == None,
                Notification.tenant_id == current_user.tenant_id
            ),
            or_(
                Notification.user_id == None,
                Notification.user_id == current_user.id
            )
        )
    ).all()
    
    # Okunmuş olanları bul
    already_read = set(session.exec(
        select(NotificationRead.notification_id)
        .where(NotificationRead.user_id == current_user.id)
    ).all())
    
    # Okunmamışları işaretle
    count = 0
    for nid in notifications:
        if nid not in already_read:
            read = NotificationRead(
                notification_id=nid,
                user_id=current_user.id,
            )
            session.add(read)
            count += 1
    
    session.commit()
    
    return {"status": "success", "marked_count": count}


@router.post("/heartbeat")
async def send_heartbeat(
    data: HeartbeatRequest,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Heartbeat gönder - Online durumunu güncelle
    Her 30 saniyede bir gönderilmeli
    """
    if not current_user.tenant_id:
        return {"status": "skipped", "reason": "no_tenant"}
    
    now = datetime.utcnow().isoformat()
    client_ip = get_client_ip(request)
    
    # Mevcut presence'ı bul veya oluştur
    presence = session.exec(
        select(UserPresence).where(UserPresence.user_id == current_user.id)
    ).first()
    
    if presence:
        presence.status = "online"
        presence.last_seen = now
        presence.current_page = data.current_page
        presence.device_id = data.device_id
        presence.ip_address = client_ip
        presence.platform = data.platform
        presence.updated_at = now
    else:
        presence = UserPresence(
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            device_id=data.device_id,
            status="online",
            last_seen=now,
            current_page=data.current_page,
            ip_address=client_ip,
            platform=data.platform,
            session_started=now,
        )
        session.add(presence)
    
    session.add(presence)
    session.commit()
    
    return {"status": "ok", "server_time": now}


# ==================== SUPER ADMIN ENDPOINTS ====================

@router.post("/send")
async def send_notification(
    data: SendNotificationRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """
    Bildirim gönder (Super Admin)
    
    - tenant_id=None: Tüm tenant'lara
    - user_id=None: Tüm kullanıcılara
    - Her ikisi de belirtilirse sadece o kullanıcıya
    """
    expires_at = None
    if data.expires_hours:
        expires_at = (datetime.utcnow() + timedelta(hours=data.expires_hours)).isoformat()
    
    notification = Notification(
        tenant_id=data.tenant_id,
        user_id=data.user_id,
        title=data.title,
        message=data.message,
        notification_type=data.notification_type,
        priority=data.priority,
        action_url=data.action_url,
        action_label=data.action_label,
        sender_id=current_user.id,
        expires_at=expires_at,
    )
    
    session.add(notification)
    session.commit()
    session.refresh(notification)
    
    # Hedef sayısını hesapla
    target_desc = "Tüm kullanıcılar"
    if data.tenant_id and data.user_id:
        target_desc = f"Kullanıcı: {data.user_id}"
    elif data.tenant_id:
        tenant = session.get(Tenant, data.tenant_id)
        target_desc = f"Tenant: {tenant.name if tenant else data.tenant_id}"
    
    return {
        "success": True,
        "notification_id": notification.id,
        "target": target_desc,
        "type": notification.notification_type,
        "priority": notification.priority,
    }


@router.get("/all-notifications", response_model=List[dict])
async def list_all_notifications(
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """
    Tüm bildirimleri listele (Super Admin)
    """
    notifications = session.exec(
        select(Notification)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    ).all()
    
    result = []
    for n in notifications:
        # Hedef bilgisi
        target = "Tüm Kullanıcılar"
        if n.tenant_id and n.user_id:
            user = session.get(User, n.user_id)
            target = f"Kullanıcı: {user.email if user else n.user_id}"
        elif n.tenant_id:
            tenant = session.get(Tenant, n.tenant_id)
            target = f"Tenant: {tenant.name if tenant else n.tenant_id}"
        
        # Okunma sayısı
        read_count = session.exec(
            select(func.count(NotificationRead.id))
            .where(NotificationRead.notification_id == n.id)
        ).one()
        
        result.append({
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "notification_type": n.notification_type,
            "priority": n.priority,
            "target": target,
            "created_at": n.created_at,
            "expires_at": n.expires_at,
            "is_active": n.is_active,
            "read_count": read_count,
        })
    
    return result


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """
    Bildirimi sil/deaktif et (Super Admin)
    """
    notification = session.get(Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    
    notification.is_active = False
    session.add(notification)
    session.commit()
    
    return {"success": True, "message": "Bildirim deaktif edildi"}


@router.get("/online-users", response_model=PresenceStatsResponse)
async def get_online_users(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """
    Online kullanıcıları getir (Super Admin)
    Son 2 dakika içinde heartbeat gönderenler "online"
    Son 5 dakika içinde gönderenler "away"
    """
    now = datetime.utcnow()
    online_threshold = (now - timedelta(minutes=2)).isoformat()
    away_threshold = (now - timedelta(minutes=5)).isoformat()
    
    # Tüm presence kayıtlarını al
    presences = session.exec(
        select(UserPresence)
        .where(UserPresence.last_seen > away_threshold)
        .order_by(UserPresence.last_seen.desc())
    ).all()
    
    # Durumları güncelle ve say
    online_count = 0
    away_count = 0
    by_tenant = {}
    by_platform = {}
    online_users = []
    
    for p in presences:
        # Durumu belirle
        if p.last_seen > online_threshold:
            status = "online"
            online_count += 1
        else:
            status = "away"
            away_count += 1
        
        # Kullanıcı ve tenant bilgisi
        user = session.get(User, p.user_id)
        tenant = session.get(Tenant, p.tenant_id)
        
        if not user:
            continue
        
        # Platform sayacı
        platform = p.platform or "unknown"
        by_platform[platform] = by_platform.get(platform, 0) + 1
        
        # Tenant sayacı
        tenant_name = tenant.name if tenant else "Bilinmiyor"
        if p.tenant_id not in by_tenant:
            by_tenant[p.tenant_id] = {"tenant_name": tenant_name, "count": 0}
        by_tenant[p.tenant_id]["count"] += 1
        
        # Session süresi
        try:
            session_start = datetime.fromisoformat(p.session_started.replace('Z', '+00:00'))
            session_duration = (now - session_start).total_seconds() / 60
        except:
            session_duration = 0
        
        online_users.append(OnlineUserResponse(
            user_id=p.user_id,
            user_email=user.email,
            user_name=user.full_name,
            tenant_id=p.tenant_id,
            tenant_name=tenant_name,
            device_id=p.device_id,
            platform=p.platform,
            current_page=p.current_page,
            status=status,
            last_seen=p.last_seen,
            session_duration_minutes=int(session_duration),
        ))
    
    # Tenant listesini dönüştür
    by_tenant_list = [
        {"tenant_id": tid, "tenant_name": data["tenant_name"], "online_count": data["count"]}
        for tid, data in by_tenant.items()
    ]
    by_tenant_list.sort(key=lambda x: x["online_count"], reverse=True)
    
    return PresenceStatsResponse(
        total_online=online_count,
        total_away=away_count,
        by_tenant=by_tenant_list,
        by_platform=by_platform,
        online_users=online_users,
    )


@router.post("/broadcast")
async def broadcast_notification(
    data: SendNotificationRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """
    Tüm online kullanıcılara anlık bildirim gönder (Super Admin)
    """
    # Sadece online kullanıcılara gönder
    now = datetime.utcnow()
    online_threshold = (now - timedelta(minutes=5)).isoformat()
    
    online_presences = session.exec(
        select(UserPresence)
        .where(UserPresence.last_seen > online_threshold)
    ).all()
    
    # Her online kullanıcıya bildirim oluştur
    count = 0
    for p in online_presences:
        expires_at = None
        if data.expires_hours:
            expires_at = (now + timedelta(hours=data.expires_hours)).isoformat()
        
        notification = Notification(
            tenant_id=p.tenant_id,
            user_id=p.user_id,
            title=data.title,
            message=data.message,
            notification_type=data.notification_type,
            priority=data.priority,
            action_url=data.action_url,
            action_label=data.action_label,
            sender_id=current_user.id,
            expires_at=expires_at,
        )
        session.add(notification)
        count += 1
    
    session.commit()
    
    return {
        "success": True,
        "sent_count": count,
        "message": f"{count} online kullanıcıya bildirim gönderildi"
    }
