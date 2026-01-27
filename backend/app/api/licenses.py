from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.base import User, License, Tenant, LicenseType, UserRole
from app.api.auth import get_current_user
import uuid

router = APIRouter()

@router.get("/my-license")
def get_my_license(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Tenant'ın aktif lisansını getirir.
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID gerekli")
        
    # En son geçerli lisansı bul
    lic = session.exec(
        select(License)
        .where(License.tenant_id == current_user.tenant_id)
        .where(License.is_active == True)
        .order_by(License.end_date.desc())
    ).first()
    
    return lic or {"status": "no_license", "type": LicenseType.TRIAL}

@router.post("/upgrade")
def upgrade_license(
    license_key: str = Body(..., embed=True),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Lisans anahtarı ile paketi yükseltir.
    Basit Mock logic: Key içinde 'PRO' geçiyorsa PRO yapar.
    """
    if current_user.role != UserRole.ADMIN and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Sadece yöneticiler lisans yükseltebilir")
    
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant bulunamadı")
        
    # --- MOCK LICENSE VALIDATION ---
    new_type = LicenseType.STANDARD
    if "PRO" in license_key.upper():
        new_type = LicenseType.PRO
    elif "ENT" in license_key.upper():
        new_type = LicenseType.ENTERPRISE
    else:
        raise HTTPException(status_code=400, detail="Geçersiz lisans anahtarı")
        
    # Mevcut lisansları pasife çek
    existing_licenses = session.exec(select(License).where(License.tenant_id == tenant_id)).all()
    for l in existing_licenses:
        l.is_active = False
        session.add(l)
        
    # Yeni lisans oluştur
    new_license = License(
        tenant_id=tenant_id,
        key=license_key,
        license_type=new_type,
        start_date=datetime.utcnow(),
        end_date=datetime.utcnow() + timedelta(days=365), # 1 Yıl
        is_active=True
    )
    session.add(new_license)
    session.commit()
    session.refresh(new_license)
    
    return {"status": "success", "new_license": new_license}
