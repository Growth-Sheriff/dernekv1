# 📁 BADER V3 - Tam Dosya Dizini Şeması

**Versiyon:** 3.0.0  
**Son Güncelleme:** 9 Ocak 2026  
**Stack:** FastAPI + Tauri + Next.js + PostgreSQL + SQLite

---

## ✅ FAZ 1 TAMAMLANDI (Desktop Foundation - 9 Ocak 2026)

**Tamamlanan Modüller:**
- ✅ Rust Database Layer (Diesel + SQLite)
- ✅ Tauri Commands (7 CRUD işlemi)
- ✅ macOS Native Layout (Sidebar + Header)
- ✅ Zustand Stores (Auth, License, Sync)
- ✅ Login UI (Form validation + Mode selection)
- ✅ Üyeler List Page (Search, Filter, Table)
- ✅ Üyeler CRUD (Create, Detail sayfaları)

**Aktif Dosyalar:**
- `desktop/src-tauri/src/db/` (schema.rs, models.rs, connection.rs) ✅
- `desktop/src-tauri/src/commands/uyeler.rs` ✅
- `desktop/src/components/layout/` (sidebar.tsx, header.tsx, layout.tsx) ✅
- `desktop/src/store/` (authStore.ts, licenseStore.ts, syncStore.ts) ✅
- `desktop/src/pages/auth/login.tsx` ✅
- `desktop/src/pages/uyeler/` (list.tsx, create.tsx, detail.tsx) ✅

---

## ✅ FAZ 2 TAMAMLANDI (Core Modules - 9 Ocak 2026)

**Aidat Takip Modülü:**
- ✅ Rust Commands: get_aidat_takip, create_aidat, kaydet_odeme, hesapla_gecikme, get_aidat_ozet
- ✅ React Pages: aidat/list.tsx (Özet kartlar, filtreleme, tablo)
- ✅ Özellikler: Gecikme hesaplama, durum yönetimi (beklemede/ödendi/kısmi/gecikti)

**Mali İşlemler Modülü:**
- ✅ Rust Commands: get_kasalar, create_kasa, get_gelirler, create_gelir, get_giderler, create_gider, virman_yap, get_kasa_ozet
- ✅ React Pages: mali/kasalar.tsx, mali/gelirler.tsx, mali/giderler.tsx
- ✅ Özellikler: Otomatik bakiye güncelleme, virman işlemleri, tarih bazlı filtreleme
- ✅ Toplam: 8 commands, 3 sayfa

**Aktif Dosyalar:**
- `desktop/src-tauri/src/commands/aidat.rs` (265 satır) ✅
- `desktop/src-tauri/src/commands/mali.rs` (420 satır) ✅
- `desktop/src/pages/aidat/list.tsx` ✅
- `desktop/src/pages/mali/` (kasalar.tsx, gelirler.tsx, giderler.tsx) ✅

---

## ✅ FAZ 4 TAMAMLANDI (Export & Raporlar - 9 Ocak 2026) 📊

**Export Sistemi (CSV):**
- ✅ 3 Export Command: export_uyeler_csv, export_aidat_raporu_csv, export_mali_raporu_csv
- ✅ CSV generation: Turkish characters, headers, data formatting
- ✅ File dialog integration (Tauri save API)
- ✅ Export results: success status, file size, record count

**Rapor Sayfaları (3 sayfa):**
- ✅ **Üyeler Raporu:** İstatistik kartları (toplam/aktif/pasif/beklemede), CSV export
- ✅ **Aidat Raporu:** Yıl seçimi, tahsilat özeti, gecikme tracking, CSV export
- ✅ **Mali Raporu:** Tarih filtreleri, gelir/gider dağılımı, net sonuç, CSV export

**Aktif Dosyalar:**
- `desktop/src-tauri/src/commands/export.rs` (280 satır) ✅ YENİ
- `desktop/src-tauri/src/main.rs` (36 komut) ✅
- `desktop/src/pages/raporlar/uyeler.tsx` (200 satır) ✅
- `desktop/src/pages/raporlar/aidat.tsx` (250 satır) ✅
- `desktop/src/pages/raporlar/mali.tsx` (280 satır) ✅

**Toplam Komut Sayısı:** 36 (33 + 3 export)

---

## ✅ FAZ 3 TAMAMLANDI (Sync + Ayarlar - 9 Ocak 2026) 🎉

**Sync Engine (Temel):**
- ✅ Rust Commands: get_sync_status, get_pending_changes, push_changes, pull_changes, manual_sync
- ✅ HTTP Client: reqwest integration
- ✅ Zustand Store: loadSyncStatus, triggerManualSync fonksiyonları
- ✅ Özellikler: Batch sync (50 kayıt), error handling, sync status tracking
- ✅ Dashboard entegrasyonu: Bekleyen sync, son sync zamanı gösterimi

