# 📋 BADER EKSİK SİSTEMLER VE GELİŞTİRME PLANI

**Tarih:** 13 Ocak 2026  
**Son Güncelleme:** 13 Ocak 2026 (Desktop hazırlıkları tamamlandı)  
**Proje:** BADER Dernek Yönetim Sistemi  
**Durum:** Faz 0-2 Tamamlandı, Desktop Online Hazırlığı Yapıldı

---

## 📊 MEVCUT DURUM ÖZETİ

| Sistem | Planlama | Backend | Desktop | Web Frontend | Tamamlanma |
|--------|----------|---------|---------|--------------|------------|
| **Lisans Sistemi** | ✅ %100 | 🔴 %10 | 🟡 %50 | 🔴 %0 | **~30%** |
| **Senkronizasyon** | ✅ %100 | 🔴 %5 | ✅ %70 | 🔴 %0 | **~35%** |
| **Süper Admin** | ✅ %100 | 🔴 %15 | N/A | 🔴 %0 | **~10%** |
| **Offline/Online** | ✅ %100 | N/A | ✅ %80 | N/A | **~40%** |
| **Web Arayüzü** | ✅ %100 | 🟡 %60 | N/A | 🔴 %5 | **~20%** |

---

## ✅ BU OTURUMDA TAMAMLANANLAR (13 Ocak 2026)

### Desktop Tarafı - Online/Sync/API Hazırlığı

| Dosya | Açıklama | Durum |
|-------|----------|-------|
| `desktop/src/lib/api.ts` | HTTP Client + License/Sync/Auth API | ✅ TAMAMLANDI |
| `desktop/src/hooks/useSync.ts` | Sync hook (push/pull/queue) | ✅ TAMAMLANDI |
| `desktop/src/hooks/useNetworkStatus.ts` | Online/offline detection | ✅ TAMAMLANDI |
| `desktop/src/store/appStore.ts` | Uygulama state yönetimi | ✅ TAMAMLANDI |
| `desktop/src/components/ui/connection-status.tsx` | Header bağlantı göstergesi | ✅ TAMAMLANDI |
| `desktop/src-tauri/src/commands/sync.rs` | Sync komutları (6 yeni fonksiyon) | ✅ TAMAMLANDI |
| `desktop/src-tauri/Cargo.toml` | hostname crate eklendi | ✅ TAMAMLANDI |

### Yeni Eklenen Rust Komutları
- `get_pending_sync_count` - Bekleyen değişiklik sayısı
- `get_pending_sync_changes` - Bekleyen değişiklikleri JSON olarak döndür
- `mark_changes_synced` - Sync edilenleri işaretle
- `queue_sync_change` - Değişiklik kuyruğa ekle
- `apply_sync_changes` - Sunucudan gelen değişiklikleri uygula
- `get_device_id` - Hardware fingerprint

---

## 🔐 1. LİSANS SİSTEMİ

### 1.1 Mevcut Dosyalar

| Bileşen | Dosya | Durum |
|---------|-------|-------|
| Backend Model | `backend/app/models/license.py` | 🔴 SKELETON |
| Backend Service | `backend/app/services/license_service.py` | 🔴 TODO |
| Backend API | `backend/app/api/v1/licenses.py` | 🔴 STUB (501) |
| Desktop Store | `desktop/src/store/licenseStore.ts` | ✅ Çalışıyor |
| Desktop Commands | `desktop/src-tauri/src/commands/license.rs` | 🟡 Format kontrolü var |
| **Desktop API Client** | `desktop/src/lib/api.ts` | ✅ **YENİ** |

### 1.2 Lisans Modları

| Mod | Açıklama | Durum |
|-----|----------|-------|
| **LOCAL** | Tamamen offline, lisans dosyası ile çalışır | 🟡 Kısmi |
| **ONLINE** | Sunucu ile sürekli bağlantı gerekir | 🟡 API hazır |
| **HYBRID** | Offline çalışır, periyodik online doğrulama | 🟡 API hazır |
| **DEMO** | 30 günlük deneme, sınırlı özellik | ✅ Çalışıyor |

### 1.3 Eksikler

- [ ] License model alanları (plan, features, max_users, expiry_date)
- [ ] License CRUD endpoint'leri
- [ ] License validation endpoint (`/api/v1/licenses/validate`)
- [ ] License activation endpoint (`/api/v1/licenses/activate`)
- [x] ~~Online aktivasyon akışı~~ (API client hazır)
- [x] ~~Hardware fingerprint oluşturma~~ (get_device_id hazır)
- [ ] `@require_feature()` decorator
- [ ] Lisans türüne göre modül kısıtlama

---

## 🔄 2. SENKRONİZASYON SİSTEMİ

