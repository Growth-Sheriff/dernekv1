"""
Complete Server Database Setup Script - V2
Creates all required tables matching SQLModel definitions exactly
"""
import sqlite3
import os

# Database path
db_paths = [
    '/app/database.db',
    './database.db',
    '/app/data/database.db',
]

db_path = None
for p in db_paths:
    if os.path.exists(p):
        db_path = p
        print(f"Found database at {p}")
        break

if not db_path:
    print("No database found!")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Drop and recreate tables to ensure schema matches model
print("🔄 Recreating tables to match SQLModel definitions...")

# ============================================================================
# KASA TABLOSU (matches Kasa model)
# ============================================================================
print("\n=== KASA TABLE ===")
cursor.execute("DROP TABLE IF EXISTS kasa")
cursor.execute("DROP TABLE IF EXISTS kasalar")
cursor.execute("""
CREATE TABLE kasa (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    kasa_adi TEXT NOT NULL,
    bakiye REAL NOT NULL DEFAULT 0,
    para_birimi TEXT NOT NULL DEFAULT 'TRY',
    devir_bakiye REAL DEFAULT 0,
    toplam_gelir REAL DEFAULT 0,
    toplam_gider REAL DEFAULT 0,
    virman_giris REAL DEFAULT 0,
    virman_cikis REAL DEFAULT 0,
    fiziksel_bakiye REAL DEFAULT 0,
    tahakkuk_tutari REAL DEFAULT 0,
    serbest_bakiye REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
""")
print("✅ kasa tablosu oluşturuldu")

# ============================================================================
# GELIR_TURLERI TABLOSU (matches GelirTuru model)
# ============================================================================
print("\n=== GELIR_TURLERI TABLE ===")
cursor.execute("DROP TABLE IF EXISTS gelir_turleri")
cursor.execute("""
CREATE TABLE gelir_turleri (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    ad TEXT NOT NULL,
    kod TEXT,
    aciklama TEXT,
    varsayilan_makbuz_prefix TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
""")
print("✅ gelir_turleri tablosu oluşturuldu")

# ============================================================================
# GIDER_TURLERI TABLOSU (matches GiderTuru model)
# ============================================================================
print("\n=== GIDER_TURLERI TABLE ===")
cursor.execute("DROP TABLE IF EXISTS gider_turleri")
cursor.execute("""
CREATE TABLE gider_turleri (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    ad TEXT NOT NULL,
    kod TEXT,
    aciklama TEXT,
    varsayilan_fatura_prefix TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
""")
print("✅ gider_turleri tablosu oluşturuldu")

# ============================================================================
# GELIRLER TABLOSU (matches Gelir model)
# ============================================================================
print("\n=== GELIRLER TABLE ===")
cursor.execute("DROP TABLE IF EXISTS gelirler")
cursor.execute("""
CREATE TABLE gelirler (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    kasa_id TEXT NOT NULL,
    gelir_turu TEXT,
    gelir_turu_id TEXT,
    alt_kategori TEXT,
    tarih TEXT NOT NULL,
    tutar REAL NOT NULL,
    aciklama TEXT,
    makbuz_no TEXT,
    belge_no TEXT,
    tahsil_eden TEXT,
    aidat_id TEXT,
    uye_id TEXT,
    ait_oldugu_yil INTEGER,
    tahakkuk_durumu TEXT,
    notlar TEXT,
    belge_id TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
""")
print("✅ gelirler tablosu oluşturuldu")

# ============================================================================
# GIDERLER TABLOSU (matches Gider model)
# ============================================================================
print("\n=== GIDERLER TABLE ===")
cursor.execute("DROP TABLE IF EXISTS giderler")
cursor.execute("""
CREATE TABLE giderler (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    kasa_id TEXT NOT NULL,
    gider_turu TEXT,
    gider_turu_id TEXT,
    alt_kategori TEXT,
    tarih TEXT NOT NULL,
    tutar REAL NOT NULL,
    aciklama TEXT,
    fatura_no TEXT,
    islem_no TEXT,
    odeyen TEXT,
    notlar TEXT,
    belge_id TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
""")
print("✅ giderler tablosu oluşturuldu")