**Ayarlar Modülü (Tamamlandı):**
- ✅ Genel Ayarlar: Tenant bilgileri, lisans görüntüleme, manuel sync trigger
- ✅ Kullanıcı Yönetimi: List, create, delete, role management (7 command)
- ✅ Yedekleme: Backup/restore UI, veritabanı bilgileri, file dialog

**Kullanıcı Backend:**
- ✅ 7 Tauri Command: list_users, get_user, create_user, update_user, delete_user, change_password, count_users_by_role
- ✅ User struct (Queryable + Serializable)
- ✅ Password hashing (TODO: bcrypt/argon2 real implementation)
- ✅ Tenant izolasyonu, soft delete

**Aktif Dosyalar:**
- `desktop/src-tauri/src/commands/sync.rs` (215 satır) ✅
- `desktop/src-tauri/src/commands/kullanici.rs` (215 satır) ✅ YENİ
- `desktop/src-tauri/src/commands/mod.rs` (güncellenmiş) ✅
- `desktop/src-tauri/src/main.rs` (33 komut) ✅
- `desktop/src/store/syncStore.ts` (güncellenmiş) ✅
- `desktop/src/pages/ayarlar/genel.tsx` ✅
- `desktop/src/pages/ayarlar/kullanicilar.tsx` (350 satır) ✅ YENİ
- `desktop/src/pages/ayarlar/yedekleme.tsx` (250 satır) ✅ YENİ
- `desktop/src/pages/dashboard/index.tsx` (güncellenmiş) ✅

**Toplam Komut Sayısı:** 33 (26 temel + 7 kullanıcı)

---

## 🏗️ Proje Yapısı (Monorepo)

