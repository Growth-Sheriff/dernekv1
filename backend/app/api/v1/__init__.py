"""
API v1 Routes
"""
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1")

@router.get("/")
async def api_root():
    return {"version": "1.0", "status": "active"}
