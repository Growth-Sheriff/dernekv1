"""
Auth API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.auth import AuthCreate, AuthUpdate, AuthResponse

router = APIRouter()


@router.get("/", response_model=List[AuthResponse])
async def list_auth(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Auth listesi
    """
    # TODO: Implement listing
    return []


@router.post("/", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def create_auth(
    data: AuthCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni auth oluştur
    """
    # TODO: Implement creation
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{item_id}", response_model=AuthResponse)
async def get_auth(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Auth detayı
    """
    # TODO: Implement retrieval
    raise HTTPException(status_code=404, detail="Not found")


@router.put("/{item_id}", response_model=AuthResponse)
async def update_auth(
    item_id: UUID,
    data: AuthUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Auth güncelle
    """
    # TODO: Implement update
    raise HTTPException(status_code=404, detail="Not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_auth(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Auth sil
    """
    # TODO: Implement deletion
    raise HTTPException(status_code=404, detail="Not found")