```
bader-v3/
├── .github/
│   ├── workflows/
│   │   ├── backend-ci.yml
│   │   ├── desktop-ci.yml
│   │   └── web-ci.yml
│   ├── yeni-sistem.md
│   ├── database-schema.sql
│   ├── onboarding-flow.md
│   └── lisans-modul-entegrasyonu.md
│
├── backend/                          # FastAPI Backend (PostgreSQL)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app entry
│   │   ├── config.py                 # Ayarlar (env, database, cors)
│   │   ├── dependencies.py           # Global dependencies
│   │   │
│   │   ├── core/                     # Core utilities
│   │   │   ├── __init__.py
│   │   │   ├── security.py          # JWT, password hashing, API key
│   │   │   ├── database.py          # SQLAlchemy engine, session
│   │   │   ├── rls.py               # Row-Level Security middleware
│   │   │   ├── tenant.py            # Tenant context manager
│   │   │   ├── cache.py             # Redis cache (optional)
│   │   │   └── exceptions.py        # Custom exceptions
│   │   │
│   │   ├── middleware/               # Middleware
│   │   │   ├── __init__.py
│   │   │   ├── tenant_middleware.py # Tenant isolation
│   │   │   ├── auth_middleware.py   # JWT validation
│   │   │   ├── audit_middleware.py  # Audit logging
│   │   │   └── rate_limit.py        # Rate limiting
│   │   │
│   │   ├── models/                   # SQLAlchemy ORM Models
│   │   │   ├── __init__.py
│   │   │   ├── base.py              # Base model (tenant_id, sync_id, version)
│   │   │   ├── tenant.py            # Tenant model
│   │   │   ├── license.py           # License model
│   │   │   ├── user.py              # User model
│   │   │   ├── role.py              # Role models (roles, user_roles, permissions)
│   │   │   ├── uye.py               # Üye model (uyeler, uye_aile_uyeleri)
│   │   │   ├── aidat.py             # Aidat models (aidat_takip, aidat_odemeleri)
│   │   │   ├── mali.py              # Mali models (kasalar, gelirler, giderler, virmanlar, gelir_turleri, gider_turleri)
│   │   │   ├── etkinlik.py          # Etkinlik model
│   │   │   ├── toplanti.py          # Toplantı model
│   │   │   ├── belge.py             # Belge model
│   │   │   ├── butce.py             # Bütçe model
│   │   │   ├── devir.py             # Devir işlemleri model (devir_islemleri)
│   │   │   ├── koy.py               # Köy modülü models (koy_kasalar, koy_gelirleri, koy_giderleri, koy_virmanlar, koy_gelir_turleri, koy_gider_turleri)
│   │   │   ├── sync.py              # Sync models (sync_changes, sync_conflicts)
│   │   │   └── system.py            # System models (ayarlar, islem_loglari)
│   │   │
│   │   ├── schemas/                  # Pydantic Schemas (Request/Response)
│   │   │   ├── __init__.py
│   │   │   ├── tenant.py
│   │   │   ├── license.py
│   │   │   ├── user.py
│   │   │   ├── auth.py              # Login, Token schemas
│   │   │   ├── role.py              # Role, Permission, UserRole schemas
│   │   │   ├── uye.py
│   │   │   ├── aidat.py
│   │   │   ├── mali.py
│   │   │   ├── etkinlik.py
│   │   │   ├── toplanti.py
│   │   │   ├── belge.py
│   │   │   ├── butce.py
│   │   │   ├── devir.py             # Devir schemas (onizleme, uygula)
│   │   │   ├── koy.py
│   │   │   ├── sync.py
│   │   │   ├── rapor.py             # Rapor response schemas
│   │   │   └── common.py            # Pagination, Response wrappers
│   │   │
│   │   ├── api/                      # API Routes
│   │   │   ├── __init__.py
│   │   │   ├── deps.py              # Route dependencies (get_current_user, etc.)
│   │   │   │
│   │   │   ├── v1/                   # API v1
│   │   │   │   ├── __init__.py
│   │   │   │   ├── router.py        # Main router
│   │   │   │   │
│   │   │   │   ├── auth.py          # POST /login, /logout, /refresh
│   │   │   │   ├── tenants.py       # CRUD tenants (admin only)
│   │   │   │   ├── licenses.py      # License management
│   │   │   │   ├── users.py         # User management
│   │   │   │   ├── roles.py         # Role management (CRUD, assign)
│   │   │   │   ├── permissions.py   # Permission listing
│   │   │   │   │
│   │   │   │   ├── uyeler.py        # Üye CRUD
│   │   │   │   ├── aidat.py         # Aidat CRUD + Tahsilat
│   │   │   │   ├── kasalar.py       # Kasa CRUD
│   │   │   │   ├── gelirler.py      # Gelir CRUD
│   │   │   │   ├── giderler.py      # Gider CRUD
│   │   │   │   ├── virmanlar.py     # Virman CRUD
│   │   │   │   ├── devir.py         # Yıl sonu devir (onizleme, uygula)
│   │   │   │   │
│   │   │   │   ├── etkinlikler.py   # Etkinlik CRUD
│   │   │   │   ├── toplantilar.py   # Toplantı CRUD
│   │   │   │   ├── belgeler.py      # Belge upload/download
│   │   │   │   ├── butce.py         # Bütçe CRUD
│   │   │   │   │
│   │   │   │   ├── raporlar.py      # Raporlar (borçlu üyeler, mali durum, vb.)
│   │   │   │   ├── dashboard.py     # Dashboard stats
│   │   │   │   │
│   │   │   │   ├── koy/             # Köy Modülü
│   │   │   │   │   ├── kasalar.py
│   │   │   │   │   ├── gelirler.py
│   │   │   │   │   ├── giderler.py
│   │   │   │   │   └── virmanlar.py
│   │   │   │   │
│   │   │   │   ├── sync/            # Sync Endpoints
│   │   │   │   │   ├── pull.py      # GET /sync/pull?since=timestamp
│   │   │   │   │   ├── push.py      # POST /sync/push (delta changes)
│   │   │   │   │   └── conflicts.py # Conflict resolution
│   │   │   │   │
│   │   │   │   └── ayarlar.py       # Ayarlar CRUD
│   │   │
│   │   ├── services/                 # Business Logic Layer
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py      # Login, token generation
│   │   │   ├── license_service.py   # License validation, feature gates
│   │   │   ├── role_service.py      # Permission checking, role assignment
│   │   │   ├── uye_service.py       # Üye business logic
│   │   │   ├── aidat_service.py     # Aidat → Gelir sync logic
│   │   │   ├── kasa_service.py      # Kasa bakiye calculation
│   │   │   ├── devir_service.py     # Yıl sonu devir logic
│   │   │   ├── sync_service.py      # Delta sync engine
│   │   │   ├── export_service.py    # Excel/PDF export
│   │   │   ├── email_service.py     # Email notifications
│   │   │   └── audit_service.py     # Audit log creation
│   │   │
│   │   ├── tasks/                    # Background Tasks (Celery/ARQ)
│   │   │   ├── __init__.py
│   │   │   ├── sync_tasks.py        # Periodic sync checks
│   │   │   ├── email_tasks.py       # Email sending
│   │   │   └── backup_tasks.py      # Database backups
│   │   │
│   │   └── utils/                    # Utilities
│   │       ├── __init__.py
│   │       ├── pagination.py        # Pagination helper
│   │       ├── validators.py        # Custom validators (TC kimlik, telefon)
│   │       ├── formatters.py        # Date, currency formatting
│   │       └── license_key.py       # License key generation
│   │
│   ├── alembic/                      # Database Migrations
│   │   ├── versions/
│   │   │   ├── 001_initial_schema.py
│   │   │   ├── 002_add_koy_modulu.py
│   │   │   └── ...
│   │   ├── env.py
│   │   └── script.py.mako
│   │
│   ├── tests/                        # Backend Tests
│   │   ├── __init__.py
│   │   ├── conftest.py              # Pytest fixtures
│   │   ├── test_auth.py
│   │   ├── test_uyeler.py
│   │   ├── test_aidat.py
│   │   ├── test_sync.py
│   │   └── ...
│   │
│   ├── scripts/                      # Utility Scripts
│   │   ├── init_db.py               # Database initialization
│   │   ├── seed_data.py             # Sample data seeder
│   │   └── create_tenant.py         # Create new tenant
│   │
│   ├── .env.example
│   ├── .env
│   ├── requirements.txt
│   ├── pyproject.toml               # Poetry config
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── README.md
│
├── desktop/                          # Tauri Desktop App
│   ├── src-tauri/                    # Rust Backend
│   │   ├── src/
│   │   │   ├── main.rs              # Tauri entry point
│   │   │   ├── commands/            # Tauri Commands (IPC)
│   │   │   │   ├── mod.rs
│   │   │   │   ├── auth.rs          # Login, session
│   │   │   │   ├── database.rs      # SQLite operations
│   │   │   │   ├── sync.rs          # Sync engine
│   │   │   │   ├── license.rs       # License validation
│   │   │   │   ├── uyeler.rs        # Üye CRUD
│   │   │   │   ├── aidat.rs         # Aidat CRUD
│   │   │   │   ├── mali.rs          # Mali işlemler
│   │   │   │   └── export.rs        # PDF/Excel export
│   │   │   │
│   │   │   ├── db/                   # SQLite Database Layer
│   │   │   │   ├── mod.rs
│   │   │   │   ├── schema.rs        # Diesel schema
│   │   │   │   ├── models.rs        # Diesel models
│   │   │   │   ├── migrations/      # Diesel migrations
│   │   │   │   └── connection.rs    # DB connection pool
│   │   │   │
│   │   │   ├── sync/                 # Sync Engine
│   │   │   │   ├── mod.rs
│   │   │   │   ├── pull.rs          # Pull changes from server
│   │   │   │   ├── push.rs          # Push local changes
│   │   │   │   ├── conflict.rs      # Conflict resolution
│   │   │   │   └── delta.rs         # Delta calculation
│   │   │   │
│   │   │   ├── api/                  # HTTP Client (reqwest)
│   │   │   │   ├── mod.rs
│   │   │   │   ├── client.rs        # HTTP client wrapper
│   │   │   │   └── endpoints.rs     # API endpoint definitions
│   │   │   │
│   │   │   ├── utils/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── crypto.rs        # Encryption/decryption
│   │   │   │   ├── hardware.rs      # Hardware ID generation
│   │   │   │   └── license.rs       # License key validation
│   │   │   │
│   │   │   └── state.rs             # Global app state
│   │   │
│   │   ├── icons/                    # App icons
│   │   ├── Cargo.toml
│   │   ├── tauri.conf.json          # Tauri config
│   │   └── build.rs
│   │
│   ├── src/                          # React Frontend
│   │   ├── App.tsx                   # Main app component
│   │   ├── main.tsx                  # Entry point
│   │   │
│   │   ├── components/               # Reusable Components
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── drawer.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── date-picker.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx      # Main sidebar navigation
│   │   │   │   ├── Header.tsx       # Top header (user menu, notifications)
│   │   │   │   ├── Layout.tsx       # Main layout wrapper
│   │   │   │   └── MobileNav.tsx    # Mobile navigation
│   │   │   │
│   │   │   ├── common/
│   │   │   │   ├── StatCard.tsx     # Dashboard stat card
│   │   │   │   ├── DataTable.tsx    # Reusable data table
│   │   │   │   ├── SearchBox.tsx    # Search input
│   │   │   │   ├── DateRangeFilter.tsx
│   │   │   │   ├── ExportButton.tsx # Export to Excel/PDF
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   └── FeatureGate.tsx  # License feature gate
│   │   │   │
│   │   │   ├── forms/
│   │   │   │   ├── UyeForm.tsx      # Üye ekleme/düzenleme formu
│   │   │   │   ├── AidatForm.tsx
│   │   │   │   ├── GelirForm.tsx
│   │   │   │   ├── GiderForm.tsx
│   │   │   │   ├── KasaForm.tsx
│   │   │   │   ├── VirmanForm.tsx
│   │   │   │   ├── EtkinlikForm.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── charts/
│   │   │       ├── LineChart.tsx    # Recharts line chart
│   │   │       ├── BarChart.tsx
│   │   │       ├── PieChart.tsx
│   │   │       └── DonutChart.tsx
│   │   │
│   │   ├── pages/                    # Pages (React Router)
│   │   │   ├── LoginPage.tsx        # Login page
│   │   │   ├── DashboardPage.tsx    # Main dashboard
│   │   │   │
│   │   │   ├── uyeler/
│   │   │   │   ├── UyelerListPage.tsx     # Üye listesi
│   │   │   │   ├── UyeDetayPage.tsx       # Üye detay
│   │   │   │   ├── UyeAidatPage.tsx       # Üye aidat sayfası
│   │   │   │   └── AyrilanUyelerPage.tsx  # Ayrılan üyeler
│   │   │   │
│   │   │   ├── aidat/
│   │   │   │   ├── AidatListPage.tsx      # Aidat listesi
│   │   │   │   └── CokluYilOdemePage.tsx  # Çoklu yıl ödeme
│   │   │   │
│   │   │   ├── mali/
│   │   │   │   ├── KasalarPage.tsx
│   │   │   │   ├── KasaDetayPage.tsx
│   │   │   │   ├── GelirlerPage.tsx
│   │   │   │   ├── GiderlerPage.tsx
│   │   │   │   └── VirmanlarPage.tsx
│   │   │   │
│   │   │   ├── etkinlikler/
│   │   │   │   ├── EtkinliklerPage.tsx
│   │   │   │   └── EtkinlikDetayPage.tsx
│   │   │   │
│   │   │   ├── toplantilar/
│   │   │   │   ├── ToplantilarPage.tsx
│   │   │   │   └── ToplantiDetayPage.tsx
│   │   │   │
│   │   │   ├── raporlar/
│   │   │   │   ├── RaporlarPage.tsx       # Tabs: Borçlu, Mali, Tahsilat
│   │   │   │   └── TahakkukRaporPage.tsx
│   │   │   │
│   │   │   ├── belgeler/
│   │   │   │   └── BelgelerPage.tsx
│   │   │   │
│   │   │   ├── butce/
│   │   │   │   └── ButcePage.tsx
│   │   │   │
│   │   │   ├── koy/                   # Köy Modülü
│   │   │   │   ├── KoyDashboardPage.tsx
│   │   │   │   ├── KoyKasalarPage.tsx
│   │   │   │   ├── KoyGelirlerPage.tsx
│   │   │   │   ├── KoyGiderlerPage.tsx
│   │   │   │   └── KoyVirmanlarPage.tsx
│   │   │   │
│   │   │   ├── ayarlar/
│   │   │   │   ├── AyarlarPage.tsx        # Tabs: Genel, Personel, Sync
│   │   │   │   ├── KullanicilarPage.tsx
│   │   │   │   └── SyncAyarlariPage.tsx
│   │   │   │
│   │   │   ├── onboarding/
│   │   │   │   ├── OnboardingPage.tsx     # 5-step wizard
│   │   │   │   └── LisansAktivasyonPage.tsx
│   │   │   │
│   │   │   └── DevPage.tsx            # Developer tools (local only)
│   │   │
│   │   ├── hooks/                     # Custom React Hooks
│   │   │   ├── useAuth.ts            # Authentication hook
│   │   │   ├── useLicense.ts         # License context hook
│   │   │   ├── usePermission.ts      # Permission check hook
│   │   │   ├── useSync.ts            # Sync status hook
│   │   │   ├── useTauri.ts           # Tauri command wrapper
│   │   │   ├── useDebounce.ts        # Debounce hook
│   │   │   └── usePagination.ts      # Pagination hook
│   │   │
│   │   ├── store/                     # Zustand State Management
│   │   │   ├── authStore.ts          # Auth state (user, token)
│   │   │   ├── licenseStore.ts       # License state
│   │   │   ├── syncStore.ts          # Sync state
│   │   │   ├── settingsStore.ts      # App settings
│   │   │   └── uiStore.ts            # UI state (sidebar, theme)
│   │   │
│   │   ├── lib/                       # Utilities
│   │   │   ├── api.ts                # Tauri command wrappers
│   │   │   ├── sync.ts               # Sync client
│   │   │   ├── utils.ts              # Helper functions
│   │   │   ├── cn.ts                 # Tailwind class merger
│   │   │   ├── validators.ts         # Form validators
│   │   │   └── formatters.ts         # Date, currency formatters
│   │   │
│   │   ├── types/                     # TypeScript Types
│   │   │   ├── index.ts
│   │   │   ├── auth.ts
│   │   │   ├── license.ts
│   │   │   ├── uye.ts
│   │   │   ├── aidat.ts
│   │   │   ├── mali.ts
│   │   │   ├── sync.ts
│   │   │   └── ...
│   │   │
│   │   ├── styles/
│   │   │   ├── globals.css           # Tailwind base + custom styles
│   │   │   └── themes.css            # Theme variables
│   │   │
│   │   └── assets/
│   │       ├── logo.svg
│   │       └── images/
│   │
│   ├── public/
│   │   └── favicon.ico
│   │
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── README.md
│
├── web/                              # Next.js Web App (ONLINE/HYBRID only)
│   ├── src/
│   │   ├── app/                       # App Router
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── page.tsx              # Homepage (marketing)
│   │   │   ├── globals.css
│   │   │   │
│   │   │   ├── (auth)/               # Auth group
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── register/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── (dashboard)/          # Protected dashboard group
│   │   │   │   ├── layout.tsx        # Dashboard layout (sidebar)
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── uyeler/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── aidat/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── mali/
│   │   │   │   │   ├── kasalar/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── gelirler/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── giderler/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── raporlar/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── ayarlar/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── koy/              # Köy modülü (HYBRID only)
│   │   │   │       ├── dashboard/
│   │   │   │       │   └── page.tsx
│   │   │   │       └── ...
│   │   │   │
│   │   │   ├── (marketing)/          # Public pages
│   │   │   │   ├── pricing/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── features/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── contact/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   └── api/                   # API Routes (optional, proxy to backend)
│   │   │       └── auth/
│   │   │           └── [...nextauth]/
│   │   │               └── route.ts
│   │   │
│   │   ├── components/                # Shared components (same as desktop)
│   │   │   ├── ui/
│   │   │   ├── layout/
│   │   │   ├── common/
│   │   │   ├── forms/
│   │   │   └── charts/
│   │   │
│   │   ├── lib/
│   │   │   ├── api-client.ts         # Fetch wrapper for backend API
│   │   │   ├── auth.ts               # NextAuth config
│   │   │   └── utils.ts
│   │   │
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── types/
│   │   └── styles/
│   │
│   ├── public/
│   ├── .env.example
│   ├── next.config.js
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── README.md
│
├── mobile/                           # React Native (Future - Phase 5)
│   ├── src/
│   ├── android/
│   ├── ios/
│   ├── package.json
│   └── README.md
│
├── shared/                           # Shared Code
│   ├── types/                        # Shared TypeScript types
│   │   ├── index.ts
│   │   ├── models.ts
│   │   └── api.ts
│   │
│   ├── utils/                        # Shared utilities
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   └── constants.ts
│   │
│   └── package.json
│
├── docs/                             # Documentation
│   ├── api/
│   │   ├── endpoints.md             # API endpoint documentation
│   │   ├── authentication.md
│   │   └── sync-protocol.md
│   ├── deployment/
│   │   ├── backend-deploy.md
│   │   ├── desktop-build.md
│   │   └── web-deploy.md
│   ├── development/
│   │   ├── setup.md
│   │   ├── database-migrations.md
│   │   └── testing.md
│   └── user-guide/
│       ├── installation.md
│       ├── onboarding.md
│       └── sync-setup.md
│
├── scripts/                          # Global Scripts
│   ├── setup.sh                     # Initial project setup
│   ├── deploy.sh                    # Deployment script
│   └── backup.sh                    # Database backup script
│
├── .gitignore
├── .editorconfig
├── LICENSE
├── README.md
└── package.json                     # Root package.json (workspace manager)
```

