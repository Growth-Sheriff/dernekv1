CREATE TABLE IF NOT EXISTS kullanici_gorunumleri (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    page_key TEXT NOT NULL,
    columns_config TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, user_id, page_key)
);

CREATE INDEX IF NOT EXISTS idx_kullanici_gorunumleri_lookup ON kullanici_gorunumleri(tenant_id, user_id, page_key);
