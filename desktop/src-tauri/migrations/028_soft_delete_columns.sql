-- Soft delete için is_deleted sütunları ekle (eksik olanlara)

-- gelirler
ALTER TABLE gelirler ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- giderler
ALTER TABLE giderler ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- kasalar
ALTER TABLE kasalar ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- aidat_takip
ALTER TABLE aidat_takip ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- virmanlar
ALTER TABLE virmanlar ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- Index'ler (performans için)
CREATE INDEX IF NOT EXISTS idx_gelirler_deleted ON gelirler(tenant_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_giderler_deleted ON giderler(tenant_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_kasalar_deleted ON kasalar(tenant_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_aidat_deleted ON aidat_takip(tenant_id, is_deleted);