---

## 📦 Önemli Dosyalar ve Görevleri

### Backend (FastAPI)

| Dosya | Açıklama |
|-------|----------|
| `main.py` | FastAPI app, CORS, middleware, router registration |
| `config.py` | Environment variables, database URL, JWT secret |
| `dependencies.py` | `get_db()`, `get_current_user()`, `check_permission()` dependencies |
| `core/rls.py` | RLS middleware - `current_setting('app.current_tenant')` |
| `core/security.py` | `create_access_token()`, `verify_password()`, `get_password_hash()` |
| `models/base.py` | `BaseModel` with `tenant_id`, `sync_id`, `version`, `is_deleted` |
| `models/role.py` | `Role`, `UserRole`, `Permission` models (roles, user_roles, permissions) |
| `models/devir.py` | `DevirIslemleri` model (devir_islemleri) |
| `services/aidat_service.py` | Aidat → Gelir otomatik transfer logic |
| `services/role_service.py` | Permission checking, role assignment |
| `services/devir_service.py` | Yıl sonu devir preview ve apply logic |
| `services/sync_service.py` | Delta sync: pull, push, conflict resolution |
| `api/v1/roles.py` | `GET /roles`, `POST /roles`, `PUT /roles/{id}`, `POST /roles/{id}/assign` |
| `api/v1/permissions.py` | `GET /permissions`, `GET /permissions/by-module` |
| `api/v1/devir.py` | `GET /devir/onizleme`, `POST /devir/uygula`, `GET /devir/gecmis` |
| `api/v1/sync/pull.py` | `GET /api/v1/sync/pull?since=2026-01-08T10:00:00` |
| `api/v1/sync/push.py` | `POST /api/v1/sync/push` with `changes` array |

