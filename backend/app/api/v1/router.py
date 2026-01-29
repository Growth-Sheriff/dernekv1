"""
API v1 Router
"""
from fastapi import APIRouter

# Only import working modules that use correct db/auth imports
from app.api.v1 import (
    aidat, gelirler, giderler, etkinlikler, dashboard
)

api_router = APIRouter()

# Mali (Working)
api_router.include_router(gelirler.router, prefix="/gelirler", tags=["gelirler"])
api_router.include_router(giderler.router, prefix="/giderler", tags=["giderler"])

# Aidat (Working)
api_router.include_router(aidat.router, prefix="/aidat", tags=["aidat"])

# Etkinlikler (Working)
api_router.include_router(etkinlikler.router, prefix="/etkinlikler", tags=["etkinlikler"])

# Dashboard (Already included in main.py separately)
# api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

# TODO: Fix these modules to use correct imports (get_session, get_current_user from app.api.auth)
# - uyeler, kasalar, toplantilar, belgeler, butce, virmanlar, raporlar, ayarlar
# - auth, tenants, licenses (already in main app)
# - users, roles, permissions (need implementation)

