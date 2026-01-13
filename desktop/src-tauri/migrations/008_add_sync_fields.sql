-- Migration: Add Sync Fields to All Tables
-- Date: 2026-01-11
-- Description: sync_id, version, is_deleted alanlarını tüm tablolara ekle
-- Note: Bu migration sadece schema.sql'den oluşturulan database'lere uygulanır

-- SQLite'da ALTER TABLE IF EXISTS yok, bu yüzden column varsa skip edilecek
-- Her tablo için ayrı ayrı kontrol yapıyoruz

-- 1. UYELER (schema.sql'de var)
ALTER TABLE uyeler ADD COLUMN sync_id TEXT DEFAULT (lower(hex(randomblob(16))));
ALTER TABLE uyeler ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE uyeler ADD COLUMN is_deleted INTEGER DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_uyeler_sync_id ON uyeler(sync_id);

-- 2. AIDAT_TAKIP (schema.sql'de var)
ALTER TABLE aidat_takip ADD COLUMN sync_id TEXT DEFAULT (lower(hex(randomblob(16))));
ALTER TABLE aidat_takip ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE aidat_takip ADD COLUMN is_deleted INTEGER DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_aidat_sync_id ON aidat_takip(sync_id);

-- 3. GELIRLER (schema.sql'de var)
ALTER TABLE gelirler ADD COLUMN sync_id TEXT DEFAULT (lower(hex(randomblob(16))));
ALTER TABLE gelirler ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE gelirler ADD COLUMN is_deleted INTEGER DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_gelirler_sync_id ON gelirler(sync_id);

-- 4. GIDERLER (schema.sql'de var)
ALTER TABLE giderler ADD COLUMN sync_id TEXT DEFAULT (lower(hex(randomblob(16))));
ALTER TABLE giderler ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE giderler ADD COLUMN is_deleted INTEGER DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_giderler_sync_id ON giderler(sync_id);

-- 5. KASALAR (schema.sql'de var)
ALTER TABLE kasalar ADD COLUMN sync_id TEXT DEFAULT (lower(hex(randomblob(16))));
ALTER TABLE kasalar ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE kasalar ADD COLUMN is_deleted INTEGER DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_kasalar_sync_id ON kasalar(sync_id);

-- 6. VIRMANLAR (schema.sql'de var - migration 004'te değil!)
ALTER TABLE virmanlar ADD COLUMN sync_id TEXT DEFAULT (lower(hex(randomblob(16))));
ALTER TABLE virmanlar ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE virmanlar ADD COLUMN is_deleted INTEGER DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_virmanlar_sync_id ON virmanlar(sync_id);

CREATE TABLE IF NOT EXISTS sync_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    sync_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    data TEXT,
    synced INTEGER DEFAULT 0,
    synced_at TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_tenant_pending ON sync_changes(tenant_id, synced);
