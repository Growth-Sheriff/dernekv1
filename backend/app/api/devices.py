"""
Device Tracking API - Cihaz Takip Endpointleri

Super Admin için tüm cihazları görüntüleme ve yönetme.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlmodel import Session, select, func
from pydantic import BaseModel
import hashlib

from app.core.db import get_session
from app.models.base import User, License, Tenant
from app.models.device import DeviceActivation, DeviceSession
from app.api.auth import get_current_user

router = APIRouter()


# ==================== SCHEMAS ====================

class DeviceInfo(BaseModel):
    """Cihazdan gelen bilgiler"""
    device_id: str
    device_name: Optional[str] = None
    device_type: str = "desktop"  # desktop, web, mobile
    platform: Optional[str] = None  # macos, windows, linux, web, ios, android
    os_version: Optional[str] = None
    app_version: Optional[str] = None
    
    # Hardware fingerprint
    cpu_info: Optional[str] = None
    ram_size: Optional[str] = None
    screen_resolution: Optional[str] = None
    hostname: Optional[str] = None
    username: Optional[str] = None
    mac_address: Optional[str] = None  # Hash'lenmiş
    disk_serial: Optional[str] = None  # Hash'lenmiş


class DeviceActivationResponse(BaseModel):
    """Cihaz aktivasyon bilgisi"""
    id: str
    tenant_id: str
    tenant_name: Optional[str] = None
    license_key: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    
    device_id: str
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    platform: Optional[str] = None
    os_version: Optional[str] = None
    app_version: Optional[str] = None
    hostname: Optional[str] = None
    username: Optional[str] = None
    
    ip_address: Optional[str] = None
    
    first_seen: str
    last_seen: str
    last_login: Optional[str] = None
    login_count: int
    
    is_active: bool
    is_blocked: bool
    block_reason: Optional[str] = None


class DeviceStatsResponse(BaseModel):
    """Cihaz istatistikleri"""
    total_devices: int
    active_devices: int
    blocked_devices: int
    
    by_platform: dict  # {"macos": 5, "windows": 10, ...}
    by_type: dict  # {"desktop": 10, "web": 5, "mobile": 3}
    by_tenant: List[dict]  # [{"tenant_name": "X", "device_count": 5}, ...]
    
    recent_activations: List[DeviceActivationResponse]


# ==================== HELPER FUNCTIONS ====================

def generate_fingerprint(device_info: DeviceInfo) -> str:
    """
    Cihaz bilgilerinden benzersiz fingerprint oluştur
    """
    components = [
        device_info.device_id,
        device_info.platform or "",
        device_info.hostname or "",
        device_info.mac_address or "",
        device_info.disk_serial or "",
        device_info.cpu_info or "",
    ]
    fingerprint_string = "|".join(components)
    return hashlib.sha256(fingerprint_string.encode()).hexdigest()[:32]


def get_client_ip(request: Request) -> str:
    """Request'ten IP adresini al"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ==================== USER ENDPOINTS ====================

