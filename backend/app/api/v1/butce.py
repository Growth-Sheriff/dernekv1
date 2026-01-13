"""
Butce API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.butce import ButceCreate, ButceUpdate, ButceResponse

router = APIRouter()


@router.get("/", response_model=List[ButceResponse])
async def list_butce(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Butce listesi
    """
    # TODO: Implement listing
    return []


@router.post("/", response_model=ButceResponse, status_code=status.HTTP_201_CREATED)
async def create_butce(
    data: ButceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni butce oluştur
    """
    # TODO: Implement creation
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{item_id}", response_model=ButceResponse)
async def get_butce(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Butce detayı
    """
    # TODO: Implement retrieval
    raise HTTPException(status_code=404, detail="Not found")


@router.put("/{item_id}", response_model=ButceResponse)
async def update_butce(
    item_id: UUID,
    data: ButceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Butce güncelle
    """
    # TODO: Implement update
    raise HTTPException(status_code=404, detail="Not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_butce(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Butce sil
    """
    # TODO: Implement deletion
    raise HTTPException(status_code=404, detail="Not found")
