-- Migration 025: Add index for aidat_takip version column (optimistic locking)
--
-- NOT: `version` kolonu migration 008'de zaten eklenmişti. Bu migration eskiden
-- yine ADD COLUMN yapıyordu ve "duplicate column" hatası veriyordu. Sadece
-- indeks garantisi bırakıyoruz; CREATE INDEX IF NOT EXISTS idempotent.

CREATE INDEX IF NOT EXISTS idx_aidat_version ON aidat_takip(id, version);
