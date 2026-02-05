from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.base import Uye, User
from app.models.base import AidatTakip as Aidat
from app.api.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[Uye])
def read_members(
    skip: int = 0, 
    limit: int = 100, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Tenant Isolation: Sadece kullanıcının derneğine ait üyeler
    if not current_user.tenant_id:
        return [] # Veya tümünü göster (Süper Admin ise)
        
    members = session.exec(
        select(Uye)
        .where(Uye.tenant_id == current_user.tenant_id)
        .offset(skip)
        .limit(limit)
    ).all()
    return members

@router.post("/", response_model=Uye)
def create_member(
    member: Uye, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID gerekli")
        
    member.tenant_id = current_user.tenant_id
    session.add(member)
    session.commit()
    session.refresh(member)
    return member

# from app.models.base import Aidat
from sqlalchemy import func
from fastapi import Body

@router.post("/debts")
def get_member_debts(
    member_ids: List[str] = Body(..., embed=True, alias="uyeIds"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Üyelerin borç durumlarını hesaplar
    """
    if not current_user.tenant_id:
        return []
        
    # Aidatları çek
    query = select(
        Aidat.uye_id,
        func.sum(Aidat.tutar).label("toplam_borc"),
        func.sum(Aidat.odenen).label("odenen")
    ).where(
        Aidat.tenant_id == current_user.tenant_id,
        Aidat.uye_id.in_(member_ids)
    ).group_by(Aidat.uye_id)
    
    results = session.exec(query).all()
    
    debts = []
    for row in results:
        # row: (uye_id, toplam_borc, odenen)
        # SQLModel exec/all returns Row objects like tuples? Yes if group_by/func used.
        debts.append({
            "uye_id": row[0],
            "toplam_borc": row[1] or 0,
            "odenen": row[2] or 0,
            "kalan_borc": (row[1] or 0) - (row[2] or 0)
        })
        
    return debts
