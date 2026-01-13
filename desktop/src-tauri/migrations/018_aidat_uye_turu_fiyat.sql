-- Migration: 018_aidat_uye_turu_fiyat
-- Üye Türü Bazlı Aidat Fiyatları

-- aidat_tanimlari tablosuna uye_turu alanı ekle (varsa hata verecek ama devam edecek)
ALTER TABLE aidat_tanimlari ADD COLUMN uye_turu TEXT DEFAULT 'Asil';

-- UNIQUE constraint güncelleme için - yeni index
CREATE INDEX IF NOT EXISTS idx_aidat_tanimlari_yil_uye_turu ON aidat_tanimlari(tenant_id, yil, uye_turu);

-- Mevcut kayıtları 'Asil' olarak işaretle (varsayılan zaten)
UPDATE aidat_tanimlari SET uye_turu = 'Asil' WHERE uye_turu IS NULL;
