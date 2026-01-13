-- Migration 006: Tüm form alanlarını genişletme
-- Üyeler tablosuna eksik alanlar ekleniyor
-- NOT: SQLite duplicate column hataları atlanır

ALTER TABLE uyeler ADD COLUMN telefon2 TEXT;
ALTER TABLE uyeler ADD COLUMN cinsiyet TEXT;
ALTER TABLE uyeler ADD COLUMN dogum_tarihi DATE;
ALTER TABLE uyeler ADD COLUMN dogum_yeri TEXT;
ALTER TABLE uyeler ADD COLUMN kan_grubu TEXT;
ALTER TABLE uyeler ADD COLUMN aile_durumu TEXT;
ALTER TABLE uyeler ADD COLUMN cocuk_sayisi INTEGER;
ALTER TABLE uyeler ADD COLUMN egitim_durumu TEXT;
ALTER TABLE uyeler ADD COLUMN meslek TEXT;
ALTER TABLE uyeler ADD COLUMN is_yeri TEXT;
ALTER TABLE uyeler ADD COLUMN il TEXT;
ALTER TABLE uyeler ADD COLUMN ilce TEXT;
ALTER TABLE uyeler ADD COLUMN mahalle TEXT;
ALTER TABLE uyeler ADD COLUMN posta_kodu TEXT;
ALTER TABLE uyeler ADD COLUMN ozel_aidat_tutari REAL;
ALTER TABLE uyeler ADD COLUMN aidat_indirimi_yuzde REAL;
ALTER TABLE uyeler ADD COLUMN referans_uye_id TEXT REFERENCES uyeler(id);
ALTER TABLE uyeler ADD COLUMN ayrilma_nedeni TEXT;

-- Gelirler tablosuna eksik alanlar ekleniyor
ALTER TABLE gelirler ADD COLUMN alt_kategori TEXT;
ALTER TABLE gelirler ADD COLUMN tahakkuk_durumu TEXT;
ALTER TABLE gelirler ADD COLUMN belge_no TEXT;
ALTER TABLE gelirler ADD COLUMN tahsil_eden TEXT;

-- Giderler tablosuna eksik alanlar ekleniyor
ALTER TABLE giderler ADD COLUMN alt_kategori TEXT;
ALTER TABLE giderler ADD COLUMN islem_no TEXT;
ALTER TABLE giderler ADD COLUMN odeyen TEXT;
ALTER TABLE giderler ADD COLUMN notlar TEXT;

-- Aidat takip tablosuna eksik alanlar ekleniyor
ALTER TABLE aidat_takip ADD COLUMN tahsilat_turu TEXT;
ALTER TABLE aidat_takip ADD COLUMN banka_sube TEXT;
ALTER TABLE aidat_takip ADD COLUMN dekont_no TEXT;
ALTER TABLE aidat_takip ADD COLUMN aciklama TEXT;

-- Index'ler ekleniyor
CREATE INDEX IF NOT EXISTS idx_uyeler_referans ON uyeler(referans_uye_id);
CREATE INDEX IF NOT EXISTS idx_uyeler_cinsiyet ON uyeler(cinsiyet);
CREATE INDEX IF NOT EXISTS idx_uyeler_il_ilce ON uyeler(il, ilce);
CREATE INDEX IF NOT EXISTS idx_gelirler_belge_no ON gelirler(belge_no);
CREATE INDEX IF NOT EXISTS idx_giderler_islem_no ON giderler(islem_no);
CREATE INDEX IF NOT EXISTS idx_aidat_tahsilat_turu ON aidat_takip(tahsilat_turu);
