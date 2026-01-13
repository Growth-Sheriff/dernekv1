"""
Giderler API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.giderler import GiderlerCreate, GiderlerUpdate, GiderlerResponse

router = APIRouter()


@router.get("/", response_model=List[GiderlerResponse])
async def list_giderler(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Giderler listesi
    """
    # TODO: Implement listing
    return []


@router.post("/", response_model=GiderlerResponse, status_code=status.HTTP_201_CREATED)
async def create_giderler(
    data: GiderlerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni giderler oluştur
    """
    # TODO: Implement creation
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{item_id}", response_model=GiderlerResponse)
async def get_giderler(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Giderler detayı
    """
    # TODO: Implement retrieval
    raise HTTPException(status_code=404, detail="Not found")


@router.put("/{item_id}", response_model=GiderlerResponse)
async def update_giderler(
    item_id: UUID,
    data: GiderlerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Giderler güncelle
    """
    # TODO: Implement update
    raise HTTPException(status_code=404, detail="Not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_giderler(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Giderler sil
    """
    # TODO: Implement deletion
    raise HTTPException(status_code=404, detail="Not found")