@router.post("/register")
async def register_device(
    device_info: DeviceInfo,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Cihaz kaydı veya güncelleme - Her login'de çağrılır
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Kullanıcının tenant'ı yok")
    
    # Fingerprint oluştur
    fingerprint = generate_fingerprint(device_info)
    
    # Mevcut aktivasyonu kontrol et
    existing = session.exec(
        select(DeviceActivation)
        .where(DeviceActivation.device_id == device_info.device_id)
        .where(DeviceActivation.tenant_id == current_user.tenant_id)
    ).first()
    
    # Lisansı bul
    license_obj = session.exec(
        select(License)
        .where(License.tenant_id == current_user.tenant_id)
        .where(License.is_active == True)
    ).first()
    
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "")
    now = datetime.utcnow().isoformat()
    
    if existing:
        # Bloklu mu kontrol et
        if existing.is_blocked:
            raise HTTPException(
                status_code=403, 
                detail=f"Bu cihaz bloklanmış: {existing.block_reason or 'Yetkisiz erişim'}"
            )
        
        # Güncelle
        existing.device_fingerprint = fingerprint
        existing.device_name = device_info.device_name
        existing.device_type = device_info.device_type
        existing.platform = device_info.platform
        existing.os_version = device_info.os_version
        existing.app_version = device_info.app_version
        existing.cpu_info = device_info.cpu_info
        existing.ram_size = device_info.ram_size
        existing.screen_resolution = device_info.screen_resolution
        existing.hostname = device_info.hostname
        existing.username = device_info.username
        existing.mac_address = device_info.mac_address
        existing.disk_serial = device_info.disk_serial
        existing.ip_address = client_ip
        existing.user_agent = user_agent
        existing.last_seen = now
        existing.last_login = now
        existing.login_count += 1
        existing.updated_at = now
        existing.is_active = True
        
        if license_obj:
            existing.license_id = license_obj.id
        
        session.add(existing)
        session.commit()
        
        return {"status": "updated", "device_id": existing.device_id, "activation_id": existing.id}
    
    else:
        # Yeni kayıt oluştur
        activation = DeviceActivation(
            tenant_id=current_user.tenant_id,
            license_id=license_obj.id if license_obj else None,
            user_id=current_user.id,
            device_id=device_info.device_id,
            device_fingerprint=fingerprint,
            device_name=device_info.device_name,
            device_type=device_info.device_type,
            platform=device_info.platform,
            os_version=device_info.os_version,
            app_version=device_info.app_version,
            cpu_info=device_info.cpu_info,
            ram_size=device_info.ram_size,
            screen_resolution=device_info.screen_resolution,
            hostname=device_info.hostname,
            username=device_info.username,
            mac_address=device_info.mac_address,
            disk_serial=device_info.disk_serial,
            ip_address=client_ip,
            user_agent=user_agent,
            first_seen=now,
            last_seen=now,
            last_login=now,
            login_count=1,
        )
        session.add(activation)
        session.commit()
        session.refresh(activation)
        
        return {"status": "registered", "device_id": activation.device_id, "activation_id": activation.id}


# ==================== SUPER ADMIN ENDPOINTS ====================