# ============================================================================
# UYELER TABLOSU (matches Uye model)
# ============================================================================
print("\n=== UYELER TABLE ===")
cursor.execute("DROP TABLE IF EXISTS uyeler")
cursor.execute("""
CREATE TABLE uyeler (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    uye_no TEXT NOT NULL,
    tc_no TEXT NOT NULL,
    ad TEXT NOT NULL,
    soyad TEXT NOT NULL,
    ad_soyad TEXT NOT NULL,
    telefon TEXT,
    telefon2 TEXT,
    email TEXT,
    cinsiyet TEXT,
    dogum_tarihi TEXT,
    dogum_yeri TEXT,
    kan_grubu TEXT,
    aile_durumu TEXT,
    cocuk_sayisi INTEGER,
    egitim_durumu TEXT,
    meslek TEXT,
    is_yeri TEXT,
    adres TEXT,
    il TEXT,
    ilce TEXT,
    mahalle TEXT,
    posta_kodu TEXT,
    uyelik_tipi TEXT DEFAULT 'Asil',
    ozel_aidat_tutari REAL,
    aidat_indirimi_yuzde REAL,
    giris_tarihi TEXT NOT NULL,
    cikis_tarihi TEXT,
    durum TEXT DEFAULT 'Aktif',
    referans_uye_id TEXT,
    ayrilma_nedeni TEXT,
    notlar TEXT,
    sync_id TEXT,
    version INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
""")
print("✅ uyeler tablosu oluşturuldu")

# ============================================================================
# AIDAT_TAKIP TABLOSU (matches AidatTakip model)
# ============================================================================
print("\n=== AIDAT_TAKIP TABLE ===")
cursor.execute("DROP TABLE IF EXISTS aidat_takip")
cursor.execute("""
CREATE TABLE aidat_takip (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    uye_id TEXT NOT NULL,
    yil INTEGER NOT NULL,
    ay INTEGER NOT NULL,
    tutar REAL DEFAULT 0.0,
    odenen REAL DEFAULT 0.0,
    kalan REAL,
    odeme_tarihi TEXT,
    durum TEXT DEFAULT 'beklemede',
    gecikme_gun INTEGER,
    gecikme_faiz REAL,
    tahsilat_turu TEXT,
    banka_sube TEXT,
    dekont_no TEXT,
    aciklama TEXT,
    notlar TEXT,
    gelir_id TEXT,
    aktarim_durumu TEXT,
    version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
""")
print("✅ aidat_takip tablosu oluşturuldu")

# ============================================================================
# VIRMANLAR TABLOSU (matches Virman model)
# ============================================================================
print("\n=== VIRMANLAR TABLE ===")
cursor.execute("DROP TABLE IF EXISTS virmanlar")
cursor.execute("""
CREATE TABLE virmanlar (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    kaynak_kasa_id TEXT NOT NULL,
    hedef_kasa_id TEXT NOT NULL,
    tarih TEXT NOT NULL,
    tutar REAL NOT NULL,
    aciklama TEXT,
    kaynak_para_birimi TEXT,
    hedef_para_birimi TEXT,
    kaynak_tutar REAL,
    hedef_tutar REAL,
    uygulanan_kur REAL,
    kur_id TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
""")
print("✅ virmanlar tablosu oluşturuldu")

# ============================================================================
# SYNC_CHANGES TABLOSU (matches SyncChange model)
# ============================================================================
print("\n=== SYNC_CHANGES TABLE ===")
cursor.execute("DROP TABLE IF EXISTS sync_changes")
cursor.execute("""
CREATE TABLE sync_changes (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    data TEXT,
    synced INTEGER DEFAULT 0,
    sync_version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
)
""")
print("✅ sync_changes tablosu oluşturuldu")

