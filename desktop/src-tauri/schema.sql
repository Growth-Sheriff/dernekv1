-- BADER Desktop - SQLite Database Schema
-- Version: 1.0
-- Date: 2026-01-08

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Tenants (Dernekler)
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Licenses: Migration 007'de oluşturuluyor - çakışma önlenmesi için buradan kaldırıldı
-- Bkz: migrations/007_create_licenses_table.sql

-- Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username TEXT,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT 1,
    is_superuser BOOLEAN DEFAULT 0,
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- MEMBER MANAGEMENT
-- ============================================================================

-- Üyeler
CREATE TABLE IF NOT EXISTS uyeler (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    uye_no TEXT NOT NULL,
    tc_no TEXT NOT NULL,
    ad TEXT NOT NULL,
    soyad TEXT NOT NULL,
    ad_soyad TEXT NOT NULL,
    telefon TEXT,
    email TEXT,
    adres TEXT,
    uyelik_tipi TEXT,
    giris_tarihi TEXT NOT NULL,
    cikis_tarihi TEXT,
    durum TEXT NOT NULL DEFAULT 'Aktif',
    notlar TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, uye_no)
);

-- ============================================================================
-- FINANCIAL MANAGEMENT
-- ============================================================================

-- Aidat Takip
CREATE TABLE IF NOT EXISTS aidat_takip (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    uye_id TEXT NOT NULL REFERENCES uyeler(id) ON DELETE CASCADE,
    yil INTEGER NOT NULL,
    ay INTEGER NOT NULL,
    tutar REAL NOT NULL,
    odenen REAL DEFAULT 0.0,
    kalan REAL,
    odeme_tarihi TEXT,
    durum TEXT DEFAULT 'Bekliyor',
    gecikme_gun INTEGER,
    gecikme_faiz REAL,
    notlar TEXT,
    gelir_id TEXT,
    aktarim_durumu TEXT DEFAULT 'Bekliyor',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, uye_id, yil, ay)
);

-- Kasalar
CREATE TABLE IF NOT EXISTS kasalar (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kasa_adi TEXT NOT NULL,
    bakiye REAL DEFAULT 0.0,
    para_birimi TEXT DEFAULT 'TRY',
    devir_bakiye REAL DEFAULT 0.0,
    toplam_gelir REAL DEFAULT 0.0,
    toplam_gider REAL DEFAULT 0.0,
    virman_giris REAL DEFAULT 0.0,
    virman_cikis REAL DEFAULT 0.0,
    fiziksel_bakiye REAL DEFAULT 0.0,
    tahakkuk_tutari REAL DEFAULT 0.0,
    serbest_bakiye REAL DEFAULT 0.0,
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, kasa_adi)
);

-- Gelir Türleri (Master Data)
CREATE TABLE IF NOT EXISTS gelir_turleri (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ad TEXT NOT NULL,
    kod TEXT,
    aciklama TEXT,
    varsayilan_makbuz_prefix TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, ad)
);

-- Gelirler
CREATE TABLE IF NOT EXISTS gelirler (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kasa_id TEXT NOT NULL REFERENCES kasalar(id) ON DELETE RESTRICT,
    gelir_turu TEXT,
    gelir_turu_id TEXT REFERENCES gelir_turleri(id) ON DELETE SET NULL,
    tarih TEXT NOT NULL,
    tutar REAL NOT NULL,
    aciklama TEXT,
    makbuz_no TEXT,
    aidat_id TEXT,
    uye_id TEXT,
    ait_oldugu_yil INTEGER,
    notlar TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Gider Türleri (Master Data)
CREATE TABLE IF NOT EXISTS gider_turleri (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ad TEXT NOT NULL,
    kod TEXT,
    aciklama TEXT,
    varsayilan_fatura_prefix TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, ad)
);

