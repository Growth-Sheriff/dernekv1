"""
Raporlar API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.raporlar import RaporlarCreate, RaporlarUpdate, RaporlarResponse

router = APIRouter()


@router.get("/", response_model=List[RaporlarResponse])
async def list_raporlar(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Raporlar listesi
    """
    # TODO: Implement listing
    return []


@router.post("/", response_model=RaporlarResponse, status_code=status.HTTP_201_CREATED)
async def create_raporlar(
    data: RaporlarCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni raporlar oluştur
    """
    # TODO: Implement creation
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{item_id}", response_model=RaporlarResponse)
async def get_raporlar(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Raporlar detayı
    """
    # TODO: Implement retrieval
    raise HTTPException(status_code=404, detail="Not found")


@router.put("/{item_id}", response_model=RaporlarResponse)
async def update_raporlar(
    item_id: UUID,
    data: RaporlarUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Raporlar güncelle
    """
    # TODO: Implement update
    raise HTTPException(status_code=404, detail="Not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_raporlar(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Raporlar sil
    """
    # TODO: Implement deletion
    raise HTTPException(status_code=404, detail="Not found")
