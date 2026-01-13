"""
Etkinlikler API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.etkinlikler import EtkinliklerCreate, EtkinliklerUpdate, EtkinliklerResponse

router = APIRouter()


@router.get("/", response_model=List[EtkinliklerResponse])
async def list_etkinlikler(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Etkinlikler listesi
    """
    # TODO: Implement listing
    return []


@router.post("/", response_model=EtkinliklerResponse, status_code=status.HTTP_201_CREATED)
async def create_etkinlikler(
    data: EtkinliklerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni etkinlikler oluştur
    """
    # TODO: Implement creation
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{item_id}", response_model=EtkinliklerResponse)
async def get_etkinlikler(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Etkinlikler detayı
    """
    # TODO: Implement retrieval
    raise HTTPException(status_code=404, detail="Not found")


@router.put("/{item_id}", response_model=EtkinliklerResponse)
async def update_etkinlikler(
    item_id: UUID,
    data: EtkinliklerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Etkinlikler güncelle
    """
    # TODO: Implement update
    raise HTTPException(status_code=404, detail="Not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_etkinlikler(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Etkinlikler sil
    """
    # TODO: Implement deletion
    raise HTTPException(status_code=404, detail="Not found")
