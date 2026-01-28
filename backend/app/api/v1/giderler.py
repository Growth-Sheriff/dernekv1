"""
Giderler API Routes
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.db import get_session
from app.api.auth import get_current_user
from app.models.base import User, Transaction, TransactionType
from app.schemas.mali import TransactionCreate, TransactionUpdate, TransactionResponse

router = APIRouter()


@router.get("/", response_model=List[TransactionResponse])
async def list_giderler(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Giderler listesi
    """
    if not current_user.tenant_id:
        return []
        
    transactions = session.exec(
        select(Transaction)
        .where(
            Transaction.tenant_id == current_user.tenant_id,
            Transaction.type == TransactionType.EXPENSE
        )
        .offset(skip)
        .limit(limit)
        .order_by(Transaction.date.desc())
    ).all()
    return transactions


@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_gider(
    data: TransactionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni gider oluştur
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
    
    obj_in = data.dict()
    obj_in["tenant_id"] = current_user.tenant_id
    obj_in["type"] = TransactionType.EXPENSE
    
    db_obj = Transaction(**obj_in)
    
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


@router.get("/{item_id}", response_model=TransactionResponse)
async def get_gider(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Gider detayı
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
        
    obj = session.get(Transaction, item_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if obj.tenant_id != current_user.tenant_id or obj.type != TransactionType.EXPENSE:
        raise HTTPException(status_code=403, detail="Not authorized or wrong type")
        
    return obj


@router.put("/{item_id}", response_model=TransactionResponse)
async def update_gider(
    item_id: str,
    data: TransactionUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Gider güncelle
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
        
    obj = session.get(Transaction, item_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if obj.tenant_id != current_user.tenant_id or obj.type != TransactionType.EXPENSE:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    obj_data = data.dict(exclude_unset=True)
    for key, value in obj_data.items():
        setattr(obj, key, value)
        
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gider(
    item_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Gider sil
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID required")
        
    obj = session.get(Transaction, item_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if obj.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    session.delete(obj)
    session.commit()
