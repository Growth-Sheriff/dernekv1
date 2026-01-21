-- Add version column for optimistic locking on aidat_takip
ALTER TABLE aidat_takip ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX idx_aidat_version ON aidat_takip(id, version);
