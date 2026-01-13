-- Migration: 012_vadeli_islemler
-- Vadeli İşlemler Tablosu (Beklenen Gelir/Gider)

CREATE TABLE IF NOT EXISTS vadeli_islemler (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    kasa_id TEXT,
    islem_tipi TEXT NOT NULL DEFAULT 'Gelir',
    tutar REAL NOT NULL DEFAULT 0,
    vade_tarihi TEXT NOT NULL,
    aciklama TEXT,
    kategori TEXT,
    tekrar_tipi TEXT DEFAULT 'Tek Seferlik',
    tekrar_sayisi INTEGER DEFAULT 1,
    ilgili_kisi TEXT,
    cari_id TEXT,
    durum TEXT DEFAULT 'Bekliyor',
    gerceklesen_id TEXT,
    gerceklesme_tarihi TEXT,
    hatirlatma_gun INTEGER DEFAULT 3,
    notlar TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (kasa_id) REFERENCES kasalar(id),
    FOREIGN KEY (cari_id) REFERENCES cariler(id)
);

-- Vadeli işlemler için indexler
CREATE INDEX IF NOT EXISTS idx_vadeli_islemler_kasa ON vadeli_islemler(tenant_id, kasa_id);
CREATE INDEX IF NOT EXISTS idx_vadeli_islemler_vade ON vadeli_islemler(tenant_id, vade_tarihi);
CREATE INDEX IF NOT EXISTS idx_vadeli_islemler_durum ON vadeli_islemler(tenant_id, durum);
CREATE INDEX IF NOT EXISTS idx_vadeli_islemler_tip ON vadeli_islemler(tenant_id, islem_tipi);
