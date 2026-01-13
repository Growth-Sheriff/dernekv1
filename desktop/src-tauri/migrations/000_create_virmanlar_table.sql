-- Migration: Create Virmanlar Table
-- Date: 2026-01-11
-- Description: Kasa virmanları için ana tablo (schema.sql'de var ama migration'da eksikti)

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

CREATE INDEX IF NOT EXISTS idx_virmanlar_tenant ON virmanlar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_virmanlar_kaynak ON virmanlar(kaynak_kasa_id);
CREATE INDEX IF NOT EXISTS idx_virmanlar_hedef ON virmanlar(hedef_kasa_id);
CREATE INDEX IF NOT EXISTS idx_virmanlar_tarih ON virmanlar(tarih);
