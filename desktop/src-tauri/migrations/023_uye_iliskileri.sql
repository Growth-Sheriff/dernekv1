-- Migration: Üye-Gelir-Gider İlişkileri ve Aidat İyileştirmeleri
-- Version: 023
-- Date: 2026-01-18

-- ============================================================================
-- GELİRLER TABLOSUNA ÜYE İLİŞKİSİ EKLENİYOR
-- (uye_id zaten var, sadece index ekleyelim)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_gelirler_uye ON gelirler(tenant_id, uye_id);
CREATE INDEX IF NOT EXISTS idx_gelirler_aidat ON gelirler(tenant_id, aidat_id);

-- ============================================================================
-- GİDERLER TABLOSUNA ÜYE İLİŞKİSİ EKLEME (opsiyonel ilgili üye)
-- ============================================================================
ALTER TABLE giderler ADD COLUMN uye_id TEXT REFERENCES uyeler(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_giderler_uye ON giderler(tenant_id, uye_id);

-- ============================================================================
-- AİDAT TAKİP TABLOSUNA KASA İLİŞKİSİ EKLENSİN (kasa_id zaten migration 015'te eklendi)
-- Ek index'ler
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_aidat_takip_kasa ON aidat_takip(tenant_id, kasa_id);

-- ============================================================================
-- DEMİRBAŞ TOPLU GİRİŞ İÇİN ADET KOLONU
-- ============================================================================
ALTER TABLE demirbaslar ADD COLUMN adet INTEGER DEFAULT 1;
ALTER TABLE demirbaslar ADD COLUMN ana_demirbas_id TEXT REFERENCES demirbaslar(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_demirbaslar_ana ON demirbaslar(ana_demirbas_id);
