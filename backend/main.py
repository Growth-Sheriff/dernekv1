from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.db import create_db_and_tables, get_session, engine
from sqlmodel import Session, select
from app.models.base import User, Tenant, UserRole

# Bootstrap: İlk çalışmada admin kullanıcısı oluştur
def create_initial_data():
    with Session(engine) as session:
        # Check if super admin exists
        user = session.exec(select(User).where(User.email == "admin@baderyazilim.com")).first()
        if not user:
            print("Creating super admin user...")
            # Şifre: 123456 (Hashlenmemiş, DEMO amaçlı. Prod'da hashlenmeli!)
            super_admin = User(
                email="admin@baderyazilim.com",
                hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", # "123456" bcrypt hash
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
            
            # Create Demo User for Tenant
            demo_user = User(
                email="admin@dernek.com",
                hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", 
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
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(members.router, prefix="/api/v1/members", tags=["members"])
app.include_router(backup.router, prefix="/api/v1/backup", tags=["backup"])
app.include_router(sync.router, prefix="/api/v1/sync", tags=["sync"])
app.include_router(licenses.router, prefix="/api/v1/licenses", tags=["licenses"])
