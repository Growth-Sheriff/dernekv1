from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from pydantic import BaseModel
from app.core.db import get_session
from app.models.base import User, License, Tenant, LicenseType, UserRole
from app.api.auth import get_current_user
from app.core.license import (
    LicenseGenerator, 
    LicenseValidator, 
    create_local_license, 
    create_online_license, 
    create_hybrid_license,
    create_custom_license
)
import uuid

router = APIRouter()

# ==================== KULLANICI ENDPOINTLERİ ====================

@router.get("/my-license")
def get_my_license(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Tenant'ın aktif lisansını getirir.
    """
    if not current_user.tenant_id:
        return {"status": "no_license", "type": "NONE", "message": "Tenant ID bulunamadı"}
        
    # En son geçerli lisansı bul
    lic = session.exec(
        select(License)
        .where(License.tenant_id == current_user.tenant_id)
        .where(License.is_active == True)
        .order_by(License.end_date.desc())
    ).first()
    
    if not lic:
        return {"status": "no_license", "type": "NONE"}
    
    return {
        "status": "active",
        "key": lic.key,
        "type": lic.get_license_type_name(),
        "desktop_enabled": lic.desktop_enabled,
        "web_enabled": lic.web_enabled,
        "mobile_enabled": lic.mobile_enabled,
        "sync_enabled": lic.sync_enabled,
        "start_date": lic.start_date,
        "end_date": lic.end_date,
        "is_active": lic.is_active
    }


# ==================== SUPER ADMIN ENDPOINTLERİ ====================

class GenerateLicenseRequest(BaseModel):
    """Yeni lisans oluşturma isteği"""
    tenant_id: Optional[str] = None  # Opsiyonel, sonra atanabilir
    desktop_enabled: bool = False
    web_enabled: bool = False
    mobile_enabled: bool = False
    sync_enabled: bool = False
    expiry_months: int = 12
    preset: Optional[str] = None  # "LOCAL", "ONLINE", "HYBRID" - hızlı oluşturma için

@router.post("/generate")
def generate_license(
    data: GenerateLicenseRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni lisans kodu oluşturur (Sadece Super Admin).
    
    Preset kullanımı:
    - preset="LOCAL" → Desktop only
    - preset="ONLINE" → Web + Mobile + Sync
    - preset="HYBRID" → All platforms + Sync
    
    Veya manuel:
    - desktop_enabled, web_enabled, mobile_enabled, sync_enabled alanlarını kullan
    """
    # Yetki kontrolü - case-insensitive
    user_role = str(current_user.role).upper()
    if user_role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Sadece Super Admin lisans oluşturabilir")
    
    # Tenant ID (opsiyonel)
    tenant_id = data.tenant_id or str(uuid.uuid4())
    
    # Preset varsa kullan
    desktop = data.desktop_enabled
    web = data.web_enabled
    mobile = data.mobile_enabled
    sync = data.sync_enabled
    
    if data.preset:
        preset = data.preset.upper()
        if preset == "LOCAL":
            desktop, web, mobile, sync = True, False, False, False
        elif preset == "ONLINE":
            desktop, web, mobile, sync = False, True, True, True
        elif preset == "HYBRID":
            desktop, web, mobile, sync = True, True, True, True
        elif preset == "DESKTOP_MOBILE":
            desktop, web, mobile, sync = True, False, True, True
    
    # Lisans kodu oluştur
    license_code = LicenseGenerator.generate(
        tenant_id=tenant_id,
        desktop=desktop,
        web=web,
        mobile=mobile,
        sync=sync,
        expiry_months=data.expiry_months
    )
    
    # Veritabanına kaydet
    expiry_date = datetime.utcnow() + timedelta(days=data.expiry_months * 30)
    new_license = License(
        id=str(uuid.uuid4()),
        tenant_id=data.tenant_id,  # None olabilir - sonra atanır
        key=license_code,
        desktop_enabled=desktop,
        web_enabled=web,
        mobile_enabled=mobile,
        sync_enabled=sync,
        plan="custom",
        mode="hybrid" if sync else "local",
        start_date=datetime.utcnow().isoformat(),
        end_date=expiry_date.isoformat(),
        is_active=True
    )
    session.add(new_license)
    session.commit()
    session.refresh(new_license)
    
    return {
        "success": True,
        "code": license_code,
        "license_id": new_license.id,
        "type": new_license.get_license_type_name(),
        "platforms": {
            "desktop": desktop,
            "web": web,
            "mobile": mobile,
            "sync": sync
        },
        "expiry_date": expiry_date.isoformat()
    }


@router.get("/all")
def list_all_licenses(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Tüm lisansları listele (Sadece Super Admin)
    """
    # Yetki kontrolü - case-insensitive
    user_role = str(current_user.role).upper()
    if user_role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Yetersiz yetki")
    
    licenses = session.exec(select(License)).all()
    result = []
    for lic in licenses:
        tenant = session.get(Tenant, lic.tenant_id) if lic.tenant_id else None
        result.append({
            "id": lic.id,
            "key": lic.key,
            "type": lic.get_license_type_name(),
            "tenant_id": lic.tenant_id,
            "tenant_name": tenant.name if tenant else "Atanmamış",
            "desktop_enabled": lic.desktop_enabled,
            "web_enabled": lic.web_enabled,
            "mobile_enabled": lic.mobile_enabled,
            "sync_enabled": lic.sync_enabled,
            "start_date": lic.start_date,
            "end_date": lic.end_date,
            "is_active": lic.is_active
        })
    return result


class AssignLicenseRequest(BaseModel):
    license_key: str
    tenant_id: str

@router.post("/assign")
def assign_license(
    data: AssignLicenseRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Bir lisansı tenant'a ata (Sadece Super Admin)
    """
    # Yetki kontrolü - case-insensitive
    user_role = str(current_user.role).upper()
    if user_role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Yetersiz yetki")
    
    # Lisansı bul
    license_obj = session.exec(select(License).where(License.key == data.license_key)).first()
    if not license_obj:
        raise HTTPException(status_code=404, detail="Lisans bulunamadı")
    
    if license_obj.tenant_id:
        raise HTTPException(status_code=400, detail="Bu lisans zaten bir tenant'a atanmış")
    
    # Tenant'ı bul
    tenant = session.get(Tenant, data.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant bulunamadı")
    
    # Mevcut aktif lisansları kapat
    existing = session.exec(
        select(License)
        .where(License.tenant_id == data.tenant_id)
        .where(License.is_active == True)
    ).all()
    for l in existing:
        l.is_active = False
        session.add(l)
    
    # Lisansı ata
    license_obj.tenant_id = data.tenant_id
    license_obj.updated_at = datetime.utcnow().isoformat()
    session.add(license_obj)
    session.commit()
    
    return {"success": True, "message": f"Lisans {tenant.name} tenant'ına atandı"}


# ==================== DOĞRULAMA ENDPOINTLERİ ====================

@router.post("/validate")
def validate_license(
    data: dict = Body(...),
    session: Session = Depends(get_session)
):
    """
    Lisans anahtarını doğrula (Desktop için - Offline da çalışır)
    """
    key = data.get("license_key")
    if not key:
        raise HTTPException(status_code=400, detail="Lisans anahtarı gerekli")
    
    # Önce offline validasyon yap (checksum kontrolü)
    validation_result = LicenseValidator.validate(key)
    
    if not validation_result.is_valid:
        return {
            "valid": False, 
            "message": validation_result.error_message or "Geçersiz lisans"
        }
    
    # Veritabanında da kontrol et
    license_obj = session.exec(select(License).where(License.key == key)).first()
    
    if not license_obj:
        return {"valid": False, "message": "Lisans veritabanında bulunamadı"}
    
    if not license_obj.is_active:
        return {"valid": False, "message": "Lisans pasif"}
    
    # Zaten atanmış mı?
    if license_obj.tenant_id:
        # Mevcut organizasyon bilgilerini getir
        from app.models.tenant import Tenant
        current_tenant = session.get(Tenant, license_obj.tenant_id)
        
        return {
            "valid": False, 
            "already_assigned": True,
            "message": "Bu lisans zaten başka bir organizasyon tarafından kullanılıyor",
            "current_organization": {
                "id": license_obj.tenant_id,
                "name": current_tenant.name if current_tenant else "Bilinmeyen Organizasyon",
                "slug": current_tenant.slug if current_tenant else None,
                "created_at": current_tenant.created_at.isoformat() if current_tenant and current_tenant.created_at else None
            },
            "license": {
                "id": license_obj.id,
                "key": license_obj.key,
                "type": license_obj.get_license_type_name(),
                "desktop_enabled": license_obj.desktop_enabled,
                "web_enabled": license_obj.web_enabled,
                "mobile_enabled": license_obj.mobile_enabled,
                "sync_enabled": license_obj.sync_enabled,
                "end_date": license_obj.end_date
            },
            "can_transfer": True
        }
    
    return {
        "valid": True,
        "license": {
            "id": license_obj.id,
            "key": license_obj.key,
            "type": license_obj.get_license_type_name(),
            "desktop_enabled": license_obj.desktop_enabled,
            "web_enabled": license_obj.web_enabled,
            "mobile_enabled": license_obj.mobile_enabled,
            "sync_enabled": license_obj.sync_enabled,
            "end_date": license_obj.end_date
        }
    }


@router.post("/activate")
def activate_license(
    data: dict = Body(...),
    session: Session = Depends(get_session)
):
    """
    Lisans aktivasyonu (Desktop kurulumu sırasında)
    Lisansı hardware_id ile ilişkilendirir.
    """
    key = data.get("license_key")
    hardware_id = data.get("hardware_id")
    
    if not key:
        raise HTTPException(status_code=400, detail="Lisans anahtarı gerekli")
    
    # Lisansı bul
    license_obj = session.exec(select(License).where(License.key == key)).first()
    
    if not license_obj:
        return {"success": False, "message": "Lisans bulunamadı"}
    
    if not license_obj.is_active:
        return {"success": False, "message": "Lisans pasif"}
    
    # Hardware ID kaydet (opsiyonel)
    if hardware_id and not license_obj.hardware_id:
        license_obj.hardware_id = hardware_id
        session.add(license_obj)
        session.commit()
    
    return {
        "success": True,
        "license": {
            "id": license_obj.id,
            "key": license_obj.key,
            "type": license_obj.get_license_type_name(),
            "desktop_enabled": license_obj.desktop_enabled,
            "web_enabled": license_obj.web_enabled,
            "mobile_enabled": license_obj.mobile_enabled,
            "sync_enabled": license_obj.sync_enabled,
            "end_date": license_obj.end_date
        }
    }


@router.post("/transfer")
def transfer_license(
    data: dict = Body(...),
    session: Session = Depends(get_session)
):
    """
    Lisansı başka bir organizasyona transfer eder.
    Yeni organizasyon bilgileri ile lisans güncellenir.
    """
    license_key = data.get("license_key")
    new_tenant_name = data.get("tenant_name")
    new_tenant_slug = data.get("tenant_slug")
    confirm_transfer = data.get("confirm", False)
    
    if not license_key:
        raise HTTPException(status_code=400, detail="Lisans anahtarı gerekli")
    
    if not confirm_transfer:
        raise HTTPException(status_code=400, detail="Transfer onayı gerekli")
    
    # Lisansı bul
    license_obj = session.exec(select(License).where(License.key == license_key)).first()
    
    if not license_obj:
        raise HTTPException(status_code=404, detail="Lisans bulunamadı")
    
    from app.models.tenant import Tenant
    from datetime import datetime
    import uuid
    
    # Eski tenant bilgisi
    old_tenant = None
    if license_obj.tenant_id:
        old_tenant = session.get(Tenant, license_obj.tenant_id)
    
    # Yeni tenant oluştur veya mevcut olanı kullan
    new_tenant = None
    if new_tenant_slug:
        new_tenant = session.exec(select(Tenant).where(Tenant.slug == new_tenant_slug)).first()
    
    if not new_tenant:
        # Yeni tenant oluştur
        new_tenant = Tenant(
            id=str(uuid.uuid4()),
            name=new_tenant_name or "Yeni Organizasyon",
            slug=new_tenant_slug or f"org-{uuid.uuid4().hex[:8]}",
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(new_tenant)
        session.commit()
        session.refresh(new_tenant)
    
    # Lisansı yeni tenant'a ata
    license_obj.tenant_id = new_tenant.id
    license_obj.updated_at = datetime.utcnow()
    session.add(license_obj)
    session.commit()
    session.refresh(license_obj)
    
    return {
        "success": True,
        "message": "Lisans başarıyla transfer edildi",
        "old_organization": {
            "id": old_tenant.id if old_tenant else None,
            "name": old_tenant.name if old_tenant else None
        } if old_tenant else None,
        "new_organization": {
            "id": new_tenant.id,
            "name": new_tenant.name,
            "slug": new_tenant.slug
        },
        "license": {
            "id": license_obj.id,
            "key": license_obj.key,
            "type": license_obj.get_license_type_name(),
            "desktop_enabled": license_obj.desktop_enabled,
            "web_enabled": license_obj.web_enabled,
            "mobile_enabled": license_obj.mobile_enabled,
            "sync_enabled": license_obj.sync_enabled,
            "end_date": license_obj.end_date
        }
    }


@router.post("/upgrade")
def upgrade_license(
    new_license_key: str = Body(..., embed=True),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Mevcut lisansı yeni bir lisans koduyla yükseltir.
    Eski lisans pasife çekilir, yeni lisans aktif edilir.
    """
    # Yetki kontrolü - case-insensitive
    user_role = str(current_user.role).upper()
    if user_role not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Sadece yöneticiler lisans yükseltebilir")
    
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant bulunamadı")
    
    # Yeni lisansı bul
    new_license = session.exec(select(License).where(License.key == new_license_key)).first()
    
    if not new_license:
        raise HTTPException(status_code=404, detail="Lisans bulunamadı")
    
    if new_license.tenant_id and new_license.tenant_id != tenant_id:
        raise HTTPException(status_code=400, detail="Bu lisans başka bir organizasyona ait")
    
    if not new_license.is_active:
        raise HTTPException(status_code=400, detail="Bu lisans aktif değil")
    
    # Mevcut lisansları pasife çek
    existing_licenses = session.exec(
        select(License)
        .where(License.tenant_id == tenant_id)
        .where(License.is_active == True)
    ).all()
    for l in existing_licenses:
        l.is_active = False
        session.add(l)
    
    # Yeni lisansı tenant'a bağla ve aktif et
    new_license.tenant_id = tenant_id
    new_license.is_active = True
    new_license.updated_at = datetime.utcnow().isoformat()
    session.add(new_license)
    session.commit()
    session.refresh(new_license)
    
    return {
        "success": True,
        "message": "Lisans başarıyla yükseltildi",
        "new_license": {
            "key": new_license.key,
            "type": new_license.get_license_type_name(),
            "desktop_enabled": new_license.desktop_enabled,
            "web_enabled": new_license.web_enabled,
            "mobile_enabled": new_license.mobile_enabled,
            "sync_enabled": new_license.sync_enabled,
            "end_date": new_license.end_date
        }
    }

