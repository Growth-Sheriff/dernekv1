-- Migration: 005_add_belgeler
-- Description: Belge yönetim sistemi için tablo ekleme

CREATE TABLE IF NOT EXISTS belgeler (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    belge_turu TEXT NOT NULL,
    baslik TEXT NOT NULL,
    dosya_adi TEXT NOT NULL,
    dosya_yolu TEXT NOT NULL,
    dosya_boyutu INTEGER,
    mime_type TEXT,
    bagli_kayit_turu TEXT,
    bagli_kayit_id TEXT,
    aciklama TEXT,
    etiketler TEXT,
    yukleyen_kullanici_id TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_belgeler_tenant ON belgeler(tenant_id);
CREATE INDEX IF NOT EXISTS idx_belgeler_turu ON belgeler(belge_turu);
CREATE INDEX IF NOT EXISTS idx_belgeler_bagli ON belgeler(bagli_kayit_turu, bagli_kayit_id);
CREATE INDEX IF NOT EXISTS idx_belgeler_yukleyen ON belgeler(yukleyen_kullanici_id);
