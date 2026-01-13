-- Migration: 013_cariler
-- Cari Hesaplar ve Cari Hareketler Tabloları

-- Ana Cari Tablosu
CREATE TABLE IF NOT EXISTS cariler (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    cari_kodu TEXT,
    cari_tipi TEXT DEFAULT 'Diğer',
    unvan TEXT NOT NULL,
    vergi_dairesi TEXT,
    vergi_no TEXT,
    tc_no TEXT,
    yetkili_kisi TEXT,
    telefon TEXT,
    telefon2 TEXT,
    email TEXT,
    web TEXT,
    adres TEXT,
    il TEXT,
    ilce TEXT,
    posta_kodu TEXT,
    banka_adi TEXT,
    iban TEXT,
    borc_bakiye REAL DEFAULT 0,
    alacak_bakiye REAL DEFAULT 0,
    kredi_limiti REAL DEFAULT 0,
    odeme_vadesi INTEGER DEFAULT 30,
    notlar TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Cari Hareketler Tablosu
CREATE TABLE IF NOT EXISTS cari_hareketler (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    cari_id TEXT NOT NULL,
    hareket_tipi TEXT NOT NULL DEFAULT 'Borç',
    tarih TEXT NOT NULL,
    vade_tarihi TEXT,
    tutar REAL NOT NULL DEFAULT 0,
    odenen REAL DEFAULT 0,
    kalan REAL DEFAULT 0,
    belge_turu TEXT,
    belge_no TEXT,
    kasa_id TEXT,
    gelir_id TEXT,
    gider_id TEXT,
    aciklama TEXT,
    durum TEXT DEFAULT 'Açık',
    kapanma_tarihi TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (cari_id) REFERENCES cariler(id),
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id),
    FOREIGN KEY (gelir_id) REFERENCES gelirler(id),
    FOREIGN KEY (gider_id) REFERENCES giderler(id)
);

-- Cariler için indexler
CREATE INDEX IF NOT EXISTS idx_cariler_tip ON cariler(tenant_id, cari_tipi);
CREATE INDEX IF NOT EXISTS idx_cariler_kodu ON cariler(tenant_id, cari_kodu);
CREATE INDEX IF NOT EXISTS idx_cariler_unvan ON cariler(tenant_id, unvan);

-- Cari hareketler için indexler
CREATE INDEX IF NOT EXISTS idx_cari_hareketler_cari ON cari_hareketler(tenant_id, cari_id);
CREATE INDEX IF NOT EXISTS idx_cari_hareketler_tarih ON cari_hareketler(tenant_id, tarih);
CREATE INDEX IF NOT EXISTS idx_cari_hareketler_durum ON cari_hareketler(tenant_id, durum);
