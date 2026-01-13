-- Migration: 016_aile_uyeleri_genisletme
-- Aile üyeleri tablosuna ek alanlar

ALTER TABLE uye_aile_uyeleri ADD COLUMN tc_no TEXT;
ALTER TABLE uye_aile_uyeleri ADD COLUMN cinsiyet TEXT;
ALTER TABLE uye_aile_uyeleri ADD COLUMN is_yeri TEXT;
ALTER TABLE uye_aile_uyeleri ADD COLUMN email TEXT;
ALTER TABLE uye_aile_uyeleri ADD COLUMN kan_grubu TEXT;
ALTER TABLE uye_aile_uyeleri ADD COLUMN ozel_durum TEXT;
ALTER TABLE uye_aile_uyeleri ADD COLUMN is_active INTEGER DEFAULT 1;

-- Index
CREATE INDEX IF NOT EXISTS idx_aile_uyeleri_active ON uye_aile_uyeleri(tenant_id, is_active);
