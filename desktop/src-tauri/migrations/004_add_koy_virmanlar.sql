-- Migration: 004_add_koy_virmanlar
-- Description: Köy kasaları arası virman işlemleri için tablo ekleme

CREATE TABLE IF NOT EXISTS koy_virmanlar (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    kaynak_kasa_id TEXT NOT NULL,
    hedef_kasa_id TEXT NOT NULL,
    tarih TEXT NOT NULL,
    tutar REAL NOT NULL,
    aciklama TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_koy_virmanlar_tenant ON koy_virmanlar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_koy_virmanlar_tarih ON koy_virmanlar(tarih);
CREATE INDEX IF NOT EXISTS idx_koy_virmanlar_kaynak ON koy_virmanlar(kaynak_kasa_id);
CREATE INDEX IF NOT EXISTS idx_koy_virmanlar_hedef ON koy_virmanlar(hedef_kasa_id);
