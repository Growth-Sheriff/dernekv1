"""
BADER V3 - FastAPI Backend
Multi-Tenant SaaS Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uuid
from datetime import datetime

# Import db module 
from app.core.db import create_db_and_tables, get_session
from app.models.base import User
from sqlmodel import Session, select

def create_super_admin():
    """Create super admin user if not exists"""
    from app.core.db import engine
    from passlib.context import CryptContext
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    with Session(engine) as session:
        existing = session.exec(select(User).where(User.email == "admin@baderyazilim.com")).first()
        if not existing:
            # Hash the password
            password = "123456"
            hashed = pwd_context.hash(password)
            
            admin = User(
                id=str(uuid.uuid4()),
                email="admin@baderyazilim.com",
                full_name="Super Admin",
                role="SUPER_ADMIN",
                hashed_password=hashed,
                password_hash=hashed,
                is_active=True,
                is_superuser=True,
                tenant_id=None,
                created_at=datetime.utcnow().isoformat(),
                updated_at=datetime.utcnow().isoformat()
            )
            session.add(admin)
            session.commit()
            print("Super Admin created: admin@baderyazilim.com / 123456")
        else:
            print("Super Admin already exists")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting BADER API v3.0...")
    create_db_and_tables()
    print("✅ Database tables created")
    create_super_admin()
    yield
    # Shutdown
    print("👋 Shutting down BADER API")

app = FastAPI(
    title="BADER API",
    description="Dernek Yönetim Sistemi - Multi-Tenant SaaS",
    version="3.0.0",
    lifespan=lifespan
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

from app.api import auth, licenses, sync, tenants
from app.api.v1 import dashboard
# from app.api.v1.router import api_router as v1_api_router  # TODO: Fix module imports

# Core auth and sync routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(licenses.router, prefix="/api/v1/licenses", tags=["licenses"])
app.include_router(tenants.router, prefix="/api/v1/tenants", tags=["tenants"])
app.include_router(sync.router, prefix="/api/v1", tags=["sync"])

# Working v1 API routes
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])

# ALL v1 Module APIs - DISABLED until import issues are fixed
# app.include_router(v1_api_router, prefix="/api/v1")


