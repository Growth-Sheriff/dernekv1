-- Migration: 019_kurlar
-- Çoklu Para Birimi Kur Yönetim Sistemi

-- 1. Kurlar Tablosu
-- para_birimi: USD, EUR
-- hedef_para_birimi: Genellikle TRY
-- kur_degeri: örn. 35.50
-- gecerlilik_baslangic: Kurun geçerli olduğu tarih
CREATE TABLE IF NOT EXISTS kurlar (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    para_birimi TEXT NOT NULL,
    hedef_para_birimi TEXT NOT NULL DEFAULT 'TRY',
    kur_degeri REAL NOT NULL,
    gecerlilik_baslangic TEXT NOT NULL,
    aciklama TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Kurlar indexleri
CREATE INDEX IF NOT EXISTS idx_kurlar_tenant ON kurlar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kurlar_para_birimi ON kurlar(tenant_id, para_birimi, gecerlilik_baslangic DESC);
CREATE INDEX IF NOT EXISTS idx_kurlar_tarih ON kurlar(tenant_id, gecerlilik_baslangic DESC);

-- 2. Virmanlar Tablosu Güncelleme - Kur alanları ekleme
ALTER TABLE virmanlar ADD COLUMN kaynak_para_birimi TEXT;
ALTER TABLE virmanlar ADD COLUMN hedef_para_birimi TEXT;
ALTER TABLE virmanlar ADD COLUMN kaynak_tutar REAL;
ALTER TABLE virmanlar ADD COLUMN hedef_tutar REAL;
ALTER TABLE virmanlar ADD COLUMN uygulanan_kur REAL;
ALTER TABLE virmanlar ADD COLUMN kur_id TEXT REFERENCES kurlar(id);

-- 3. Mevcut virmanları güncelle (TRY varsayılan)
UPDATE virmanlar SET 
    kaynak_para_birimi = 'TRY',
    hedef_para_birimi = 'TRY',
    kaynak_tutar = tutar,
    hedef_tutar = tutar,
    uygulanan_kur = 1.0
WHERE kaynak_para_birimi IS NULL;
