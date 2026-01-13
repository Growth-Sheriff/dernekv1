#!/usr/bin/env python3
"""
BADER Proje Dosya Oluşturucu
Tüm eksik dosyaları otomatik olarak oluşturur.
"""

import os
from pathlib import Path
from typing import Dict, List

# Proje kök dizini
PROJECT_ROOT = Path(__file__).parent.parent


# ============================================================================
# BACKEND DOSYA ŞABLONLARı
# ============================================================================

def generate_backend_model(name: str) -> str:
    """Backend SQLAlchemy model şablonu"""
    class_name = name.replace("_", " ").title().replace(" ", "")
    return f'''"""
{class_name} Model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid

from app.models.base import Base


class {class_name}(Base):
    """
    {class_name} tablosu
    """
    __tablename__ = "{name}"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # İlişkiler
    tenant = relationship("Tenant", back_populates="{name}")
    
    def __repr__(self):
        return f"<{class_name}(id={{self.id}})>"
'''


def generate_backend_schema(name: str) -> str:
    """Backend Pydantic schema şablonu"""
    class_name = name.replace("_", " ").title().replace(" ", "")
    return f'''"""
{class_name} Schemas
"""
from pydantic import BaseModel, Field, UUID4
from datetime import datetime
from typing import Optional


class {class_name}Base(BaseModel):
    """Base {class_name} schema"""
    pass


class {class_name}Create({class_name}Base):
    """Create {class_name} schema"""
    pass


class {class_name}Update(BaseModel):
    """Update {class_name} schema"""
    pass


class {class_name}InDB({class_name}Base):
    """Database {class_name} schema"""
    id: UUID4
    tenant_id: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class {class_name}Response({class_name}InDB):
    """Response {class_name} schema"""
    pass
'''


def generate_backend_route(name: str) -> str:
    """Backend FastAPI route şablonu"""
    class_name = name.replace("_", " ").title().replace(" ", "")
    return f'''"""
{class_name} API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.{name} import {class_name}Create, {class_name}Update, {class_name}Response

router = APIRouter()


@router.get("/", response_model=List[{class_name}Response])
async def list_{name}(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    {class_name} listesi
    """
    # TODO: Implement listing
    return []


@router.post("/", response_model={class_name}Response, status_code=status.HTTP_201_CREATED)
async def create_{name}(
    data: {class_name}Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni {name} oluştur
    """
    # TODO: Implement creation
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{{item_id}}", response_model={class_name}Response)
async def get_{name}(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    {class_name} detayı
    """
    # TODO: Implement retrieval
    raise HTTPException(status_code=404, detail="Not found")


@router.put("/{{item_id}}", response_model={class_name}Response)
async def update_{name}(
    item_id: UUID,
    data: {class_name}Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    {class_name} güncelle
    """
    # TODO: Implement update
    raise HTTPException(status_code=404, detail="Not found")


@router.delete("/{{item_id}}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_{name}(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    {class_name} sil
    """
    # TODO: Implement deletion
    raise HTTPException(status_code=404, detail="Not found")
'''


def generate_backend_service(name: str) -> str:
    """Backend service şablonu"""
    class_name = name.replace("_", " ").title().replace(" ", "")
    return f'''"""
{class_name} Service
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.models.user import User


class {class_name}Service:
    """
    {class_name} iş mantığı servisi
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    async def list_items(self, tenant_id: UUID, skip: int = 0, limit: int = 100) -> List:
        """Liste"""
        # TODO: Implement
        return []
    
    async def get_by_id(self, item_id: UUID, tenant_id: UUID) -> Optional[dict]:
        """ID ile getir"""
        # TODO: Implement
        return None
    
    async def create(self, data: dict, tenant_id: UUID, user: User) -> dict:
        """Oluştur"""
        # TODO: Implement
        return {{}}
    
    async def update(self, item_id: UUID, data: dict, tenant_id: UUID, user: User) -> Optional[dict]:
        """Güncelle"""
        # TODO: Implement
        return None
    
    async def delete(self, item_id: UUID, tenant_id: UUID, user: User) -> bool:
        """Sil"""
        # TODO: Implement
        return False


# Singleton instance
def get_{name}_service(db: Session) -> {class_name}Service:
    return {class_name}Service(db)
'''


