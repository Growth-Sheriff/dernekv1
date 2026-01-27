from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.base import Member, User
from app.api.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[Member])
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
        select(Member)
        .where(Member.tenant_id == current_user.tenant_id)
        .offset(skip)
        .limit(limit)
    ).all()
    return members

@router.post("/", response_model=Member)
def create_member(
    member: Member, 
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
