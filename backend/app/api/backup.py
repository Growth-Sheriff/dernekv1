from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.base import User, Tenant, Uye, Gelir, Gider, License, UserRole
from app.api.auth import get_current_user

router = APIRouter()

@router.get("/export")
def export_database(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Veritabanındaki tüm verileri JSON olarak dışa aktarır.
    Sadece Admin yetkisi olanlar yapabilir.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")

    # Tenant Isolation: Eğer Super Admin değilse sadece kendi tenant'ını almalı
    # Ancak şimdilik basit tutuyoruz, tenant filter ekleyelim
    
    if current_user.role == UserRole.SUPER_ADMIN:
        # Her şeyi al
        tenants = session.exec(select(Tenant)).all()
        users = session.exec(select(User)).all()
        members = session.exec(select(Uye)).all()
        gelirler = session.exec(select(Gelir)).all()
        giderler = session.exec(select(Gider)).all()
        licenses = session.exec(select(License)).all()
    else:
        # Sadece kendi tenantını al
        tenant_id = current_user.tenant_id
        if not tenant_id:
            raise HTTPException(status_code=400, detail="Tenant bilgisi bulunamadı")
            
        tenants = session.exec(select(Tenant).where(Tenant.id == tenant_id)).all()
        users = session.exec(select(User).where(User.tenant_id == tenant_id)).all()
        members = session.exec(select(Uye).where(Uye.tenant_id == tenant_id)).all()
        gelirler = session.exec(select(Gelir).where(Gelir.tenant_id == tenant_id)).all()
        giderler = session.exec(select(Gider).where(Gider.tenant_id == tenant_id)).all()
        licenses = session.exec(select(License).where(License.tenant_id == tenant_id)).all()

    return {
        "meta": {
            "version": "1.0",
            "timestamp": datetime.utcnow().isoformat(),
            "exported_by": current_user.email
        },
        "data": {
            "tenants": [t.model_dump() for t in tenants],
            "users": [u.model_dump() for u in users],
            "members": [m.model_dump() for m in members],
            "gelirler": [g.model_dump() for g in gelirler],
            "giderler": [g.model_dump() for g in giderler],
            "licenses": [l.model_dump() for l in licenses],
        }
    }
