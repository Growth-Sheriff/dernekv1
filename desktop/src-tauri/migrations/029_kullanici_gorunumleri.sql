-- Kullanıcı Görünüm Tercihleri Tablosu
-- Her kullanıcı için her sayfa özelinde sütun ayarlarını saklar

CREATE TABLE IF NOT EXISTS kullanici_gorunumleri (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    page_key TEXT NOT NULL,  -- 'uyeler_list', 'gelirler_list', 'aidat_takip_list' vb.
    columns_config TEXT NOT NULL, -- JSON string: {"visible": ["col1", "col2"], "order": [...], "widths": {...}}
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,

    -- Her kullanıcı için her sayfa tek bir config
    UNIQUE(tenant_id, user_id, page_key)
);

-- Performans için index
CREATE INDEX IF NOT EXISTS idx_kullanici_gorunumleri_lookup
ON kullanici_gorunumleri(tenant_id, user_id, page_key);

-- Updated_at otomatik güncelleme trigger
CREATE TRIGGER IF NOT EXISTS update_kullanici_gorunumleri_timestamp
AFTER UPDATE ON kullanici_gorunumleri
BEGIN
    UPDATE kullanici_gorunumleri
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;