-- Giderler
CREATE TABLE IF NOT EXISTS giderler (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kasa_id TEXT NOT NULL REFERENCES kasalar(id) ON DELETE RESTRICT,
    gider_turu TEXT,
    gider_turu_id TEXT REFERENCES gider_turleri(id) ON DELETE SET NULL,
    tarih TEXT NOT NULL,
    tutar REAL NOT NULL,
    aciklama TEXT,
    fatura_no TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Virmanlar (Kasalar arası transfer)
CREATE TABLE IF NOT EXISTS virmanlar (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kaynak_kasa_id TEXT NOT NULL REFERENCES kasalar(id) ON DELETE RESTRICT,
    hedef_kasa_id TEXT NOT NULL REFERENCES kasalar(id) ON DELETE RESTRICT,
    tarih TEXT NOT NULL,
    tutar REAL NOT NULL,
    aciklama TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    CHECK (kaynak_kasa_id != hedef_kasa_id)
);

-- Bütçe tablosu
CREATE TABLE IF NOT EXISTS butce (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    yil INTEGER NOT NULL,
    kategori TEXT NOT NULL,
    alt_kategori TEXT,
    donem TEXT,
    planlanan_gelir REAL DEFAULT 0.0,
    planlanan_gider REAL DEFAULT 0.0,
    gerceklesen_gelir REAL DEFAULT 0.0,
    gerceklesen_gider REAL DEFAULT 0.0,
    notlar TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, yil, kategori)
);

-- ============================================================================
-- SYNC SYSTEM
-- ============================================================================

-- Sync Changes (Değişiklik takibi)
CREATE TABLE IF NOT EXISTS sync_changes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    data TEXT NOT NULL,
    synced BOOLEAN DEFAULT 0,
    sync_version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_licen_turleri_tenant ON gelir_turleri(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gelirler_tenant ON gelirler(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gelirler_kasa ON gelirler(kasa_id);
CREATE INDEX IF NOT EXISTS idx_gelirler_tarih ON gelirler(tarih);
CREATE INDEX IF NOT EXISTS idx_gelir_turleri_tenant ON gelir_turleri(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gelirler_tenant ON gelirler(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gelirler_kasa ON gelirler(kasa_id);
CREATE INDEX IF NOT EXISTS idx_gelirler_tarih ON gelirler(tarih);
CREATE INDEX IF NOT EXISTS idx_gelirler_turu ON gelirler(gelir_turu_id);

CREATE INDEX IF NOT EXISTS idx_gider_turleri_tenant ON gider_turleri(tenant_id);
CREATE INDEX IF NOT EXISTS idx_giderler_tenant ON giderler(tenant_id);
CREATE INDEX IF NOT EXISTS idx_giderler_kasa ON giderler(kasa_id);
CREATE INDEX IF NOT EXISTS idx_giderler_tarih ON giderler(tarih);
CREATE INDEX IF NOT EXISTS idx_giderler_turu ON giderler(gider_turu_id);

CREATE INDEX IF NOT EXISTS idx_virmanlar_tenant ON virmanlar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_virmanlar_kaynak ON virmanlar(kaynak_kasa_id);
CREATE INDEX IF NOT EXISTS idx_virmanlar_hedef ON virmanlar(hedef_kasa_id);
CREATE INDEX IF NOT EXISTS idx_virmanlar_tarih ON virmanlar(tarih);

CREATE INDEX IF NOT EXISTS idx_aidat_tenant ON aidat_takip(tenant_id);
CREATE INDEX IF NOT EXISTS idx_aidat_uye ON aidat_takip(uye_id);
CREATE INDEX IF NOT EXISTS idx_aidat_yil ON aidat_takip(yil);

CREATE INDEX IF NOT EXISTS idx_kasalar_tenant ON kasalar(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sync_tenant ON sync_changes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_table ON sync_changes(table_name);

-- ============================================================================
-- Schema created successfully!
-- No demo data - clean database for production use
-- ============================================================================
