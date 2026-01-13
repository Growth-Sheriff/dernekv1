-- Migration 003: Gelir/Gider Türleri Tabloları
-- Tarih: 2026-01-09
-- Amaç: Dinamik kategori sistemi için gelir_turleri ve gider_turleri tablolarını oluştur

CREATE TABLE IF NOT EXISTS gelir_turleri (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    ad TEXT NOT NULL,
    kod TEXT,
    aciklama TEXT,
    varsayilan_makbuz_prefix TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gelir_turleri_tenant ON gelir_turleri(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gelir_turleri_active ON gelir_turleri(is_active);

CREATE TABLE IF NOT EXISTS gider_turleri (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    ad TEXT NOT NULL,
    kod TEXT,
    aciklama TEXT,
    varsayilan_fatura_prefix TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gider_turleri_tenant ON gider_turleri(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gider_turleri_active ON gider_turleri(is_active);

INSERT OR IGNORE INTO gelir_turleri (id, tenant_id, ad, kod, varsayilan_makbuz_prefix, is_active, created_at, updated_at)
VALUES 
    ('gelir_aidat', 'default', 'Aidat', 'AIDAT', 'MKB-AIDAT-', 1, datetime('now'), datetime('now')),
    ('gelir_bagis', 'default', 'Bağış', 'BAGIS', 'MKB-BAGIS-', 1, datetime('now'), datetime('now')),
    ('gelir_etkinlik', 'default', 'Etkinlik Geliri', 'ETK', 'MKB-ETK-', 1, datetime('now'), datetime('now')),
    ('gelir_diger', 'default', 'Diğer Gelirler', 'DIGER', 'MKB-', 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO gider_turleri (id, tenant_id, ad, kod, varsayilan_fatura_prefix, is_active, created_at, updated_at)
VALUES 
    ('gider_kira', 'default', 'Kira', 'KIRA', 'FTR-KIRA-', 1, datetime('now'), datetime('now')),
    ('gider_fatura', 'default', 'Faturalar', 'FATURA', 'FTR-', 1, datetime('now'), datetime('now')),
    ('gider_personel', 'default', 'Personel Giderleri', 'PERS', 'FTR-PERS-', 1, datetime('now'), datetime('now')),
    ('gider_etkinlik', 'default', 'Etkinlik Gideri', 'ETK', 'FTR-ETK-', 1, datetime('now'), datetime('now')),
    ('gider_diger', 'default', 'Diğer Giderler', 'DIGER', 'FTR-', 1, datetime('now'), datetime('now'));
