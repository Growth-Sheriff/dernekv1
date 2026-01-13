-- Migration: 020_evrak_sistemi
-- Evrak/Belge Sistemi Genişletme

-- 1. Belgeler tablosuna resmi_durum alanı ekle
-- resmi_durum: 'resmi' veya 'gayri_resmi' 
ALTER TABLE belgeler ADD COLUMN resmi_durum TEXT DEFAULT 'gayri_resmi';

-- 2. Gelirler tablosuna belge_id alanı ekle
ALTER TABLE gelirler ADD COLUMN belge_id TEXT REFERENCES belgeler(id);

-- 3. Giderler tablosuna belge_id alanı ekle
ALTER TABLE giderler ADD COLUMN belge_id TEXT REFERENCES belgeler(id);

-- 4. Vadeli İşlemler tablosuna belge_id alanı ekle
ALTER TABLE vadeli_islemler ADD COLUMN belge_id TEXT REFERENCES belgeler(id);

-- 5. Demirbaşlar tablosuna belge_id alanı ekle (garanti belgesi vb.)
ALTER TABLE demirbaslar ADD COLUMN belge_id TEXT REFERENCES belgeler(id);

-- 6. Index'ler
CREATE INDEX IF NOT EXISTS idx_belgeler_resmi_durum ON belgeler(tenant_id, resmi_durum);
CREATE INDEX IF NOT EXISTS idx_gelirler_belge ON gelirler(belge_id);
CREATE INDEX IF NOT EXISTS idx_giderler_belge ON giderler(belge_id);
CREATE INDEX IF NOT EXISTS idx_vadeli_islemler_belge ON vadeli_islemler(belge_id);
CREATE INDEX IF NOT EXISTS idx_demirbaslar_belge ON demirbaslar(belge_id);