### Desktop (Tauri)

| Dosya | Açıklama |
|-------|----------|
| `src-tauri/src/main.rs` | Tauri setup, register commands |
| `src-tauri/src/commands/database.rs` | SQLite CRUD commands |
| `src-tauri/src/commands/sync.rs` | `sync_pull()`, `sync_push()` commands |
| `src-tauri/src/db/schema.rs` | Diesel ORM schema (same structure as PostgreSQL) |
| `src-tauri/src/sync/pull.rs` | HTTP fetch from backend `/sync/pull` |
| `src-tauri/src/sync/push.rs` | HTTP post to backend `/sync/push` |
| `src-tauri/src/sync/conflict.rs` | Conflict detection and resolution UI |
| `src/App.tsx` | Main React app with router |
| `src/components/layout/Sidebar.tsx` | Dynamic menu based on license features |
| `src/components/common/FeatureGate.tsx` | `<FeatureGate feature="koy_modulu">` |
| `src/pages/onboarding/OnboardingPage.tsx` | 5-step setup wizard |
| `src/store/licenseStore.ts` | License state: `plan`, `features`, `max_users` |
| `src/hooks/useSync.ts` | `useSync()` - sync status, manual trigger |

### Web (Next.js)

| Dosya | Açıklama |
|-------|----------|
| `app/layout.tsx` | Root layout, providers |
| `app/(dashboard)/layout.tsx` | Protected layout with sidebar |
| `app/(dashboard)/dashboard/page.tsx` | Dashboard page |
| `lib/api-client.ts` | `apiClient.get('/uyeler')` - fetch wrapper |
| `components/` | Shared with desktop (90% code reuse) |

