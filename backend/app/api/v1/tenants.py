"""
Tenants API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.tenants import TenantsCreate, TenantsUpdate, TenantsResponse

router = APIRouter()


@router.get("/", response_model=List[TenantsResponse])
async def list_tenants(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Tenants listesi
    """
    # TODO: Implement listing
    return []


@router.post("/", response_model=TenantsResponse, status_code=status.HTTP_201_CREATED)
async def create_tenants(
    data: TenantsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni tenants oluştur
    """
    # TODO: Implement creation
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{item_id}", response_model=TenantsResponse)
async def get_tenants(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Tenants detayı
    """
    # TODO: Implement retrieval
    raise HTTPException(status_code=404, detail="Not found")


@router.put("/{item_id}", response_model=TenantsResponse)
async def update_tenants(
    item_id: UUID,
    data: TenantsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Tenants güncelle
    """
    # TODO: Implement update
    raise HTTPException(status_code=404, detail="Not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenants(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Tenants sil
    """
    # TODO: Implement deletion
    raise HTTPException(status_code=404, detail="Not found")
