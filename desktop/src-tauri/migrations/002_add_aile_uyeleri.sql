-- Migration 002: Aile Üyeleri Tablosu
-- Tarih: 2026-01-09
-- Amaç: Üye aile üyeleri yönetimi için tablo oluştur

-- ============================================================================
-- 1. uye_aile_uyeleri tablosu oluştur
-- ============================================================================

CREATE TABLE IF NOT EXISTS uye_aile_uyeleri (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    uye_id TEXT NOT NULL,
    
    -- Aile Üyesi Bilgileri
    yakinlik TEXT,
    ad_soyad TEXT NOT NULL,
    dogum_tarihi TEXT,
    telefon TEXT,
    meslek TEXT,
    egitim_durumu TEXT,
    notlar TEXT,
    
    -- Sync & Audit
    sync_id TEXT UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT,
    updated_by TEXT
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_aile_tenant ON uye_aile_uyeleri(tenant_id);
CREATE INDEX IF NOT EXISTS idx_aile_uye ON uye_aile_uyeleri(uye_id);
CREATE INDEX IF NOT EXISTS idx_aile_sync ON uye_aile_uyeleri(sync_id);
CREATE INDEX IF NOT EXISTS idx_aile_deleted ON uye_aile_uyeleri(is_deleted);
