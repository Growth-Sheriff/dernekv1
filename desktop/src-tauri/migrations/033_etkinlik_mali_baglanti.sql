-- Migration: Etkinlik ↔ Muhasebe bağlantısı
-- Date: 2026-07-02
-- Description: Gelir ve gider kayıtları bir etkinliğe bağlanabilir.
-- Etkinliğin gerçekleşen gelir/gideri bu bağ üzerinden baz kayıtlardan hesaplanır
-- (türetilmiş değer sync edilmez, her cihazda yeniden hesaplanır).

ALTER TABLE gelirler ADD COLUMN etkinlik_id TEXT;
ALTER TABLE giderler ADD COLUMN etkinlik_id TEXT;

CREATE INDEX IF NOT EXISTS idx_gelirler_etkinlik ON gelirler(etkinlik_id);
CREATE INDEX IF NOT EXISTS idx_giderler_etkinlik ON giderler(etkinlik_id);