# ============================================================================
# ETKINLIKLER TABLOSU
# ============================================================================
print("\n=== ETKINLIKLER TABLE ===")
cursor.execute("DROP TABLE IF EXISTS etkinlikler")
cursor.execute("""
CREATE TABLE etkinlikler (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    baslik TEXT NOT NULL,
    aciklama TEXT,
    baslangic_tarihi TEXT NOT NULL,
    bitis_tarihi TEXT,
    konum TEXT,
    etkinlik_turu TEXT,
    kapasite INTEGER,
    katilimci_sayisi INTEGER DEFAULT 0,
    durum TEXT DEFAULT 'Planlandi',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
""")
print("✅ etkinlikler tablosu oluşturuldu")

# ============================================================================
# TOPLANTILAR TABLOSU
# ============================================================================
print("\n=== TOPLANTILAR TABLE ===")
cursor.execute("DROP TABLE IF EXISTS toplantilar")
cursor.execute("""
CREATE TABLE toplantilar (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL,
    baslik TEXT NOT NULL,
    tarih TEXT NOT NULL,
    saat TEXT,
    konum TEXT,
    gundem TEXT,
    kararlar TEXT,
    katilimcilar TEXT,
    durum TEXT DEFAULT 'Planlandi',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
""")
print("✅ toplantilar tablosu oluşturuldu")

conn.commit()

# ============================================================================
# DEMO VERİ EKLEMELERİ
# ============================================================================
print("\n=== DEMO DATA ===")
TENANT_ID = 'd047fe07-6ad5-466a-bae5-b9b5eb49400a'
NOW = "datetime('now')"

# Demo kasa
cursor.execute(f"""
INSERT INTO kasa (id, tenant_id, kasa_adi, bakiye, para_birimi, created_at, updated_at)
VALUES ('kasa-demo-001', '{TENANT_ID}', 'Ana Kasa', 0, 'TRY', datetime('now'), datetime('now'))
""")
print("✅ Demo kasa eklendi")

# Varsayılan gelir türleri
gelir_turleri = [
    ('gt-001', 'Aidat', 'AID'),
    ('gt-002', 'Bağış', 'BAG'),
    ('gt-003', 'Etkinlik Geliri', 'ETK'),
    ('gt-004', 'Diğer', 'DIG'),
]
for gt_id, ad, kod in gelir_turleri:
    cursor.execute(f"""
    INSERT INTO gelir_turleri (id, tenant_id, ad, kod, created_at, updated_at)
    VALUES ('{gt_id}', '{TENANT_ID}', '{ad}', '{kod}', datetime('now'), datetime('now'))
    """)
print("✅ Demo gelir türleri eklendi")

# Varsayılan gider türleri
gider_turleri = [
    ('gdt-001', 'Kira', 'KIR'),
    ('gdt-002', 'Elektrik', 'ELK'),
    ('gdt-003', 'Su', 'SU'),
    ('gdt-004', 'Personel', 'PER'),
    ('gdt-005', 'Diğer', 'DIG'),
]
for gdt_id, ad, kod in gider_turleri:
    cursor.execute(f"""
    INSERT INTO gider_turleri (id, tenant_id, ad, kod, created_at, updated_at)
    VALUES ('{gdt_id}', '{TENANT_ID}', '{ad}', '{kod}', datetime('now'), datetime('now'))
    """)
print("✅ Demo gider türleri eklendi")

conn.commit()

# ============================================================================
# VERİFİKASYON
# ============================================================================
print("\n=== VERIFICATION ===")
tables = ['kasa', 'uyeler', 'gelirler', 'giderler', 'gelir_turleri', 'gider_turleri', 
          'aidat_takip', 'virmanlar', 'sync_changes', 'etkinlikler', 'toplantilar']

for table in tables:
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"  ✅ {table}: {count} kayıt")
    except Exception as e:
        print(f"  ❌ {table}: {e}")

conn.close()
print("\n✅ Sunucu veritabanı hazır!")