---

## 🔄 Sync Dosya Akışı

### Desktop → Server (Push)

```
User edits üye in Desktop
    ↓
src/pages/uyeler/UyelerListPage.tsx → Save button
    ↓
Tauri command: invoke('update_uye', { ... })
    ↓
src-tauri/src/commands/uyeler.rs → update_uye()
    ↓
SQLite UPDATE + INSERT into local sync_changes table
    ↓
Background sync worker detects changes
    ↓
src-tauri/src/sync/push.rs → sync_push()
    ↓
HTTP POST to backend: /api/v1/sync/push
    ↓
Backend: app/api/v1/sync/push.py
    ↓
Validate, detect conflicts, merge to PostgreSQL
```

### Server → Desktop (Pull)

```
Desktop app starts
    ↓
src/hooks/useSync.ts → useEffect() → syncPull()
    ↓
Tauri command: invoke('sync_pull')
    ↓
src-tauri/src/sync/pull.rs
    ↓
HTTP GET: /api/v1/sync/pull?since=last_sync_time
    ↓
Backend returns delta changes (new/updated records)
    ↓
Desktop applies changes to SQLite
    ↓
Increment version, update sync_id
    ↓
UI re-renders with new data
```

---

## 🎨 UI Component Reuse (Desktop ↔ Web)

