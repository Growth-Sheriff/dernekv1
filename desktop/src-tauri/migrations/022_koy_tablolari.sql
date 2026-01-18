-- Migration: Köy Mali Yönetim Tabloları
-- Version: 022
-- Date: 2026-01-18

-- ============================================================================
-- KÖY KASALARI
-- ============================================================================
CREATE TABLE IF NOT EXISTS koy_kasalar (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kasa_adi TEXT NOT NULL,
    para_birimi TEXT DEFAULT 'TRY',
    bakiye REAL DEFAULT 0.0,
    devir_bakiye REAL DEFAULT 0.0,
    toplam_gelir REAL DEFAULT 0.0,
    toplam_gider REAL DEFAULT 0.0,
    aciklama TEXT,
    is_active INTEGER DEFAULT 1,
    sync_id TEXT,
    version INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, kasa_adi)
);

CREATE INDEX IF NOT EXISTS idx_koy_kasalar_tenant ON koy_kasalar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_koy_kasalar_active ON koy_kasalar(tenant_id, is_active);

-- ============================================================================
-- KÖY GELİRLERİ
-- ============================================================================
CREATE TABLE IF NOT EXISTS koy_gelirler (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kasa_id TEXT NOT NULL REFERENCES koy_kasalar(id) ON DELETE RESTRICT,
    gelir_turu TEXT NOT NULL,
    tarih TEXT NOT NULL,
    tutar REAL NOT NULL,
    aciklama TEXT,
    makbuz_no TEXT,
    belge_id TEXT,
    is_active INTEGER DEFAULT 1,
    sync_id TEXT,
    version INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_koy_gelirler_tenant ON koy_gelirler(tenant_id);
CREATE INDEX IF NOT EXISTS idx_koy_gelirler_kasa ON koy_gelirler(kasa_id);
CREATE INDEX IF NOT EXISTS idx_koy_gelirler_tarih ON koy_gelirler(tenant_id, tarih);

-- ============================================================================
-- KÖY GİDERLERİ
-- ============================================================================
CREATE TABLE IF NOT EXISTS koy_giderler (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kasa_id TEXT NOT NULL REFERENCES koy_kasalar(id) ON DELETE RESTRICT,
    gider_turu TEXT NOT NULL,
    tarih TEXT NOT NULL,
    tutar REAL NOT NULL,
    aciklama TEXT,
    fatura_no TEXT,
    belge_id TEXT,
    is_active INTEGER DEFAULT 1,
    sync_id TEXT,
    version INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_koy_giderler_tenant ON koy_giderler(tenant_id);
CREATE INDEX IF NOT EXISTS idx_koy_giderler_kasa ON koy_giderler(kasa_id);
CREATE INDEX IF NOT EXISTS idx_koy_giderler_tarih ON koy_giderler(tenant_id, tarih);

-- ============================================================================
-- KÖY VİRMANLARI
-- ============================================================================
CREATE TABLE IF NOT EXISTS koy_virmanlar (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kaynak_kasa_id TEXT NOT NULL REFERENCES koy_kasalar(id) ON DELETE RESTRICT,
    hedef_kasa_id TEXT NOT NULL REFERENCES koy_kasalar(id) ON DELETE RESTRICT,
    tarih TEXT NOT NULL,
    tutar REAL NOT NULL,
    aciklama TEXT,
    is_active INTEGER DEFAULT 1,
    sync_id TEXT,
    version INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    CHECK (kaynak_kasa_id != hedef_kasa_id)
);

CREATE INDEX IF NOT EXISTS idx_koy_virmanlar_tenant ON koy_virmanlar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_koy_virmanlar_tarih ON koy_virmanlar(tenant_id, tarih);
