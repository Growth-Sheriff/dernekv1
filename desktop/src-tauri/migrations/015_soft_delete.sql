-- Migration: 015_soft_delete
-- Tüm ana tablolara soft delete alanları ekleme

-- Uyeler tablosuna soft delete alanları
ALTER TABLE uyeler ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE uyeler ADD COLUMN pasife_alinma_tarihi TEXT;
ALTER TABLE uyeler ADD COLUMN pasife_alma_nedeni TEXT;

-- Gelirler tablosuna soft delete alanları
ALTER TABLE gelirler ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE gelirler ADD COLUMN iptal_tarihi TEXT;
ALTER TABLE gelirler ADD COLUMN iptal_nedeni TEXT;

-- Giderler tablosuna soft delete alanları
ALTER TABLE giderler ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE giderler ADD COLUMN iptal_tarihi TEXT;
ALTER TABLE giderler ADD COLUMN iptal_nedeni TEXT;

-- Aidat takip tablosuna soft delete alanları
ALTER TABLE aidat_takip ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE aidat_takip ADD COLUMN iptal_nedeni TEXT;

-- Aidat takip tablosuna kasa_id ekleme
ALTER TABLE aidat_takip ADD COLUMN kasa_id TEXT;

-- Virmanlar tablosuna soft delete
ALTER TABLE virmanlar ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE virmanlar ADD COLUMN iptal_nedeni TEXT;

-- Indexler
CREATE INDEX IF NOT EXISTS idx_uyeler_active ON uyeler(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_gelirler_active ON gelirler(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_giderler_active ON giderler(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_aidat_takip_active ON aidat_takip(tenant_id, is_active);