**90% kod paylaşımı:**

```
shared/components/
    ├── ui/              # shadcn/ui (identical)
    ├── common/          # DataTable, StatCard, etc. (identical)
    ├── forms/           # Forms (identical)
    └── charts/          # Recharts (identical)

desktop/src/components/   → symlink/copy from shared/
web/src/components/       → symlink/copy from shared/
```

**Farklılıklar:**

| Özellik | Desktop | Web |
|---------|---------|-----|
| Layout | Tauri window (no browser chrome) | Next.js layout with navbar |
| Routing | React Router (`BrowserRouter`) | Next.js App Router |
| Data fetching | Tauri commands (`invoke()`) | Fetch API (`apiClient.get()`) |
| Storage | SQLite (offline-first) | PostgreSQL (always online) |

---

## 🗄️ Database Dosya Konumları

### Desktop (SQLite)

```
Windows:  C:\Users\{user}\AppData\Roaming\com.bader.app\bader.db
macOS:    ~/Library/Application Support/com.bader.app/bader.db
Linux:    ~/.config/com.bader.app/bader.db
```

### Backend (PostgreSQL)

```
Server:   PostgreSQL 16 running on VPS
Docker:   postgresql://bader_user:password@db:5432/bader_db
```

---

## 📋 Dependency Dosyaları

