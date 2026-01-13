"""
Permissions API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.permissions import PermissionsCreate, PermissionsUpdate, PermissionsResponse

router = APIRouter()


@router.get("/", response_model=List[PermissionsResponse])
async def list_permissions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Permissions listesi
    """
    # TODO: Implement listing
    return []


@router.post("/", response_model=PermissionsResponse, status_code=status.HTTP_201_CREATED)
async def create_permissions(
    data: PermissionsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni permissions oluştur
    """
    # TODO: Implement creation
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{item_id}", response_model=PermissionsResponse)
async def get_permissions(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Permissions detayı
    """
    # TODO: Implement retrieval
    raise HTTPException(status_code=404, detail="Not found")


@router.put("/{item_id}", response_model=PermissionsResponse)
async def update_permissions(
    item_id: UUID,
    data: PermissionsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Permissions güncelle
    """
    # TODO: Implement update
    raise HTTPException(status_code=404, detail="Not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_permissions(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Permissions sil
    """
    # TODO: Implement deletion
    raise HTTPException(status_code=404, detail="Not found")
