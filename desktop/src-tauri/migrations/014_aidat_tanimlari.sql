-- Migration: 014_aidat_tanimlari
-- Yıllık Aidat Tanımları Tablosu

CREATE TABLE IF NOT EXISTS aidat_tanimlari (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    yil INTEGER NOT NULL,
    aidat_tipi TEXT DEFAULT 'Yıllık',
    tutar REAL NOT NULL DEFAULT 0,
    gecikme_faiz_orani REAL DEFAULT 0,
    son_odeme_gunu INTEGER DEFAULT 31,
    aciklama TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, yil)
);

-- Aidat takip tablosuna kasa_id ekleme (eğer yoksa)
-- SQLite ALTER TABLE ile kontrol yapılamadığından try-catch benzeri yaklaşım
-- Bu sütun zaten varsa hata verecek ama devam edecek

-- Index
CREATE INDEX IF NOT EXISTS idx_aidat_tanimlari_yil ON aidat_tanimlari(tenant_id, yil);
