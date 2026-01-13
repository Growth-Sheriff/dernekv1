"""
Uyeler API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.uyeler import UyelerCreate, UyelerUpdate, UyelerResponse

router = APIRouter()


@router.get("/", response_model=List[UyelerResponse])
async def list_uyeler(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Uyeler listesi
    """
    # TODO: Implement listing
    return []


@router.post("/", response_model=UyelerResponse, status_code=status.HTTP_201_CREATED)
async def create_uyeler(
    data: UyelerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni uyeler oluştur
    """
    # TODO: Implement creation
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{item_id}", response_model=UyelerResponse)
async def get_uyeler(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Uyeler detayı
    """
    # TODO: Implement retrieval
    raise HTTPException(status_code=404, detail="Not found")


@router.put("/{item_id}", response_model=UyelerResponse)
async def update_uyeler(
    item_id: UUID,
    data: UyelerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Uyeler güncelle
    """
    # TODO: Implement update
    raise HTTPException(status_code=404, detail="Not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_uyeler(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Uyeler sil
    """
    # TODO: Implement deletion
    raise HTTPException(status_code=404, detail="Not found")
