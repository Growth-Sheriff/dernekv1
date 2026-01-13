-- Migration: Licenses Table
-- Date: 2026-01-11
-- Description: Gerçek lisans sistemi - plan, features, expiry

-- Drop existing table if exists to recreate with correct schema
DROP TABLE IF EXISTS licenses;

CREATE TABLE licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Lisans Key (BADER-XXXX-XXXX-XXXX format)
    license_key TEXT UNIQUE NOT NULL,
    
    -- Plan: LOCAL, ONLINE, HYBRID
    plan TEXT NOT NULL DEFAULT 'LOCAL',
    
    -- Limitler
    max_users INTEGER DEFAULT 5,
    max_records INTEGER DEFAULT 10000,
    
    -- Özellikler (JSON)
    features TEXT DEFAULT '{
        "modules": {
            "uye_yonetimi": true,
            "aidat_takip": true,
            "mali_islemler": true,
            "kasa_yonetimi": true,
            "raporlar": true,
            "etkinlik": false,
            "toplanti": false,
            "belge": false,
            "butce": false,
            "koy_modulu": false,
            "ocr": false
        },
        "features": {
            "multi_kasa": true,
            "multi_para_birimi": true,
            "excel_export": true,
            "pdf_export": true,
            "api_access": false,
            "mobile_access": false,
            "tahakkuk": false
        },
        "limits": {
            "max_kasalar": 10,
            "max_gelir_turleri": 20,
            "max_gider_turleri": 20
        }
    }',
    
    -- Tarih
    start_date TEXT NOT NULL,
    expiry_date TEXT,
    
    -- Durum
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Index
CREATE INDEX IF NOT EXISTS idx_licenses_tenant ON licenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_active ON licenses(is_active, expiry_date);
