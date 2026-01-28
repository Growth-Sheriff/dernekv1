"""
Mali Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


from app.models.base import TransactionType

class TransactionBase(BaseModel):
    """Base Transaction schema"""
    type: TransactionType
    amount: float
    currency: str = "TRY"
    description: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    category_id: Optional[str] = None
    account_id: Optional[str] = None
    member_id: Optional[str] = None

class TransactionCreate(TransactionBase):
    """Create Transaction schema"""
    pass

class TransactionUpdate(BaseModel):
    """Update Transaction schema"""
    amount: Optional[float] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    category_id: Optional[str] = None
    account_id: Optional[str] = None
    member_id: Optional[str] = None

class TransactionInDB(TransactionBase):
    """Database Transaction schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    
    class Config:
        from_attributes = True

class TransactionResponse(TransactionInDB):
    """Response Transaction schema"""
    pass
