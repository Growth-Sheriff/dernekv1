-- Migration: Add platform enable flags to licenses table
-- These fields enable HYBRID license mode with platform-specific access control

ALTER TABLE licenses ADD COLUMN mode TEXT DEFAULT 'local';
ALTER TABLE licenses ADD COLUMN desktop_enabled INTEGER DEFAULT 1;
ALTER TABLE licenses ADD COLUMN web_enabled INTEGER DEFAULT 0;
ALTER TABLE licenses ADD COLUMN mobile_enabled INTEGER DEFAULT 0;
ALTER TABLE licenses ADD COLUMN sync_enabled INTEGER DEFAULT 0;
ALTER TABLE licenses ADD COLUMN expiry_date TEXT;

-- Update existing licenses to have desktop enabled by default
UPDATE licenses SET desktop_enabled = 1 WHERE desktop_enabled IS NULL;
UPDATE licenses SET mode = 'local' WHERE mode IS NULL;
