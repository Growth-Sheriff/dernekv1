-- Migration: 011_demirbaslar
-- Demirbaş/Envanter Yönetimi Tablosu

CREATE TABLE IF NOT EXISTS demirbaslar (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    demirbas_no TEXT,
    ad TEXT NOT NULL,
    kategori TEXT DEFAULT 'Diğer',
    marka_model TEXT,
    seri_no TEXT,
    alis_tarihi TEXT,
    alis_bedeli REAL DEFAULT 0,
    amortisman_suresi INTEGER DEFAULT 5,
    amortisman_turu TEXT DEFAULT 'Doğrusal',
    guncel_deger REAL DEFAULT 0,
    konum TEXT,
    sorumlu_uye_id TEXT,
    durum TEXT DEFAULT 'Aktif',
    garanti_bitis TEXT,
    fatura_no TEXT,
    tedarikci TEXT,
    notlar TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (sorumlu_uye_id) REFERENCES uyeler(id)
);

-- Demirbaş kategorileri için index
CREATE INDEX IF NOT EXISTS idx_demirbaslar_kategori ON demirbaslar(tenant_id, kategori);
CREATE INDEX IF NOT EXISTS idx_demirbaslar_durum ON demirbaslar(tenant_id, durum);
CREATE INDEX IF NOT EXISTS idx_demirbaslar_sorumlu ON demirbaslar(tenant_id, sorumlu_uye_id);
