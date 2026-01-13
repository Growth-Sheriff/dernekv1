-- Toplantılar tablosu
CREATE TABLE IF NOT EXISTS toplantilar (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    baslik TEXT NOT NULL,
    aciklama TEXT,
    tarih TEXT NOT NULL,
    saat TEXT,
    yer TEXT,
    toplanti_tipi TEXT DEFAULT 'genel',
    durum TEXT DEFAULT 'planli',
    katilimci_sayisi INTEGER DEFAULT 0,
    gundem TEXT,
    kararlar TEXT,
    notlar TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    is_deleted INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_toplantilar_tenant ON toplantilar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_toplantilar_tarih ON toplantilar(tarih);

-- Etkinlikler tablosu
CREATE TABLE IF NOT EXISTS etkinlikler (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    baslik TEXT NOT NULL,
    aciklama TEXT,
    baslangic_tarihi TEXT NOT NULL,
    bitis_tarihi TEXT,
    yer TEXT,
    etkinlik_tipi TEXT DEFAULT 'genel',
    durum TEXT DEFAULT 'planli',
    katilimci_sayisi INTEGER DEFAULT 0,
    tahmini_butce REAL DEFAULT 0,
    gerceklesen_butce REAL DEFAULT 0,
    sorumlu_uye_id TEXT,
    notlar TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    is_deleted INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_etkinlikler_tenant ON etkinlikler(tenant_id);
CREATE INDEX IF NOT EXISTS idx_etkinlikler_tarih ON etkinlikler(baslangic_tarihi);
