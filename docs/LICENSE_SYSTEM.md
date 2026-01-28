# BADER Lisans Sistemi Mimarisi

## 📋 İçindekiler
1. [Genel Bakış](#genel-bakış)
2. [Platform Tanımları](#platform-tanımları)
3. [Lisans Tipleri](#lisans-tipleri)
4. [Lisans Kodu Yapısı](#lisans-kodu-yapısı)
5. [Platform Erişim Matrisi](#platform-erişim-matrisi)
6. [Yükseltme / Düşürme Senaryoları](#yükseltme--düşürme-senaryoları)
7. [Offline Doğrulama Motoru](#offline-doğrulama-motoru)
8. [Özel Paketler](#özel-paketler)
9. [Teknik Implementasyon](#teknik-implementasyon)

---

## Genel Bakış

BADER Lisans Sistemi, modüler ve platform bazlı bir yapıya sahiptir. Her lisans kodu içinde hangi platformların aktif olduğu, sync özelliğinin açık olup olmadığı ve bitiş tarihi gibi bilgiler **şifreli olarak encode edilmiştir**.

### Temel Prensipler:
- ✅ **Offline Doğrulama:** İnternet gerektirmeden lisans doğrulama
- ✅ **Modüler Yapı:** Her platform ayrı ayrı açılıp kapanabilir
- ✅ **Güvenli Kod:** TC kimlik numarası gibi karmaşık, tahmin edilemez kodlar
- ✅ **Yükseltme/Düşürme:** Veri kaybı olmadan lisans değişikliği

---

## Platform Tanımları

| Platform | Açıklama | Veri Depolama |
|----------|----------|---------------|
| **DESKTOP** | Windows/Mac/Linux masaüstü uygulaması | Local SQLite |
| **WEB** | Tarayıcı tabanlı web uygulaması | Sunucu Veritabanı |
| **MOBİL** | iOS/Android mobil uygulama | Sunucu Veritabanı |

---

## Lisans Tipleri

### Hazır Paketler

| Paket Adı | Desktop | Web | Mobil | Sync | Açıklama |
|-----------|:-------:|:---:|:-----:|:----:|----------|
| **LOCAL** | ✅ | ❌ | ❌ | ❌ | Sadece masaüstü, offline çalışma |
| **ONLINE** | ❌ | ✅ | ✅ | ✅ | Web+Mobil, sunucu tabanlı |
| **HYBRID** | ✅ | ✅ | ✅ | ✅ | Tam erişim, her platformda sync |

### Özel Paketler

| Paket Adı | Desktop | Web | Mobil | Sync | Kullanım Senaryosu |
|-----------|:-------:|:---:|:-----:|:----:|-------------------|
| **DESKTOP+MOBİL** | ✅ | ❌ | ✅ | ✅ | Sahada mobil, ofiste desktop |
| **WEB ONLY** | ❌ | ✅ | ❌ | ✅ | Sadece tarayıcı erişimi |
| **MOBİL ONLY** | ❌ | ❌ | ✅ | ✅ | Sadece mobil uygulama |
| **DESKTOP+WEB** | ✅ | ✅ | ❌ | ✅ | Desktop + Web erişimi |

---

## Lisans Kodu Yapısı

### Format
```
BADER-PPPP-TTTT-IIII-CCCC
```

### Segment Açıklamaları

| Segment | Uzunluk | Açıklama |
|---------|---------|----------|
| `BADER` | 5 | Sabit prefix |
| `PPPP` | 4 | Platform ve özellik bitleri (encoded) |
| `TTTT` | 4 | Bitiş tarihi (encoded) |
| `IIII` | 4 | Tenant ID (encoded) |
| `CCCC` | 4 | Checksum (doğrulama) |

### Platform Bitleri (PPPP içinde)

```
Bit 0 (1):   Desktop aktif
Bit 1 (2):   Web aktif
Bit 2 (4):   Mobil aktif
Bit 3 (8):   Sync aktif
Bit 4-7:     Rezerve (gelecek özellikler için)
```

### Örnek Kodlar

| Lisans Tipi | Platform Bits | Decimal | Örnek Kod |
|-------------|---------------|---------|-----------|
| LOCAL | 0001 | 1 | `BADER-A1XX-...` |
| ONLINE | 1110 | 14 | `BADER-E1XX-...` |
| HYBRID | 1111 | 15 | `BADER-F1XX-...` |
| DESKTOP+MOBİL | 1101 | 13 | `BADER-D1XX-...` |

---

## Platform Erişim Matrisi

### Kullanıcı Girişinde

```
┌─────────────────────────────────────────────────────────────────┐
│                    KULLANICI GİRİŞ YAPIYOR                      │
│                           ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Hangi platformdan giriş yapıyor?                        │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │    │
│  │  │ DESKTOP │  │   WEB   │  │  MOBİL  │                  │    │
│  │  └────┬────┘  └────┬────┘  └────┬────┘                  │    │
│  └───────┼────────────┼────────────┼───────────────────────┘    │
│          ↓            ↓            ↓                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Lisans kodunu kontrol et                                 │  │
│  │  Bu platform aktif mi?                                    │  │
│  │                                                           │  │
│  │  EVET → Giriş izin ver                                    │  │
│  │  HAYIR → "Bu platform lisansınızda yok, yükseltin" göster │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Desktop Davranışları

| Lisans | Desktop'ta Ne Olur? |
|--------|---------------------|
| LOCAL | ✅ SQLite ile çalışır, sync yok |
| ONLINE | ❌ "Desktop lisansınız yok, yükseltin" |
| HYBRID | ✅ SQLite + Sync aktif |
| DESKTOP+MOBİL | ✅ SQLite + Sync aktif |

### Web Davranışları

| Lisans | Web'de Ne Olur? |
|--------|-----------------|
| LOCAL | ❌ "Web lisansınız yok, yükseltin" |
| ONLINE | ✅ Sunucu veritabanı ile çalışır |
| HYBRID | ✅ Sunucu veritabanı ile çalışır |
| WEB ONLY | ✅ Sunucu veritabanı ile çalışır |

### Mobil Davranışları

| Lisans | Mobil'de Ne Olur? |
|--------|-------------------|
| LOCAL | ❌ "Mobil lisansınız yok, yükseltin" |
| ONLINE | ✅ Sunucu veritabanı ile çalışır |
| HYBRID | ✅ Sunucu veritabanı ile çalışır |
| MOBİL ONLY | ✅ Sunucu veritabanı ile çalışır |

---

## Yükseltme / Düşürme Senaryoları

### Yükseltme: LOCAL → HYBRID

```
┌─────────────────────────────────────────────────────────────┐
│  1. Kullanıcı HYBRID lisans satın alır                      │
│                       ↓                                      │
│  2. Super Admin yeni lisans kodu oluşturur                  │
│                       ↓                                      │
│  3. Kullanıcı Desktop'ta yeni kodu girer                    │
│                       ↓                                      │
│  4. Sistem eski LOCAL lisansı tespit eder                   │
│                       ↓                                      │
│  5. UYARI: "Mevcut verileriniz korunacak ve                 │
│             sunucuya senkronize edilecek"                   │
│                       ↓                                      │
│  6. Kullanıcı onaylar                                        │
│                       ↓                                      │
│  7. Mevcut SQLite verileri → Sunucu (ilk sync)              │
│                       ↓                                      │
│  8. HYBRID modu aktif, sync başlar                          │
└─────────────────────────────────────────────────────────────┘
```

### Düşürme: HYBRID → LOCAL

```
┌─────────────────────────────────────────────────────────────┐
│  1. Kullanıcı LOCAL lisansa geçmek istiyor                  │
│                       ↓                                      │
│  2. Super Admin yeni lisans kodu oluşturur                  │
│                       ↓                                      │
│  3. Kullanıcı Desktop'ta yeni kodu girer                    │
│                       ↓                                      │
│  4. Sistem HYBRID → LOCAL düşürme tespit eder               │
│                       ↓                                      │
│  5. UYARI: "Sync devre dışı kalacak!                        │
│             Son verileri sunucudan indirmek ister misiniz?" │
│                       ↓                                      │
│  6. [İndir ve Devam Et] veya [Vazgeç]                       │
│                       ↓                                      │
│  7. Son sync: Sunucu → SQLite                               │
│                       ↓                                      │
│  8. Sync devre dışı, LOCAL modu aktif                       │
│                       ↓                                      │
│  ⚠️ Web ve Mobil erişim artık çalışmaz                      │
└─────────────────────────────────────────────────────────────┘
```

### Platform Ekleme: LOCAL → DESKTOP+MOBİL

```
┌─────────────────────────────────────────────────────────────┐
│  1. Kullanıcı mobil erişim eklemek istiyor                  │
│                       ↓                                      │
│  2. Super Admin yeni lisans kodu oluşturur                  │
│     (Desktop + Mobil + Sync aktif)                          │
│                       ↓                                      │
│  3. Kullanıcı Desktop'ta yeni kodu girer                    │
│                       ↓                                      │
│  4. Mevcut SQLite verileri → Sunucu (ilk sync)              │
│                       ↓                                      │
│  5. Mobil uygulamayı indirir ve giriş yapar                 │
│                       ↓                                      │
│  6. Mobil ve Desktop senkronize çalışır                     │
│     (Web hala kapalı)                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Offline Doğrulama Motoru

### Algoritma

```python
def validate_license(code: str) -> LicenseInfo:
    """
    Lisans kodunu offline olarak doğrular.
    İnternet bağlantısı GEREKTIRMEZ.
    """
    
    # 1. Format kontrolü
    if not code.startswith("BADER-"):
        raise InvalidLicenseError("Geçersiz format")
    
    parts = code.split("-")
    if len(parts) != 5:
        raise InvalidLicenseError("Geçersiz segment sayısı")
    
    # 2. Checksum doğrulama
    provided_checksum = parts[4]
    calculated_checksum = calculate_checksum(parts[0:4])
    if provided_checksum != calculated_checksum:
        raise InvalidLicenseError("Checksum hatalı")
    
    # 3. Platform bitlerini çöz
    platform_data = decode_platform_bits(parts[1])
    
    # 4. Bitiş tarihini çöz
    expiry_date = decode_expiry_date(parts[2])
    if expiry_date < today():
        raise LicenseExpiredError("Lisans süresi dolmuş")
    
    # 5. Tenant ID'yi çöz
    tenant_id = decode_tenant_id(parts[3])
    
    return LicenseInfo(
        desktop_enabled=platform_data.desktop,
        web_enabled=platform_data.web,
        mobile_enabled=platform_data.mobile,
        sync_enabled=platform_data.sync,
        expiry_date=expiry_date,
        tenant_id=tenant_id
    )
```

### Güvenlik Önlemleri

1. **Karmaşık Encoding:** Base32 + XOR şifreleme
2. **Salt Değeri:** Her tenant için farklı salt
3. **Checksum:** CRC32 veya SHA256 truncated
4. **Tarih Encoding:** Epoch timestamp + offset

---

## Özel Paketler

### Fiyatlandırma Mantığı

```
Temel Fiyat = 0

+ Desktop aktif    → +100 TL/ay
+ Web aktif        → +50 TL/ay
+ Mobil aktif      → +50 TL/ay
+ Sync aktif       → +30 TL/ay

Toplam = Temel + Seçilen Özellikler
```

### Örnek Hesaplamalar

| Paket | Desktop | Web | Mobil | Sync | Toplam |
|-------|---------|-----|-------|------|--------|
| LOCAL | ✅ 100 | ❌ | ❌ | ❌ | **100 TL/ay** |
| ONLINE | ❌ | ✅ 50 | ✅ 50 | ✅ 30 | **130 TL/ay** |
| HYBRID | ✅ 100 | ✅ 50 | ✅ 50 | ✅ 30 | **230 TL/ay** |
| DESKTOP+MOBİL | ✅ 100 | ❌ | ✅ 50 | ✅ 30 | **180 TL/ay** |

---

## Teknik Implementasyon

### 1. Veritabanı Şeması (licenses tablosu)

```sql
CREATE TABLE licenses (
    id UUID PRIMARY KEY,
    code VARCHAR(25) UNIQUE NOT NULL,  -- BADER-XXXX-XXXX-XXXX-XXXX
    tenant_id UUID REFERENCES tenants(id),
    
    -- Platform Erişimleri
    desktop_enabled BOOLEAN DEFAULT FALSE,
    web_enabled BOOLEAN DEFAULT FALSE,
    mobile_enabled BOOLEAN DEFAULT FALSE,
    sync_enabled BOOLEAN DEFAULT FALSE,
    
    -- Tarihler
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    
    -- Durum
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Meta
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Desktop - Lisans Doğrulama

```rust
// src-tauri/src/license.rs

pub struct LicenseValidator {
    // Offline doğrulama için gerekli sabitler
}

impl LicenseValidator {
    pub fn validate(&self, code: &str) -> Result<LicenseInfo, LicenseError> {
        // 1. Format kontrolü
        // 2. Checksum doğrulama
        // 3. Bitleri çözümle
        // 4. Tarihi kontrol et
        // 5. LicenseInfo döndür
    }
}
```

### 3. Web/Mobil - Lisans Kontrolü

```typescript
// Login sırasında
async function login(email: string, password: string): Promise<void> {
    const response = await api.login(email, password);
    
    // Backend lisans bilgisini döndürür
    const license = response.license;
    
    // Platform kontrolü (WEB için)
    if (!license.web_enabled) {
        throw new Error("Web erişimi lisansınızda yok. Lütfen lisansınızı yükseltin.");
    }
    
    // Başarılı giriş
    setUser(response.user);
    setLicense(license);
}
```

### 4. Super Admin - Lisans Oluşturma

```python
# backend/app/api/v1/admin/licenses.py

@router.post("/generate")
async def generate_license(
    data: LicenseCreateRequest,
    current_user: User = Depends(require_super_admin)
):
    """
    Yeni lisans kodu oluşturur.
    
    Request:
    {
        "tenant_id": "uuid",
        "desktop": true,
        "web": false,
        "mobile": true,
        "sync": true,
        "expiry_months": 12
    }
    
    Response:
    {
        "code": "BADER-D1A3-B7C2-E9F4-A1B2",
        "details": { ... }
    }
    """
    code = LicenseGenerator.generate(
        tenant_id=data.tenant_id,
        desktop=data.desktop,
        web=data.web,
        mobile=data.mobile,
        sync=data.sync,
        expiry_date=calculate_expiry(data.expiry_months)
    )
    
    # Veritabanına kaydet
    license = License(
        code=code,
        tenant_id=data.tenant_id,
        desktop_enabled=data.desktop,
        web_enabled=data.web,
        mobile_enabled=data.mobile,
        sync_enabled=data.sync,
        expiry_date=calculate_expiry(data.expiry_months)
    )
    session.add(license)
    session.commit()
    
    return {"code": code, "details": license.dict()}
```

---

## Sonraki Adımlar

1. [ ] Lisans kodu encoding/decoding algoritmasını implement et
2. [ ] Desktop'ta offline doğrulama motorunu yaz
3. [ ] Backend'de lisans kontrolü ekle
4. [ ] Login akışını lisans bazlı güncelle
5. [ ] Super Admin paneline lisans yönetimi ekle
6. [ ] Yükseltme/düşürme akışlarını implement et

---

## Onay Bekleyen Kararlar

1. **Checksum Algoritması:** CRC32 mı, SHA256 truncated mı?
2. **Encoding:** Base32 mi, Base64 mi?
3. **Fiyatlandırma:** Yukarıdaki fiyatlar doğru mu?
4. **Deneme Süresi:** Yeni kullanıcılara otomatik trial verilecek mi?

---

*Doküman Versiyonu: 1.0*
*Son Güncelleme: 2026-01-28*
