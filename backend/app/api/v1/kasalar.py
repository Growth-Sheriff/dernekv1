"""
Kasalar API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.kasalar import KasalarCreate, KasalarUpdate, KasalarResponse

router = APIRouter()


@router.get("/", response_model=List[KasalarResponse])
async def list_kasalar(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Kasalar listesi
    """
    # TODO: Implement listing
    return []


@router.post("/", response_model=KasalarResponse, status_code=status.HTTP_201_CREATED)
async def create_kasalar(
    data: KasalarCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni kasalar oluştur
    """
    # TODO: Implement creation
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{item_id}", response_model=KasalarResponse)
async def get_kasalar(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Kasalar detayı
    """
    # TODO: Implement retrieval
    raise HTTPException(status_code=404, detail="Not found")


@router.put("/{item_id}", response_model=KasalarResponse)
async def update_kasalar(
    item_id: UUID,
    data: KasalarUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Kasalar güncelle
    """
    # TODO: Implement update
    raise HTTPException(status_code=404, detail="Not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kasalar(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Kasalar sil
    """
    # TODO: Implement deletion
    raise HTTPException(status_code=404, detail="Not found")