def generate_backend_core(name: str) -> str:
    """Backend core utility şablonu"""
    return f'''"""
{name.title()} Utilities
"""
from typing import Optional


# TODO: Implement {name} utilities
'''


def generate_backend_middleware(name: str) -> str:
    """Backend middleware şablonu"""
    class_name = name.replace("_", " ").title().replace(" ", "")
    return f'''"""
{class_name} Middleware
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class {class_name}(BaseHTTPMiddleware):
    """
    {class_name} middleware
    """
    
    async def dispatch(self, request: Request, call_next):
        """
        İstek/yanıt işleme
        """
        # TODO: Implement middleware logic
        response = await call_next(request)
        return response
'''


def generate_backend_task(name: str) -> str:
    """Backend task şablonu"""
    return f'''"""
{name.replace("_", " ").title()} Background Tasks
"""
from celery import shared_task


@shared_task
def sample_task():
    """
    Örnek arka plan görevi
    """
    # TODO: Implement task
    pass
'''


# ============================================================================
# DESKTOP (RUST) DOSYA ŞABLONLARı
# ============================================================================

def generate_rust_command(name: str) -> str:
    """Tauri command şablonu"""
    return f'''// {name} Tauri Commands

use tauri::State;

#[tauri::command]
pub async fn sample_{name}_command() -> Result<String, String> {{
    // TODO: Implement command
    Ok("Not implemented".to_string())
}}
'''


def generate_rust_module(name: str) -> str:
    """Rust module şablonu"""
    return f'''// {name.title()} Module

pub mod {name};

// TODO: Implement module
'''


def generate_diesel_schema() -> str:
    """Diesel schema şablonu"""
    return '''// Diesel Schema - Auto-generated by diesel CLI
// @generated automatically by Diesel CLI.

diesel::table! {
    tenants (id) {
        id -> Text,
        name -> Text,
        slug -> Text,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

// TODO: Add more tables as per database schema
'''


# ============================================================================
# DESKTOP (REACT) DOSYA ŞABLONLARı
# ============================================================================

def generate_react_component(name: str) -> str:
    """React component şablonu"""
    component_name = name.replace("-", " ").replace("_", " ").title().replace(" ", "")
    return f'''import React from 'react';

interface {component_name}Props {{
  // TODO: Define props
}}

export const {component_name}: React.FC<{component_name}Props> = (props) => {{
  return (
    <div>
      <h2>{component_name}</h2>
      {{/* TODO: Implement component */}}
    </div>
  );
}};
'''


def generate_react_page(name: str) -> str:
    """React page şablonu"""
    page_name = name.replace("-", " ").replace("_", " ").title().replace(" ", "") + "Page"
    return f'''import React from 'react';

export const {page_name}: React.FC = () => {{
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{page_name}</h1>
      {{/* TODO: Implement page */}}
    </div>
  );
}};

export default {page_name};
'''


def generate_react_hook(name: str) -> str:
    """React hook şablonu"""
    hook_name = name.replace("-", "").replace("_", "")
    return f'''import {{ useState, useEffect }} from 'react';

export const {hook_name} = () => {{
  // TODO: Implement hook logic
  
  return {{
    // TODO: Return hook values
  }};
}};
'''


def generate_zustand_store(name: str) -> str:
    """Zustand store şablonu"""
    store_name = name.replace("Store", "").replace("_", "").replace("-", "")
    return f'''import {{ create }} from 'zustand';
import {{ persist }} from 'zustand/middleware';

interface {store_name.title()}State {{
  // TODO: Define state
}}

export const use{store_name.title()}Store = create<{store_name.title()}State>()(
  persist(
    (set, get) => ({{
      // TODO: Implement store
    }}),
    {{
      name: '{store_name}-storage',
    }}
  )
);
'''


def generate_typescript_util(name: str) -> str:
    """TypeScript utility şablonu"""
    return f'''/**
 * {name.title()} Utilities
 */

// TODO: Implement utilities
export {{}};
'''