def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Super admin kontrolü"""
    if current_user.role.upper() != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super Admin yetkisi gerekli")
    return current_user


@router.get("/all", response_model=List[DeviceActivationResponse])
async def list_all_devices(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin),
    tenant_id: Optional[str] = None,
    platform: Optional[str] = None,
    device_type: Optional[str] = None,
    is_blocked: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0
):
    """
    Tüm cihazları listele (Super Admin)
    """
    query = select(DeviceActivation)
    
    if tenant_id:
        query = query.where(DeviceActivation.tenant_id == tenant_id)
    if platform:
        query = query.where(DeviceActivation.platform == platform)
    if device_type:
        query = query.where(DeviceActivation.device_type == device_type)
    if is_blocked is not None:
        query = query.where(DeviceActivation.is_blocked == is_blocked)
    
    query = query.order_by(DeviceActivation.last_seen.desc())
    query = query.offset(offset).limit(limit)
    
    devices = session.exec(query).all()
    
    result = []
    for d in devices:
        # Tenant bilgisi
        tenant = session.get(Tenant, d.tenant_id)
        tenant_name = tenant.name if tenant else "Bilinmiyor"
        
        # License bilgisi
        license_key = None
        if d.license_id:
            lic = session.get(License, d.license_id)
            license_key = lic.key if lic else None
        
        # User bilgisi
        user = session.get(User, d.user_id)
        user_email = user.email if user else None
        user_name = user.full_name if user else None
        
        result.append(DeviceActivationResponse(
            id=d.id,
            tenant_id=d.tenant_id,
            tenant_name=tenant_name,
            license_key=license_key,
            user_email=user_email,
            user_name=user_name,
            device_id=d.device_id,
            device_name=d.device_name,
            device_type=d.device_type,
            platform=d.platform,
            os_version=d.os_version,
            app_version=d.app_version,
            hostname=d.hostname,
            username=d.username,
            ip_address=d.ip_address,
            first_seen=d.first_seen,
            last_seen=d.last_seen,
            last_login=d.last_login,
            login_count=d.login_count,
            is_active=d.is_active,
            is_blocked=d.is_blocked,
            block_reason=d.block_reason,
        ))
    
    return result


@router.get("/stats", response_model=DeviceStatsResponse)
async def get_device_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """
    Cihaz istatistikleri (Super Admin)
    """
    # Toplam sayılar
    total_devices = session.exec(select(func.count(DeviceActivation.id))).one()
    active_devices = session.exec(
        select(func.count(DeviceActivation.id))
        .where(DeviceActivation.is_active == True)
        .where(DeviceActivation.is_blocked == False)
    ).one()
    blocked_devices = session.exec(
        select(func.count(DeviceActivation.id))
        .where(DeviceActivation.is_blocked == True)
    ).one()
    
    # Platform bazlı
    all_devices = session.exec(select(DeviceActivation)).all()
    
    by_platform = {}
    by_type = {}
    tenant_counts = {}
    
    for d in all_devices:
        # Platform
        platform = d.platform or "unknown"
        by_platform[platform] = by_platform.get(platform, 0) + 1
        
        # Type
        dtype = d.device_type or "unknown"
        by_type[dtype] = by_type.get(dtype, 0) + 1
        
        # Tenant
        tenant_counts[d.tenant_id] = tenant_counts.get(d.tenant_id, 0) + 1
    
    # Tenant bilgilerini zenginleştir
    by_tenant = []
    for tid, count in tenant_counts.items():
        tenant = session.get(Tenant, tid)
        by_tenant.append({
            "tenant_id": tid,
            "tenant_name": tenant.name if tenant else "Bilinmiyor",
            "device_count": count
        })
    by_tenant.sort(key=lambda x: x["device_count"], reverse=True)
    
    # Son aktivasyonlar
    recent = session.exec(
        select(DeviceActivation)
        .order_by(DeviceActivation.last_seen.desc())
        .limit(10)
    ).all()
    
    recent_activations = []
    for d in recent:
        tenant = session.get(Tenant, d.tenant_id)
        user = session.get(User, d.user_id)
        recent_activations.append(DeviceActivationResponse(
            id=d.id,
            tenant_id=d.tenant_id,
            tenant_name=tenant.name if tenant else "Bilinmiyor",
            license_key=None,
            user_email=user.email if user else None,
            user_name=user.full_name if user else None,
            device_id=d.device_id,
            device_name=d.device_name,
            device_type=d.device_type,
            platform=d.platform,
            os_version=d.os_version,
            app_version=d.app_version,
            hostname=d.hostname,
            username=d.username,
            ip_address=d.ip_address,
            first_seen=d.first_seen,
            last_seen=d.last_seen,
            last_login=d.last_login,
            login_count=d.login_count,
            is_active=d.is_active,
            is_blocked=d.is_blocked,
            block_reason=d.block_reason,
        ))
    
    return DeviceStatsResponse(
        total_devices=total_devices,
        active_devices=active_devices,
        blocked_devices=blocked_devices,
        by_platform=by_platform,
        by_type=by_type,
        by_tenant=by_tenant,
        recent_activations=recent_activations,
    )


@router.post("/{device_activation_id}/block")
async def block_device(
    device_activation_id: str,
    reason: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """
    Cihazı blokla (Super Admin)
    """
    activation = session.get(DeviceActivation, device_activation_id)
    if not activation:
        raise HTTPException(status_code=404, detail="Cihaz bulunamadı")
    
    activation.is_blocked = True
    activation.block_reason = reason or "Super Admin tarafından bloklandı"
    activation.updated_at = datetime.utcnow().isoformat()
    
    session.add(activation)
    session.commit()
    
    return {"success": True, "message": f"Cihaz bloklandı: {activation.device_id}"}


@router.post("/{device_activation_id}/unblock")
async def unblock_device(
    device_activation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """
    Cihaz blokunu kaldır (Super Admin)
    """
    activation = session.get(DeviceActivation, device_activation_id)
    if not activation:
        raise HTTPException(status_code=404, detail="Cihaz bulunamadı")
    
    activation.is_blocked = False
    activation.block_reason = None
    activation.updated_at = datetime.utcnow().isoformat()
    
    session.add(activation)
    session.commit()
    
    return {"success": True, "message": f"Cihaz bloku kaldırıldı: {activation.device_id}"}


@router.delete("/{device_activation_id}")
async def delete_device_activation(
    device_activation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin)
):
    """
    Cihaz kaydını sil (Super Admin)
    """
    activation = session.get(DeviceActivation, device_activation_id)
    if not activation:
        raise HTTPException(status_code=404, detail="Cihaz bulunamadı")
    
    device_id = activation.device_id
    session.delete(activation)
    session.commit()
    
    return {"success": True, "message": f"Cihaz kaydı silindi: {device_id}"}