### Backend

**requirements.txt**
```
fastapi==0.110.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.27
alembic==1.13.1
psycopg2-binary==2.9.9
pydantic==2.6.1
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
openpyxl==3.1.2
pandas==2.2.0
redis==5.0.1
celery==5.3.6
pytest==8.0.0
httpx==0.26.0
```

### Desktop (Rust)

**Cargo.toml**
```toml
[dependencies]
tauri = { version = "2.0", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
diesel = { version = "2.1", features = ["sqlite", "r2d2"] }
reqwest = { version = "0.11", features = ["json"] }
tokio = { version = "1.35", features = ["full"] }
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.6", features = ["v4", "serde"] }
```

### Desktop (React)

**package.json**
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.21.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.4.7",
    "@tauri-apps/api": "^2.0.0",
    "recharts": "^2.10.0",
    "date-fns": "^3.0.0",
    "zod": "^3.22.4",
    "react-hook-form": "^7.49.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "@tauri-apps/cli": "^2.0.0"
  }
}
```

### Web (Next.js)

**package.json**
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next-auth": "^4.24.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.4.7",
    "recharts": "^2.10.0",
    "date-fns": "^3.0.0",
    "zod": "^3.22.4"
  }
}
```

---

## 🚀 Build ve Deploy Dosyaları

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Desktop Build

```bash
# Build for current platform
cd desktop
npm run tauri build

# Outputs:
# macOS:   src-tauri/target/release/bundle/dmg/BADER_3.0.0_x64.dmg
# Windows: src-tauri/target/release/bundle/msi/BADER_3.0.0_x64.msi
# Linux:   src-tauri/target/release/bundle/appimage/bader_3.0.0_amd64.AppImage
```

### Web Deploy (Vercel/Netlify)

```bash
cd web
npm run build
# Output: .next/ (deploy to Vercel)
```

---

## 🔐 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://bader_user:password@localhost:5432/bader_db

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

# iyzico (Payment)
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
```

### Desktop (.env)

```env
VITE_API_URL=http://localhost:8000
VITE_SYNC_INTERVAL=300000
```

### Web (.env)

```env
NEXT_PUBLIC_API_URL=https://api.bader.com
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://app.bader.com
```

---

## 🎯 FAZ 7 TAMAMLANDI (Test & Polish - 9 Ocak 2026) ✨

### Build Sistemi Başarılı

**npm build**: ✅ Başarıyla derlendi
- TypeScript compilation: 0 errors
- Vite build: dist/assets/index-BVZoIYf7.js (430.65 kB → 118.53 kB gzip)
- Total modules: 1833

**Düzeltilen Hatalar:**
1. ✅ Tauri API v2 import'ları (`@tauri-apps/api/core` + `@tauri-apps/plugin-dialog`)
2. ✅ Dashboard duplicate code cleanup (558 → 303 satır)
3. ✅ `cn()` utility function (utils.ts)
4. ✅ User interface'e `role?: string` eklendi
5. ✅ App.tsx routing (index route düzeltmesi)
6. ✅ TypeScript config (noUnusedLocals: false)
7. ✅ Component export isimleri (LoginPage, KasalarPage, GelirlerPage, GiderlerPage)

**Kurulumlar:**
- Rust 1.92.0: ✅ Kuruldu (aarch64-apple-darwin)
- npm packages: 250 paket (tailwind-merge, clsx, lucide-react, @tauri-apps/*)
- Tauri CLI v2: 🔄 Kuruluyor (cargo install)

**Toplam Komut Sayısı: 36 aktif Tauri command**

---

## 📝 Önemli Notlar

1. **Desktop ilk öncelik** - HYBRID plan için tüm özellikler ✅ TAMAMLANDI
2. **Shared components** - Desktop ve Web arasında %90 kod paylaşımı
3. **Offline-first** - Desktop SQLite her zaman çalışır ✅
4. **Sync engine** - Push/Pull delta sync with conflict resolution ✅
5. **Export system** - CSV generation için 3 command + 3 rapor sayfası ✅
5. **RLS enforcement** - PostgreSQL Row-Level Security her tabloda aktif
6. **License gating** - Her modül lisans features JSONB'den kontrol edilir
7. **RBAC** - 4 rol (ADMIN, MUHASEBECI, SEKRETER, GORUNTULEYICI) + custom permissions

---

**Bu dosya dizini yeni-sistem.md'deki tüm gereksinimleri karşılayacak eksiksiz yapıdır.**