def generate_typescript_type(name: str) -> str:
    """TypeScript type definition şablonu"""
    return f'''/**
 * {name.title()} Type Definitions
 */

// TODO: Define types
export type {{}};
'''


# ============================================================================
# WEB (NEXT.JS) DOSYA ŞABLONLARı
# ============================================================================

def generate_nextjs_page(name: str) -> str:
    """Next.js page şablonu"""
    page_name = name.title().replace("-", "").replace("_", "")
    return f'''export default function {page_name}Page() {{
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">{page_name} Page</h1>
      {{/* TODO: Implement page */}}
    </div>
  );
}}
'''


def generate_nextjs_layout(name: str) -> str:
    """Next.js layout şablonu"""
    return f'''export default function {name.title().replace("-", "")}Layout({{
  children,
}}: {{
  children: React.ReactNode;
}}) {{
  return (
    <div>
      {{/* TODO: Implement layout */}}
      {{children}}
    </div>
  );
}}
'''


def generate_api_route(name: str) -> str:
    """Next.js API route şablonu"""
    return f'''import {{ NextRequest, NextResponse }} from 'next/server';

export async function GET(request: NextRequest) {{
  // TODO: Implement GET handler
  return NextResponse.json({{ message: 'Not implemented' }}, {{ status: 501 }});
}}

export async function POST(request: NextRequest) {{
  // TODO: Implement POST handler
  return NextResponse.json({{ message: 'Not implemented' }}, {{ status: 501 }});
}}
'''


# ============================================================================
# DOSYA OLUŞTURMA
# ============================================================================

def create_file(path: Path, content: str):
    """Dosya oluştur"""
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(content, encoding='utf-8')
        print(f"✓ {path.relative_to(PROJECT_ROOT)}")
    else:
        print(f"⊘ {path.relative_to(PROJECT_ROOT)} (zaten var)")


