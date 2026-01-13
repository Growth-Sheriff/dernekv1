"""
Gelirler API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.gelirler import GelirlerCreate, GelirlerUpdate, GelirlerResponse

router = APIRouter()


@router.get("/", response_model=List[GelirlerResponse])
async def list_gelirler(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Gelirler listesi
    """
    # TODO: Implement listing
    return []


@router.post("/", response_model=GelirlerResponse, status_code=status.HTTP_201_CREATED)
async def create_gelirler(
    data: GelirlerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni gelirler oluştur
    """
    # TODO: Implement creation
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{item_id}", response_model=GelirlerResponse)
async def get_gelirler(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Gelirler detayı
    """
    # TODO: Implement retrieval
    raise HTTPException(status_code=404, detail="Not found")


@router.put("/{item_id}", response_model=GelirlerResponse)
async def update_gelirler(
    item_id: UUID,
    data: GelirlerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Gelirler güncelle
    """
    # TODO: Implement update
    raise HTTPException(status_code=404, detail="Not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gelirler(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Gelirler sil
    """
    # TODO: Implement deletion
    raise HTTPException(status_code=404, detail="Not found")
