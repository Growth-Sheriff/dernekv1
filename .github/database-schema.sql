-- ============================================================================
-- BADER V3 - PostgreSQL Veritabanı Şeması
-- Multi-Tenant SaaS Architecture with RLS
-- ============================================================================
-- Versiyon: 3.0.0
-- Son Güncelleme: 8 Ocak 2026
-- Platform: PostgreSQL 16+
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- FOUNDATION TABLES (Multi-Tenant Core)
-- ============================================================================

-- Tenants (Dernekler)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly identifier
    
    -- Dernek Bilgileri
    name VARCHAR(200) NOT NULL,
    full_name VARCHAR(500),
    address TEXT,
    city VARCHAR(100),
    district VARCHAR(100),
    postal_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(200),
    website VARCHAR(200),
    logo_url VARCHAR(500),
    
    -- Yasal Bilgiler
    tax_number VARCHAR(50),
    registration_number VARCHAR(100),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_trial BOOLEAN DEFAULT false,
    trial_ends_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT tenant_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_active ON tenants(is_active);

-- ============================================================================

-- Licenses (Lisans Yönetimi)
CREATE TABLE licenses (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- License Info
    license_key VARCHAR(100) UNIQUE NOT NULL,  -- BADER-XXXX-XXXX-XXXX-XXXX
    plan VARCHAR(20) NOT NULL,  -- LOCAL, ONLINE, HYBRID
    
    -- Features (JSONB for flexibility)
    features JSONB DEFAULT '{
        "modules": {
            "uye_yonetimi": true,
            "aidat_takip": true,
            "mali_islemler": true,
            "aile_modulu": false,
            "koy_modulu": false,
            "ocr": false,
            "web_erisim": false,
            "mobil_erisim": false,
            "sync": false,
            "api_access": false,
            "email_sms": false
        },
        "limits": {
            "max_users": 1,
            "max_members": 5000,
            "max_kasalar": 2,
            "max_storage_mb": 100
        },
        "exports": {
            "pdf": true,
            "excel": false,
            "api": false
        }
    }'::jsonb,
    
    -- Pricing
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'TRY',
    billing_period VARCHAR(20),  -- one-time, monthly, yearly
    
    -- Limits
    max_users INTEGER DEFAULT 1,
    max_members INTEGER DEFAULT 5000,
    
    -- Validity
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_lifetime BOOLEAN DEFAULT false,
    
    -- Activation
    activation_code VARCHAR(200),  -- For offline activation
    hardware_id VARCHAR(200),  -- Device binding
    activated_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id),
    CONSTRAINT valid_plan CHECK (plan IN ('LOCAL', 'ONLINE', 'HYBRID'))
);

CREATE INDEX idx_licenses_tenant ON licenses(tenant_id);
CREATE INDEX idx_licenses_key ON licenses(license_key);
CREATE INDEX idx_licenses_active ON licenses(is_active);

-- ============================================================================

-- Users (Kullanıcılar ve Personel)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Auth Bilgileri
    username VARCHAR(50) NOT NULL,
    email VARCHAR(200),
    password_hash VARCHAR(255) NOT NULL,
    
    -- Kişisel Bilgiler
    ad_soyad VARCHAR(200),
    telefon VARCHAR(20),
    profil_foto VARCHAR(500),
    
    -- Roller ve Yetkiler
    role VARCHAR(50) DEFAULT 'GORUNTULEYICI',  -- ADMIN, MUHASEBECI, SEKRETER, GORUNTULEYICI
    permissions JSONB DEFAULT '{}'::jsonb,  -- Custom permissions
    
    -- Durum
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,  -- System admin only
    email_verified BOOLEAN DEFAULT false,
    
    -- Çalışma Bilgileri
    baslangic_tarihi DATE,
    bitis_tarihi DATE,
    
    -- Session
    last_login TIMESTAMPTZ,
    last_activity TIMESTAMPTZ,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    UNIQUE(tenant_id, username),
    CONSTRAINT valid_role CHECK (role IN ('ADMIN', 'MUHASEBECI', 'SEKRETER', 'GORUNTULEYICI', 'CUSTOM'))
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_username ON users(tenant_id, username);
CREATE INDEX idx_users_sync ON users(sync_id);
CREATE INDEX idx_users_active ON users(tenant_id, is_active, is_deleted);

-- ============================================================================
-- MEMBER MANAGEMENT
-- ============================================================================

-- Üyeler
CREATE TABLE uyeler (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Temel Bilgiler
    uye_no VARCHAR(50),
    tc_kimlik VARCHAR(11),
    ad_soyad VARCHAR(200) NOT NULL,
    uyelik_tipi VARCHAR(50) DEFAULT 'Asil',  -- Asil, Onursal, Fahri, Kurumsal
    durum VARCHAR(20) DEFAULT 'Aktif',  -- Aktif, Pasif, Ayrıldı
    
    -- İletişim
    telefon VARCHAR(20),
    telefon2 VARCHAR(20),
    email VARCHAR(200),
    
    -- Kişisel
    cinsiyet VARCHAR(10),
    dogum_tarihi DATE,
    dogum_yeri VARCHAR(100),
    kan_grubu VARCHAR(10),
    aile_durumu VARCHAR(20),
    cocuk_sayisi INTEGER DEFAULT 0,
    
    -- Meslek
    egitim_durumu VARCHAR(50),
    meslek VARCHAR(100),
    is_yeri VARCHAR(200),
    
    -- Adres
    il VARCHAR(100),
    ilce VARCHAR(100),
    mahalle VARCHAR(100),
    adres TEXT,
    posta_kodu VARCHAR(20),
    
    -- Aidat
    ozel_aidat_tutari DECIMAL(10,2),
    aidat_indirimi_yuzde DECIMAL(5,2) DEFAULT 0,
    
    -- Referans
    referans_uye_id INTEGER REFERENCES uyeler(id),
    
    -- Ayrılma
    ayrilma_tarihi DATE,
    ayrilma_nedeni TEXT,
    
    -- Notlar
    notlar TEXT,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    UNIQUE(tenant_id, uye_no),
    UNIQUE(tenant_id, tc_kimlik)
);

