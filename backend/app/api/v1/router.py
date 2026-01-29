"""
API v1 Router - Çalışan Modüller
"""
from fastapi import APIRouter

# Sadece çalışan modülleri dahil et
from app.api.v1 import aidat, dashboard

api_router = APIRouter()

# Aidat API (Düzeltildi)
api_router.include_router(aidat.router, prefix="/aidat", tags=["aidat"])

# Dashboard API
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

# NOT: Diğer modüller henüz skeleton olarak bırakılmış
# Bunlar düzeltildiğinde buraya eklenecek:
# - uyeler (import hataları ve TODO'lar mevcut)
# - gelirler (aynı)
# - giderler (aynı)
# - kasalar (aynı)
# - etkinlikler (aynı)
# - toplantilar (aynı)
# - belgeler (aynı)
# - butce (aynı)
# - virmanlar (aynı)