def generate_all_files():
    """Tüm eksik dosyaları oluştur"""
    
    print("=" * 80)
    print("BADER PROJE DOSYA OLUŞTURUCU")
    print("=" * 80)
    
    # ========================================================================
    # BACKEND
    # ========================================================================
    
    print("\n[BACKEND] Core Utilities...")
    backend_core_files = [
        ("security", generate_backend_core),
        ("database", generate_backend_core),
        ("rls", generate_backend_core),
        ("tenant", generate_backend_core),
        ("cache", generate_backend_core),
        ("exceptions", generate_backend_core),
    ]
    for name, generator in backend_core_files:
        create_file(PROJECT_ROOT / f"backend/app/core/{name}.py", generator(name))
    
    # Dependencies
    create_file(PROJECT_ROOT / "backend/app/dependencies.py", '''"""
FastAPI Dependencies
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user


# TODO: Add common dependencies
''')
    
    print("\n[BACKEND] Middleware...")
    backend_middleware_files = [
        "tenant_middleware",
        "auth_middleware",
        "audit_middleware",
        "rate_limit",
    ]
    for name in backend_middleware_files:
        create_file(PROJECT_ROOT / f"backend/app/middleware/{name}.py", generate_backend_middleware(name))
    
    print("\n[BACKEND] Models...")
    backend_model_files = [
        "base", "tenant", "license", "user", "role",
        "uye", "aidat", "mali", "etkinlik", "toplanti",
        "belge", "butce", "devir", "koy", "sync", "system"
    ]
    for name in backend_model_files:
        create_file(PROJECT_ROOT / f"backend/app/models/{name}.py", generate_backend_model(name))
    
    print("\n[BACKEND] Schemas...")
    backend_schema_files = [
        "tenant", "license", "user", "auth", "role",
        "uye", "aidat", "mali", "etkinlik", "toplanti",
        "belge", "butce", "devir", "koy", "sync", "rapor", "common"
    ]
    for name in backend_schema_files:
        create_file(PROJECT_ROOT / f"backend/app/schemas/{name}.py", generate_backend_schema(name))
    
    print("\n[BACKEND] API Routes...")
    backend_route_files = [
        "auth", "tenants", "licenses", "users", "roles", "permissions",
        "uyeler", "aidat", "kasalar", "gelirler", "giderler", "virmanlar",
        "devir", "etkinlikler", "toplantilar", "belgeler", "butce",
        "raporlar", "dashboard", "ayarlar"
    ]
    for name in backend_route_files:
        create_file(PROJECT_ROOT / f"backend/app/api/v1/{name}.py", generate_backend_route(name))
    
    # Router
    create_file(PROJECT_ROOT / "backend/app/api/v1/router.py", '''"""
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
''')
    
    print("\n[BACKEND] Services...")
    backend_service_files = [
        "auth_service", "license_service", "role_service",
        "uye_service", "aidat_service", "kasa_service", "devir_service",
        "sync_service", "export_service", "email_service", "audit_service"
    ]
    for name in backend_service_files:
        create_file(PROJECT_ROOT / f"backend/app/services/{name}.py", generate_backend_service(name))
    
    print("\n[BACKEND] Tasks...")
    backend_task_files = ["sync_tasks", "email_tasks", "backup_tasks"]
    for name in backend_task_files:
        create_file(PROJECT_ROOT / f"backend/app/tasks/{name}.py", generate_backend_task(name))
    
    print("\n[BACKEND] Utils...")
    backend_util_files = ["pagination", "validators", "formatters", "license_key"]
    for name in backend_util_files:
        create_file(PROJECT_ROOT / f"backend/app/utils/{name}.py", generate_backend_core(name))
    
    print("\n[BACKEND] Alembic...")
    create_file(PROJECT_ROOT / "backend/alembic/env.py", '''"""
Alembic Environment Configuration
"""
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Import models for autogenerate
from app.models.base import Base
from app.config import settings

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
''')
    
    # ========================================================================
    # DESKTOP - RUST
    # ========================================================================
    
    print("\n[DESKTOP-RUST] Commands...")
    rust_command_files = ["auth", "database", "sync", "license", "uyeler", "aidat", "mali", "export"]
    for name in rust_command_files:
        create_file(PROJECT_ROOT / f"desktop/src-tauri/src/commands/{name}.rs", generate_rust_command(name))
    
    # mod.rs for commands
    create_file(PROJECT_ROOT / "desktop/src-tauri/src/commands/mod.rs", f'''// Commands Module
{chr(10).join(f"pub mod {name};" for name in rust_command_files)}
''')
    
    print("\n[DESKTOP-RUST] Database...")
    create_file(PROJECT_ROOT / "desktop/src-tauri/src/db/schema.rs", generate_diesel_schema())
    create_file(PROJECT_ROOT / "desktop/src-tauri/src/db/models.rs", '''// Database Models

use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Queryable)]
pub struct Tenant {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

// TODO: Add more models
''')
    create_file(PROJECT_ROOT / "desktop/src-tauri/src/db/connection.rs", '''// Database Connection

use diesel::sqlite::SqliteConnection;
use diesel::r2d2::{self, ConnectionManager};
use std::path::PathBuf;

pub type Pool = r2d2::Pool<ConnectionManager<SqliteConnection>>;

pub fn establish_connection(db_path: PathBuf) -> Pool {
    let manager = ConnectionManager::<SqliteConnection>::new(db_path.to_str().unwrap());
    r2d2::Pool::builder()
        .build(manager)
        .expect("Failed to create pool")
}
''')
    create_file(PROJECT_ROOT / "desktop/src-tauri/src/db/mod.rs", '''// Database Module

pub mod schema;
pub mod models;
pub mod connection;

pub use connection::{establish_connection, Pool};
''')
    
    print("\n[DESKTOP-RUST] Sync Engine...")
    sync_files = ["pull", "push", "conflict", "delta"]
    for name in sync_files:
        create_file(PROJECT_ROOT / f"desktop/src-tauri/src/sync/{name}.rs", f'''// {name.title()} Sync Logic

// TODO: Implement {name} sync
''')
    create_file(PROJECT_ROOT / "desktop/src-tauri/src/sync/mod.rs", f'''// Sync Module
{chr(10).join(f"pub mod {name};" for name in sync_files)}
''')
    
    print("\n[DESKTOP-RUST] API Client...")
    create_file(PROJECT_ROOT / "desktop/src-tauri/src/api/client.rs", '''// API Client

use reqwest::Client;
use serde::{Deserialize, Serialize};

pub struct ApiClient {
    client: Client,
    base_url: String,
}

impl ApiClient {
    pub fn new(base_url: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
        }
    }
    
    // TODO: Add API methods
}
''')
    create_file(PROJECT_ROOT / "desktop/src-tauri/src/api/endpoints.rs", '''// API Endpoints

pub const AUTH_LOGIN: &str = "/api/v1/auth/login";
pub const AUTH_LOGOUT: &str = "/api/v1/auth/logout";
pub const TENANTS: &str = "/api/v1/tenants";
// TODO: Add more endpoints
''')
    create_file(PROJECT_ROOT / "desktop/src-tauri/src/api/mod.rs", '''// API Module

pub mod client;
pub mod endpoints;

pub use client::ApiClient;
''')
    
    print("\n[DESKTOP-RUST] Utils...")
    util_files = ["crypto", "hardware", "license"]
    for name in util_files:
        create_file(PROJECT_ROOT / f"desktop/src-tauri/src/utils/{name}.rs", f'''// {name.title()} Utilities

// TODO: Implement {name} utilities
''')
    create_file(PROJECT_ROOT / "desktop/src-tauri/src/utils/mod.rs", f'''// Utils Module
{chr(10).join(f"pub mod {name};" for name in util_files)}
''')
    
    create_file(PROJECT_ROOT / "desktop/src-tauri/src/state.rs", '''// Application State

use std::sync::Mutex;
use crate::db::Pool;

pub struct AppState {
    pub db: Mutex<Option<Pool>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            db: Mutex::new(None),
        }
    }
}
''')
    
    # ========================================================================
    # DESKTOP - REACT
    # ========================================================================
    
    print("\n[DESKTOP-REACT] shadcn/ui Components...")
    ui_components = [
        "button", "input", "label", "select", "textarea", "checkbox", "radio-group",
        "dialog", "alert-dialog", "drawer", "sheet", "popover", "dropdown-menu",
        "table", "card", "badge", "avatar", "separator", "tabs", "accordion",
        "toast", "toaster", "calendar", "date-picker", "form", "skeleton"
    ]
    for name in ui_components:
        create_file(PROJECT_ROOT / f"desktop/src/components/ui/{name}.tsx", generate_react_component(name))
    
    print("\n[DESKTOP-REACT] Layout Components...")
    layout_components = ["sidebar", "header", "layout", "mobile-nav"]
    for name in layout_components:
        create_file(PROJECT_ROOT / f"desktop/src/components/layout/{name}.tsx", generate_react_component(name))
    
    print("\n[DESKTOP-REACT] Common Components...")
    common_components = [
        "stat-card", "data-table", "search-box", "export-button",
        "feature-gate", "loading-spinner", "error-boundary", "empty-state"
    ]
    for name in common_components:
        create_file(PROJECT_ROOT / f"desktop/src/components/common/{name}.tsx", generate_react_component(name))
    
    print("\n[DESKTOP-REACT] Form Components...")
    form_components = [
        "uye-form", "aidat-form", "gelir-form", "gider-form",
        "virman-form", "etkinlik-form", "toplanti-form", "belge-form",
        "butce-form"
    ]
    for name in form_components:
        create_file(PROJECT_ROOT / f"desktop/src/components/forms/{name}.tsx", generate_react_component(name))
    
    print("\n[DESKTOP-REACT] Chart Components...")
    chart_components = ["line-chart", "bar-chart", "pie-chart", "donut-chart"]
    for name in chart_components:
        create_file(PROJECT_ROOT / f"desktop/src/components/charts/{name}.tsx", generate_react_component(name))
    
    print("\n[DESKTOP-REACT] Pages...")
    page_modules = {
        "auth": ["login"],
        "dashboard": ["index"],
        "uyeler": ["list", "detail", "create"],
        "aidat": ["list", "detail", "takip"],
        "mali": ["kasalar", "gelirler", "giderler", "virmanlar"],
        "etkinlikler": ["list", "detail"],
        "toplantilar": ["list", "detail"],
        "raporlar": ["mali", "aidat", "uyeler"],
        "belgeler": ["list"],
        "butce": ["list", "detail"],
        "koy": ["index"],
        "ayarlar": ["genel", "kullanicilar", "yedekleme"],
        "onboarding": ["welcome", "license", "setup"]
    }
    for module, pages in page_modules.items():
        for page in pages:
            create_file(PROJECT_ROOT / f"desktop/src/pages/{module}/{page}.tsx", generate_react_page(f"{module}-{page}"))
    
    print("\n[DESKTOP-REACT] Hooks...")
    hook_files = [
        "useAuth", "useLicense", "usePermission", "useSync",
        "useTauri", "useDebounce", "usePagination", "useLocalStorage"
    ]
    for name in hook_files:
        create_file(PROJECT_ROOT / f"desktop/src/hooks/{name}.ts", generate_react_hook(name))
    
    print("\n[DESKTOP-REACT] Stores...")
    store_files = ["authStore", "licenseStore", "syncStore", "settingsStore", "uiStore"]
    for name in store_files:
        create_file(PROJECT_ROOT / f"desktop/src/store/{name}.ts", generate_zustand_store(name))
    
    print("\n[DESKTOP-REACT] Lib...")
    lib_files = ["api", "sync", "utils", "cn", "validators", "formatters"]
    for name in lib_files:
        create_file(PROJECT_ROOT / f"desktop/src/lib/{name}.ts", generate_typescript_util(name))
    
    print("\n[DESKTOP-REACT] Types...")
    type_files = ["models", "api", "auth", "license", "sync", "common"]
    for name in type_files:
        create_file(PROJECT_ROOT / f"desktop/src/types/{name}.ts", generate_typescript_type(name))
    
    # ========================================================================
    # WEB - NEXT.JS
    # ========================================================================
    
    print("\n[WEB] Pages...")
    # Auth pages
    create_file(PROJECT_ROOT / "web/src/app/auth/login/page.tsx", generate_nextjs_page("login"))
    create_file(PROJECT_ROOT / "web/src/app/auth/register/page.tsx", generate_nextjs_page("register"))
    create_file(PROJECT_ROOT / "web/src/app/auth/layout.tsx", generate_nextjs_layout("auth"))
    
    # Dashboard pages
    dashboard_pages = ["overview", "uyeler", "aidat", "mali", "raporlar"]
    for page in dashboard_pages:
        create_file(PROJECT_ROOT / f"web/src/app/dashboard/{page}/page.tsx", generate_nextjs_page(f"dashboard-{page}"))
    create_file(PROJECT_ROOT / "web/src/app/dashboard/layout.tsx", generate_nextjs_layout("dashboard"))
    
    # Marketing pages
    marketing_pages = ["features", "pricing", "about", "contact"]
    for page in marketing_pages:
        create_file(PROJECT_ROOT / f"web/src/app/marketing/{page}/page.tsx", generate_nextjs_page(f"marketing-{page}"))
    
    # API routes
    create_file(PROJECT_ROOT / "web/src/app/api/auth/[...nextauth]/route.ts", generate_api_route("nextauth"))
    
    print("\n[WEB] Components... (90% shared with desktop)")
    # UI components (shared)
    for name in ui_components[:10]:  # Sadece ilk 10'unu oluştur (paylaşımlı olduğu için)
        create_file(PROJECT_ROOT / f"web/src/components/ui/{name}.tsx", generate_react_component(name))
    
    print("\n[WEB] Lib...")
    web_lib_files = ["api", "utils", "auth"]
    for name in web_lib_files:
        create_file(PROJECT_ROOT / f"web/src/lib/{name}.ts", generate_typescript_util(name))
    
    print("\n[WEB] Hooks...")
    web_hook_files = ["useAuth", "useApi"]
    for name in web_hook_files:
        create_file(PROJECT_ROOT / f"web/src/hooks/{name}.ts", generate_react_hook(name))
    
    # ========================================================================
    # SHARED
    # ========================================================================
    
    print("\n[SHARED] Types & Utils...")
    # Shared'a ek dosyalar eklenebilir
    
    print("\n" + "=" * 80)
    print("✓ TAMAMLANDI!")
    print("=" * 80)


if __name__ == "__main__":
    generate_all_files()
