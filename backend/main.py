from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.db import create_db_and_tables, get_session, engine
from sqlmodel import Session, select
from datetime import datetime, timedelta
from app.models.base import User, Tenant, UserRole, License, LicenseType

# Bootstrap: İlk çalışmada admin kullanıcısı oluştur
def create_initial_data():
    with Session(engine) as session:
        # Check if super admin exists
        user = session.exec(select(User).where(User.email == "admin@baderyazilim.com")).first()
        if not user:
            print("Creating super admin user...")
            # Şifre: 123456
            # New hash: $2b$12$3L6kMYNCte/M5StRxKFPtukzCAgHwzIAkviE70tE/63ltMWhM/xjy
            current_hash = "$2b$12$3L6kMYNCte/M5StRxKFPtukzCAgHwzIAkviE70tE/63ltMWhM/xjy"
            
            super_admin = User(
                email="admin@baderyazilim.com",
                hashed_password=current_hash,
                full_name="Süper Admin",
                role=UserRole.SUPER_ADMIN
            )
            session.add(super_admin)
            
            # Create Demo Tenant
            demo_tenant = Tenant(
                name="Demo Dernek",
                slug="demo",
                contact_email="admin@dernek.com"
            )
            session.add(demo_tenant)
            session.commit()
            session.refresh(demo_tenant)
            
            # Create Hybrid License for Demo Tenant
            demo_license = License(
                tenant_id=demo_tenant.id,
                key="DEMO-LICENSE-KEY-HYBRID",
                license_type=LicenseType.HYBRID,
                start_date=datetime.utcnow(),
                end_date=datetime.utcnow() + timedelta(days=365*10),
                is_active=True
            )
            session.add(demo_license)
            
            # Create Demo User for Tenant
            demo_user = User(
                email="admin@dernek.com",
                hashed_password=current_hash, 
                full_name="Dernek Yöneticisi",
                role=UserRole.ADMIN,
                tenant_id=demo_tenant.id
            )
            session.add(demo_user)
            session.commit()
            print("Initial data created.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    create_initial_data()
    yield

app = FastAPI(
    title="Bader Platform API", 
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Production'da kısıtlanmalı
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Bader API is running", "status": "ok"}

from app.api import auth, members, backup, sync, licenses
from app.api.v1 import etkinlikler, aidat, tenants, dashboard, gelirler, giderler

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(members.router, prefix="/api/v1/members", tags=["members"])
app.include_router(backup.router, prefix="/api/v1/backup", tags=["backup"])
app.include_router(sync.router, prefix="/api/v1/sync", tags=["sync"])
app.include_router(licenses.router, prefix="/api/v1/licenses", tags=["licenses"])
app.include_router(etkinlikler.router, prefix="/api/v1/etkinlikler", tags=["etkinlikler"])
app.include_router(aidat.router, prefix="/api/v1/aidat", tags=["aidat"])
app.include_router(tenants.router, prefix="/api/v1/tenants", tags=["tenants"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(gelirler.router, prefix="/api/v1/gelirler", tags=["gelirler"])
app.include_router(giderler.router, prefix="/api/v1/giderler", tags=["giderler"])

