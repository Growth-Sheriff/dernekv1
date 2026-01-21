-- Gelir türü string'den ID'ye migrate etme
-- Eğer gelir_turu dolu ama gelir_turu_id boşsa, gelir_turleri'nden eşleştir

UPDATE gelirler
SET gelir_turu_id = (
    SELECT id FROM gelir_turleri
    WHERE gelir_turleri.tenant_id = gelirler.tenant_id
    AND (gelir_turleri.ad = gelirler.gelir_turu OR gelir_turleri.kod = gelirler.gelir_turu)
    LIMIT 1
)
WHERE gelir_turu_id IS NULL AND gelir_turu IS NOT NULL;

-- Gider türü string'den ID'ye migrate etme
UPDATE giderler
SET gider_turu_id = (
    SELECT id FROM gider_turleri
    WHERE gider_turleri.tenant_id = giderler.tenant_id
    AND (gider_turleri.ad = giderler.gider_turu OR gider_turleri.kod = giderler.gider_turu)
    LIMIT 1
)
WHERE gider_turu_id IS NULL AND gider_turu IS NOT NULL;

-- Legacy alanları NULL'la (silemiyoruz çünkü schema değişikliği gerekir)
-- Bunun yerine kullanımını durduralım
