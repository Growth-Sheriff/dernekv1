"""
API v1 Router - Çalışan Modüller
"""
from fastapi import APIRouter

from app.api.v1 import (
    aidat,
    dashboard,
    uyeler,
    gelirler,
    giderler,
    kasalar,
    virmanlar,
    etkinlikler,
)

api_router = APIRouter()

# Aidat API
api_router.include_router(aidat.router, prefix="/aidat", tags=["aidat"])

# Dashboard API
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

# CRUD modülleri (web istemcisi)
api_router.include_router(uyeler.router, prefix="/uyeler", tags=["uyeler"])
api_router.include_router(gelirler.router, prefix="/gelirler", tags=["gelirler"])
api_router.include_router(giderler.router, prefix="/giderler", tags=["giderler"])
api_router.include_router(kasalar.router, prefix="/kasalar", tags=["kasalar"])
api_router.include_router(virmanlar.router, prefix="/virmanlar", tags=["virmanlar"])
api_router.include_router(etkinlikler.router, prefix="/etkinlikler", tags=["etkinlikler"])

# NOT: Henüz eklenmeyen modüller:
# - toplantilar, belgeler, butce: base.py'de karşılık modeli yok (Toplanti/Belge/Butce tanımlı değil)
# - roles, permissions, users, ayarlar, raporlar, devir: bu turda kapsam dışı (skeleton)