CREATE INDEX idx_uyeler_tenant ON uyeler(tenant_id);
CREATE INDEX idx_uyeler_uye_no ON uyeler(tenant_id, uye_no);
CREATE INDEX idx_uyeler_tc ON uyeler(tenant_id, tc_kimlik);
CREATE INDEX idx_uyeler_durum ON uyeler(tenant_id, durum, is_deleted);
CREATE INDEX idx_uyeler_sync ON uyeler(sync_id);
CREATE INDEX idx_uyeler_search ON uyeler USING gin(to_tsvector('turkish', ad_soyad || ' ' || COALESCE(telefon, '')));

-- ============================================================================

-- Aile Üyeleri
CREATE TABLE uye_aile_uyeleri (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    uye_id INTEGER REFERENCES uyeler(id) ON DELETE CASCADE,
    
    -- Aile Üyesi Bilgileri
    yakinlik VARCHAR(50),  -- Eş, Çocuk, Anne, Baba, vb.
    ad_soyad VARCHAR(200) NOT NULL,
    dogum_tarihi DATE,
    telefon VARCHAR(20),
    meslek VARCHAR(100),
    egitim_durumu VARCHAR(50),
    notlar TEXT,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_aile_tenant ON uye_aile_uyeleri(tenant_id);
CREATE INDEX idx_aile_uye ON uye_aile_uyeleri(uye_id);
CREATE INDEX idx_aile_sync ON uye_aile_uyeleri(sync_id);

-- ============================================================================
-- AIDAT SYSTEM
-- ============================================================================

-- Aidat Takip (Yıllık)
CREATE TABLE aidat_takip (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    uye_id INTEGER REFERENCES uyeler(id) ON DELETE CASCADE,
    
    -- Aidat Bilgileri
    yil INTEGER NOT NULL,
    yillik_aidat_tutari DECIMAL(10,2) NOT NULL,
    odenen_tutar DECIMAL(10,2) DEFAULT 0,
    kalan_tutar DECIMAL(10,2),
    durum VARCHAR(20) DEFAULT 'Eksik',  -- Tamamlandı, Kısmi, Eksik
    
    -- Gelir Bağlantısı
    aktarim_durumu VARCHAR(20),  -- Aktarıldı, null
    gelir_id INTEGER REFERENCES gelirler(id) ON DELETE SET NULL,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    UNIQUE(tenant_id, uye_id, yil)
);

CREATE INDEX idx_aidat_tenant ON aidat_takip(tenant_id);
CREATE INDEX idx_aidat_uye ON aidat_takip(uye_id);
CREATE INDEX idx_aidat_yil ON aidat_takip(tenant_id, yil);
CREATE INDEX idx_aidat_durum ON aidat_takip(tenant_id, durum);
CREATE INDEX idx_aidat_sync ON aidat_takip(sync_id);

-- ============================================================================

-- Aidat Ödemeleri
CREATE TABLE aidat_odemeleri (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    aidat_id INTEGER REFERENCES aidat_takip(id) ON DELETE CASCADE,
    
    -- Ödeme Bilgileri
    tarih DATE NOT NULL,
    tutar DECIMAL(10,2) NOT NULL,
    tahsilat_turu VARCHAR(50) DEFAULT 'Nakit',  -- Nakit, Havale/EFT, Kredi Kartı, Çek, Diğer
    
    -- Dekont Bilgileri
    dekont_no VARCHAR(100),
    banka_sube VARCHAR(200),
    aciklama TEXT,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_odeme_tenant ON aidat_odemeleri(tenant_id);
CREATE INDEX idx_odeme_aidat ON aidat_odemeleri(aidat_id);
CREATE INDEX idx_odeme_tarih ON aidat_odemeleri(tenant_id, tarih);
CREATE INDEX idx_odeme_sync ON aidat_odemeleri(sync_id);

-- ============================================================================
-- FINANCIAL MANAGEMENT
-- ============================================================================

-- Kasalar
CREATE TABLE kasalar (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Kasa Bilgileri
    kasa_adi VARCHAR(100) NOT NULL,
    para_birimi VARCHAR(10) DEFAULT 'TRY',  -- TRY, USD, EUR
    aciklama TEXT,
    
    -- Bakiye Bilgileri
    devir_bakiye DECIMAL(15,2) DEFAULT 0,
    toplam_gelir DECIMAL(15,2) DEFAULT 0,
    toplam_gider DECIMAL(15,2) DEFAULT 0,
    virman_giris DECIMAL(15,2) DEFAULT 0,
    virman_cikis DECIMAL(15,2) DEFAULT 0,
    fiziksel_bakiye DECIMAL(15,2) DEFAULT 0,  -- Devir + Gelir - Gider + Virman
    
    -- Tahakkuk
    tahakkuk_tutari DECIMAL(15,2) DEFAULT 0,
    serbest_bakiye DECIMAL(15,2) DEFAULT 0,  -- Fiziksel - Tahakkuk
    
    -- Sıralama
    sira INTEGER DEFAULT 0,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    UNIQUE(tenant_id, kasa_adi)
);

CREATE INDEX idx_kasalar_tenant ON kasalar(tenant_id);
CREATE INDEX idx_kasalar_sync ON kasalar(sync_id);

-- ============================================================================

-- Gelir Türleri
CREATE TABLE gelir_turleri (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    tur_adi VARCHAR(100) NOT NULL,
    ust_kategori VARCHAR(100),
    aciklama TEXT,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, tur_adi)
);

CREATE INDEX idx_gelir_turleri_tenant ON gelir_turleri(tenant_id);

-- ============================================================================

-- Gelirler
CREATE TABLE gelirler (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    kasa_id INTEGER REFERENCES kasalar(id) ON DELETE RESTRICT,
    gelir_turu_id INTEGER REFERENCES gelir_turleri(id),
    
    -- Gelir Bilgileri
    tarih DATE NOT NULL,
    belge_no VARCHAR(100),  -- Otomatik: GEL-2026-0001
    gelir_turu VARCHAR(100),  -- KİRA, BAĞIŞ, DÜĞÜN, KINA, AİDAT, vb.
    alt_kategori VARCHAR(100),
    aciklama TEXT NOT NULL,
    tutar DECIMAL(15,2) NOT NULL,
    
    -- Tahsilat Bilgileri
    tahsil_eden VARCHAR(100),
    dekont_no VARCHAR(100),
    
    -- Tahakkuk
    ait_oldugu_yil INTEGER,
    tahakkuk_durumu VARCHAR(50) DEFAULT 'NORMAL',  -- NORMAL, GERİYE DÖNÜK, PEŞİN
    
    -- Bağlantılar
    uye_id INTEGER REFERENCES uyeler(id),
    aidat_id INTEGER REFERENCES aidat_takip(id),
    
    -- Ek Notlar (Ekleme: 2026-01-08)
    notlar TEXT,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_gelirler_tenant ON gelirler(tenant_id);
CREATE INDEX idx_gelirler_kasa ON gelirler(kasa_id);
CREATE INDEX idx_gelirler_tarih ON gelirler(tenant_id, tarih);
CREATE INDEX idx_gelirler_yil ON gelirler(tenant_id, ait_oldugu_yil);
CREATE INDEX idx_gelirler_sync ON gelirler(sync_id);

-- ============================================================================

-- Gider Türleri
CREATE TABLE gider_turleri (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    tur_adi VARCHAR(100) NOT NULL,
    ust_kategori VARCHAR(100),
    aciklama TEXT,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, tur_adi)
);

CREATE INDEX idx_gider_turleri_tenant ON gider_turleri(tenant_id);

-- ============================================================================

-- Giderler
CREATE TABLE giderler (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    kasa_id INTEGER REFERENCES kasalar(id) ON DELETE RESTRICT,
    gider_turu_id INTEGER REFERENCES gider_turleri(id),
    
    -- Gider Bilgileri
    tarih DATE NOT NULL,
    islem_no VARCHAR(100),  -- Otomatik: GID-2026-0001
    gider_turu VARCHAR(100),  -- ELEKTRİK, SU, KİRA, vb.
    alt_kategori VARCHAR(100),
    aciklama TEXT NOT NULL,
    tutar DECIMAL(15,2) NOT NULL,
    
    -- Ödeme Bilgileri
    odeyen VARCHAR(100),
    
    -- Belge
    fatura_no VARCHAR(100),
    notlar TEXT,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_giderler_tenant ON giderler(tenant_id);
CREATE INDEX idx_giderler_kasa ON giderler(kasa_id);
CREATE INDEX idx_giderler_tarih ON giderler(tenant_id, tarih);
CREATE INDEX idx_giderler_sync ON giderler(sync_id);

-- ============================================================================

-- Virmanlar
CREATE TABLE virmanlar (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    kaynak_kasa_id INTEGER REFERENCES kasalar(id) ON DELETE RESTRICT,
    hedef_kasa_id INTEGER REFERENCES kasalar(id) ON DELETE RESTRICT,
    
    -- Virman Bilgileri
    tarih DATE NOT NULL,
    tutar DECIMAL(15,2) NOT NULL,
    aciklama TEXT,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    CONSTRAINT virman_farkli_kasa CHECK (kaynak_kasa_id != hedef_kasa_id)
);

CREATE INDEX idx_virmanlar_tenant ON virmanlar(tenant_id);
CREATE INDEX idx_virmanlar_kaynak ON virmanlar(kaynak_kasa_id);
CREATE INDEX idx_virmanlar_hedef ON virmanlar(hedef_kasa_id);
CREATE INDEX idx_virmanlar_tarih ON virmanlar(tenant_id, tarih);
CREATE INDEX idx_virmanlar_sync ON virmanlar(sync_id);

-- ============================================================================
-- EVENTS & MEETINGS
-- ============================================================================

-- Etkinlikler
CREATE TABLE etkinlikler (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Etkinlik Bilgileri
    etkinlik_turu VARCHAR(50),  -- DÜĞÜN, NİŞAN, KINA, SÜNNET, CENAZE, MEVLİT, TOPLANTI, GENEL KURUL, vb.
    baslik VARCHAR(200) NOT NULL,
    aciklama TEXT,
    
    -- Tarih ve Konum
    tarih DATE NOT NULL,
    saat TIME,
    bitis_tarihi DATE,
    mekan VARCHAR(200),
    durum VARCHAR(50) DEFAULT 'Planlandı',  -- Planlandı, Devam Ediyor, Tamamlandı, İptal
    
    -- Finansal
    tahmini_gelir DECIMAL(15,2),
    tahmini_gider DECIMAL(15,2),
    gerceklesen_gelir DECIMAL(15,2),
    gerceklesen_gider DECIMAL(15,2),
    
    -- Katılım
    katilimci_sayisi INTEGER,
    sorumlu_uye_id INTEGER REFERENCES uyeler(id),
    
    -- Notlar
    notlar TEXT,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_etkinlikler_tenant ON etkinlikler(tenant_id);
CREATE INDEX idx_etkinlikler_tarih ON etkinlikler(tenant_id, tarih);
CREATE INDEX idx_etkinlikler_sync ON etkinlikler(sync_id);

-- ============================================================================

-- Toplantılar
CREATE TABLE toplantilar (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Toplantı Bilgileri
    toplanti_turu VARCHAR(50),  -- Yönetim Kurulu, Genel Kurul, Denetim Kurulu, Komisyon, Diğer
    baslik VARCHAR(200) NOT NULL,
    tarih DATE NOT NULL,
    saat TIME,
    mekan VARCHAR(200),
    
    -- İçerik
    gundem TEXT,
    katilimcilar TEXT,
    kararlar TEXT,
    tutanak TEXT,
    
    -- Sonraki Toplantı
    bir_sonraki_toplanti DATE,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_toplantilar_tenant ON toplantilar(tenant_id);
CREATE INDEX idx_toplantilar_tarih ON toplantilar(tenant_id, tarih);
CREATE INDEX idx_toplantilar_sync ON toplantilar(sync_id);

-- ============================================================================
-- DOCUMENTS & BUDGET
-- ============================================================================

-- Belgeler
CREATE TABLE belgeler (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Belge Bilgileri
    belge_turu VARCHAR(50),  -- DEKONT, FATURA, MAKBUZ, SÖZLEŞME, TUTANAK, KARAR, DİĞER
    baslik VARCHAR(200) NOT NULL,
    aciklama TEXT,
    
    -- Dosya
    dosya_adi VARCHAR(255) NOT NULL,
    dosya_yolu VARCHAR(500) NOT NULL,
    dosya_boyutu BIGINT,
    mime_type VARCHAR(100),
    
    -- Bağlantılar
    bagli_kayit_turu VARCHAR(50),  -- uye, gelir, gider, etkinlik, vb.
    bagli_kayit_id INTEGER,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_belgeler_tenant ON belgeler(tenant_id);
CREATE INDEX idx_belgeler_tur ON belgeler(tenant_id, belge_turu);
CREATE INDEX idx_belgeler_bagli ON belgeler(tenant_id, bagli_kayit_turu, bagli_kayit_id);
CREATE INDEX idx_belgeler_sync ON belgeler(sync_id);

-- ============================================================================

-- Bütçe Planları
CREATE TABLE butce_planlari (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Bütçe Bilgileri
    yil INTEGER NOT NULL,
    tur VARCHAR(20) NOT NULL,  -- GELİR, GİDER
    kategori VARCHAR(100) NOT NULL,
    planlanan_tutar DECIMAL(15,2) NOT NULL,
    gerceklesen_tutar DECIMAL(15,2) DEFAULT 0,
    aciklama TEXT,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    UNIQUE(tenant_id, yil, tur, kategori)
);

CREATE INDEX idx_butce_tenant ON butce_planlari(tenant_id);
CREATE INDEX idx_butce_yil ON butce_planlari(tenant_id, yil);
CREATE INDEX idx_butce_sync ON butce_planlari(sync_id);

-- ============================================================================

-- Devir İşlemleri
CREATE TABLE devir_islemleri (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Devir Bilgileri
    onceki_yil INTEGER NOT NULL,
    yeni_yil INTEGER NOT NULL,
    devir_tarihi TIMESTAMPTZ NOT NULL,
    
    -- Kasa Bilgileri
    kasa_id INTEGER REFERENCES kasalar(id),
    onceki_devir DECIMAL(15,2),
    yeni_devir DECIMAL(15,2),
    
    -- İşlem Bilgileri
    islem_yapan_kullanici INTEGER REFERENCES users(id),
    aciklama TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, kasa_id, yeni_yil)
);

CREATE INDEX idx_devir_tenant ON devir_islemleri(tenant_id);
CREATE INDEX idx_devir_yil ON devir_islemleri(tenant_id, yeni_yil);

-- ============================================================================
-- KÖY MODÜLÜ (Ayrı Muhasebe Sistemi)
-- ============================================================================

-- Köy Kasaları
CREATE TABLE koy_kasalar (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    kasa_adi VARCHAR(100) NOT NULL,
    para_birimi VARCHAR(10) DEFAULT 'TRY',
    aciklama TEXT,
    
    devir_bakiye DECIMAL(15,2) DEFAULT 0,
    toplam_gelir DECIMAL(15,2) DEFAULT 0,
    toplam_gider DECIMAL(15,2) DEFAULT 0,
    virman_giris DECIMAL(15,2) DEFAULT 0,
    virman_cikis DECIMAL(15,2) DEFAULT 0,
    fiziksel_bakiye DECIMAL(15,2) DEFAULT 0,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    UNIQUE(tenant_id, kasa_adi)
);

CREATE INDEX idx_koy_kasalar_tenant ON koy_kasalar(tenant_id);
CREATE INDEX idx_koy_kasalar_sync ON koy_kasalar(sync_id);

-- ============================================================================

-- Köy Gelir Türleri
CREATE TABLE koy_gelir_turleri (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    tur_adi VARCHAR(100) NOT NULL,
    ust_kategori VARCHAR(100),
    aciklama TEXT,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, tur_adi)
);

CREATE INDEX idx_koy_gelir_turleri_tenant ON koy_gelir_turleri(tenant_id);

-- ============================================================================

-- Köy Gelirleri
CREATE TABLE koy_gelirleri (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    kasa_id INTEGER REFERENCES koy_kasalar(id) ON DELETE RESTRICT,
    gelir_turu_id INTEGER REFERENCES koy_gelir_turleri(id),
    
    tarih DATE NOT NULL,
    belge_no VARCHAR(100),
    gelir_turu VARCHAR(100),
    alt_kategori VARCHAR(100),
    aciklama TEXT NOT NULL,
    tutar DECIMAL(15,2) NOT NULL,
    tahsil_eden VARCHAR(100),
    dekont_no VARCHAR(100),
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_koy_gelirleri_tenant ON koy_gelirleri(tenant_id);
CREATE INDEX idx_koy_gelirleri_kasa ON koy_gelirleri(kasa_id);
CREATE INDEX idx_koy_gelirleri_tarih ON koy_gelirleri(tenant_id, tarih);
CREATE INDEX idx_koy_gelirleri_sync ON koy_gelirleri(sync_id);

-- ============================================================================

-- Köy Gider Türleri
CREATE TABLE koy_gider_turleri (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    tur_adi VARCHAR(100) NOT NULL,
    ust_kategori VARCHAR(100),
    aciklama TEXT,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, tur_adi)
);

CREATE INDEX idx_koy_gider_turleri_tenant ON koy_gider_turleri(tenant_id);

-- ============================================================================

-- Köy Giderleri
CREATE TABLE koy_giderleri (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    kasa_id INTEGER REFERENCES koy_kasalar(id) ON DELETE RESTRICT,
    gider_turu_id INTEGER REFERENCES koy_gider_turleri(id),
    
    tarih DATE NOT NULL,
    islem_no VARCHAR(100),
    gider_turu VARCHAR(100),
    alt_kategori VARCHAR(100),
    aciklama TEXT NOT NULL,
    tutar DECIMAL(15,2) NOT NULL,
    odeyen VARCHAR(100),
    fatura_no VARCHAR(100),
    notlar TEXT,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_koy_giderleri_tenant ON koy_giderleri(tenant_id);
CREATE INDEX idx_koy_giderleri_kasa ON koy_giderleri(kasa_id);
CREATE INDEX idx_koy_giderleri_tarih ON koy_giderleri(tenant_id, tarih);
CREATE INDEX idx_koy_giderleri_sync ON koy_giderleri(sync_id);

-- ============================================================================

-- Köy Virmanları
CREATE TABLE koy_virmanlar (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    kaynak_kasa_id INTEGER REFERENCES koy_kasalar(id) ON DELETE RESTRICT,
    hedef_kasa_id INTEGER REFERENCES koy_kasalar(id) ON DELETE RESTRICT,
    
    tarih DATE NOT NULL,
    tutar DECIMAL(15,2) NOT NULL,
    aciklama TEXT,
    
    -- Sync & Audit
    sync_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    version INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    CONSTRAINT koy_virman_farkli_kasa CHECK (kaynak_kasa_id != hedef_kasa_id)
);

CREATE INDEX idx_koy_virmanlar_tenant ON koy_virmanlar(tenant_id);
CREATE INDEX idx_koy_virmanlar_kaynak ON koy_virmanlar(kaynak_kasa_id);
CREATE INDEX idx_koy_virmanlar_hedef ON koy_virmanlar(hedef_kasa_id);
CREATE INDEX idx_koy_virmanlar_tarih ON koy_virmanlar(tenant_id, tarih);
CREATE INDEX idx_koy_virmanlar_sync ON koy_virmanlar(sync_id);

-- ============================================================================
-- SYNC INFRASTRUCTURE (HYBRID Mode)
-- ============================================================================

-- Sync Changes (Delta Sync)
CREATE TABLE sync_changes (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Change Info
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    operation VARCHAR(20) NOT NULL,  -- INSERT, UPDATE, DELETE
    
    -- Data
    data JSONB,  -- Full record snapshot
    
    -- Metadata
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by INTEGER REFERENCES users(id),
    device_id VARCHAR(200),  -- Desktop/Mobile device identifier
    
    -- Sync Status
    synced BOOLEAN DEFAULT false,
    synced_at TIMESTAMPTZ,
    sync_error TEXT
);

CREATE INDEX idx_sync_changes_tenant ON sync_changes(tenant_id);
CREATE INDEX idx_sync_changes_table ON sync_changes(tenant_id, table_name);
CREATE INDEX idx_sync_changes_time ON sync_changes(tenant_id, changed_at);
CREATE INDEX idx_sync_changes_synced ON sync_changes(tenant_id, synced);

-- ============================================================================

-- Sync Conflicts
CREATE TABLE sync_conflicts (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Conflict Info
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    
    -- Versions
    local_version INTEGER,
    server_version INTEGER,
    local_data JSONB,
    server_data JSONB,
    
    -- Resolution
    resolution VARCHAR(50),  -- SERVER_WINS, CLIENT_WINS, MANUAL, PENDING
    resolved_data JSONB,
    resolved_at TIMESTAMPTZ,
    resolved_by INTEGER REFERENCES users(id),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_conflicts_tenant ON sync_conflicts(tenant_id);
CREATE INDEX idx_sync_conflicts_table ON sync_conflicts(tenant_id, table_name);
CREATE INDEX idx_sync_conflicts_resolution ON sync_conflicts(tenant_id, resolution);

-- ============================================================================
-- SYSTEM TABLES
-- ============================================================================

-- Ayarlar (Dernek Ayarları)
CREATE TABLE ayarlar (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    anahtar VARCHAR(100) NOT NULL,
    deger TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, anahtar)
);

CREATE INDEX idx_ayarlar_tenant ON ayarlar(tenant_id);

-- ============================================================================

-- İşlem Logları (Audit Trail)
CREATE TABLE islem_loglari (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- İşlem Bilgileri
    kullanici_id INTEGER REFERENCES users(id),
    islem_turu VARCHAR(50),  -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, vb.
    modül VARCHAR(50),  -- uyeler, aidat, gelir, gider, vb.
    kayit_id INTEGER,
    
    -- Detaylar
    aciklama TEXT,
    eski_deger JSONB,
    yeni_deger JSONB,
    
    -- IP ve Cihaz
    ip_adresi VARCHAR(50),
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_islem_loglari_tenant ON islem_loglari(tenant_id);
CREATE INDEX idx_islem_loglari_kullanici ON islem_loglari(kullanici_id);
CREATE INDEX idx_islem_loglari_tarih ON islem_loglari(created_at);
CREATE INDEX idx_islem_loglari_modul ON islem_loglari(tenant_id, modül);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE uyeler ENABLE ROW LEVEL SECURITY;
ALTER TABLE uye_aile_uyeleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE aidat_takip ENABLE ROW LEVEL SECURITY;
ALTER TABLE aidat_odemeleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE kasalar ENABLE ROW LEVEL SECURITY;
ALTER TABLE gelir_turleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE gelirler ENABLE ROW LEVEL SECURITY;
ALTER TABLE gider_turleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE giderler ENABLE ROW LEVEL SECURITY;
ALTER TABLE virmanlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE etkinlikler ENABLE ROW LEVEL SECURITY;
ALTER TABLE toplantilar ENABLE ROW LEVEL SECURITY;
ALTER TABLE belgeler ENABLE ROW LEVEL SECURITY;
ALTER TABLE butce_planlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE devir_islemleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE koy_kasalar ENABLE ROW LEVEL SECURITY;
ALTER TABLE koy_gelir_turleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE koy_gelirleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE koy_gider_turleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE koy_giderleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE koy_virmanlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ayarlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE islem_loglari ENABLE ROW LEVEL SECURITY;

-- RLS Policies (örnek - middleware tarafından current_setting ile tenant_id set edilir)
CREATE POLICY tenant_isolation ON uyeler
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Diğer tablolar için de aynı pattern uygulanır

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Updated_at Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uyeler_updated_at BEFORE UPDATE ON uyeler
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- (Diğer tüm tablolar için aynı trigger uygulanır)

-- ============================================================================

-- Auto-increment Version on UPDATE
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_uyeler_version BEFORE UPDATE ON uyeler
    FOR EACH ROW EXECUTE FUNCTION increment_version();

-- (Sync-aware tüm tablolar için aynı trigger)

-- ============================================================================

-- Kasa Bakiye Güncelleme Function
CREATE OR REPLACE FUNCTION update_kasa_bakiye(kasa_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE kasalar SET
        toplam_gelir = COALESCE((SELECT SUM(tutar) FROM gelirler WHERE kasa_id = kasa_id_param AND is_deleted = false), 0),
        toplam_gider = COALESCE((SELECT SUM(tutar) FROM giderler WHERE kasa_id = kasa_id_param AND is_deleted = false), 0),
        virman_giris = COALESCE((SELECT SUM(tutar) FROM virmanlar WHERE hedef_kasa_id = kasa_id_param AND is_deleted = false), 0),
        virman_cikis = COALESCE((SELECT SUM(tutar) FROM virmanlar WHERE kaynak_kasa_id = kasa_id_param AND is_deleted = false), 0),
        fiziksel_bakiye = devir_bakiye + 
            COALESCE((SELECT SUM(tutar) FROM gelirler WHERE kasa_id = kasa_id_param AND is_deleted = false), 0) -
            COALESCE((SELECT SUM(tutar) FROM giderler WHERE kasa_id = kasa_id_param AND is_deleted = false), 0) +
            COALESCE((SELECT SUM(tutar) FROM virmanlar WHERE hedef_kasa_id = kasa_id_param AND is_deleted = false), 0) -
            COALESCE((SELECT SUM(tutar) FROM virmanlar WHERE kaynak_kasa_id = kasa_id_param AND is_deleted = false), 0)
    WHERE id = kasa_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================

-- Aidat Durum Güncelleme Function
CREATE OR REPLACE FUNCTION update_aidat_durum(aidat_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    toplam_odeme DECIMAL(10,2);
    yillik_tutar DECIMAL(10,2);
    yeni_durum VARCHAR(20);
BEGIN
    SELECT 
        COALESCE(SUM(tutar), 0),
        at.yillik_aidat_tutari
    INTO toplam_odeme, yillik_tutar
    FROM aidat_odemeleri ao
    JOIN aidat_takip at ON ao.aidat_id = at.id
    WHERE ao.aidat_id = aidat_id_param AND ao.is_deleted = false
    GROUP BY at.yillik_aidat_tutari;
    
    IF toplam_odeme >= yillik_tutar THEN
        yeni_durum = 'Tamamlandı';
    ELSIF toplam_odeme > 0 THEN
        yeni_durum = 'Kısmi';
    ELSE
        yeni_durum = 'Eksik';
    END IF;
    
    UPDATE aidat_takip SET
        odenen_tutar = toplam_odeme,
        kalan_tutar = yillik_aidat_tutari - toplam_odeme,
        durum = yeni_durum
    WHERE id = aidat_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Varsayılan Gelir Türleri (her tenant için oluşturulacak)
-- INSERT INTO gelir_turleri (tenant_id, tur_adi) VALUES
-- (tenant_id, 'AİDAT'), (tenant_id, 'BAĞIŞ'), (tenant_id, 'KİRA'), ...

-- Varsayılan Gider Türleri
-- INSERT INTO gider_turleri (tenant_id, tur_adi) VALUES
-- (tenant_id, 'ELEKTRİK'), (tenant_id, 'SU'), (tenant_id, 'DOĞALGAZ'), ...

-- ============================================================================
-- VIEWS (Raporlama için yardımcı görünümler)
-- ============================================================================

-- Üye Aidat Özeti View
CREATE OR REPLACE VIEW v_uye_aidat_ozet AS
SELECT 
    u.tenant_id,
    u.id as uye_id,
    u.uye_no,
    u.ad_soyad,
    COUNT(DISTINCT at.yil) as kayitli_yil_sayisi,
    COUNT(DISTINCT CASE WHEN at.durum = 'Tamamlandı' THEN at.yil END) as odenen_yil_sayisi,
    COALESCE(SUM(at.yillik_aidat_tutari), 0) as toplam_beklenen,
    COALESCE(SUM(at.odenen_tutar), 0) as toplam_odenen,
    COALESCE(SUM(at.kalan_tutar), 0) as toplam_borc
FROM uyeler u
LEFT JOIN aidat_takip at ON u.id = at.uye_id AND at.is_deleted = false
WHERE u.is_deleted = false
GROUP BY u.tenant_id, u.id, u.uye_no, u.ad_soyad;

-- ============================================================================

-- Mali Özet View
CREATE OR REPLACE VIEW v_mali_ozet AS
SELECT 
    tenant_id,
    DATE_TRUNC('month', tarih) as ay,
    COALESCE(SUM(CASE WHEN tur = 'GELİR' THEN tutar ELSE 0 END), 0) as toplam_gelir,
    COALESCE(SUM(CASE WHEN tur = 'GİDER' THEN tutar ELSE 0 END), 0) as toplam_gider,
    COALESCE(SUM(CASE WHEN tur = 'GELİR' THEN tutar ELSE -tutar END), 0) as net
FROM (
    SELECT tenant_id, tarih, 'GELİR' as tur, tutar FROM gelirler WHERE is_deleted = false
    UNION ALL
    SELECT tenant_id, tarih, 'GİDER' as tur, tutar FROM giderler WHERE is_deleted = false
) mali_islemler
GROUP BY tenant_id, DATE_TRUNC('month', tarih);

-- ============================================================================
-- ROL VE YETKİ YÖNETİMİ (Ekleme: 2026-01-08)
-- ============================================================================

-- Roles tablosu - Rol tanımları
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_roles_tenant ON roles(tenant_id);
CREATE INDEX idx_roles_active ON roles(is_active);

COMMENT ON TABLE roles IS 'Rol tanımları - her tenant için özelleştirilebilir roller';
COMMENT ON COLUMN roles.permissions IS 'Rol için izin kodları array - ["uyeler.ekle", "uyeler.duzenle", "mali.goruntule"]';
COMMENT ON COLUMN roles.is_system IS 'Sistem rolü mü (ADMIN, MUHASEBECI vb.) - silinemeyen roller';

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_tenant_isolation ON roles
    USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- User Roles tablosu - Kullanıcı-Rol ilişkisi
CREATE TABLE user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

COMMENT ON TABLE user_roles IS 'Kullanıcı-Rol ilişkileri - bir kullanıcı birden fazla rol alabilir';

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_roles_tenant_isolation ON user_roles
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = user_roles.user_id 
            AND users.tenant_id::text = current_setting('app.current_tenant', TRUE)
        )
    );

-- Permissions tablosu - İzin tanımları (global)
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permissions_module ON permissions(module);
CREATE INDEX idx_permissions_category ON permissions(category);

COMMENT ON TABLE permissions IS 'Sistem izinleri - global tanımlar (tenant''a bağlı değil)';
COMMENT ON COLUMN permissions.code IS 'Benzersiz izin kodu - örn: "uyeler.ekle", "mali.goruntule"';

-- Varsayılan izinleri ekle
INSERT INTO permissions (code, module, name, description, category) VALUES
-- Üye yönetimi
('uyeler.goruntule', 'uyeler', 'Üyeleri Görüntüle', 'Üye listesini ve detaylarını görüntüleme', 'uyeler'),
('uyeler.ekle', 'uyeler', 'Üye Ekle', 'Yeni üye ekleme', 'uyeler'),
('uyeler.duzenle', 'uyeler', 'Üye Düzenle', 'Üye bilgilerini güncelleme', 'uyeler'),
('uyeler.sil', 'uyeler', 'Üye Sil', 'Üye silme/arşivleme', 'uyeler'),
('uyeler.export', 'uyeler', 'Üye Export', 'Üye listesini Excel/PDF olarak dışa aktarma', 'uyeler'),
-- Aidat yönetimi
('aidat.goruntule', 'aidat', 'Aidat Görüntüle', 'Aidat kayıtlarını görüntüleme', 'aidat'),
('aidat.ekle', 'aidat', 'Aidat Ekle', 'Aidat ödeme kaydı ekleme', 'aidat'),
('aidat.duzenle', 'aidat', 'Aidat Düzenle', 'Aidat kaydını düzenleme', 'aidat'),
('aidat.sil', 'aidat', 'Aidat Sil', 'Aidat kaydını silme', 'aidat'),
('aidat.toplu_olustur', 'aidat', 'Toplu Aidat Oluştur', 'Tüm üyeler için yıllık aidat oluşturma', 'aidat'),
-- Mali işlemler
('mali.goruntule', 'mali', 'Mali İşlemleri Görüntüle', 'Gelir/gider/kasa görüntüleme', 'mali'),
('gelir.ekle', 'mali', 'Gelir Ekle', 'Gelir kaydı ekleme', 'mali'),
('gelir.duzenle', 'mali', 'Gelir Düzenle', 'Gelir kaydı düzenleme', 'mali'),
('gelir.sil', 'mali', 'Gelir Sil', 'Gelir kaydı silme', 'mali'),
('gider.ekle', 'mali', 'Gider Ekle', 'Gider kaydı ekleme', 'mali'),
('gider.duzenle', 'mali', 'Gider Düzenle', 'Gider kaydı düzenleme', 'mali'),
('gider.sil', 'mali', 'Gider Sil', 'Gider kaydı silme', 'mali'),
('kasa.goruntule', 'mali', 'Kasa Görüntüle', 'Kasa bakiyelerini görüntüleme', 'mali'),
('kasa.yonet', 'mali', 'Kasa Yönet', 'Kasa ekleme/düzenleme/silme', 'mali'),
('virman.ekle', 'mali', 'Virman Ekle', 'Kasalar arası transfer yapma', 'mali'),
-- Raporlar
('raporlar.goruntule', 'raporlar', 'Raporları Görüntüle', 'Tüm raporları görüntüleme', 'raporlar'),
('raporlar.export', 'raporlar', 'Rapor Export', 'Raporları Excel/PDF olarak dışa aktarma', 'raporlar'),
-- Etkinlik ve Toplantı
('etkinlik.goruntule', 'etkinlik', 'Etkinlik Görüntüle', 'Etkinlikleri görüntüleme', 'etkinlik'),
('etkinlik.ekle', 'etkinlik', 'Etkinlik Ekle', 'Yeni etkinlik oluşturma', 'etkinlik'),
('etkinlik.duzenle', 'etkinlik', 'Etkinlik Düzenle', 'Etkinlik düzenleme', 'etkinlik'),
('etkinlik.sil', 'etkinlik', 'Etkinlik Sil', 'Etkinlik silme', 'etkinlik'),
('toplanti.goruntule', 'toplanti', 'Toplantı Görüntüle', 'Toplantıları görüntüleme', 'toplanti'),
('toplanti.ekle', 'toplanti', 'Toplantı Ekle', 'Yeni toplantı oluşturma', 'toplanti'),
('toplanti.duzenle', 'toplanti', 'Toplantı Düzenle', 'Toplantı düzenleme', 'toplanti'),
('toplanti.sil', 'toplanti', 'Toplantı Sil', 'Toplantı silme', 'toplanti'),
-- Belgeler
('belge.goruntule', 'belge', 'Belge Görüntüle', 'Belgeleri görüntüleme', 'belge'),
('belge.ekle', 'belge', 'Belge Ekle', 'Belge yükleme', 'belge'),
('belge.duzenle', 'belge', 'Belge Düzenle', 'Belge bilgilerini düzenleme', 'belge'),
('belge.sil', 'belge', 'Belge Sil', 'Belge silme', 'belge'),
-- Bütçe
('butce.goruntule', 'butce', 'Bütçe Görüntüle', 'Bütçe planlarını görüntüleme', 'butce'),
('butce.yonet', 'butce', 'Bütçe Yönet', 'Bütçe planlama ve düzenleme', 'butce'),
-- Devir işlemleri
('devir.goruntule', 'devir', 'Devir Görüntüle', 'Devir kayıtlarını görüntüleme', 'devir'),
('devir.uygula', 'devir', 'Devir Uygula', 'Yıl sonu devir işlemini uygulama', 'devir'),
-- Köy modülü
('koy.goruntule', 'koy', 'Köy Modülü Görüntüle', 'Köy işlemlerini görüntüleme', 'koy'),
('koy.yonet', 'koy', 'Köy Modülü Yönet', 'Köy işlemlerini yönetme', 'koy'),
-- Kullanıcı yönetimi
('kullanici.goruntule', 'kullanici', 'Kullanıcı Görüntüle', 'Kullanıcı listesini görüntüleme', 'kullanici'),
('kullanici.ekle', 'kullanici', 'Kullanıcı Ekle', 'Yeni kullanıcı ekleme', 'kullanici'),
('kullanici.duzenle', 'kullanici', 'Kullanıcı Düzenle', 'Kullanıcı bilgilerini güncelleme', 'kullanici'),
('kullanici.sil', 'kullanici', 'Kullanıcı Sil', 'Kullanıcı silme/devre dışı bırakma', 'kullanici'),
('rol.yonet', 'kullanici', 'Rol Yönet', 'Rol atama/kaldırma', 'kullanici'),
-- Ayarlar
('ayarlar.goruntule', 'ayarlar', 'Ayarları Görüntüle', 'Sistem ayarlarını görüntüleme', 'ayarlar'),
('ayarlar.duzenle', 'ayarlar', 'Ayarları Düzenle', 'Sistem ayarlarını değiştirme', 'ayarlar'),
-- Sistem
('sistem.yedekleme', 'sistem', 'Yedekleme', 'Veritabanı yedeği alma/geri yükleme', 'sistem'),
('sistem.loglari_goruntule', 'sistem', 'Logları Görüntüle', 'Sistem loglarını görüntüleme', 'sistem'),
('sistem.admin', 'sistem', 'Sistem Yönetimi', 'Tam sistem yönetimi yetkisi', 'sistem')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Şema Versiyonu
CREATE TABLE IF NOT EXISTS schema_version (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schema_version (version) VALUES ('3.0.0');
