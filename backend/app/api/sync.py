from typing import List, Optional, Any, Dict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.base import User, Member, Transaction
from app.api.auth import get_current_user

router = APIRouter()

class SyncPayload(BaseModel):
    members: List[Dict[str, Any]] = []
    transactions: List[Dict[str, Any]] = []
    # Diğer tablolar...

@router.post("/push")
def push_data(
    payload: SyncPayload,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Desktop uygulamasından gelen verileri sunucuya yazar (Upsert).
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID gerekli")
    
    tenant_id = current_user.tenant_id
    stats = {"members_updated": 0, "transactions_updated": 0}
    
    # 1. Members Sync
    for m_data in payload.members:
        # ID kontrolü (sync_id veya id)
        # Eğer desktop'tan geliyorsa 'sync_id' desktop'taki ID olabilir. 
        # Biz burada basitçe ID eşleşmesine bakalım.
        
        # Backend'de ID çakışması olmaması için, Desktop'ın gönderdiği ID'yi kullanabiliriz 
        # (eğer UUID ise) veya yeni ID üretiriz.
        
        # Basit Upsert (ID'ye göre)
        m_id = m_data.get("id")
        if not m_id:
            continue
            
        existing = session.get(Member, m_id)
        if existing:
            # Update
            for key, value in m_data.items():
                if key != "id" and key != "tenant_id": # ID ve Tenant değişmez
                    setattr(existing, key, value)
            existing.tenant_id = tenant_id # Güvenlik: Tenant'ı zorla
            session.add(existing)
            stats["members_updated"] += 1
        else:
            # Insert
            # Pydantic modeline dönüştürüp validate edelim
            m_data["tenant_id"] = tenant_id
            try:
                # Tarih alanlarını parse etmek gerekebilir ama Pydantic halleder mi?
                # SQLModel doğrudan dict almaz, model(**dict) gerekir.
                new_member = Member(**m_data)
                session.add(new_member)
                stats["members_updated"] += 1
            except Exception as e:
                print(f"Member Sync Error: {e}")

    # 2. Transactions Sync
    for t_data in payload.transactions:
        t_id = t_data.get("id")
        if not t_id:
            continue
            
        existing_t = session.get(Transaction, t_id)
        if existing_t:
            for key, value in t_data.items():
                if key != "id" and key != "tenant_id":
                    setattr(existing_t, key, value)
            existing_t.tenant_id = tenant_id
            session.add(existing_t)
            stats["transactions_updated"] += 1
        else:
            t_data["tenant_id"] = tenant_id
            try:
                new_trans = Transaction(**t_data)
                session.add(new_trans)
                stats["transactions_updated"] += 1
            except Exception as e:
                print(f"Transaction Sync Error: {e}")

    session.commit()
    return {"status": "success", "stats": stats}

@router.get("/pull")
def pull_data(
    since: Optional[datetime] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Sunucudaki son değişiklikleri Desktop'a gönderir.
    """
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant ID gerekli")
    
    tenant_id = current_user.tenant_id
    
    # Basitçe tüm veriyi dönelim şimdilik (since filtresi sonra)
    members = session.exec(select(Member).where(Member.tenant_id == tenant_id)).all()
    transactions = session.exec(select(Transaction).where(Transaction.tenant_id == tenant_id)).all()
    
    return {
        "members": members,
        "transactions": transactions
    }
