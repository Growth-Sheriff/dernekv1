# 🏗️ BADER Yeni Sistem Mimarisi

**Versiyon:** 3.0 (Sıfırdan Yeniden)  
**Tarih:** 8 Ocak 2026  
**Durum:** Planlama Aşaması  
**Proje Tipi:** Multi-Platform Dernek Yönetim Sistemi

---

## 📋 İçindekiler

1. [Teknoloji Stack](#teknoloji-stack)
2. [Sistem Mimarisi](#sistem-mimarisi)
3. [Veritabanı Tasarımı](#veritabanı-tasarımı)
4. [Modül Listesi ve İlişkileri](#modül-listesi-ve-i̇lişkileri)
5. [CRUD İşlemleri](#crud-i̇şlemleri)
6. [API Endpoint'leri](#api-endpointleri)
7. [Geliştirme Planı](#geliştirme-planı)

---

## 🎯 Teknoloji Stack

### Backend Stack

```yaml
Framework: FastAPI (Python 3.11+)
ORM: SQLAlchemy 2.0
Database: PostgreSQL 16
Migration: Alembic
Authentication: JWT + OAuth2
Validation: Pydantic V2
API Docs: OpenAPI (Swagger)
```

**Neden FastAPI?**
- ✅ Hızlı geliştirme (Django'dan 3x hızlı)
- ✅ Otomatik API dokümantasyonu
- ✅ Type-safe (Pydantic validation)
- ✅ Async/await desteği
- ✅ Alembic migration sistemi çalışıyor
- ✅ Kolay deployment (Docker, Railway, Render)

### Desktop Stack

```yaml
Framework: Tauri 2.0
Frontend: React 19 + TypeScript
UI Library: shadcn/ui + Tailwind CSS
State: Zustand + TanStack Query
Forms: React Hook Form + Zod
Icons: Lucide React
```

**Neden Tauri?**
- ✅ Küçük installer (15MB vs .NET MAUI 150MB)
- ✅ Düşük RAM kullanımı (50MB vs 200MB)
- ✅ macOS native görünüm
- ✅ Rust güvenliği
- ✅ Web teknolojileri (React)

### Web Stack

```yaml
Framework: Next.js 15 (App Router)
Language: TypeScript 5.x
UI: shadcn/ui (Desktop ile paylaşımlı)
State: Zustand + TanStack Query
Database: PostgreSQL (shared with backend)
```

### Ortak Özellikler

```yaml
Styling: Tailwind CSS
Components: shadcn/ui (copy-paste approach)
Icons: Lucide
Charts: Recharts
Tables: TanStack Table
PDF: React-PDF / jsPDF
Excel: SheetJS
```

---

## 🏛️ Sistem Mimarisi (Multi-Tenant + Sync Aware)

```
┌──────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                              │
├────────────────────┬──────────────────┬──────────────────────┤
│   🖥️ DESKTOP       │   🌐 WEB         │   📱 MOBILE         │
│   Tauri 2.0        │   Next.js 15     │   React Native      │
│   React 19         │   TypeScript     │   TypeScript        │
│   SQLite (LOCAL)   │   PostgreSQL     │   WatermelonDB      │
│   Sync Engine      │   (ONLINE)       │   (HYBRID)          │
└─────────┬──────────┴────────┬─────────┴──────────┬──────────┘
          │                   │                    │
          │     HTTP/REST + WebSocket (Sync)       │
          └───────────────────┼────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────┐
│                   🔐 MIDDLEWARE STACK                      │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Auth JWT   │  │  Tenant ID   │  │ License Check   │  │
│  │   Validator  │  │  Resolver    │  │ Feature Gate    │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────┬──────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────┐
│                   🐍 FastAPI BACKEND                       │
├────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐   │
│  │         DEPENDENCY INJECTION                       │   │
│  │  get_current_user() → get_tenant_id() → check()   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Routers    │  │   Services   │  │   Schemas       │  │
│  │  (Endpoints) │  │  (Business)  │  │  (Pydantic)     │  │
│  └──────┬───────┘  └──────┬───────┘  └─────────────────┘  │
│         │                 │                                │
│  ┌──────▼─────────────────▼──────────┐                    │
│  │   SQLAlchemy Models (ORM)         │                    │
│  │   - Auto tenant_id injection      │                    │
│  │   - Sync tracking (version, sync_id)                  │
│  │   - Soft delete filter            │                    │
│  └──────────────┬────────────────────┘                    │
└─────────────────┼─────────────────────────────────────────┘
                  │
┌─────────────────▼─────────────────────────────────────────┐
│          📊 PostgreSQL Database (RLS Enabled)             │
├───────────────────────────────────────────────────────────┤
│  🔐 Row-Level Security:                                   │
│     WHERE tenant_id = current_setting('app.current_tenant')│
│                                                            │
│  📋 Tablolar:                                             │
│  ├─ tenants (Dernek izolasyonu)                          │
│  ├─ licenses (Lisans + feature gating)                   │
│  ├─ users (Tenant'a bağlı)                               │
│  ├─ uyeler, aidat_takip (tenant_id + sync_id)           │
│  ├─ gelirler, giderler, kasalar (tenant_id + sync_id)   │
│  └─ sync_changes, sync_conflicts (Senkronizasyon)        │
└───────────────────────────────────────────────────────────┘
```

### 🔄 Senkronizasyon Akışı (HYBRID Mode)

```
DESKTOP (SQLite)                    SERVER (PostgreSQL)
───────────────                     ──────────────────

1. Kullanıcı veri ekler
   └─ local INSERT
   └─ sync_changes kaydı
                                    
2. Sync başlatılır                 
   └─ POST /api/sync/push
   └─ {changes: [...]}  ────────>  3. Server alır
                                      ├─ tenant_id check
                                      ├─ license check
                                      ├─ version conflict?
                                      └─ INSERT/UPDATE
                                    
4. Server değişiklikleri gönderir <─ 5. GET /api/sync/pull
   └─ {changes: [...]}                  └─ since: last_sync
   
6. Client değişiklikleri alır
   └─ Conflict var mı?
   ├─ YES → sync_conflicts
   └─ NO  → local UPDATE

7. Conflict çözümleme
   └─ User seçer: SERVER_WINS/CLIENT_WINS
   └─ POST /api/sync/resolve
```

### 🎫 Lisans Kontrol Akışı

```python
# Her API isteğinde:

1. JWT Token → user_id, tenant_id
2. tenant_id → license check
3. license.plan → LOCAL/ONLINE/HYBRID
4. license.features → koy_modulu: true/false
5. @require_feature("koy_modulu")
   ├─ true  → İşleme devam
   └─ false → 403 Forbidden
```

---

## 🗄️ Veritabanı Tasarımı

### 🔐 İzolasyon Katmanları

```
┌─────────────────────────────────────────────────────┐
│         TENANT İZOLASYONU (Dernek Seviyesi)        │
│  Her dernek kendi veritabanı alanında izole        │
└─────────────────┬───────────────────────────────────┘
                  │
      ┌───────────┴────────────┐
      │                        │
┌─────▼──────────┐   ┌────────▼────────┐
│ USER İZOLASYONU│   │ LİSANS İZOLASYONU│
│ Tenant'a ait   │   │ Tenant'a özel    │
│ kullanıcılar   │   │ plan/özellikler  │
└────────────────┘   └──────────────────┘
```

### Temel Tablolar (Tenant/License/User)

```sql
-- 1. TENANT (Dernek) Yönetimi
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,           -- dernek-slug
    name VARCHAR(200) NOT NULL,                  -- Dernek Adı
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LİSANS Yönetimi
CREATE TABLE licenses (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    license_key VARCHAR(100) UNIQUE NOT NULL,    -- BADER-XXXX-XXXX-XXXX
    plan VARCHAR(20) NOT NULL,                   -- LOCAL, ONLINE, HYBRID
    
    -- Limitler
    max_users INTEGER DEFAULT 5,
    max_records INTEGER DEFAULT 10000,
    
    -- Özellikler (JSONB)
    features JSONB DEFAULT '{
        "modules": {
            "uye_yonetimi": true,
            "aidat_takip": true,
            "mali_islemler": true,
            "kasa_yonetimi": true,
            "raporlar": true,
            "etkinlik": false,
            "toplanti": false,
            "belge": false,
            "butce": false,
            "koy_modulu": false,
            "ocr": false
        },
        "features": {
            "multi_kasa": true,
            "multi_para_birimi": true,
            "excel_export": true,
            "pdf_export": true,
            "api_access": false,
            "mobile_access": false,
            "tahakkuk": false
        },
        "limits": {
            "max_kasalar": 10,
            "max_gelir_turleri": 20,
            "max_gider_turleri": 20
        }
    }'::jsonb,
    
    -- Tarih
    start_date DATE NOT NULL,
    expiry_date DATE,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id)
);

-- 3. KULLANICI Yönetimi (Tenant'a Bağlı)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profil
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    
    -- Rol ve İzinler
    role VARCHAR(50) DEFAULT 'viewer',           -- admin, accountant, viewer
    permissions JSONB DEFAULT '[]'::jsonb,       -- Custom permissions
    
    -- Durum
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,          -- System admin
    last_login TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, username)
);

-- 4. Roller ve İzinler
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    UNIQUE(tenant_id, name)
);

CREATE TABLE user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,           -- uye:create, gelir:delete
    name VARCHAR(200),
    description TEXT,
    module VARCHAR(50)                            -- uye, aidat, gelir, vb.
);

-- 5. Üye Yönetimi (TENANT İZOLE)
CREATE TABLE uyeler (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Sync & Audit Fields (Her tabloda ZORUNLU)
    sync_id UUID DEFAULT gen_random_uuid() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    -- Temel Bilgiler
    uye_no VARCHAR(50),
    tc_kimlik VARCHAR(11),
    ad_soyad VARCHAR(200) NOT NULL,
    telefon VARCHAR(20),
    telefon2 VARCHAR(20),
    email VARCHAR(255),
    durum VARCHAR(20) DEFAULT 'Aktif',           -- Aktif, Pasif, Ayrıldı
    uyelik_tipi VARCHAR(50) DEFAULT 'Asil',      -- Asil, Onursal, Fahri
    
    -- Kişisel Bilgiler
    cinsiyet VARCHAR(10),
    dogum_tarihi DATE,
    dogum_yeri VARCHAR(100),
    kan_grubu VARCHAR(5),
    aile_durumu VARCHAR(20),
    cocuk_sayisi INTEGER DEFAULT 0,
    
    -- Meslek
    egitim_durumu VARCHAR(50),
    meslek VARCHAR(100),
    is_yeri VARCHAR(200),
    
    -- Adres
    il VARCHAR(100),
    ilce VARCHAR(100),
    mahalle VARCHAR(100),
    adres TEXT,
    posta_kodu VARCHAR(10),
    
    -- Aidat
    ozel_aidat_tutari DECIMAL(18,2),
    aidat_indirimi_yuzde DECIMAL(5,2),
    
    -- Referans
    referans_uye_id INTEGER REFERENCES uyeler(id),
    
    -- Ayrılma
    ayrilma_tarihi DATE,
    ayrilma_nedeni TEXT,
    notlar TEXT,
    
    UNIQUE(tenant_id, uye_no),
    UNIQUE(tenant_id, tc_kimlik)
);

-- Index'ler (Tenant + Sync Aware)
CREATE INDEX idx_uyeler_tenant ON uyeler(tenant_id);
CREATE INDEX idx_uyeler_sync ON uyeler(sync_id);
CREATE INDEX idx_uyeler_search ON uyeler USING gin(to_tsvector('turkish', ad_soyad));
CREATE INDEX idx_uyeler_durum ON uyeler(tenant_id, durum) WHERE is_deleted = false;

CREATE TABLE uye_aile_uyeleri (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    uye_id INTEGER REFERENCES uyeler(id) ON DELETE CASCADE,
    
    yakinlik VARCHAR(50),                        -- Eş, Çocuk, Anne, Baba
    ad_soyad VARCHAR(200),
    dogum_tarihi DATE,
    telefon VARCHAR(20),
    
    sync_id UUID DEFAULT gen_random_uuid() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Aidat Sistemi (TENANT İZOLE)
CREATE TABLE aidat_takip (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
   7. Mali İşlemler (TENANT İZOLE)
CREATE TABLE kasalar (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    kasa_adi VARCHAR(100) NOT NULL,
    para_birimi VARCHAR(10) DEFAULT 'TL',        -- TL, USD, EUR
    devir_bakiye DECIMAL(18,2) DEFAULT 0,
    aciklama TEXT,
    
    sync_id UUID DEFAULT gen_random_uuid() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    UNIQUE(tenant_id, kasa_adi)
);

CREATE TABLE gelirler (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    kasa_id INTEGER REFERENCES kasalar(id),
    
    tarih DATE NOT NULL,
    belge_no VARCHAR(50),
    gelir_turu VARCHAR(50) NOT NULL,
    alt_kategori VARCHAR(100),
    aciklama TEXT,
    tutar DECIMAL(18,2) NOT NULL,
    tahsil_eden VARCHAR(100),
    dekont_no VARCHAR(100),
    ait_oldugu_yil INTEGER,
    tahakkuk_durumu VARCHAR(50) DEFAULT 'NORMAL',
    notlar TEXT,
    
    sync_id UUID DEFAULT gen_random_uuid() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_gelirler_tenant_tarih ON gelirler(tenant_id, tarih);
CREATE INDEX idx_gelirler_kasa ON gelirler(kasa_id);

CREATE TABLE giderler (
   8. Senkronizasyon Tabloları
CREATE TABLE sync_changes (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    sync_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL,              -- INSERT, UPDATE, DELETE
    data JSONB,
    
    synced BOOLEAN DEFAULT false,
    synced_at TIMESTAMPTZ,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_tenant_pending ON sync_changes(tenant_id, synced) WHERE synced = false;

CREATE TABLE sync_conflicts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    sync_id UUID NOT NULL,
    
    local_version INTEGER,
    server_version INTEGER,
    local_data JSONB,
    server_data JSONB,
    
    resolution VARCHAR(20),                      -- SERVER_WINS, CLIENT_WINS, MANUAL
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by INTEGER REFERENCES users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Audit Log (Tenant İzole)
CREATE TABLE islem_loglari (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    
    action VARCHAR(50) NOT NULL,                 -- CREATE, UPDATE, DELETE
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER,
    old_data JSONB,
    new_data JSONB,
    
    ip_address VARCHAR(50),
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_table ON islem_loglari(tenant_id, table_name, created_at);

-- 10. Ayarlar (Key-Value, Tenant Özel)
CREATE TABLE ayarlar (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    description TEXT,
    UNIQUE(tenant_id, key)
);

-- 11. Etkinlik, Toplantı, Belge (Kısa versiyon, tam schema benzer)
-- ... (Her biri tenant_id, sync_id, version, is_deleted içerir)

-- 12. Köy Modülü (Tenant İzole, Bağımsız Muhasebe)
-- koy_kasalar, koy_gelirleri, koy_giderleri, koy_virmanlar
-- ... (Aynı izolasyon kuralları)
```

### 🔒 Row-Level Security (RLS) - PostgreSQL

```sql
-- Her tablo için RLS kuralı
ALTER TABLE uyeler ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON uyeler
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Diğer tablolar için aynı
ALTER TABLE aidat_takip ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON aidat_takip
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- ... (Her tablo için)
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_giderler_tenant_tarih ON giderler(tenant_id, tarih);
CREATE INDEX idx_giderler_kasa ON giderler(kasa_id);

CREATE TABLE virmanlar (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    gonderen_kasa_id INTEGER REFERENCES kasalar(id),
    alan_kasa_id INTEGER REFERENCES kasalar(id),
    
    tarih DATE NOT NULL,
    tutar DECIMAL(18,2) NOT NULL,
    aciklama TEXT,
    
    sync_id UUID DEFAULT gen_random_uuid() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Dinamik Kategoriler (Tenant'a özel)
CREATE TABLE gelir_turleri (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    kod VARCHAR(50) NOT NULL,
    ad VARCHAR(100) NOT NULL,
    aciklama TEXT,
    UNIQUE(tenant_id, kod)
);

CREATE TABLE gider_turleri (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    kod VARCHAR(50) NOT NULL,
    ad VARCHAR(100) NOT NULL,
    aciklama TEXT,
    UNIQUE(tenant_id, kod)
);reign key sonra eklenecek
    
    sync_id UUID DEFAULT gen_random_uuid() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    UNIQUE(tenant_id, uye_id, yil)
);

CREATE INDEX idx_aidat_tenant_yil ON aidat_takip(tenant_id, yil);
CREATE INDEX idx_aidat_uye ON aidat_takip(uye_id);

CREATE TABLE aidat_odemeleri (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    aidat_id INTEGER REFERENCES aidat_takip(id) ON DELETE CASCADE,
    
    tarih DATE NOT NULL,
    tutar DECIMAL(18,2) NOT NULL,
    tahsilat_turu VARCHAR(50),                   -- Nakit, Havale, Kredi Kartı
    banka_sube VARCHAR(100),
    dekont_no VARCHAR(100),
    aciklama TEXT,
    
    sync_id UUID DEFAULT gen_random_uuid() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- 4. Mali İşlemler
kasalar                  -- Kasa/Hesap tanımları
gelirler                 -- Gelir kayıtları
giderler                 -- Gider kayıtları
virmanlar                -- Kasalar arası transferler
gelir_turleri            -- Dinamik gelir kategorileri
gider_turleri            -- Dinamik gider kategorileri

-- 5. Etkinlik ve Toplantı
etkinlikler              -- Etkinlik kayıtları
toplantilar              -- Toplantı tutanakları

-- 6. Belge ve Bütçe
belgeler                 -- Belge yönetimi
butce_planlari           -- Bütçe planlama

-- 7. Köy Modülü (Ayrı Muhasebe)
koy_kasalar              -- Köy kasaları
koy_gelirleri            -- Köy gelirleri
koy_giderleri            -- Köy giderleri
koy_virmanlar            -- Köy virmanları

-- 8. Sistem
ayarlar                  -- Sistem ayarları (key-value)
islem_loglari            -- Audit log
tahakkuklar              -- Tahakkuk kayıtları
devir_islemleri          -- Yıl sonu devir
```

### Kritik İlişkiler

```
uyeler (1) ──────────── (N) aidat_takip
                              │
aidat_takip (1) ─────── (N) aidat_odemeleri
                              │
aidat_takip (1) ─────── (1) gelirler (gelir_id)
                              │
gelirler (N) ──────────── (1) kasalar
giderler (N) ──────────── (1) kasalar
virmanlar (1) ─────────── (1) kasalar (gonderen)
virmanlar (1) ─────────── (1) kasalar (alan)

uyeler (1) ──────────── (N) uye_aile_uyeleri
uyeler (1) ──────────── (1) uyeler (referans_uye_id)

etkinlikler (N) ───────── (1) uyeler (sorumlu_uye_id)
toplantilar (N) ───────── (1) users (olusturan_user_id)
```

---

## 📦 Modül Listesi ve İlişkileri

### 1. 🔐 Giriş ve Oturum Yönetimi

**Amaç:** Kullanıcı kimlik doğrulama ve yetkilendirme

#### İşlemler (CRUD)
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Login** | `POST /api/auth/login` | Kullanıcı girişi, JWT token döner |
| **Logout** | `POST /api/auth/logout` | Token'ı geçersiz kılar |
| **Refresh** | `POST /api/auth/refresh` | Token yenileme |
| **Change Password** | `PUT /api/auth/change-password` | Şifre değiştirme |

#### İlişkiler
- `users` → `roles` (many-to-many)
- `users` → `permissions` (many-to-many)
- `users` → `islem_loglari` (one-to-many)

---

### 2. 📊 Dashboard (Ana Sayfa)

**Amaç:** Özet istatistikler ve hızlı erişim

#### İşlemler (READ)
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Get Stats** | `GET /api/dashboard/stats` | Üye sayıları, kasa bakiyeleri |
| **Get Recent** | `GET /api/dashboard/recent` | Son işlemler |
| **Get Charts** | `GET /api/dashboard/charts` | Grafik verileri |

#### Gösterilen Veriler
- Toplam Üye / Aktif / Pasif / Ayrılan
- Kasa Bakiyeleri (TL, USD, EUR)
- Bu Ay Gelir/Gider
- Borçlu Üye Sayısı
- Son 10 İşlem

#### İlişkiler
- Aggregate queries: `uyeler`, `kasalar`, `gelirler`, `giderler`, `aidat_takip`

---

### 3. 👥 Üye Yönetimi

**Amaç:** Üye CRUD işlemleri (30+ alan)

#### İşlemler (CRUD)
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Create** | `POST /api/uyeler` | Yeni üye kaydı |
| **Read** | `GET /api/uyeler/{id}` | Tek üye detayı |
| **Update** | `PUT /api/uyeler/{id}` | Üye güncelleme |
| **Delete** | `DELETE /api/uyeler/{id}` | Soft delete (durum=Ayrıldı) |
| **List** | `GET /api/uyeler` | Sayfalama, filtreleme, arama |
| **Search** | `GET /api/uyeler/search?q=` | Tam metin arama |
| **Export** | `GET /api/uyeler/export` | Excel/PDF dışa aktarım |

#### Form Alanları (30+ Alan)

**Temel Bilgiler**
- `uye_no` (string, unique)
- `tc_kimlik` (string, 11 hane)
- `ad_soyad` (string, required)
- `uyelik_tipi` (enum: Asil, Onursal, Fahri, Kurumsal)
- `durum` (enum: Aktif, Pasif, Ayrıldı)

**İletişim**
- `telefon` (string)
- `telefon2` (string)
- `email` (string)

**Kişisel**
- `cinsiyet` (enum: Erkek, Kadın)
- `dogum_tarihi` (date)
- `dogum_yeri` (string)
- `kan_grubu` (enum: A+, A-, B+, B-, AB+, AB-, 0+, 0-)
- `aile_durumu` (enum: Bekar, Evli, Dul, Boşanmış)
- `cocuk_sayisi` (integer)

**Meslek**
- `egitim_durumu` (enum: İlkokul...Doktora)
- `meslek` (string)
- `is_yeri` (string)

**Adres**
- `il` (string)
- `ilce` (string)
- `mahalle` (string)
- `adres` (text)
- `posta_kodu` (string)

**Aidat**
- `ozel_aidat_tutari` (decimal)
- `aidat_indirimi_yuzde` (decimal)

**Diğer**
- `referans_uye_id` (foreign key)
- `ayrilma_tarihi` (date)
- `ayrilma_nedeni` (text)
- `notlar` (text)

#### Validasyonlar
- ✅ Ad Soyad zorunlu
- ✅ TC Kimlik 11 hane + algoritma kontrolü
- ✅ Email format kontrolü
- ✅ Telefon format kontrolü
- ✅ Üye No benzersiz

#### İlişkiler
```
uyeler (1) → (N) aidat_takip
uyeler (1) → (N) uye_aile_uyeleri
uyeler (1) → (1) uyeler (referans)
uyeler (N) → (N) etkinlikler (katılımcı)
```

---

### 4. 👤 Üye Detay Sayfası

**Amaç:** Tek üyenin tüm bilgileri

#### İşlemler (READ)
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Get Detail** | `GET /api/uyeler/{id}/detail` | Üye + aidat + aile üyeleri |
| **Get Timeline** | `GET /api/uyeler/{id}/timeline` | İşlem geçmişi |

#### Görüntülenen Bölümler
1. **Kişisel Bilgiler Kartı**
2. **Adres Bilgileri Kartı**
3. **İletişim Bilgileri Kartı**
4. **Aidat Özeti** (Kayıtlı Yıl, Ödenen, Borç)
5. **Aile Üyeleri Tablosu**
6. **Aidat Geçmişi Tablosu**
7. **İşlem Logları**

#### İlişkiler
- Join: `uyeler` + `aidat_takip` + `uye_aile_uyeleri` + `islem_loglari`

---

### 5. 💳 Üye Aidat Sayfası

**Amaç:** Üye bazlı yıl-yıl aidat takibi

#### İşlemler (CRUD)
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Get Aidat Years** | `GET /api/uyeler/{id}/aidatlar` | Yıl bazlı aidat listesi |
| **Add Payment** | `POST /api/aidatlar/{aidat_id}/odeme` | Ödeme ekleme |
| **Delete Payment** | `DELETE /api/aidatlar/odeme/{id}` | Ödeme silme |

#### Aidat Durumları
- 🔴 **Eksik** - Hiç ödeme yok
- 🟡 **Kısmi** - Kısmi ödeme var
- 🟢 **Tamamlandı** - Tam ödendi

#### İlişkiler
```
uyeler (1) → (N) aidat_takip
aidat_takip (1) → (N) aidat_odemeleri
aidat_takip (1) → (1) gelirler (otomatik)
```

---

### 6. 👋 Ayrılan Üyeler

**Amaç:** Soft-deleted üyelerin yönetimi

#### İşlemler
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **List** | `GET /api/uyeler/ayrilan` | Durumu=Ayrıldı olanlar |
| **Activate** | `PUT /api/uyeler/{id}/aktif-yap` | Tekrar aktif yapma |
| **Hard Delete** | `DELETE /api/uyeler/{id}/kalici-sil` | Veritabanından silme |

#### İlişkiler
- Aynı `uyeler` tablosu (durum filtresi)

---

### 7. 📋 Aidat Takip Sistemi

**Amaç:** Toplu aidat yönetimi

#### İşlemler (CRUD)
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Create Bulk** | `POST /api/aidatlar/toplu-olustur` | Tüm üyeler için yıllık |
| **Create Single** | `POST /api/aidatlar` | Tek üye için |
| **List** | `GET /api/aidatlar?yil=2026` | Yıl/durum filtreli liste |
| **Update Status** | `PUT /api/aidatlar/{id}/durum` | Durum güncelleme |

#### Toplu Aidat Oluşturma
```json
{
  "yil": 2026,
  "varsayilan_tutar": 1000,
  "sadece_aktif_uyeler": true
}
```

#### İlişkiler
```
aidat_takip (N) → (1) uyeler
aidat_takip (1) → (N) aidat_odemeleri
aidat_takip → gelirler (tamamlandığında otomatik)
```

---

### 8. 📅 Çoklu Yıl Ödeme

**Amaç:** Birden fazla yıl için tek seferde tahsilat

#### İşlemler
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Multi-Year Payment** | `POST /api/aidatlar/coklu-yil-odeme` | 2020-2025 arası ödeme |

#### Request Body
```json
{
  "uye_id": 123,
  "baslangic_yil": 2020,
  "bitis_yil": 2025,
  "tahsilat_tarihi": "2026-01-08",
  "kasa_id": 1,
  "odemeler": [
    {
      "yil": 2020,
      "tutar": 800,
      "dekont_no": "D-001",
      "tahsilat_turu": "Havale/EFT"
    }
  ]
}
```

#### İş Mantığı
1. Her yıl için `aidat_takip` kontrolü (yoksa oluştur)
2. `aidat_odemeleri` kayıtları oluştur
3. Durum güncelleme (Eksik → Kısmi → Tamamlandı)
4. Tamamlanan aidatlar için otomatik `gelirler` kaydı
5. Kasa bakiyesi güncelleme

---

### 9. 💵 Gelir Yönetimi

**Amaç:** Tüm gelir kayıtları

#### İşlemler (CRUD)
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Create** | `POST /api/gelirler` | Yeni gelir |
| **Read** | `GET /api/gelirler/{id}` | Gelir detayı |
| **Update** | `PUT /api/gelirler/{id}` | Gelir güncelleme |
| **Delete** | `DELETE /api/gelirler/{id}` | Gelir silme |
| **List** | `GET /api/gelirler` | Filtreleme, arama |

#### Form Alanları
- `tarih` (date, required)
- `belge_no` (string, otomatik)
- `gelir_turu` (string, required) - KİRA, BAĞIŞ, AİDAT, DÜĞÜN, KINA, DİĞER
- `alt_kategori` (string)
- `aciklama` (text, required)
- `tutar` (decimal, required)
- `kasa_id` (foreign key, required)
- `tahsil_eden` (string)
- `dekont_no` (string)
- `ait_oldugu_yil` (integer) - Tahakkuk için
- `tahakkuk_durumu` (enum: NORMAL, GERİYE DÖNÜK, PEŞİN)
- `notlar` (text)

#### Otomatik İşlemler
- ✅ Belge No otomatik oluşturulur: `G-20260108-XXXX`
- ✅ Kasa bakiyesi otomatik güncellenir
- ✅ Audit log kaydı

#### İlişkiler
```
gelirler (N) → (1) kasalar
gelirler (1) → (1) aidat_takip (aidat geliri ise)
gelirler (N) → (1) gelir_turleri (dinamik kategoriler)
```

---

### 10. 💸 Gider Yönetimi

**Amaç:** Tüm gider kayıtları

#### İşlemler (CRUD)
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Create** | `POST /api/giderler` | Yeni gider |
| **Read** | `GET /api/giderler/{id}` | Gider detayı |
| **Update** | `PUT /api/giderler/{id}` | Gider güncelleme |
| **Delete** | `DELETE /api/giderler/{id}` | Gider silme |
| **List** | `GET /api/giderler` | Filtreleme, arama |

#### Form Alanları
- `tarih` (date, required)
- `islem_no` (string, otomatik)
- `gider_turu` (string, required) - ELEKTRİK, SU, KİRA, TAMİRAT, vb.
- `alt_kategori` (string)
- `aciklama` (text, required)
- `tutar` (decimal, required)
- `kasa_id` (foreign key, required)
- `odeyen` (string)
- `fatura_no` (string)
- `notlar` (text)

#### Varsayılan Gider Türleri
- ELEKTRİK, SU, DOĞALGAZ
- KİRA, TEMİZLİK, BAKIM-ONARIM
- ORGANİZASYON, YEMEK, ULAŞIM
- VERGİ-HARÇ, SİGORTA, DİĞER

#### İlişkiler
```
giderler (N) → (1) kasalar
giderler (N) → (1) gider_turleri (dinamik)
```

---

### 11. 🏦 Kasa Yönetimi

**Amaç:** Çoklu kasa/hesap yönetimi

#### İşlemler (CRUD)
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Create** | `POST /api/kasalar` | Yeni kasa |
| **Read** | `GET /api/kasalar/{id}` | Kasa detayı |
| **Update** | `PUT /api/kasalar/{id}` | Kasa güncelleme |
| **Delete** | `DELETE /api/kasalar/{id}` | Kasa silme (bakiye=0 ise) |
| **List** | `GET /api/kasalar` | Tüm kasalar |
| **Get Balance** | `GET /api/kasalar/{id}/bakiye` | Anlık bakiye hesaplama |
| **Get Movements** | `GET /api/kasalar/{id}/hareketler` | İşlem geçmişi |

#### Form Alanları
- `kasa_adi` (string, required, unique)
- `para_birimi` (enum: TL, USD, EUR)
- `devir_bakiye` (decimal) - Açılış bakiyesi
- `aciklama` (text)

#### Bakiye Hesaplama
```python
fiziksel_bakiye = devir_bakiye + sum(gelirler) - sum(giderler) + virman_net
tahakkuk = sum(gelirler where tahakkuk_durumu = 'PEŞİN')
serbest_bakiye = fiziksel_bakiye - tahakkuk
```

#### İlişkiler
```
kasalar (1) → (N) gelirler
kasalar (1) → (N) giderler
kasalar (1) → (N) virmanlar (gonderen)
kasalar (1) → (N) virmanlar (alan)
```

---

### 12. 🔁 Virman İşlemleri

**Amaç:** Kasalar arası para transferi

#### İşlemler (CRUD)
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Create** | `POST /api/virmanlar` | Yeni virman |
| **Read** | `GET /api/virmanlar/{id}` | Virman detayı |
| **Delete** | `DELETE /api/virmanlar/{id}` | Virman silme |
| **List** | `GET /api/virmanlar` | Filtreleme |

#### Form Alanları
- `tarih` (date, required)
- `gonderen_kasa_id` (foreign key, required)
- `alan_kasa_id` (foreign key, required)
- `tutar` (decimal, required)
- `aciklama` (text)

#### Validasyonlar
- ❌ Gönderen ve alan kasa aynı olamaz
- ❌ Gönderen kasada yeterli bakiye olmalı
- ✅ Para birimleri aynı olmalı (veya kur dönüşümü)

#### İş Mantığı
1. Gönderen kasa: bakiye -= tutar
2. Alan kasa: bakiye += tutar
3. Transaction (her iki işlem birden commit)

---

### 13. 📊 Raporlar Modülü

**Amaç:** Mali ve üye raporları

#### Rapor Türleri

**1. Borçlu Üye Listesi**
| İşlem | Endpoint |
|-------|----------|
| **Report** | `GET /api/raporlar/borclu-uyeler?yil=2026` |

Sütunlar: Üye No, Ad Soyad, Telefon, Yıl, Aidat, Ödenen, Borç

**2. Mali Durum Raporu**
| İşlem | Endpoint |
|-------|----------|
| **Report** | `GET /api/raporlar/mali-durum?baslangic=&bitis=` |

İstatistikler:
- Toplam Gelir
- Toplam Gider
- Net Sonuç
- Gelir Dağılımı (tür bazında)
- Gider Dağılımı (tür bazında)

**3. Tahsilat Oranları**
| İşlem | Endpoint |
|-------|----------|
| **Report** | `GET /api/raporlar/tahsilat-oranlari` |

Yıl bazında: Toplam Üye, Tamamlanan, Kısmi, Ödeme Yok, Tahsilat %

**4. Kasa Hareketleri**
| İşlem | Endpoint |
|-------|----------|
| **Report** | `GET /api/kasalar/{id}/rapor?baslangic=&bitis=` |

Kronolojik işlem listesi (Gelir/Gider/Virman)

#### İlişkiler
- Aggregate queries: Tüm mali tablolar

---

### 14. 🎉 Etkinlik Yönetimi

**Amaç:** Dernek etkinliklerinin takibi

#### İşlemler (CRUD)
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Create** | `POST /api/etkinlikler` | Yeni etkinlik |
| **Read** | `GET /api/etkinlikler/{id}` | Etkinlik detayı |
| **Update** | `PUT /api/etkinlikler/{id}` | Etkinlik güncelleme |
| **Delete** | `DELETE /api/etkinlikler/{id}` | Etkinlik silme |
| **List** | `GET /api/etkinlikler` | Filtreleme |

#### Form Alanları
- `etkinlik_turu` (enum: DÜĞÜN, NİŞAN, KINA, CENAZE, TOPLANTI, vb.)
- `baslik` (string, required)
- `aciklama` (text)
- `tarih` (date, required)
- `saat` (time)
- `bitis_tarihi` (date)
- `mekan` (string)
- `durum` (enum: Planlandı, Devam Ediyor, Tamamlandı, İptal)
- `tahmini_gelir` (decimal)
- `tahmini_gider` (decimal)
- `gerceklesen_gelir` (decimal)
- `gerceklesen_gider` (decimal)
- `katilimci_sayisi` (integer)
- `sorumlu_uye_id` (foreign key)
- `notlar` (text)

#### İlişkiler
```
etkinlikler (N) → (1) uyeler (sorumlu)
etkinlikler (N) → (N) uyeler (katılımcılar)
```

---

### 15. 📅 Toplantı Yönetimi

**Amaç:** Yönetim kurulu ve genel kurul kayıtları

#### İşlemler (CRUD)
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Create** | `POST /api/toplantilar` | Yeni toplantı |
| **Read** | `GET /api/toplantilar/{id}` | Toplantı detayı |
| **Update** | `PUT /api/toplantilar/{id}` | Toplantı güncelleme |
| **Delete** | `DELETE /api/toplantilar/{id}` | Toplantı silme |
| **List** | `GET /api/toplantilar` | Filtreleme |

#### Form Alanları
- `toplanti_turu` (enum: Yönetim Kurulu, Genel Kurul, Denetim, vb.)
- `baslik` (string, required)
- `tarih` (date, required)
- `saat` (time)
- `mekan` (string)
- `gundem` (text)
- `katilimcilar` (text)
- `kararlar` (text)
- `tutanak` (text)
- `bir_sonraki_toplanti` (date)

---

### 16. 👥 Kullanıcı Yönetimi

**Amaç:** Sistem kullanıcıları ve roller

#### İşlemler (CRUD)
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Create** | `POST /api/users` | Yeni kullanıcı (admin only) |
| **Read** | `GET /api/users/{id}` | Kullanıcı detayı |
| **Update** | `PUT /api/users/{id}` | Kullanıcı güncelleme |
| **Delete** | `DELETE /api/users/{id}` | Kullanıcı silme |
| **List** | `GET /api/users` | Tüm kullanıcılar |

#### Roller ve Yetkiler
| Rol | Açıklama | Yetkiler |
|-----|----------|----------|
| **admin** | Yönetici | Tam yetki |
| **muhasebeci** | Muhasebeci | Mali işlemler + düzenleme |
| **görüntüleyici** | Görüntüleyici | Sadece okuma |

#### İzinler (Permission-based)
```python
permissions = [
    "uye:read", "uye:create", "uye:update", "uye:delete",
    "aidat:read", "aidat:create", "aidat:update",
    "gelir:read", "gelir:create", "gelir:update", "gelir:delete",
    "gider:read", "gider:create", "gider:update", "gider:delete",
    "kasa:read", "kasa:create", "kasa:update", "kasa:delete",
    "rapor:read", "rapor:export",
    "user:read", "user:create", "user:update", "user:delete"
]
```

---

### 17. ⚙️ Ayarlar

**Amaç:** Sistem yapılandırması

#### İşlemler
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Get All** | `GET /api/ayarlar` | Tüm ayarlar |
| **Get One** | `GET /api/ayarlar/{key}` | Tek ayar |
| **Update** | `PUT /api/ayarlar/{key}` | Ayar güncelleme |

#### Ayar Kategorileri

**Dernek Bilgileri**
- `dernek_adi`
- `dernek_adresi`
- `dernek_telefonu`
- `dernek_email`

**Mali Ayarlar**
- `varsayilan_aidat_tutari`
- `usd_kuru`
- `eur_kuru`

**Sistem Ayarları**
- `yedekleme_sikligi`
- `otomatik_gelir_aktarimi` (aidat tamamlandığında)

---

### 18. 🔍 Gelişmiş Arama

**Amaç:** Global arama

#### İşlemler
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Search** | `GET /api/arama?q=ahmet&modul=uyeler` | Global arama |

#### Aranabilir Modüller
- Üyeler (ad soyad, TC, telefon, email)
- Gelirler (açıklama, belge no, dekont)
- Giderler (açıklama, işlem no)
- Aidatlar (üye adı, yıl)

#### PostgreSQL Full-Text Search
```sql
-- Index
CREATE INDEX idx_uyeler_search ON uyeler 
USING gin(to_tsvector('turkish', ad_soyad || ' ' || COALESCE(telefon, '')));

-- Query
SELECT * FROM uyeler 
WHERE to_tsvector('turkish', ad_soyad) @@ to_tsquery('turkish', 'ahmet:*');
```

---

### 19. 📁 Belge Yönetimi

**Amaç:** Dosya depolama

#### İşlemler (CRUD)
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Upload** | `POST /api/belgeler` | Dosya yükleme |
| **Download** | `GET /api/belgeler/{id}/download` | Dosya indirme |
| **Delete** | `DELETE /api/belgeler/{id}` | Dosya silme |
| **List** | `GET /api/belgeler` | Belge listesi |

#### Form Alanları
- `belge_turu` (enum: DEKONT, FATURA, MAKBUZ, SÖZLEŞME, vb.)
- `baslik` (string, required)
- `aciklama` (text)
- `dosya` (file, required) - PDF, JPG, PNG, DOCX
- `dosya_boyutu` (bigint, otomatik)
- `dosya_yolu` (string, otomatik)

#### Dosya Depolama
- Yerel: `/var/www/bader/storage/belgeler/{yil}/{ay}/`
- Cloud: AWS S3 / Azure Blob Storage (opsiyonel)

---

### 20. 📊 Bütçe Planlama

**Amaç:** Yıllık bütçe planlama

#### İşlemler (CRUD)
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Create** | `POST /api/butce-planlari` | Yeni bütçe kalemi |
| **Read** | `GET /api/butce-planlari/{id}` | Bütçe detayı |
| **Update** | `PUT /api/butce-planlari/{id}` | Bütçe güncelleme |
| **Delete** | `DELETE /api/butce-planlari/{id}` | Bütçe silme |
| **List** | `GET /api/butce-planlari?yil=2026` | Yıl bazlı liste |
| **Update Actual** | `POST /api/butce-planlari/gerceklesen-guncelle` | Otomatik güncelleme |

#### Form Alanları
- `yil` (integer, required)
- `turu` (enum: GELİR, GİDER)
- `kategori` (string, required)
- `planlanan_tutar` (decimal, required)
- `gerceklesen_tutar` (decimal, otomatik)
- `aciklama` (text)

#### Otomatik Güncelleme
```python
# Her gün/hafta çalışan job
gerceklesen_gelir = sum(gelirler where yil=2026 and turu='KİRA')
butce.gerceklesen_tutar = gerceklesen_gelir
```

---

### 21. 🔄 Yıl Sonu Devir

**Amaç:** Kasa bakiyelerini yeni yıla aktarma

#### İşlemler
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Preview** | `GET /api/devir/onizleme?yil=2026` | Devir önizleme |
| **Execute** | `POST /api/devir/uygula` | Devir işlemi (GERİ ALINAMAZ) |

#### Önizleme Response
```json
{
  "yil": 2026,
  "kasalar": [
    {
      "kasa_id": 1,
      "kasa_adi": "BANKA TL",
      "mevcut_devir": 10000,
      "net_bakiye": 45000,
      "yeni_devir": 45000,
      "fark": 35000
    }
  ],
  "toplam_fark": 50000
}
```

#### İş Mantığı
1. Her kasa için net bakiye hesapla
2. `devir_bakiye` = net_bakiye
3. `devir_islemleri` tablosuna log
4. Transaction ile tüm kasalar birden güncellenir

---

### 22. 📈 Tahakkuk Raporları

**Amaç:** Gelir tahakkuk takibi

#### İşlemler
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Get Report** | `GET /api/raporlar/tahakkuk?yil=2026` | Tahakkuk raporu |

#### İstatistikler
- **Fiziksel Bakiye:** Gerçek kasa bakiyesi
- **Gelir Tahakkuku:** Gelecek yıllara ait gelirler
- **Serbest Bakiye:** Kullanılabilir bakiye

#### Tahakkuk Durumları
- **NORMAL:** Gelir kendi yılına ait
- **GERİYE DÖNÜK:** Geçmiş yıl geliri
- **PEŞİN:** Gelecek yıl geliri

---

### 23. 📤 Dışa Aktarma

**Amaç:** Excel/PDF export

#### İşlemler
| İşlem | Endpoint | Açıklama |
|-------|----------|----------|
| **Export Excel** | `GET /api/export/excel/{modul}` | Excel dosyası |
| **Export PDF** | `GET /api/export/pdf/{modul}` | PDF dosyası |

#### Desteklenen Modüller
- Üyeler
- Aidat Takip
- Gelirler
- Giderler
- Kasa Özeti

---

### 24. 🌾 Köy Modülü (4 Alt Modül)

**Amaç:** Dernek muhas (İzolasyon Öncelikli)

### Faz 0: Altyapı (1 Hafta) ⚠️ KRİTİK

**Hedef:** Tenant/License/Sync altyapısı kurulu

- [ ] Proje kurulumu (FastAPI + PostgreSQL)
- [ ] Database schema (tenant, license, user tabloları)
- [ ] Row-Level Security (RLS) aktif
- [ ] Middleware stack:
  - [ ] JWT authentication
  - [ ] Tenant resolver (header/subdomain)
  - [ ] License checker
  - [ ] Feature gate decorator
- [ ] Base model (tenant_id, sync_id, version auto-inject)
- [ ] Audit log interceptor
- [ ] Soft delete global filter

### Faz 1: Backend MVP (4 Hafta)

**Hedef:** Temel API çalışır (Multi-tenant aware)

- [ ] Tenant management endpoints (superadmin)
- [ ] License CRUD + activation
- [ ] User management (tenant içinde)
- [ ] Üye CRUD (tenant izole)
- [ ] Aidat CRUD (tenant izole)
- [ ] Kasa CRUD (tenant izole)
- [ ] Gelir/Gider CRUD (tenant izole)
- [ ] Virman CRUD (tenant izole)
- [ ] Temel raporlar (tenant filtered)
- [ ] Sync endpoints (push/pull/conflicts) BAĞIŞ, TARIMSAL GELİR, HAYVANCILIK, PROJE DESTEĞİ

#### 24.3 Köy Gider
| İşlem | Endpoint |
|-------|----------|
| **CRUD** | `/api/koy/giderler` |

Gider Türleri: ELEKTRİK, SU, YOL BAKIM, ALTYAPI, TAMİRAT, PERSONEL

#### 24.4 Köy Kasa
| İşlem | Endpoint |
|-------|----------|
| **CRUD** | `/api/koy/kasalar` |

Bağımsız köy kasaları

#### 24.5 Köy Virman
| İşlem | Endpoint |
|-------|----------|
| **CRUD** | `/api/koy/virmanlar` |

Köy kasaları arası transferler

#### İlişkiler
```
koy_kasalar (1) → (N) koy_gelirleri
koy_kasalar (1) → (N) koy_giderleri
koy_kasalar (1) → (N) koy_virmanlar
```

---

## 🔗 Modüller Arası İlişki Diyagramı

```
                            ┌──────────────┐
                            │    USERS     │
                            └──────┬───────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
            ┌───────▼──────┐ ┌─────▼─────┐ ┌─────▼──────┐
            │  UYELER      │ │ KASALAR   │ │ AYARLAR    │
            └───────┬──────┘ └─────┬─────┘ └────────────┘
                    │              │
        ┌───────────┼──────────────┼───────────┐
        │           │              │           │
┌───────▼──────┐ ┌──▼────────┐ ┌──▼──────┐ ┌─▼────────┐
│AIDAT_TAKIP   │ │  GELIRLER │ │ GIDERLER│ │ VIRMANLAR│
└───────┬──────┘ └──────┬────┘ └─────────┘ └──────────┘
        │               │
┌───────▼──────┐ ┌──────▼────────┐
│AIDAT_ODEMELERI│ │ Kasa Bakiyesi │
└──────────────┘ └───────────────┘

┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│ ETKINLIKLER │  │ TOPLANTILAR  │  │   BELGELER   │
└─────────────┘  └──────────────┘  └──────────────┘

┌─────────────────────────────────────────────┐
│           KÖY MODÜLÜ (Bağımsız)             │
├─────────────┬──────────────┬────────────────┤
│ KOY_KASALAR │ KOY_GELIRLERI│ KOY_GIDERLERI │
└─────────────┴──────────────┴────────────────┘
```

---

## 📝 API Endpoint Standardı

### RESTful Endpoint Yapısı

```
GET    /api/v1/{resource}              # List (pagination + filters)
GET    /api/v1/{resource}/{id}         # Detail
POST   /api/v1/{resource}              # Create
PUT    /api/v1/{resource}/{id}         # Update (full)
PATCH  /api/v1/{resource}/{id}         # Update (partial)
DELETE /api/v1/{resource}/{id}         # Delete (soft)
GET    /api/v1/{resource}/search?q=    # Search
GET    /api/v1/{resource}/export       # Export
```

### Pagination & Filtering

```
GET /api/v1/uyeler?
  page=1&
  limit=50&
  durum=Aktif&
  uyelik_tipi=Asil&
  search=ahmet&
  sort=-created_at
```

**Response:**
```json
{
  "data": [...],
  "meta": {
    "total": 1250,
    "page": 1,
    "limit": 50,
    "total_pages": 25
  }
}
```

### Error Handling

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "TC Kimlik geçersiz",
    "details": {
      "field": "tc_kimlik",
      "reason": "11 haneli olmalıdır"
    }
  }
}
```

---

## 🚀 Geliştirme Planı

### Faz 1: Backend MVP (4 Hafta)

**Hedef:** Temel API çalışır halde

- [x] Proje kurulumu (FastAPI + PostgreSQL)
- [ ] Authentication (JWT)
- [ ] Kullanıcı yönetimi
- [ ] Üye CRUD
- [ ] Aidat CRUD
- [ ] Kasa CRUD
- [ ] Gelir/Gider CRUD
- [ ] Virman CRUD
- [ ] Temel raporlar

### Faz 2: Desktop App (6 Hafta)

**Hedef:** Tauri Desktop uygulaması

- [ ] Tauri + React setup
- [ ] shadcn/ui integration
- [ ] Auth flow
- [ ] Dashboard
- [ ] Üye modülü (tam)
- [ ] Aidat modülü
- [ ] Mali modüller
- [ ] Raporlar
- [ ] Installer (macOS/Windows)

### Faz 3: Web App (4 Hafta)

**Hedef:** Next.js web uygulaması

- [ ] Next.js 15 setup
- [ ] shadcn/ui (Desktop ile paylaşımlı)
- [ ] Auth (NextAuth)
- [ ] Tüm modüller (desktop'tan copy-paste)
- [ ] Responsive tasarım
- [ ] Deployment (Vercel)

### Faz 4: Gelişmiş Özellikler (4 Hafta)

- [ ] Etkinlik/Toplantı modülleri
- [ ] Belge yönetimi
- [ ] Bütçe modülü
- [ ] Köy modülü
- [ ] Excel/PDF export
- [ ] Tahakkuk raporları

### Faz 5: Test & Deploy (2 Hafta)

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Production deployment
- [ ] Dokümantasyon

---

## 💾 Veritabanı Stratejisi (3 Mod)

### 1. LOCAL Mod (Offline-Only)

```
┌─────────────────────────────┐
│      DESKTOP APP            │
│  (Tauri + React)            │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│    SQLite Database          │
│  ~/Documents/BADER/data.db  │
│                             │
│  • Tüm tablolar local       │
│  • tenant_id = local_uuid   │
│  • sync_id NULL             │
│  • NO internet required     │
└─────────────────────────────┘
```

**Özellikler:**
- ✅ Tam offline çalışma
- ✅ Tek dernek
- ✅ Yedekleme: dosya kopyalama
- ❌ Mobil erişim yok
- ❌ Web erişim yok
- ❌ Çoklu kullanıcı yok (tek PC)

**Database Path:**
- Windows: `C:\Users\{user}\Documents\BADER\data.db`
- macOS: `~/Documents/BADER/data.db`
- Linux: `~/.local/share/BADER/data.db`

---

### 2. ONLINE Mod (Cloud-Only)

```
┌──────────────┐  ┌──────────────┐
│  WEB APP     │  │  MOBILE APP  │
│  (Next.js)   │  │ (React Native)│
└──────┬───────┘  └──────┬───────┘
       │                 │
       └────────┬────────┘
                │
                ▼
        ┌───────────────┐
        │   FastAPI     │
        │   Backend     │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │  PostgreSQL   │
        │   (Cloud)     │
        │               │
        │ • Multi-tenant│
        │ • RLS enabled │
        │ • Backups     │
        └───────────────┘
```

**Özellikler:**
- ✅ Web erişim
- ✅ Mobil erişim
- ✅ Çoklu kullanıcı
- ✅ Gerçek zamanlı sync (WebSocket)
- ✅ Otomatik yedekleme
- ❌ İnternet zorunlu

**Tenant Isolation:**
```sql
-- Her istek başında
SET app.current_tenant = 'tenant-uuid-123';

-- RLS otomatik filtreler
SELECT * FROM uyeler; 
-- WHERE tenant_id = current_setting('app.current_tenant')
```

---

### 3. HYBRID Mod (Offline + Cloud)

```
┌─────────────────────────────┐
│      DESKTOP APP            │
│                             │
│  ┌────────────────────────┐ │
│  │   SQLite (Local)       │ │
│  │   • Full copy of data  │ │
│  │   • sync_id populated  │ │
│  └───────────┬────────────┘ │
│              │              │
│  ┌───────────▼────────────┐ │
│  │   Sync Engine          │ │
│  │   • Background worker  │ │
│  │   • Conflict resolver  │ │
│  │   • Delta calculation  │ │
│  └───────────┬────────────┘ │
└──────────────┼──────────────┘
               │
               │ HTTP/WebSocket
               ▼
       ┌───────────────┐
       │   FastAPI     │
       │   /sync/*     │
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │  PostgreSQL   │
       │   (Master)    │
       └───────────────┘
```

**Özellikler:**
- ✅ Offline çalışma (SQLite)
- ✅ Online sync (PostgreSQL)
- ✅ Çoklu cihaz
- ✅ Web + Desktop + Mobile
- ✅ Conflict resolution
- ⚠️ En karmaşık mod

**Sync Stratejisi:**
1. **Pull-first:** Server → Local (GET /sync/pull)
2. **Push:** Local → Server (POST /sync/push)
3. **Conflict detection:** version mismatch
4. **Resolution:** User chooses (UI)

---

## 🔄 Senkronizasyon Mekanizması

### Delta Sync (Sadece Değişenler)

```python
# Client (Desktop SQLite)
last_sync = get_last_sync_timestamp()  # 2026-01-07 10:00:00

# 1. Pull değişiklikleri al
response = GET /api/sync/pull?since=2026-01-07T10:00:00&tables=uyeler,gelirler

{
  "changes": [
    {
      "table": "uyeler",
      "sync_id": "uuid-123",
      "operation": "UPDATE",
      "data": {...},
      "version": 5,
      "updated_at": "2026-01-08T09:30:00"
    }
  ],
  "server_timestamp": "2026-01-08T10:00:00"
}

# 2. Local değişiklikleri gönder
local_changes = get_unsynced_changes()  # sync_changes tablosundan

response = POST /api/sync/push
{
  "changes": [
    {
      "table": "gelirler",
      "sync_id": "uuid-456",
      "operation": "INSERT",
      "data": {...},
      "version": 1
    }
  ]
}

# 3. Conflict var mı kontrol
{
  "conflicts": [
    {
      "table": "uyeler",
      "sync_id": "uuid-789",
      "local_version": 3,
      "server_version": 4,
      "local_data": {...},
      "server_data": {...}
    }
  ]
}
```

### Conflict Resolution UI

```
┌───────────────────────────────────────────────────┐
│          ÇAKIŞMA TESPİT EDİLDİ!                  │
├───────────────────────────────────────────────────┤
│                                                   │
│  Kayıt: Ahmet Yılmaz (Üye #123)                 │
│  Alan: Telefon                                   │
│                                                   │
│  ┌─────────────────┐    ┌─────────────────┐     │
│  │  SİZİN DEĞER    │    │ SERVER DEĞER    │     │
│  │  0532 111 2222  │    │ 0532 333 4444   │     │
│  │  ○ Bunu Kullan  │    │ ○ Bunu Kullan   │     │
│  └─────────────────┘    └─────────────────┘     │
│                                                   │
│  [Tüm Çakışmalar için Server Kazansın]          │
│  [Tüm Çakışmalar için Benim Versiyonum]         │
│  [Tek Tek Çöz]  [İptal]                         │
└───────────────────────────────────────────────────┘
```

### Background Sync Worker

```typescript
// Desktop (Tauri)
class SyncWorker {
  private syncInterval = 5 * 60 * 1000; // 5 dakika
  private isOnline = navigator.onLine;
  
  async start() {
    // Network dinle
    window.addEventListener('online', () => this.triggerSync());
    window.addEventListener('offline', () => this.stopSync());
    
    // Periyodik sync
    setInterval(() => {
      if (this.isOnline) {
        this.sync();
      }
    }, this.syncInterval);
  }
  
  async sync() {
    const lastSync = await db.getLastSyncTimestamp();
    
    // 1. Pull (server değişikliklerini al)
    const serverChanges = await api.sync.pull({ since: lastSync });
    await this.applyServerChanges(serverChanges);
    
    // 2. Push (local değişikliklerini gönder)
    const localChanges = await db.getUnsyncedChanges();
    const result = await api.sync.push({ changes: localChanges });
    
    // 3. Conflict varsa UI göster
    if (result.conflicts.length > 0) {
      await this.showConflictResolutionUI(result.conflicts);
    }
    
    // 4. Last sync güncelle
    await db.setLastSyncTimestamp(Date.now());
  }
}
```

---

## 🎫 Lisans Modları ve Geçişler

### Lisans Türleri

| Plan | Fiyat | Özellikler | Sınırlar |
|------|-------|------------|----------|
| **LOCAL** | ₺2,500 (tek seferlik) | Offline, tek PC | 1 kullanıcı, 5,000 üye |
| **ONLINE** | ₺500/ay | Web+Mobile, cloud | 5 kullanıcı, 50,000 üye |
| **HYBRID** | ₺800/ay | Hepsi (Desktop+Web+Mobile) | 10 kullanıcı, sınırsız |

### Geçiş Senaryoları

#### 1️⃣ LOCAL → ONLINE

```
┌────────────────────────────────────────────┐
│  Geçiş Süreci                             │
├────────────────────────────────────────────┤
│                                            │
│  1. Online lisans satın al                │
│  2. Tenant oluştur (server)               │
│  3. Data export (SQLite → JSON)           │
│  4. Data upload (POST /api/migrate)       │
│     • Üyeler                               │
│     • Aidatlar                             │
│     • Gelir/Gider/Kasa                     │
│  5. Doğrulama (kayıt sayıları)            │
│  6. Desktop app → Web'e yönlendir         │
│                                            │
│  ⏱ Tahmini Süre: 10-30 dakika            │
└────────────────────────────────────────────┘
```

**API Endpoint:**
```python
POST /api/admin/migrate-from-local
Authorization: Bearer {license_key}

{
  "tenant_name": "Bader Derneği",
  "data": {
    "uyeler": [...],
    "aidat_takip": [...],
    "gelirler": [...],
    "giderler": [...],
    "kasalar": [...]
  }
}

Response:
{
  "tenant_id": "uuid-123",
  "records_imported": {
    "uyeler": 1250,
    "aidat_takip": 3500,
    "gelirler": 850
  },
  "warnings": [
    "3 üyenin TC Kimlik numarası geçersiz"
  ]
}
```

---

#### 2️⃣ LOCAL → HYBRID

```
┌────────────────────────────────────────────┐
│  Geçiş Süreci                             │
├────────────────────────────────────────────┤
│                                            │
│  1. Hybrid lisans satın al                │
│  2. Tenant oluştur + initial upload       │
│  3. Desktop app güncelleme:               │
│     • sync_id oluştur (tüm kayıtlar)      │
│     • sync_changes tablosu oluştur        │
│     • Sync worker başlat                  │
│  4. İlk sync (bidirectional)              │
│  5. Desktop artık sync ediyor             │
│                                            │
│  ⚠️ Local SQLite korunur (offline)        │
│  ✅ Server PostgreSQL master olur         │
└────────────────────────────────────────────┘
```

**Migration Steps:**
```sql
-- Desktop SQLite'ta
ALTER TABLE uyeler ADD COLUMN sync_id TEXT;
UPDATE uyeler SET sync_id = lower(hex(randomblob(16)));

CREATE TABLE sync_changes (
  id INTEGER PRIMARY KEY,
  table_name TEXT,
  record_id INTEGER,
  sync_id TEXT,
  operation TEXT,
  data TEXT,
  synced INTEGER DEFAULT 0,
  timestamp TEXT
);

CREATE TABLE sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT
);
INSERT INTO sync_metadata VALUES ('last_sync', '2026-01-08T00:00:00');
INSERT INTO sync_metadata VALUES ('tenant_id', 'uuid-from-server');
```

---

#### 3️⃣ ONLINE → HYBRID

```
┌────────────────────────────────────────────┐
│  Offline Özelliğini Aç                    │
├────────────────────────────────────────────┤
│                                            │
│  1. Desktop app indir                      │
│  2. Login (online hesap)                  │
│  3. İlk sync: Full download               │
│     • Server → Local SQLite                │
│     • Tüm tablolar kopyalanır             │
│  4. Sync worker başlat                    │
│  5. Artık offline çalışabilir             │
│                                            │
│  💾 Local db size: ~50-500MB              │
│  ⏱ İlk download: 5-20 dakika             │
└────────────────────────────────────────────┘
```

---

#### 4️⃣ Plan Downgrade/Upgrade

```python
# HYBRID → ONLINE (Downgrade)
1. Desktop app sync son kez
2. Local SQLite sil
3. Web/Mobile kullan
4. Lisans: hybrid_features = false

# ONLINE → LOCAL (Downgrade)
1. Data export
2. Desktop app kur
3. Import data
4. Server erişim kapat
5. ⚠️ Web/Mobile kullanılamaz
```

---

## 🔒 Lisans Kontrolü ve Feature Gating

### Backend Middleware

```python
from functools import wraps
from fastapi import HTTPException, Depends

async def get_license(tenant_id: str) -> License:
    license = await db.query(License).filter_by(tenant_id=tenant_id).first()
    if not license:
        raise HTTPException(403, "No license found")
    if license.expiry_date < date.today():
        raise HTTPException(403, "License expired")
    return license

def require_feature(feature: str):
    """Decorator for feature gating"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, license: License = Depends(get_license), **kwargs):
            if not license.features.get("modules", {}).get(feature):
                raise HTTPException(
                    403, 
                    f"Feature '{feature}' not available in your plan"
                )
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Kullanım
@router.get("/koy/dashboard")
@require_feature("koy_modulu")
async def get_koy_dashboard(license: License = Depends(get_license)):
    # Köy modülü sadece HYBRID ve feature açıksa
    return {...}
```

### Desktop Feature Check

```typescript
// Desktop (Tauri)
class LicenseManager {
  private license: License;
  
  async checkFeature(feature: string): Promise<boolean> {
    // LOCAL mod: features local storage'dan
    if (this.isLocalMode()) {
      const features = await storage.get('license_features');
      return features?.modules?.[feature] || false;
    }
    
    // ONLINE/HYBRID: Server'dan kontrol
    const response = await api.get('/api/license/features');
    return response.data.modules[feature];
  }
  
  async checkLimit(limit: string): Promise<number> {
    // Örnek: max_users, max_records
    if (this.isLocalMode()) {
      return LOCAL_LIMITS[limit]; // 1 user, 5000 records
    }
    
    const response = await api.get('/api/license/limits');
    return response.data.limits[limit];
  }
}

// UI'da kullanım
const canAccessKoy = await license.checkFeature('koy_modulu');
if (!canAccessKoy) {
  // Köy menü item'ı gizle veya disable et
  // Upgrade prompt göster
}
```

### UI Feature Gate

```tsx
// React component
import { useFeature } from '@/hooks/useLicense';

export function KoyModulePage() {
  const { hasFeature, loading } = useFeature('koy_modulu');
  
  if (loading) return <Skeleton />;
  
  if (!hasFeature) {
    return (
      <UpgradePrompt 
        feature="Köy Modülü"
        requiredPlan="HYBRID"
        price="₺800/ay"
      />
    );
  }
  
  return <KoyDashboard />;
}
```

---

## 🗂️ Veritabanı Schema Versiyonlama

### Migration Stratejisi

```python
# Alembic migrations
# migrations/versions/001_initial_schema.py

def upgrade():
    # tenants
    op.create_table('tenants', ...)
    
    # licenses
    op.create_table('licenses', ...)
    
    # users
    op.create_table('users', ...)
    
    # uyeler
    op.create_table('uyeler', ...)

def downgrade():
    op.drop_table('uyeler')
    op.drop_table('users')
    op.drop_table('licenses')
    op.drop_table('tenants')
```

### Desktop SQLite Schema Sync

```typescript
// Desktop app başlarken
const REQUIRED_SCHEMA_VERSION = 5;
const currentVersion = await db.getSchemaVersion();

if (currentVersion < REQUIRED_SCHEMA_VERSION) {
  // Auto-migration
  await runMigrations(currentVersion, REQUIRED_SCHEMA_VERSION);
}

async function runMigrations(from: number, to: number) {
  const migrations = [
    migration_001_initial,
    migration_002_add_sync_fields,
    migration_003_add_koy_tables,
    // ...
  ];
  
  for (let v = from + 1; v <= to; v++) {
    await migrations[v - 1].up();
    await db.setSchemaVersion(v);
  }
}
```

---

## 📊 Data Import/Export

### Excel Import (Toplu Üye Ekleme)

```python
POST /api/import/uyeler
Content-Type: multipart/form-data

File: uyeler.xlsx

Response:
{
  "success": 850,
  "failed": 15,
  "errors": [
    {"row": 23, "error": "TC Kimlik geçersiz"},
    {"row": 45, "error": "Telefon formatı hatalı"}
  ]
}
```

### Backup & Restore

**LOCAL Mod:**
```bash
# Yedek al
cp ~/Documents/BADER/data.db ~/Backups/bader_2026-01-08.db

# Geri yükle
cp ~/Backups/bader_2026-01-08.db ~/Documents/BADER/data.db
```

**ONLINE/HYBRID Mod:**
```bash
# PostgreSQL dump (server)
pg_dump -U bader -d bader_prod -F c -f backup_2026-01-08.dump

# Restore
pg_restore -U bader -d bader_prod backup_2026-01-08.dump
```

---

## 🔐 Güvenlik ve İzolasyon Kontrolleri

### Tenant Isolation Test

```python
# Test: Farklı tenant verisi görünmemeli
tenant_a = create_tenant("Dernek A")
tenant_b = create_tenant("Dernek B")

# Tenant A kullanıcısı
set_current_tenant(tenant_a.id)
uye_a = create_uye(ad_soyad="Ahmet A")

# Tenant B kullanıcısı
set_current_tenant(tenant_b.id)
uyeler = get_uyeler()  # Sadece Tenant B'nin üyeleri

assert uye_a not in uyeler  # ✅ İzolasyon çalışıyor
```

### Sync Security

```python
# Sync endpoint: Sadece kendi tenant'ın değişikliklerini çekebilir
@router.post("/sync/push")
async def sync_push(
    changes: List[SyncChange],
    current_user: User = Depends(get_current_user)
):
    # Her change'in tenant_id'si kontrol et
    for change in changes:
        if change.tenant_id != current_user.tenant_id:
            raise HTTPException(403, "Tenant mismatch")
    
    # Değişiklikleri uygula
    await apply_changes(changes)
```

---

## ✅ Tamamlanma Kriterleri

### Veritabanı
- [ ] PostgreSQL schema (RLS aktif)
- [ ] SQLite schema (sync fields)
- [ ] Alembic migrations
- [ ] Seed data (varsayılanlar)

### Lisans
- [ ] License CRUD API
- [ ] Feature gate decorator
- [ ] Plan upgrade/downgrade flow
- [ ] UI upgrade prompts

### Senkronizasyon
- [ ] Delta sync (pull/push)
- [ ] Conflict detection
- [ ] Conflict resolution UI
- [ ] Background sync worker
- [ ] Offline fallback

### Geçişler
- [ ] LOCAL → ONLINE migration API
- [ ] LOCAL → HYBRID migration flow
- [ ] ONLINE → HYBRID initial sync
- [ ] Import/Export tools

### MVP Kriterleri
- [ ] Kullanıcı girişi çalışıyor
- [ ] Üye CRUD tam çalışıyor
- [ ] Aidat takibi çalışıyor
- [ ] Gelir/Gider/Kasa çalışıyor
- [ ] Temel raporlar çalışıyor
- [ ] Desktop installer hazır
- [ ] API dokümantasyonu hazır

### Kalite Kriterleri
- [ ] Test coverage > %80
- [ ] Tüm formlar validasyonlu
- [ ] Hata mesajları kullanıcı dostu
- [ ] Responsive tasarım
- [ ] Performans (liste yükleme < 1sn)
- [ ] Güvenlik (SQL injection korumalı)

---

## 🚀 Geliştirme Öncelikleri

### Faz 0: Altyapı (2 Hafta) ⚠️ KRİTİK

1. ✅ PostgreSQL + Alembic setup
2. ✅ Row-Level Security
3. ✅ Tenant/License/User tabloları
4. ✅ Base models (tenant_id, sync_id auto-inject)
5. ✅ Middleware stack
6. ✅ Feature gate decorator

### Faz 1: ONLINE Mod (4 Hafta)

1. ✅ Backend API (multi-tenant aware)
2. ✅ Web app (Next.js)
3. ✅ Authentication
4. ✅ Core CRUD (Üye, Aidat, Mali)
5. ❌ Sync yok (henüz)

### Faz 2: LOCAL Mod (3 Hafta)

1. ✅ Desktop app (Tauri)
2. ✅ SQLite database
3. ✅ Offline CRUD
4. ✅ Backup/Restore
5. ❌ Sync yok (henüz)

### Faz 3: HYBRID Mod (4 Hafta)

1. ✅ Sync endpoints (pull/push)
2. ✅ Conflict detection
3. ✅ Background sync worker
4. ✅ Conflict resolution UI
5. ✅ Migration tools (LOCAL→HYBRID)

### Faz 4: Production (2 Hafta)

1. ✅ License management UI
2. ✅ Plan upgrade flows
3. ✅ Import/Export
4. ✅ Testing (isolation, sync, conflicts)
5. ✅ Deployment

---

**Toplam Süre:** 15 hafta (~4 ay)

---

## � Lisans Satış ve Yönetim Sistemi

### 1. Lisans Key Üretimi

```python
import secrets
import hashlib

def generate_license_key(tenant_id: str, plan: str) -> str:
    """
    Format: BADER-XXXX-XXXX-XXXX-XXXX
    """
    # Unique seed
    seed = f"{tenant_id}-{plan}-{secrets.token_hex(8)}"
    hash_obj = hashlib.sha256(seed.encode())
    hash_hex = hash_obj.hexdigest()[:16]
    
    # Format: BADER-XXXX-XXXX-XXXX-XXXX
    parts = [hash_hex[i:i+4].upper() for i in range(0, 16, 4)]
    return f"BADER-{'-'.join(parts)}"

# Örnek: BADER-A3F2-9B1C-7E4D-5A8B
```

### 2. Offline Activation (İnternet Olmadan)

```
┌─────────────────────────────────────────────┐
│  OFFLINE AKTİVASYON SÜRECİ                 │
├─────────────────────────────────────────────┤
│                                             │
│  1. Müşteri lisans key alır (satın alma)  │
│     BADER-A3F2-9B1C-7E4D-5A8B              │
│                                             │
│  2. Desktop app açılır                      │
│     "Lisans Gir" ekranı                    │
│     • Lisans Key: [____________________]   │
│     • Hardware ID: B7E3-9A12 (otomatik)    │
│                                             │
│  3. App "Activation Code" oluşturur        │
│     BASE64(license_key + hardware_id)      │
│     → QR kod veya text                     │
│                                             │
│  4. Müşteri activation code'u gönderir:    │
│     • Email: lisans@bader.com              │
│     • Web: bader.com/activate              │
│     • WhatsApp: 0532 XXX XXXX              │
│                                             │
│  5. Admin panel'den onaylanır              │
│     • Activation code decode edilir        │
│     • License kaydı oluşturulur            │
│     • Response code üretilir               │
│                                             │
│  6. Müşteri response code'u alır           │
│     Email veya SMS ile                     │
│                                             │
│  7. App'e response code girilir            │
│     → Lisans aktif! ✅                     │
│                                             │
└─────────────────────────────────────────────┘
```

**Hardware ID Binding:**
```typescript
// Desktop (Tauri)
import { invoke } from '@tauri-apps/api/tauri';

async function getHardwareId(): Promise<string> {
  // CPU ID + MAC Address + Disk Serial
  const hwInfo = await invoke('get_hardware_info');
  const hash = sha256(JSON.stringify(hwInfo));
  return hash.substring(0, 8).toUpperCase(); // B7E3-9A12
}

// Rust (src-tauri/src/main.rs)
#[tauri::command]
fn get_hardware_info() -> HardwareInfo {
    HardwareInfo {
        cpu_id: get_cpu_id(),
        mac_address: get_primary_mac(),
        disk_serial: get_disk_serial(),
    }
}
```

### 3. Trial Period (Deneme Süresi)

```python
# licenses tablosu
class License(Base):
    # ...
    is_trial = Column(Boolean, default=False)
    trial_ends_at = Column(DateTime, nullable=True)
    trial_days = Column(Integer, default=14)
    
def check_license_validity(license: License) -> LicenseStatus:
    if license.is_trial:
        if datetime.now() > license.trial_ends_at:
            return LicenseStatus.TRIAL_EXPIRED
        days_left = (license.trial_ends_at - datetime.now()).days
        return LicenseStatus.TRIAL_ACTIVE(days_left)
    
    if datetime.now() > license.expiry_date:
        return LicenseStatus.EXPIRED
    
    return LicenseStatus.ACTIVE
```

**Trial Limitations:**
```json
{
  "trial_features": {
    "modules": {
      "uye_yonetimi": true,
      "aidat_takip": true,
      "mali_islemler": true,
      "koy_modulu": false,  // Trial'da kapalı
      "ocr": false
    },
    "limits": {
      "max_users": 2,
      "max_records": 100,
      "max_kasalar": 2
    },
    "watermark": true  // Raporlarda "DENEME SÜRÜMÜ" damgası
  }
}
```

### 4. Ödeme Entegrasyonu

```python
# iyzico entegrasyonu
from iyzipay import Payment

@router.post("/api/payment/purchase")
async def purchase_license(
    plan: str,  # LOCAL, ONLINE, HYBRID
    payment_card: PaymentCard,
    buyer_info: BuyerInfo
):
    # Fiyat hesapla
    price = get_plan_price(plan)
    
    # iyzico ödeme
    payment = Payment().create({
        'price': price,
        'paidPrice': price,
        'currency': 'TRY',
        'paymentCard': payment_card,
        'buyer': buyer_info
    })
    
    if payment.status == 'success':
        # Tenant oluştur
        tenant = create_tenant(buyer_info.name)
        
        # Lisans oluştur
        license_key = generate_license_key(tenant.id, plan)
        license = create_license(
            tenant_id=tenant.id,
            license_key=license_key,
            plan=plan,
            start_date=date.today(),
            expiry_date=date.today() + timedelta(days=30 if plan == 'ONLINE' else 365)
        )
        
        # Email gönder
        send_license_email(
            to=buyer_info.email,
            license_key=license_key,
            download_link='https://bader.com/download'
        )
        
        # Fatura oluştur
        create_invoice(payment, tenant)
        
        return {
            'success': True,
            'license_key': license_key,
            'tenant_id': tenant.id,
            'download_url': 'https://bader.com/download'
        }
```

### 5. Lisans Yenileme (Renewal)

```python
# 30 gün önceden uyarı
@celery.task
def check_expiring_licenses():
    expiring_licenses = db.query(License).filter(
        License.expiry_date - timedelta(days=30) <= date.today(),
        License.expiry_date > date.today(),
        License.renewal_reminded == False
    ).all()
    
    for license in expiring_licenses:
        # Email gönder
        send_renewal_reminder(
            to=license.tenant.email,
            days_left=(license.expiry_date - date.today()).days,
            renewal_link=f"https://bader.com/renew/{license.id}"
        )
        
        license.renewal_reminded = True
        db.commit()

# Renewal API
@router.post("/api/payment/renew/{license_id}")
async def renew_license(license_id: str, payment_card: PaymentCard):
    license = get_license(license_id)
    
    # Ödeme al
    payment = process_payment(license.plan, payment_card)
    
    if payment.success:
        # Süre uzat
        if license.expiry_date < date.today():
            # Süresi dolmuş: bugünden başlat
            license.start_date = date.today()
        else:
            # Aktif: mevcut bitiş tarihine ekle
            license.start_date = license.expiry_date
        
        license.expiry_date = license.start_date + timedelta(days=30)
        db.commit()
        
        return {'success': True, 'new_expiry': license.expiry_date}
```

### 6. Cihaz Limiti (Device Limit)

```sql
CREATE TABLE device_activations (
    id SERIAL PRIMARY KEY,
    license_id INTEGER REFERENCES licenses(id),
    hardware_id VARCHAR(50) UNIQUE,
    device_name VARCHAR(100),  -- "MacBook Pro - Ahmet"
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- Constraint: LOCAL plan max 1 device, HYBRID max 3 device
ALTER TABLE device_activations ADD CONSTRAINT check_device_limit
CHECK (
    (SELECT COUNT(*) FROM device_activations 
     WHERE license_id = device_activations.license_id 
     AND is_active = true) <= 3
);
```

```python
@router.post("/api/activate-device")
async def activate_device(
    license_key: str,
    hardware_id: str,
    device_name: str
):
    license = get_license_by_key(license_key)
    
    # Device limit kontrol
    active_devices = db.query(DeviceActivation).filter_by(
        license_id=license.id,
        is_active=True
    ).count()
    
    max_devices = 1 if license.plan == 'LOCAL' else 3
    
    if active_devices >= max_devices:
        # UI: "Cihaz limiti aşıldı. Bir cihazı deaktive edin."
        return {
            'error': 'DEVICE_LIMIT_EXCEEDED',
            'active_devices': get_active_devices(license.id)
        }
    
    # Yeni cihaz ekle
    device = DeviceActivation(
        license_id=license.id,
        hardware_id=hardware_id,
        device_name=device_name
    )
    db.add(device)
    db.commit()
    
    return {'success': True}
```

---

## 🎟️ Müşteri Yönetim Sistemi (CRM)

### 1. Lead Management (Potansiyel Müşteri)

```sql
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    email VARCHAR(200),
    phone VARCHAR(20),
    company_name VARCHAR(200),  -- Dernek adı
    source VARCHAR(50),  -- WEB, PHONE, REFERRAL
    status VARCHAR(20),  -- NEW, CONTACTED, DEMO_SCHEDULED, WON, LOST
    interested_plan VARCHAR(20),
    notes TEXT,
    assigned_to INTEGER REFERENCES users(id),  -- Sales rep
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_activities (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    activity_type VARCHAR(50),  -- CALL, EMAIL, MEETING, NOTE
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Demo Talepleri

```python
# Web sitesinden demo talebi
@router.post("/api/public/request-demo")
async def request_demo(request: DemoRequest):
    # Lead oluştur
    lead = Lead(
        name=request.name,
        email=request.email,
        phone=request.phone,
        company_name=request.organization,
        source='WEB',
        status='DEMO_SCHEDULED',
        interested_plan=request.plan
    )
    db.add(lead)
    db.commit()
    
    # Demo ortamı oluştur (Trial tenant)
    demo_tenant = create_tenant(
        name=f"DEMO - {request.organization}",
        is_demo=True
    )
    
    demo_license = create_license(
        tenant_id=demo_tenant.id,
        plan='HYBRID',  # Full features
        is_trial=True,
        trial_days=14
    )
    
    # Sample data ekle
    populate_demo_data(demo_tenant.id)
    
    # Email gönder
    send_demo_credentials(
        to=request.email,
        username=f"demo_{lead.id}",
        password=generate_temp_password(),
        url=f"https://demo.bader.com?tenant={demo_tenant.slug}"
    )
    
    return {'success': True, 'demo_url': f'https://demo.bader.com'}
```

### 3. Destek Ticket Sistemi

```sql
CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    user_id INTEGER REFERENCES users(id),
    subject VARCHAR(200),
    description TEXT,
    status VARCHAR(20),  -- OPEN, IN_PROGRESS, WAITING_CUSTOMER, RESOLVED, CLOSED
    priority VARCHAR(20),  -- LOW, MEDIUM, HIGH, URGENT
    category VARCHAR(50),  -- BUG, FEATURE_REQUEST, QUESTION, TECHNICAL
    assigned_to INTEGER REFERENCES users(id),  -- Support agent
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE ticket_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id),
    user_id INTEGER REFERENCES users(id),
    message TEXT,
    is_internal BOOLEAN DEFAULT false,  -- Dahili not
    attachments JSONB,  -- [{url, filename, size}]
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```tsx
// In-app destek butonu
export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button className="fixed bottom-4 right-4 bg-blue-600 p-4 rounded-full">
        💬 Yardım
      </button>
      
      {isOpen && (
        <SupportDialog>
          <form onSubmit={createTicket}>
            <input name="subject" placeholder="Konu" />
            <textarea name="description" placeholder="Açıklama" />
            <select name="category">
              <option value="BUG">Hata Bildirimi</option>
              <option value="QUESTION">Soru</option>
              <option value="FEATURE_REQUEST">Özellik İsteği</option>
            </select>
            <button>Gönder</button>
          </form>
        </SupportDialog>
      )}
    </>
  );
}
```

---

## 🔔 Bildirim Sistemi

### 1. Email Notifications

```python
from sendgrid import SendGridAPIClient
from jinja2 import Template

# Email templates
EMAIL_TEMPLATES = {
    'license_expiring': """
        Sayın {{ tenant_name }},
        
        Lisansınızın süresi {{ days_left }} gün içinde dolacaktır.
        
        Kesintisiz hizmet için lütfen yenileyin:
        {{ renewal_link }}
        
        İyi çalışmalar,
        BADER Ekibi
    """,
    
    'limit_warning': """
        Sayın {{ tenant_name }},
        
        {{ limit_type }} limitinizin %90'ına ulaştınız.
        Mevcut: {{ current }} / {{ max }}
        
        Upgrade yapmak için: {{ upgrade_link }}
    """,
    
    'welcome': """
        Hoş geldiniz {{ tenant_name }}!
        
        Lisans Key: {{ license_key }}
        İndirme: {{ download_link }}
        
        Kurulum videosu: {{ tutorial_link }}
    """
}

async def send_notification(
    type: str,
    to: str,
    context: dict
):
    template = Template(EMAIL_TEMPLATES[type])
    content = template.render(**context)
    
    sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
    sg.send({
        'to': to,
        'from': 'noreply@bader.com',
        'subject': get_subject(type),
        'html': content
    })
```

### 2. In-App Notifications

```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    user_id INTEGER REFERENCES users(id),  -- NULL = tüm kullanıcılar
    type VARCHAR(50),  -- INFO, WARNING, ERROR, SUCCESS
    title VARCHAR(200),
    message TEXT,
    action_url VARCHAR(500),  -- Tıklanınca nereye gitsin
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```tsx
// Notification bell
export function NotificationBell() {
  const { data: notifications } = useQuery('/api/notifications/unread');
  
  return (
    <Popover>
      <PopoverTrigger>
        <Bell className="w-6 h-6" />
        {notifications?.length > 0 && (
          <span className="badge">{notifications.length}</span>
        )}
      </PopoverTrigger>
      <PopoverContent>
        {notifications.map(notif => (
          <NotificationItem key={notif.id} {...notif} />
        ))}
      </PopoverContent>
    </Popover>
  );
}
```

### 3. Limit Warnings

```python
@celery.task
def check_usage_limits():
    licenses = db.query(License).filter_by(is_active=True).all()
    
    for license in licenses:
        # Kullanıcı sayısı kontrolü
        user_count = db.query(User).filter_by(
            tenant_id=license.tenant_id
        ).count()
        
        if user_count >= license.max_users * 0.9:
            create_notification(
                tenant_id=license.tenant_id,
                type='WARNING',
                title='Kullanıcı Limiti Dolmak Üzere',
                message=f'{user_count}/{license.max_users} kullanıcı'
            )
        
        # Kayıt sayısı kontrolü
        total_records = count_tenant_records(license.tenant_id)
        
        if total_records >= license.max_records * 0.9:
            create_notification(
                tenant_id=license.tenant_id,
                type='WARNING',
                title='Kayıt Limiti Dolmak Üzere',
                message=f'{total_records}/{license.max_records} kayıt',
                action_url='/upgrade'
            )
```

---

## 📊 Analytics ve Telemetri

### 1. Usage Tracking

```sql
CREATE TABLE usage_stats (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    date DATE,
    module VARCHAR(50),
    action VARCHAR(50),  -- VIEW, CREATE, UPDATE, DELETE, EXPORT
    count INTEGER DEFAULT 1,
    UNIQUE(tenant_id, date, module, action)
);

-- Örnekler:
-- tenant_123, 2026-01-08, uye_yonetimi, CREATE, 15
-- tenant_123, 2026-01-08, aidat_takip, VIEW, 245
```

```python
# Middleware: Her request'te log
@app.middleware("http")
async def track_usage(request: Request, call_next):
    response = await call_next(request)
    
    if request.method in ['POST', 'PUT', 'DELETE']:
        # Action çıkar
        module = extract_module(request.url.path)  # /api/uyeler → uye_yonetimi
        action = request.method  # POST → CREATE
        
        # Usage stat ekle
        increment_usage_stat(
            tenant_id=request.state.tenant_id,
            date=date.today(),
            module=module,
            action=action
        )
    
    return response
```

### 2. Feature Adoption

```python
# Analytics dashboard (Super Admin)
@router.get("/api/admin/analytics/feature-adoption")
async def get_feature_adoption():
    # Hangi modüller ne kadar kullanılıyor?
    stats = db.execute("""
        SELECT 
            module,
            COUNT(DISTINCT tenant_id) as active_tenants,
            SUM(count) as total_usage
        FROM usage_stats
        WHERE date >= NOW() - INTERVAL '30 days'
        GROUP BY module
        ORDER BY total_usage DESC
    """).fetchall()
    
    return {
        'most_used_modules': stats,
        'adoption_rate': calculate_adoption_rate(stats)
    }
```

### 3. Error Tracking (Sentry)

```python
import sentry_sdk

sentry_sdk.init(
    dsn="https://xxx@sentry.io/xxx",
    environment="production",
    traces_sample_rate=0.1
)

# Automatic error capture
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    sentry_sdk.capture_exception(exc)
    
    # User-friendly message
    return JSONResponse(
        status_code=500,
        content={'error': 'Bir hata oluştu. Destek ekibine bildirildi.'}
    )
```

---

## 🔧 Admin Panel (Super Admin)

### Dashboard

```tsx
// Super Admin Dashboard
export function AdminDashboard() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatsCard 
        title="Toplam Tenant" 
        value={tenants.length}
        trend="+5 bu ay"
      />
      <StatsCard 
        title="Aktif Lisans" 
        value={activeLicenses}
        trend={`${expiringCount} süresi dolacak`}
      />
      <StatsCard 
        title="Aylık Gelir" 
        value={`₺${monthlyRevenue}`}
        trend="+12% geçen aya göre"
      />
      <StatsCard 
        title="Destek Tickets" 
        value={openTickets}
        trend={`${urgentCount} acil`}
      />
      
      <ChartCard title="Yeni Kayıtlar" data={signupData} />
      <ChartCard title="Gelir Grafiği" data={revenueData} />
      <ChartCard title="Modül Kullanımı" data={moduleUsage} />
      <ChartCard title="Churn Rate" data={churnData} />
    </div>
  );
}
```

### Tenant Management

```tsx
export function TenantList() {
  return (
    <Table>
      <thead>
        <tr>
          <th>Tenant</th>
          <th>Plan</th>
          <th>Kullanıcılar</th>
          <th>Kayıtlar</th>
          <th>Lisans Bitiş</th>
          <th>Durum</th>
          <th>İşlemler</th>
        </tr>
      </thead>
      <tbody>
        {tenants.map(t => (
          <tr>
            <td>{t.name}</td>
            <td><Badge>{t.license.plan}</Badge></td>
            <td>{t.user_count} / {t.license.max_users}</td>
            <td>{t.record_count} / {t.license.max_records}</td>
            <td>{formatDate(t.license.expiry_date)}</td>
            <td>
              <StatusBadge status={t.license.status} />
            </td>
            <td>
              <DropdownMenu>
                <DropdownMenuItem onClick={() => viewTenant(t)}>
                  Görüntüle
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => extendLicense(t)}>
                  Süre Uzat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => suspendTenant(t)}>
                  Askıya Al
                </DropdownMenuItem>
              </DropdownMenu>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
```

---

## 🎨 White-Label Özelleştirme

```sql
CREATE TABLE tenant_customizations (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
    logo_url VARCHAR(500),
    primary_color VARCHAR(7),  -- #FF5733
    secondary_color VARCHAR(7),
    custom_domain VARCHAR(200),  -- dernegim.bader.com
    email_from_name VARCHAR(100),
    email_from_address VARCHAR(200),
    custom_css TEXT,
    settings JSONB
);
```

```tsx
// Theme provider
export function ThemeProvider({ children }) {
  const { data: customization } = useQuery('/api/tenant/customization');
  
  const theme = {
    colors: {
      primary: customization?.primary_color || '#3B82F6',
      secondary: customization?.secondary_color || '#10B981'
    },
    logo: customization?.logo_url || '/default-logo.png'
  };
  
  return (
    <ThemeContext.Provider value={theme}>
      <style>{customization?.custom_css}</style>
      {children}
    </ThemeContext.Provider>
  );
}
```

---

## 🔄 Auto-Update Mekanizması

### Desktop App Updates (Tauri)

```rust
// src-tauri/src/main.rs
use tauri::updater::UpdaterBuilder;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Check for updates on startup
            let handle = app.handle();
            tauri::async_runtime::spawn(async move {
                check_for_updates(handle).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn check_for_updates(app: AppHandle) {
    let update_resp = app.updater().check().await;
    
    if let Ok(Some(update)) = update_resp {
        // Yeni versiyon var
        update.download_and_install().await.unwrap();
        
        // Kullanıcıya bildir
        app.emit_all("update-downloaded", {
            "version": update.version
        });
    }
}
```

```tsx
// React: Update notification
useEffect(() => {
  listen('update-downloaded', (event) => {
    toast({
      title: 'Güncelleme Hazır',
      description: `Versiyon ${event.payload.version} indirildi. Yeniden başlatın.`,
      action: (
        <Button onClick={() => relaunch()}>
          Yeniden Başlat
        </Button>
      )
    });
  });
}, []);
```

---

## ✅ Ek Tamamlanma Kriterleri

### Lisans & Satış
- [ ] Lisans key generator
- [ ] Offline activation system
- [ ] Trial period (14 gün)
- [ ] Ödeme entegrasyonu (iyzico)
- [ ] Fatura otomasyonu
- [ ] Renewal reminders
- [ ] Device limit enforcement

### CRM
- [ ] Lead management
- [ ] Demo ortamı otomasyonu
- [ ] Destek ticket sistemi
- [ ] In-app chat

### Bildirimler
- [ ] Email notifications (SendGrid)
- [ ] In-app notifications
- [ ] Limit warnings
- [ ] License expiry reminders

### Analytics
- [ ] Usage tracking
- [ ] Feature adoption metrics
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring

### Admin Panel
- [ ] Super admin dashboard
- [ ] Tenant management
- [ ] License management
- [ ] Analytics görünüm
- [ ] System health monitoring

### Ekstra
- [ ] White-label customization
- [ ] Auto-update (desktop)
- [ ] Knowledge base
- [ ] Video tutorials
- [ ] KVKK compliance

---

**Toplam Süre:** 15 hafta (~4 ay)

---

## �📚 Kaynaklar

### Dokümantasyon
- [FastAPI](https://fastapi.tiangolo.com/)
- [Tauri](https://tauri.app/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Next.js](https://nextjs.org/)
- [PostgreSQL](https://www.postgresql.org/)

### GitHub Repository
```
https://github.com/org/bader-v3
├── backend/          # FastAPI
├── desktop/          # Tauri
├── web/              # Next.js
└── docs/             # Dokümantasyon
```

---

## 🔐 Lisans-Modül Entegrasyonu ve Personel Sistemi

### 📊 Modül-Lisans Matrisi

#### Lisans Planlarına Göre Modül Erişimi

| Modül | LOCAL | ONLINE | HYBRID | Açıklama |
|-------|-------|--------|--------|----------|
| **👥 Üye Yönetimi** | ✅ | ✅ | ✅ | Tüm planlarda var |
| **💰 Aidat Takip** | ✅ | ✅ | ✅ | Tüm planlarda var |
| **💵 Gelir/Gider** | ✅ | ✅ | ✅ | Tüm planlarda var |
| **🏦 Kasa Yönetimi** | ✅ (Max 2) | ✅ (Max 10) | ✅ (Sınırsız) | Kasa sayısı sınırlı |
| **📄 Dekont/Fatura** | ✅ | ✅ | ✅ | Tüm planlarda var |
| **📊 Raporlar** | ✅ (PDF) | ✅ (PDF+Excel) | ✅ (Hepsi) | Export sınırlaması |
| **👨‍👩‍👧 Aile Modülü** | ❌ | ✅ | ✅ | LOCAL'da yok |
| **🏘️ Köy Modülü** | ❌ | ❌ | ✅ | Sadece HYBRID |
| **📸 OCR (Dekont)** | ❌ | ❌ | ✅ | Sadece HYBRID |
| **📱 Mobil Erişim** | ❌ | ✅ | ✅ | LOCAL offline |
| **🌐 Web Erişim** | ❌ | ✅ | ✅ | LOCAL offline |
| **🔄 Senkronizasyon** | ❌ | ❌ | ✅ | Sadece HYBRID |
| **📧 Email/SMS** | ❌ | ✅ | ✅ | API access |
| **🔗 API Access** | ❌ | ❌ | ✅ | External API |
| **📋 Toplantı Yönetimi** | ✅ | ✅ | ✅ | Tüm planlarda |
| **👔 Personel Yönetimi** | ❌ (1 user) | ✅ (5 user) | ✅ (10 user) | Kullanıcı limiti |

---

### 👥 Personel/Kullanıcı Yönetimi Sistemi

#### 1. Kullanıcı Modeli

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    
    -- Auth bilgileri
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(200),
    password_hash VARCHAR(255),
    
    -- Kişisel bilgiler
    ad_soyad VARCHAR(200),
    telefon VARCHAR(20),
    profil_foto VARCHAR(500),
    
    -- Roller ve yetkiler
    role VARCHAR(50),  -- ADMIN, MUHASEBECI, SEKRETER, GORUNTULEYICI
    permissions JSONB,  -- Custom permissions
    
    -- Durum
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,  -- System admin only
    
    -- Çalışma saatleri
    baslangic_tarihi DATE,
    bitis_tarihi DATE,
    
    -- Sync & Audit
    sync_id UUID DEFAULT gen_random_uuid() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER,
    updated_by INTEGER,
    
    UNIQUE(tenant_id, username),
    CONSTRAINT check_user_limit CHECK (
        (SELECT COUNT(*) FROM users WHERE tenant_id = users.tenant_id AND is_active = true) <= 
        (SELECT max_users FROM licenses WHERE tenant_id = users.tenant_id)
    )
);

-- Indexes
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_active ON users(tenant_id, is_active);
```

#### 2. Rol Sistemi (RBAC)

**Varsayılan Roller:**

| Rol | Açıklama | Modül Erişimi |
|-----|----------|---------------|
| **ADMIN** | Tam yetkili yönetici | Tüm modüllere tam erişim |
| **MUHASEBECI** | Mali işlemler sorumlusu | Üye, Aidat, Gelir, Gider, Kasa, Raporlar (düzenleyebilir) |
| **SEKRETER** | Genel işlemler | Üye, Aidat, Toplantı (düzenleyebilir), Raporlar (görüntüleme) |
| **GORUNTULEYICI** | Sadece okuma | Tüm modüller (sadece görüntüleme) |
| **CUSTOM** | Özel yetkilendirme | İzinler manuel seçilir |

**Permission Matrisi:**

```typescript
interface Permissions {
  // Üye Yönetimi
  "uye:read": boolean;
  "uye:create": boolean;
  "uye:update": boolean;
  "uye:delete": boolean;
  "uye:export": boolean;
  
  // Aidat
  "aidat:read": boolean;
  "aidat:create": boolean;
  "aidat:update": boolean;
  "aidat:delete": boolean;
  "aidat:tahakkuk": boolean;  // Toplu tahakkuk
  
  // Mali İşlemler
  "gelir:read": boolean;
  "gelir:create": boolean;
  "gelir:update": boolean;
  "gelir:delete": boolean;
  
  "gider:read": boolean;
  "gider:create": boolean;
  "gider:update": boolean;
  "gider:delete": boolean;
  
  "kasa:read": boolean;
  "kasa:create": boolean;
  "kasa:update": boolean;
  "kasa:virman": boolean;  // Virman işlemi
  
  // Raporlar
  "rapor:read": boolean;
  "rapor:export_pdf": boolean;
  "rapor:export_excel": boolean;
  
  // Köy Modülü
  "koy:read": boolean;
  "koy:create": boolean;
  "koy:update": boolean;
  
  // Sistem
  "user:read": boolean;
  "user:create": boolean;
  "user:update": boolean;
  "user:delete": boolean;
  
  "ayarlar:read": boolean;
  "ayarlar:update": boolean;
}
```

#### 3. Permission Decorator

```python
from functools import wraps
from fastapi import HTTPException

def require_permission(permission: str):
    """
    Endpoint'leri permission ile koru
    @require_permission("uye:create")
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User, **kwargs):
            # Admin her şeyi yapabilir
            if current_user.role == "ADMIN":
                return await func(*args, current_user=current_user, **kwargs)
            
            # Permission kontrolü
            user_permissions = current_user.permissions or {}
            if not user_permissions.get(permission, False):
                raise HTTPException(
                    403,
                    f"Bu işlem için '{permission}' yetkisi gerekli"
                )
            
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator


# Kullanım
@router.post("/api/uyeler")
@require_permission("uye:create")
async def create_uye(uye_data: UyeCreate, current_user: User):
    # ...
    pass
```

#### 4. UI'da Role-Based Menü

```tsx
// React - Sidebar component
export function Sidebar() {
  const { user, license } = useUser();
  
  const menuItems = [
    {
      label: 'Dashboard',
      icon: Home,
      path: '/',
      permission: null  // Herkes görebilir
    },
    {
      label: 'Üye Yönetimi',
      icon: Users,
      path: '/uyeler',
      permission: 'uye:read'
    },
    {
      label: 'Köy Modülü',
      icon: Mountain,
      path: '/koy',
      permission: 'koy:read',
      requiresFeature: 'koy_modulu',  // License check
      badge: 'HYBRID'
    },
    {
      label: 'Personel',
      icon: UserCog,
      path: '/personel',
      permission: 'user:read',
      adminOnly: true
    }
  ];
  
  // Menü filtering
  const visibleMenuItems = menuItems.filter(item => {
    if (item.adminOnly && user.role !== 'ADMIN') return false;
    if (item.permission && !hasPermission(user, item.permission)) return false;
    if (item.requiresFeature && !license.features.modules[item.requiresFeature]) return false;
    return true;
  });
  
  return (
    <aside className="sidebar">
      {visibleMenuItems.map(item => <SidebarItem key={item.path} {...item} />)}
    </aside>
  );
}
```

#### 5. Feature Gate Component

```tsx
// Modül erişim kontrolü
export function FeatureGate({ feature, permission, children, fallback }) {
  const { hasFeature } = useFeature(feature);
  const { hasPermission: hasPerm } = usePermission(permission);
  
  // Feature check (license)
  if (feature && !hasFeature) {
    return fallback || (
      <UpgradePrompt 
        title="Bu Özellik Mevcut Değil"
        description={`${feature} modülü için HYBRID plan gerekli`}
      />
    );
  }
  
  // Permission check (user role)
  if (permission && !hasPerm) {
    return fallback || (
      <Alert>Bu işlem için yetkiniz yok.</Alert>
    );
  }
  
  return <>{children}</>;
}

// Kullanım
<FeatureGate feature="koy_modulu" permission="koy:read">
  <KoyDashboard />
</FeatureGate>
```

---

### 🔄 Senkronizasyon ve Modüller

#### Modül Bazında Sync Kontrolü

```typescript
// Desktop (Tauri)
class SyncEngine {
  private syncableModules = {
    uyeler: true,
    aidat_takip: true,
    gelirler: true,
    giderler: true,
    kasalar: true,
    virmanlar: true,
    koy_gelirler: false,  // Sadece HYBRID'de sync
    koy_giderler: false   // Sadece HYBRID'de sync
  };
  
  async sync() {
    const license = await this.getLicense();
    
    // HYBRID modda tüm modüller sync edilir
    if (license.plan === 'HYBRID') {
      this.syncableModules.koy_gelirler = true;
      this.syncableModules.koy_giderler = true;
    }
    
    // Her modül için sync
    for (const [module, enabled] of Object.entries(this.syncableModules)) {
      if (enabled) {
        await this.syncModule(module);
      }
    }
  }
}
```

#### Offline Modül Davranışı

| Modül | LOCAL (Offline) | ONLINE (Always Online) | HYBRID (Sync) |
|-------|-----------------|------------------------|---------------|
| Üye Yönetimi | ✅ SQLite | ✅ PostgreSQL | ✅ SQLite + Sync |
| Aidat Takip | ✅ SQLite | ✅ PostgreSQL | ✅ SQLite + Sync |
| Gelir/Gider | ✅ SQLite | ✅ PostgreSQL | ✅ SQLite + Sync |
| Kasa | ✅ SQLite | ✅ PostgreSQL | ✅ SQLite + Sync |
| Köy Modülü | ❌ Yok | ❌ Yok | ✅ SQLite + Sync |
| Raporlar | ✅ PDF Export | ✅ PDF+Excel | ✅ Hepsi |
| Email/SMS | ❌ | ✅ API | ✅ API |

---

### ✅ Entegrasyon Özeti

**Lisans → Modül Kontrolü:**
```
LICENSE (JSONB features)
    ↓
Feature Gate Middleware
    ↓
Module Availability Check
    ↓
UI Menu Filtering
```

**User → Permission Kontrolü:**
```
USER (role + permissions JSONB)
    ↓
Permission Decorator (@require_permission)
    ↓
Endpoint Access Control
    ↓
UI Button/Action Visibility
```

**Sync → Modül Davranışı:**
```
LICENSE (plan: LOCAL/ONLINE/HYBRID)
    ↓
Sync Engine Activation
    ↓
Module-specific Sync Rules
    ↓
SQLite ↔ PostgreSQL
```

---

**Son Güncelleme:** 8 Ocak 2026  
**Hazırlayan:** AI Assistant  
**Durum:** 📝 Detaylı Planlama Tamamlandı - Kod Yazmaya Hazır 🚀
