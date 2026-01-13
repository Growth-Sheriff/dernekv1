-- Migration: 017_kasa_genisletme
-- Kasa tablosuna banka bilgileri ve ek alanlar

ALTER TABLE kasalar ADD COLUMN kasa_tipi TEXT DEFAULT 'Nakit';
ALTER TABLE kasalar ADD COLUMN iban TEXT;
ALTER TABLE kasalar ADD COLUMN banka_adi TEXT;
ALTER TABLE kasalar ADD COLUMN sube TEXT;
ALTER TABLE kasalar ADD COLUMN hesap_no TEXT;
ALTER TABLE kasalar ADD COLUMN aciklama TEXT;

-- Index
CREATE INDEX IF NOT EXISTS idx_kasalar_tip ON kasalar(tenant_id, kasa_tipi);
