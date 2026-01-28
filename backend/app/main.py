"""
BADER V3 - FastAPI Backend
Multi-Tenant SaaS Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="BADER API",
    description="Dernek Yönetim Sistemi - Multi-Tenant SaaS",
    version="3.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "BADER API v3.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

from app.api import auth, licenses, sync
from app.api.v1 import dashboard

# Core auth and sync routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(licenses.router, prefix="/api/v1/licenses", tags=["licenses"])
app.include_router(sync.router, prefix="/api/v1", tags=["sync"])

# Working v1 API routes
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])

# NOTE: Other v1 modules (uyeler, gelirler, giderler, aidat, kasalar, etc.) have import issues
# They use old models that don't exist in app.models.base
# For now, sync is handled through the /api/v1/sync endpoints


