-- Migration 001: Add missing columns for module integration
-- Tarih: 2026-01-08
-- Amaç: Aidat → Gelir → Kasa entegrasyonu için eksik kolonları ekle
-- NOT: Bu alanlar schema.sql'de zaten tanımlı. Bu migration eski veritabanları içindir.
-- SQLite'da "IF NOT EXISTS" için ALTER TABLE desteklenmez, duplicate column hataları atlanır.

-- ============================================================================
-- 4. İlk bakiye değerlerini hesapla ve güncelle
-- ============================================================================

-- Mevcut kasaların bakiyelerini fiziksel_bakiye'ye kopyala
UPDATE kasalar 
SET fiziksel_bakiye = bakiye,
    devir_bakiye = bakiye,
    serbest_bakiye = bakiye
WHERE fiziksel_bakiye IS NULL OR fiziksel_bakiye = 0;

-- ============================================================================
-- Migration tamamlandı!
-- ============================================================================