### 2.1 Mevcut Dosyalar

| Bileşen | Dosya | Durum |
|---------|-------|-------|
| Backend Model | `backend/app/models/sync.py` | 🔴 SKELETON |
| Backend Service | `backend/app/services/sync_service.py` | 🔴 TODO |
| Backend API | `backend/app/api/v1/sync/` | 🔴 BOŞ KLASÖR |
| Desktop Store | `desktop/src/store/syncStore.ts` | ✅ Çalışıyor |
| Desktop Commands | `src-tauri/src/commands/sync.rs` | ✅ **TAMAMLANDI** |
| **Desktop Hook** | `desktop/src/hooks/useSync.ts` | ✅ **YENİ** |
| **Desktop API** | `desktop/src/lib/api.ts (syncApi)` | ✅ **YENİ** |

### 2.2 Senkronizasyon Stratejisi

```
┌─────────────────────────────────────────────────────────────┐
│                    SYNC ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     PUSH      ┌─────────────────────────┐ │
│  │   DESKTOP   │ ───────────▶  │        SUNUCU           │ │
│  │   SQLite    │               │      PostgreSQL         │ │
│  │             │  ◀───────────  │                         │ │
│  └─────────────┘     PULL      └─────────────────────────┘ │
│         │                                  │                │
│         │                                  │                │
│         ▼                                  ▼                │
│  ┌─────────────┐               ┌─────────────────────────┐ │
│  │ sync_queue  │               │      sync_log           │ │
│  │ (offline)   │               │   sync_conflicts        │ │
│  └─────────────┘               └─────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Eksikler

- [ ] `sync_log` tablosu (PostgreSQL)
- [ ] `sync_conflicts` tablosu (PostgreSQL)
- [x] ~~`sync_queue` tablosu (SQLite - Desktop)~~ (sync_changes var)
- [ ] `/api/v1/sync/push` endpoint
- [ ] `/api/v1/sync/pull` endpoint
- [ ] `/api/v1/sync/conflicts` endpoint
- [x] ~~Delta sync mekanizması~~ (useSync hook hazır)
- [ ] Conflict resolution mantığı (backend)
- [x] ~~Conflict resolution UI~~ (temel yapı hazır)
- [ ] Auto-sync timer

---

## 👑 3. SÜPER ADMİN SİSTEMİ

### 3.1 Mevcut Dosyalar

| Bileşen | Dosya | Durum |
|---------|-------|-------|
| User Model | `backend/app/models/user.py` | ✅ `is_superuser` var |
| Tenant API | `backend/app/api/v1/tenants.py` | 🟡 Kısmi |
| Admin Pages | `frontend/pages/admin/*` | 🔴 YOK |

### 3.2 Admin Panel Modülleri

```
/admin
├── /dashboard        # Genel istatistikler
├── /tenants          # Tenant yönetimi
│   ├── /list         # Tüm tenant'lar
│   ├── /pending      # Onay bekleyenler
│   └── /[id]         # Tenant detay
├── /licenses         # Lisans yönetimi
│   ├── /list         # Tüm lisanslar
│   ├── /generate     # Yeni lisans oluştur
│   └── /[id]         # Lisans detay
├── /users            # Kullanıcı yönetimi
├── /sync             # Senkronizasyon durumu
│   ├── /logs         # Sync logları
│   └── /conflicts    # Çakışmalar
└── /settings         # Sistem ayarları
```

### 3.3 Eksikler

- [ ] Super admin middleware
- [ ] `@require_superadmin` decorator
- [ ] Tenant onaylama endpoint
- [ ] Tenant askıya alma endpoint
- [ ] Admin dashboard component'leri
- [ ] Lisans oluşturma UI
- [ ] Sistem geneli raporlar

---

## 🌐 4. DESKTOP İNTERNET SİSTEMİ

### 4.1 Mevcut Dosyalar

| Bileşen | Dosya | Durum |
|---------|-------|-------|
| App State | `desktop/src/store/appStore.ts` | ✅ `isOnline` var |
| Sync State | `desktop/src/store/syncStore.ts` | ✅ Temel yapı |

### 4.2 Bağlantı Durumu Akışı

```
┌─────────────────────────────────────────────────────────────┐
│                  CONNECTION STATE MACHINE                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌──────────┐     online     ┌──────────────────────┐    │
│    │ OFFLINE  │ ────────────▶  │       ONLINE         │    │
│    │          │                │                      │    │
│    │ • Queue  │  ◀────────────  │ • Sync immediately   │    │
│    │ • Store  │     offline    │ • Real-time updates  │    │
│    └──────────┘                └──────────────────────┘    │
│         │                              │                    │
│         │                              │                    │
│         ▼                              ▼                    │
│    ┌──────────┐                ┌──────────────────────┐    │
│    │ PENDING  │                │      SYNCING         │    │
│    │ SYNC     │ ─────────────▶ │                      │    │
│    │          │   connection   │ • Push changes       │    │
│    │          │   restored     │ • Pull updates       │    │
│    └──────────┘                └──────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Eksikler

- [ ] `navigator.onLine` dinleme
- [ ] Online/offline event listener
- [ ] Connection status indicator (header)
- [ ] Auto-reconnect mekanizması
- [ ] Offline queue sistemi
- [ ] Queue processing (online olunca)
- [ ] Sync conflict notification

---

## 🖥️ 5. WEB ARAYÜZÜ

### 5.1 Mevcut Dosyalar

| Bileşen | Dosya | Durum |
|---------|-------|-------|
| Next.js App | `frontend/` | 🟡 Temel yapı |
| API Client | `frontend/lib/api.ts` | 🟡 Kısmi |
| Auth Pages | `frontend/pages/auth/*` | 🔴 Placeholder |

### 5.2 Web Panel Modülleri

```
/
├── /auth
│   ├── /login
│   ├── /register
│   └── /forgot-password
├── /dashboard
├── /uyeler
├── /mali
├── /belgeler
├── /ayarlar
└── /admin (Super Admin Only)
```

### 5.3 Eksikler

- [ ] Authentication flow (login/register)
- [ ] Protected routes
- [ ] API client interceptors
- [ ] Tenant context provider
- [ ] Tüm modül sayfaları
- [ ] Responsive tasarım
- [ ] Dark mode

---

## 🚀 GELİŞTİRME PLANI (FAZ 3-5)

### FAZ 3: LİSANS SİSTEMİ (2 Hafta)

#### Hafta 1: Backend Lisans Altyapısı

| Gün | Görev | Çıktı |
|-----|-------|-------|
| 1 | License model genişletme | `license.py` tamamlanmış |
| 2 | License CRUD service | `license_service.py` |
| 3 | License API endpoints | `/api/v1/licenses/*` |
| 4 | Validation & Activation | `/validate`, `/activate` |
| 5 | Feature gating decorator | `@require_feature()` |

#### Hafta 2: Desktop Lisans Entegrasyonu

| Gün | Görev | Çıktı |
|-----|-------|-------|
| 1 | Hardware fingerprint | `fingerprint.rs` |
| 2 | Online activation flow | `license.rs` güncelleme |
| 3 | License mode switching | LOCAL/ONLINE/HYBRID |
| 4 | Feature gating UI | Kısıtlı modüller |
| 5 | Test & Debug | Tüm modlar test |

---

### FAZ 4: SENKRONİZASYON SİSTEMİ (3 Hafta)

#### Hafta 1: Backend Sync Altyapısı

| Gün | Görev | Çıktı |
|-----|-------|-------|
| 1 | sync_log tablosu | PostgreSQL migration |
| 2 | sync_conflicts tablosu | PostgreSQL migration |
| 3 | Sync model & service | `sync_service.py` |
| 4 | Push endpoint | `/api/v1/sync/push` |
| 5 | Pull endpoint | `/api/v1/sync/pull` |

#### Hafta 2: Desktop Sync Entegrasyonu

| Gün | Görev | Çıktı |
|-----|-------|-------|
| 1 | sync_queue tablosu | SQLite migration |
| 2 | Network listener | Online/offline detection |
| 3 | Sync commands | `sync.rs` tamamlama |
| 4 | Auto-sync timer | Periyodik senkronizasyon |
| 5 | Connection indicator | Header'da durum gösterimi |

#### Hafta 3: Conflict Resolution

| Gün | Görev | Çıktı |
|-----|-------|-------|
| 1 | Conflict detection | Backend mantığı |
| 2 | Conflict API | `/api/v1/sync/conflicts` |
| 3 | Conflict UI | Desktop notification |
| 4 | Resolution dialog | Kullanıcı seçimi |
| 5 | Test & Debug | Full sync test |

---

### FAZ 5: SÜPER ADMİN & WEB ARAYÜZÜ (4 Hafta)

#### Hafta 1: Backend Admin Altyapısı

| Gün | Görev | Çıktı |
|-----|-------|-------|
| 1 | Super admin middleware | `admin_middleware.py` |
| 2 | Tenant management API | Onay/Askıya alma |
| 3 | License generation API | Yeni lisans oluşturma |
| 4 | System reports API | İstatistikler |
| 5 | Audit logging | Admin işlem logları |

#### Hafta 2: Web Authentication

| Gün | Görev | Çıktı |
|-----|-------|-------|
| 1 | Login page | `/auth/login` |
| 2 | Register page | `/auth/register` |
| 3 | Forgot password | `/auth/forgot-password` |
| 4 | Auth context | `AuthProvider` |
| 5 | Protected routes | Route guard |

#### Hafta 3: Admin Dashboard

| Gün | Görev | Çıktı |
|-----|-------|-------|
| 1 | Dashboard page | `/admin/dashboard` |
| 2 | Tenant list | `/admin/tenants` |
| 3 | License management | `/admin/licenses` |
| 4 | User management | `/admin/users` |
| 5 | Sync monitoring | `/admin/sync` |

#### Hafta 4: Web Modülleri & Polish

| Gün | Görev | Çıktı |
|-----|-------|-------|
| 1 | Üye modülü | `/uyeler` |
| 2 | Mali modül | `/mali` |
| 3 | Belge modülü | `/belgeler` |
| 4 | Responsive tasarım | Mobile uyumluluk |
| 5 | Dark mode & Final test | Production ready |

---

## 📅 ZAMAN ÇİZELGESİ

```
                   2026
    Ocak                 Şubat                 Mart
    ├─────────────────────┼─────────────────────┼─────────────────────┤
    │                     │                     │                     │
    │  FAZ 3: LİSANS      │  FAZ 4: SYNC        │  FAZ 5: ADMIN+WEB   │
    │  (2 hafta)          │  (3 hafta)          │  (4 hafta)          │
    │                     │                     │                     │
    │  [======]           │  [=========]        │  [============]     │
    │                     │                     │                     │
    │  13 Oca - 26 Oca    │  27 Oca - 16 Şub    │  17 Şub - 16 Mar    │
    │                     │                     │                     │
    └─────────────────────┴─────────────────────┴─────────────────────┘
```

---

## 🔧 TEKNİK DETAYLAR

### Lisans Modeli (Hedef)

```python
class License(Base):
    __tablename__ = "licenses"
    
    id = Column(UUID, primary_key=True)
    tenant_id = Column(UUID, ForeignKey("tenants.id"))
    license_key = Column(String, unique=True)
    plan = Column(String)  # basic, pro, enterprise
    mode = Column(String)  # local, online, hybrid
    features = Column(JSON)  # ["uyeler", "mali", "belgeler", ...]
    max_users = Column(Integer)
    max_members = Column(Integer)
    hardware_id = Column(String, nullable=True)
    issued_at = Column(DateTime)
    expires_at = Column(DateTime)
    last_validated_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
```

### Sync Log Modeli (Hedef)

```python
class SyncLog(Base):
    __tablename__ = "sync_logs"
    
    id = Column(UUID, primary_key=True)
    tenant_id = Column(UUID, ForeignKey("tenants.id"))
    device_id = Column(String)
    sync_type = Column(String)  # push, pull
    table_name = Column(String)
    record_id = Column(UUID)
    action = Column(String)  # create, update, delete
    data = Column(JSON)
    synced_at = Column(DateTime)
    status = Column(String)  # success, conflict, failed
```

### Desktop Network Listener (Hedef)

```typescript
// src/hooks/useNetworkStatus.ts
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncStore.getState().triggerSync();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      syncStore.getState().enableQueueMode();
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}
```

---

## ✅ BAŞARI KRİTERLERİ

### Faz 3 Tamamlandı Sayılır Eğer:
- [ ] Lisans online/offline modlarında çalışıyorsa
- [ ] Lisans validasyonu sunucu ile yapılabiliyorsa
- [ ] Feature gating modülleri kısıtlayabiliyorsa
- [ ] DEMO modu 30 gün sonra sona eriyorsa

### Faz 4 Tamamlandı Sayılır Eğer:
- [ ] Desktop offline değişiklikleri queue'layabiliyorsa
- [ ] Online olunca otomatik sync yapılıyorsa
- [ ] Conflict'ler tespit edilip kullanıcıya gösteriliyorsa
- [ ] Kullanıcı conflict'leri çözebiliyorsa

### Faz 5 Tamamlandı Sayılır Eğer:
- [ ] Super admin tüm tenant'ları yönetebiliyorsa
- [ ] Web üzerinden lisans oluşturulabiliyorsa
- [ ] Web'de en az 3 modül çalışıyorsa
- [ ] Responsive tasarım mobile'da çalışıyorsa

---

## 📝 NOTLAR

1. **Öncelik:** Lisans sistemi ilk tamamlanmalı çünkü sync ve admin buna bağlı
2. **Bağımlılık:** Sync sistemi lisans moduna göre farklı davranacak
3. **Test:** Her faz sonunda entegrasyon testi yapılmalı
4. **Güvenlik:** Tüm admin endpoint'leri `is_superuser` kontrolü içermeli

---

*Bu doküman 13 Ocak 2026 tarihinde oluşturulmuştur.*
