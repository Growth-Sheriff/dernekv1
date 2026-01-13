# 🚀 BADER V3 - Kurulum Özeti

**Tarih:** 8 Ocak 2026  
**Durum:** ✅ Veritabanı Hazır - Desktop Geliştirmeye Başlanabilir

---

## ✅ Tamamlanan İşlemler

### 1. Dokümantasyon
- ✅ [yeni-sistem.md](yeni-sistem.md) - Eksiksiz mimari dökümanı (3700+ satır)
- ✅ [database-schema.sql](database-schema.sql) - PostgreSQL şeması (1232 satır, 29 tablo)
- ✅ [dosya-dizini.md](dosya-dizini.md) - Tam proje dosya yapısı
- ✅ [lisans-modul-entegrasyonu.md](lisans-modul-entegrasyonu.md) - Lisans-modül entegrasyonu
- ✅ [onboarding-flow.md](onboarding-flow.md) - Kullanıcı onboarding akışı

### 2. Sunucu Altyapısı (SSH: bader-app)
- ✅ Eski proje dosyaları temizlendi (~/bader, ~/server-v2, vb.)
- ✅ PostgreSQL 16 kuruldu ve yapılandırıldı
- ✅ Database oluşturuldu: `bader_db`
- ✅ Database user oluşturuldu: `bader_user`
- ✅ 29 tablo + 2 view başarıyla oluşturuldu
- ✅ Extensions kuruldu: uuid-ossp, pgcrypto
- ✅ Row-Level Security (RLS) aktif

### 3. Veritabanı Tabloları (29 Tablo)

#### Foundation (Multi-Tenant Core)
1. **tenants** - Dernekler
2. **licenses** - Lisans yönetimi (LOCAL/ONLINE/HYBRID)
3. **users** - Kullanıcılar ve personel (RBAC)

#### Member Management
4. **uyeler** - Üyeler (30+ kolon)
5. **uye_aile_uyeleri** - Aile üyeleri

#### Aidat System
6. **aidat_takip** - Yıllık aidat takibi
7. **aidat_odemeleri** - Aidat ödeme kayıtları

#### Financial Management
8. **kasalar** - Kasalar
9. **gelir_turleri** - Gelir kategorileri
10. **gelirler** - Gelir kayıtları
11. **gider_turleri** - Gider kategorileri
12. **giderler** - Gider kayıtları
13. **virmanlar** - Kasalar arası transferler

#### Events & Meetings
14. **etkinlikler** - Etkinlikler
15. **toplantilar** - Toplantılar

#### Documents & Budget
16. **belgeler** - Belge yönetimi
17. **butce_planlari** - Bütçe planları
18. **devir_islemleri** - Yıl sonu devir

#### Köy Modülü (Ayrı Muhasebe)
19. **koy_kasalar** - Köy kasaları
20. **koy_gelir_turleri** - Köy gelir türleri
21. **koy_gelirleri** - Köy gelirleri
22. **koy_gider_turleri** - Köy gider türleri
23. **koy_giderleri** - Köy giderleri
24. **koy_virmanlar** - Köy virmanları

#### Sync Infrastructure (HYBRID Mode)
25. **sync_changes** - Delta sync kayıtları
26. **sync_conflicts** - Sync çakışma yönetimi

#### System Tables
27. **ayarlar** - Dernek ayarları
28. **islem_loglari** - Audit trail
29. **schema_version** - Şema versiyonu

#### Views
- **v_uye_aidat_ozet** - Üye aidat özet raporu
- **v_mali_ozet** - Aylık mali özet

---

## 📋 Veritabanı Bağlantı Bilgileri

### Production (Sunucu)
```env
DATABASE_URL=postgresql://bader_user:Bader2026Secure@localhost:5432/bader_db
HOST=bader-app (SSH alias)
PORT=5432
```

### Local Development (Backend)
```env
DATABASE_URL=postgresql://bader_user:Bader2026Secure@bader-app-ip:5432/bader_db
```

### Desktop (SQLite - Offline)
```
Windows:  C:\Users\{user}\AppData\Roaming\com.bader.app\bader.db
macOS:    ~/Library/Application Support/com.bader.app/bader.db
Linux:    ~/.config/com.bader.app/bader.db
```

---

## 🎯 Sıradaki Adımlar

