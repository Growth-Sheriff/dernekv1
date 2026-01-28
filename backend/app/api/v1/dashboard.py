"""
Dashboard API Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from datetime import datetime
from typing import Dict, Any

from app.core.db import get_session
from app.api.auth import get_current_user
from app.models.base import User, Uye, Gelir, Gider

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Dashboard istatistiklerini getirir.
    """
    if not current_user.tenant_id:
        return {
            "toplam_uye": 0,
            "aktif_uye": 0,
            "aylik_gelir": 0,
            "aylik_gider": 0,
            "kasa_bakiyesi": 0
        }

    tenant_id = current_user.tenant_id
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)

    # Üye İstatistikleri
    total_members = session.exec(select(func.count(Uye.id)).where(Uye.tenant_id == tenant_id)).one()
    active_members = session.exec(select(func.count(Uye.id)).where(Uye.tenant_id == tenant_id, Uye.durum == "Aktif")).one()

    # Finans İstatistikleri (Genel)
    total_income = session.exec(
        select(func.sum(Gelir.tutar))
        .where(Gelir.tenant_id == tenant_id, Gelir.is_deleted == 0)
    ).one() or 0
    
    total_expense = session.exec(
        select(func.sum(Gider.tutar))
        .where(Gider.tenant_id == tenant_id, Gider.is_deleted == 0)
    ).one() or 0

    # Finans İstatistikleri (Bu Ay)
    monthly_income = session.exec(
        select(func.sum(Gelir.tutar))
        .where(
            Gelir.tenant_id == tenant_id, 
            Gelir.is_deleted == 0,
            Gelir.tarih >= month_start.isoformat()
        )
    ).one() or 0
    
    monthly_expense = session.exec(
        select(func.sum(Gider.tutar))
        .where(
            Gider.tenant_id == tenant_id, 
            Gider.is_deleted == 0,
            Gider.tarih >= month_start.isoformat()
        )
    ).one() or 0

    return {
        "toplam_uye": total_members,
        "aktif_uye": active_members,
        "aylik_gelir": monthly_income,
        "aylik_gider": monthly_expense,
        "kasa_bakiyesi": total_income - total_expense
    }

