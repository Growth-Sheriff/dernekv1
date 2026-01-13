"""
API v1 Router
"""
from fastapi import APIRouter

from app.api.v1 import (
    auth, tenants, licenses, users, roles, permissions,
    uyeler, aidat, kasalar, gelirler, giderler, virmanlar,
    devir, etkinlikler, toplantilar, belgeler, butce,
    raporlar, dashboard, ayarlar
)

api_router = APIRouter()

# Auth
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Tenants & Licenses
api_router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
api_router.include_router(licenses.router, prefix="/licenses", tags=["licenses"])

# Users & Permissions
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["permissions"])

# Üyeler
api_router.include_router(uyeler.router, prefix="/uyeler", tags=["uyeler"])

# Aidat
api_router.include_router(aidat.router, prefix="/aidat", tags=["aidat"])

# Mali
api_router.include_router(kasalar.router, prefix="/kasalar", tags=["kasalar"])
api_router.include_router(gelirler.router, prefix="/gelirler", tags=["gelirler"])
api_router.include_router(giderler.router, prefix="/giderler", tags=["giderler"])
api_router.include_router(virmanlar.router, prefix="/virmanlar", tags=["virmanlar"])
api_router.include_router(devir.router, prefix="/devir", tags=["devir"])

# Etkinlikler & Toplantılar
api_router.include_router(etkinlikler.router, prefix="/etkinlikler", tags=["etkinlikler"])
api_router.include_router(toplantilar.router, prefix="/toplantilar", tags=["toplantilar"])

# Belgeler & Bütçe
api_router.include_router(belgeler.router, prefix="/belgeler", tags=["belgeler"])
api_router.include_router(butce.router, prefix="/butce", tags=["butce"])

# Raporlar & Dashboard
api_router.include_router(raporlar.router, prefix="/raporlar", tags=["raporlar"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

# Ayarlar
api_router.include_router(ayarlar.router, prefix="/ayarlar", tags=["ayarlar"])