### ÖNCE: Desktop Uygulaması (Tauri + React)

#### Faz 0: Proje Altyapısı (1 gün)
- [ ] **Backend API kurulumu gerekmez** - İlk aşamada sadece LOCAL mode (SQLite)
- [ ] Desktop klasörü oluştur: `mkdir -p desktop`
- [ ] Tauri projesi başlat: `npm create tauri-app@latest`
  ```
  Project name: desktop
  Choose which language: TypeScript
  Choose UI template: React
  ```
- [ ] Rust dependencies ekle (Cargo.toml):
  - diesel (SQLite ORM)
  - tokio (async runtime)
  - serde/serde_json
  - chrono, uuid
- [ ] React dependencies ekle (package.json):
  - @tanstack/react-query
  - zustand
  - recharts
  - react-router-dom
  - shadcn/ui components
  - tailwindcss
- [ ] Dosya yapısını oluştur (dosya-dizini.md'ye göre):
  - src-tauri/src/commands/
  - src-tauri/src/db/
  - src/components/
  - src/pages/
  - src/hooks/
  - src/store/

#### Faz 1: Veritabanı Layer (2 gün)
- [ ] SQLite schema oluştur (PostgreSQL schema'nın benzeri)
- [ ] Diesel migration dosyaları:
  - tenants, licenses, users
  - uyeler, aidat_takip, aidat_odemeleri
  - kasalar, gelirler, giderler, virmanlar
- [ ] Rust database modelleri (src-tauri/src/db/models.rs)
- [ ] CRUD fonksiyonları (her tablo için)

#### Faz 2: Tauri Commands (2 gün)
- [ ] Auth commands:
  - login, logout, get_current_user
- [ ] Üye commands:
  - list_uyeler, get_uye, create_uye, update_uye, delete_uye
- [ ] Aidat commands:
  - list_aidat, create_aidat_odeme, delete_aidat_odeme
- [ ] Mali commands:
  - list_kasalar, create_gelir, create_gider, create_virman

#### Faz 3: React UI - Core Pages (3 gün)
- [ ] Layout components:
  - Sidebar (menü)
  - Header (user menu)
  - Layout wrapper
- [ ] Login sayfası
- [ ] Dashboard sayfası (istatistikler + grafikler)
- [ ] Üyeler sayfası:
  - Liste (DataTable)
  - Form (Drawer)
  - Detay sayfası
  - Aidat sayfası

#### Faz 4: Mali İşlemler UI (2 gün)
- [ ] Kasalar sayfası
- [ ] Gelirler sayfası
- [ ] Giderler sayfası
- [ ] Virmanlar sayfası
- [ ] Aidat takip sayfası

#### Faz 5: License System (1 gün)
- [ ] License store (Zustand)
- [ ] FeatureGate component
- [ ] License validation logic
- [ ] Plan features (LOCAL/ONLINE/HYBRID)
- [ ] Offline activation flow

#### Faz 6: Raporlar ve Diğer (2 gün)
- [ ] Raporlar sayfası:
  - Borçlu üyeler
  - Mali durum
  - Tahsilat oranları
- [ ] Etkinlikler sayfası
- [ ] Toplantılar sayfası
- [ ] Belgeler sayfası
- [ ] Bütçe sayfası
- [ ] Ayarlar sayfası

#### Faz 7: Köy Modülü (HYBRID only) (1 gün)
- [ ] Köy dashboard
- [ ] Köy kasalar
- [ ] Köy gelirler
- [ ] Köy giderler
- [ ] Feature gate: `koy_modulu` (sadece HYBRID plan)

---

### SONRA: Backend API (FastAPI) - HYBRID/ONLINE için

#### Faz 8: Backend Altyapısı (2 gün)
- [ ] Backend klasörü oluştur
- [ ] FastAPI setup
- [ ] PostgreSQL bağlantısı
- [ ] SQLAlchemy ORM models
- [ ] Alembic migrations
- [ ] JWT authentication
- [ ] Tenant middleware (RLS)

#### Faz 9: Sync Engine (3 gün)
- [ ] Desktop sync worker (Rust)
- [ ] Backend sync endpoints:
  - GET /api/v1/sync/pull
  - POST /api/v1/sync/push
- [ ] Delta sync logic
- [ ] Conflict detection
- [ ] Conflict resolution UI

#### Faz 10: Desktop Sync Integration (2 gün)
- [ ] useSync hook
- [ ] Sync status indicator
- [ ] Manual sync trigger
- [ ] Background sync worker
- [ ] Conflict resolution modal

---

### ÇOK SONRA: Web App (Next.js) - ONLINE only

#### Faz 11: Web Frontend (5 gün)
- [ ] Next.js setup
- [ ] Shared components (desktop ile %90 aynı)
- [ ] API client (fetch wrapper)
- [ ] Authentication (NextAuth)
- [ ] Dashboard + tüm sayfalar

---

## 📂 Mevcut Dosya Yapısı

```
/Users/adiguzel/Desktop/baderone/
└── .github/
    ├── yeni-sistem.md                    # Ana mimari
    ├── database-schema.sql               # PostgreSQL şema
    ├── dosya-dizini.md                   # Dosya yapısı
    ├── lisans-modul-entegrasyonu.md      # Lisans entegrasyonu
    ├── onboarding-flow.md                # Onboarding akışı
    └── KURULUM_OZETI.md                  # Bu dosya
```

**Sıradaki:**
```
baderone/
├── .github/              # ✅ Hazır
├── desktop/              # ⏳ Şimdi oluşturulacak
├── backend/              # ⏸️ Desktop tamamlandıktan sonra
└── web/                  # ⏸️ En son
```

---

## 🔧 Gerekli Kurulumlar (Desktop için)

### macOS (Tauri requirements)
```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# System dependencies
xcode-select --install

# Node.js (eğer yoksa)
brew install node
```

### Windows
```bash
# Rust
https://www.rust-lang.org/tools/install

# Microsoft C++ Build Tools
https://visualstudio.microsoft.com/visual-cpp-build-tools/

# WebView2 (genellikle Windows 11'de var)
```

---

## 🧪 Test Verileri

İlk tenant ve test verileri için script:

```sql
-- Test tenant
INSERT INTO tenants (id, slug, name, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'demo-dernek', 'Demo Dernek', true);

-- Test license (LOCAL plan)
INSERT INTO licenses (tenant_id, license_key, plan, max_users, is_lifetime, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'BADER-DEMO-0000-0000-0001', 'LOCAL', 1, true, true);

-- Test admin user (password: admin123)
INSERT INTO users (tenant_id, username, password_hash, ad_soyad, role, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYKKjvL3gH6', 'Admin Kullanıcı', 'ADMIN', true);

-- Varsayılan kasa
INSERT INTO kasalar (tenant_id, kasa_adi, para_birimi, devir_bakiye) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Ana Kasa', 'TRY', 0);

-- Varsayılan gelir türleri
INSERT INTO gelir_turleri (tenant_id, tur_adi) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'AİDAT'),
('550e8400-e29b-41d4-a716-446655440000', 'BAĞIŞ'),
('550e8400-e29b-41d4-a716-446655440000', 'KİRA');

-- Varsayılan gider türleri
INSERT INTO gider_turleri (tenant_id, tur_adi) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'ELEKTRİK'),
('550e8400-e29b-41d4-a716-446655440000', 'SU'),
('550e8400-e29b-41d4-a716-446655440000', 'KİRA');
```

---

## 📞 Sunucu Erişimi

```bash
# SSH bağlantısı
ssh bader-app

# PostgreSQL bağlantısı (sunucu içinden)
sudo -u postgres psql -d bader_db

# Tablo listesi
\dt

# Tablo yapısı
\d uyeler

# Veri kontrolü
SELECT COUNT(*) FROM tenants;
```

---

## 🎉 Özet

✅ **Tamamlandı:**
- Mimari tasarım (Multi-tenant, RLS, Sync-aware)
- PostgreSQL database (29 tablo + 2 view)
- Sunucu kurulumu ve yapılandırması
- Dosya yapısı planlaması

⏳ **Sırada:**
- Desktop uygulaması (Tauri + React)
- SQLite database layer
- Core UI sayfaları
- License system

🎯 **Hedef:**
- 2 hafta içinde LOCAL modda çalışan desktop app
- 4 hafta içinde HYBRID modda sync ile tam özellikli sistem

---

**Hazırlayan:** GitHub Copilot  
**Tarih:** 8 Ocak 2026  
**Versiyon:** 3.0.0
