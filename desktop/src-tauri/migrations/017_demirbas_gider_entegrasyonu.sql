-- Migration: 017_demirbas_gider_entegrasyonu
-- Demirbaş-Gider İlişkilendirmesi

-- Demirbaşlar tablosuna gider referansı ekle
ALTER TABLE demirbaslar ADD COLUMN gider_id TEXT REFERENCES giderler(id);

-- Giderler tablosuna demirbaş referansı ekle
ALTER TABLE giderler ADD COLUMN demirbas_id TEXT REFERENCES demirbaslar(id);

-- İlişkilendirme için index
CREATE INDEX IF NOT EXISTS idx_demirbaslar_gider ON demirbaslar(gider_id);
CREATE INDEX IF NOT EXISTS idx_giderler_demirbas ON giderler(demirbas_id);
