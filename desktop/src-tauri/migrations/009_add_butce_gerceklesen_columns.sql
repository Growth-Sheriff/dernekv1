-- Migration 009: Add gerceklesen_gelir and gerceklesen_gider columns to butce table
-- Date: 2025-01-08
-- Description: Add actual vs planned tracking columns for budget
-- NOT: Bu kolonlar artık schema.sql'de zaten tanımlı. Eski veritabanları için migration.

-- Update existing records to have 0.0 as default (eğer tablo varsa)
UPDATE butce SET gerceklesen_gelir = 0.0 WHERE gerceklesen_gelir IS NULL;
UPDATE butce SET gerceklesen_gider = 0.0 WHERE gerceklesen_gider IS NULL;
