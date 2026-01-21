-- Aidat takip tablosuna aidat_tanim_id ekle
ALTER TABLE aidat_takip ADD COLUMN aidat_tanim_id TEXT;

CREATE INDEX IF NOT EXISTS idx_aidat_takip_tanim ON aidat_takip(aidat_tanim_id);
