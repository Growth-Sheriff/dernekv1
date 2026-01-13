# 📊 BADER Modül Analiz Raporu

**Tarih:** 12 Ocak 2026  
**Versiyon:** 3.0  
**Analiz Tipi:** Kapsamlı Frontend-Backend Uyumluluk Analizi

---

## 📋 İçindekiler

1. [Genel Özet](#genel-özet)
2. [Faz 1: Kritik Düzeltmeler](#faz-1-kritik-düzeltmeler)
3. [Faz 2: Frontend-Backend Uyumsuzlukları](#faz-2-frontend-backend-uyumsuzlukları)
4. [Faz 3: Eksik Sayfalar ve Routes](#faz-3-eksik-sayfalar-ve-routes)
5. [Faz 4: Form Eksiklikleri](#faz-4-form-eksiklikleri)
6. [Faz 5: Eksik Backend Komutları](#faz-5-eksik-backend-komutları)
7. [Modül Bazlı Detaylı Analiz](#modül-bazlı-detaylı-analiz)

---

## 🎯 Genel Özet

### Mevcut Durum

| Kategori | Durum | Not |
|----------|-------|-----|
| **Backend (Tauri)** | ✅ Derleniyor | 56 warning var ama hata yok |
| **Frontend (React)** | ⚠️ Kısmen Çalışıyor | Bazı modüllerde veri uyumsuzluğu |
| **Veritabanı** | ✅ Hazır | Tüm tablolar mevcut |
| **Routes** | ⚠️ Eksikler Var | Bazı sayfalar yok veya boş |

### Modül Sayıları

| Modül | Sayfa Sayısı | Backend Komut | Durum |
|-------|--------------|---------------|-------|
| Dashboard | 1 | 3 | ✅ Çalışıyor |
| Üyeler | 3 | 6 | ✅ Çalışıyor |
| Aidat | 4 | 8 | ⚠️ Kısmen |
| Mali | 7 | 15+ | ⚠️ Kısmen |
| Etkinlikler | 3 | 5 | ⚠️ Veri Uyumsuz |
| Toplantılar | 2 | 5 | ⚠️ Veri Uyumsuz |
| Belgeler | 1 | 5 | ✅ Çalışıyor |
| Bütçe | 2 | 6 | ⚠️ Veri Uyumsuz |
| Köy | 5 | 12 | ⚠️ Routes Eksik |
| Raporlar | 3 | 3 | ⚠️ Basit |
| Ayarlar | 3 | 5 | ✅ Çalışıyor |

---

## 🔴 Faz 1: Kritik Düzeltmeler

### 1.1 Etkinlikler - Frontend/Backend Veri Uyumsuzluğu

**Sorun:** Frontend eski alan isimleri kullanıyor, backend yeni alan isimleri bekliyor.

| Frontend (list.tsx) | Backend (etkinlikler.rs) | Veritabanı |
|---------------------|--------------------------|------------|
| `etkinlik_turu` | `etkinlik_tipi` | `etkinlik_tipi` |
| `tarih` | `baslangic_tarihi` | `baslangic_tarihi` |
| `mekan` | `yer` | `yer` |
| `tahmini_gelir` | `tahmini_butce` | `tahmini_butce` |
| `tahmini_gider` | ❌ Kaldırıldı | ❌ Yok |

**Dosyalar:**
- `/desktop/src/pages/etkinlikler/list.tsx` (interface + formData)
- `/desktop/src/pages/etkinlikler/create.tsx` (formData + handleSubmit)
- `/desktop/src/pages/etkinlikler/detail.tsx` (interface)

**Düzeltme:**
```typescript
// ESKİ
interface Etkinlik {
  etkinlik_turu: string;
  tarih: string;
  mekan?: string;
  tahmini_gelir?: number;
  tahmini_gider?: number;
}

// YENİ
interface Etkinlik {
  etkinlik_tipi?: string;
  baslangic_tarihi: string;
  bitis_tarihi?: string;
  yer?: string;
  tahmini_butce?: number;
  gerceklesen_butce?: number;
}
```

---

### 1.2 Toplantılar - Frontend/Backend Veri Uyumsuzluğu

**Sorun:** Frontend'de olmayan alanlar backend'de kaldırıldı.

| Frontend (list.tsx) | Backend (toplantilar.rs) | Veritabanı |
|---------------------|--------------------------|------------|
| `toplanti_turu` | `toplanti_tipi` | `toplanti_tipi` |
| `katilimcilar` | ❌ Kaldırıldı | `katilimci_sayisi` |
| `tutanak` | ❌ Kaldırıldı | ❌ Yok |
| `bir_sonraki_toplanti` | ❌ Kaldırıldı | ❌ Yok |
| `karar` | ❌ Kaldırıldı | `kararlar` |

**Dosyalar:**
- `/desktop/src/pages/toplantilar/list.tsx`
- `/desktop/src/pages/toplantilar/detail.tsx`

---

### 1.3 Bütçe - Frontend/Backend Veri Uyumsuzluğu

**Sorun:** Frontend eski alan isimleri kullanıyor.

| Frontend (list.tsx) | Backend (butce.rs) | Veritabanı |
|---------------------|---------------------|------------|
| `gelir_hedefi` | `planlanan_gelir` | `planlanan_gelir` |
| `gider_hedefi` | `planlanan_gider` | `planlanan_gider` |
| `aciklama` | ❌ Yok | ❌ Yok |
| ❌ Yok | `kategori` | `kategori` |
| ❌ Yok | `alt_kategori` | `alt_kategori` |

**Dosyalar:**
- `/desktop/src/pages/butce/list.tsx`
- `/desktop/src/pages/butce/detail.tsx`

---

## 🟠 Faz 2: Frontend-Backend Uyumsuzlukları

### 2.1 Kullanıcı Yönetimi - Yanlış Komut Adı

**Dosya:** `/desktop/src/pages/ayarlar/kullanicilar.tsx`

```typescript
// YANLIŞ (satır 55)
const data = await invoke<User[]>('list_users', { tenantIdParam: tenant.id });

// DOĞRU
const data = await invoke<User[]>('get_users', { tenantIdParam: tenant.id });
```

**Backend'de mevcut komutlar:**
- `get_users` ✅
- `get_user` ✅
- `create_user` ✅
- `update_user` ✅
- `delete_user` ✅
- `activate_user` ✅

---

### 2.2 Aidat Modülü - Eksik Komutlar

**Dosya:** `/desktop/src/pages/aidat/list.tsx`

Frontend'de kullanılan ama eksik olabilecek komutlar:
- `get_aidat_takip` ✅ Mevcut
- `get_aidat_ozet` ✅ Mevcut
- `update_aidat_tanimlama` ✅ Mevcut (ama frontend'de kullanılmıyor)
- `delete_aidat_tanimlama` ✅ Mevcut (ama frontend'de kullanılmıyor)

---

## 🟡 Faz 3: Eksik Sayfalar ve Routes

### 3.1 Routes.tsx Analizi

**Mevcut Routes:**
```
/                           → Dashboard ✅
/uyeler                     → Liste ✅
/uyeler/create              → Oluştur ✅
/uyeler/:id                 → Detay ✅
/aidat                      → Liste ✅
/aidat/takip                → Takip ✅
/aidat/toplu-islemler       → Toplu İşlemler ✅
/aidat/:id                  → Detay ✅
/mali/kasalar               → Kasalar ✅
/mali/gelirler              → Gelirler ✅
/mali/gelir-turleri         → Gelir Türleri ✅
/mali/giderler              → Giderler ✅
/mali/gider-turleri         → Gider Türleri ✅
/mali/virmanlar             → Virmanlar ✅
/mali/yilsonu-devir         → Yıl Sonu Devir ✅
/etkinlikler                → Liste ✅
/etkinlikler/create         → Oluştur ✅
/etkinlikler/:id            → Detay ✅
/toplantilar                → Liste ✅
/toplantilar/:id            → Detay ✅
/raporlar/mali              → Mali Rapor ✅
/raporlar/aidat             → Aidat Rapor ✅
/raporlar/uyeler            → Üye Rapor ✅
/belgeler                   → Liste ✅
/butce                      → Liste ✅
/butce/:id                  → Detay ✅
/koy                        → Index ✅
/ayarlar/genel              → Genel ✅
/ayarlar/kullanicilar       → Kullanıcılar ✅
/ayarlar/yedekleme          → Yedekleme ✅
```

### 3.2 Eksik Köy Modülü Routes

**Mevcut sayfalar ama routes yok:**
- `/koy/kasalar` → `koy/kasalar.tsx` ✅ Sayfa var
- `/koy/gelirler` → `koy/gelirler.tsx` ✅ Sayfa var
- `/koy/giderler` → `koy/giderler.tsx` ✅ Sayfa var
- `/koy/virmanlar` → `koy/virmanlar.tsx` ✅ Sayfa var

**routes.tsx'e eklenmeli:**
```tsx
{
  path: 'koy',
  children: [
    { index: true, element: <KoyIndexPage /> },
    { path: 'kasalar', element: <KoyKasalarPage /> },
    { path: 'gelirler', element: <KoyGelirlerPage /> },
    { path: 'giderler', element: <KoyGiderlerPage /> },
    { path: 'virmanlar', element: <KoyVirmanlarPage /> },
  ],
},
```

### 3.3 Eksik Toplantı Oluşturma Sayfası

**Eksik:**
- `/toplantilar/create` → Sayfa yok (liste içinde modal ile yapılıyor)

**Öneri:** Ya route ekle ya da liste sayfasındaki modal yeterli

---

## 🔵 Faz 4: Form Eksiklikleri

### 4.1 Üye Formu - Eksik Alanlar

**yeni-sistem.md'de belirtilen 30+ alan:**

| Alan | list.tsx | create.tsx | Backend |
|------|----------|------------|---------|
| tc_no (tc_kimlik) | ✅ | ✅ | ✅ |
| ad | ✅ | ✅ | ✅ |
| soyad | ✅ | ✅ | ✅ |
| telefon | ✅ | ✅ | ✅ |
| email | ✅ | ✅ | ✅ |
| adres | ❌ | ✅ | ✅ |
| giris_tarihi | ✅ | ✅ | ✅ |
| durum | ✅ | ✅ | ✅ |
| notlar | ❌ | ✅ | ✅ |
| cinsiyet | ❌ | ❌ | ✅ |
| dogum_tarihi | ❌ | ❌ | ✅ |
| dogum_yeri | ❌ | ❌ | ✅ |
| kan_grubu | ❌ | ❌ | ✅ |
| aile_durumu | ❌ | ❌ | ✅ |
| cocuk_sayisi | ❌ | ❌ | ✅ |
| egitim_durumu | ❌ | ❌ | ✅ |
| meslek | ❌ | ❌ | ✅ |
| is_yeri | ❌ | ❌ | ✅ |
| il | ❌ | ❌ | ✅ |
| ilce | ❌ | ❌ | ✅ |
| mahalle | ❌ | ❌ | ✅ |
| posta_kodu | ❌ | ❌ | ✅ |
| uyelik_tipi | ❌ | ❌ | ✅ |
| ozel_aidat_tutari | ❌ | ❌ | ✅ |
| aidat_indirimi_yuzde | ❌ | ❌ | ✅ |
| referans_uye_id | ❌ | ❌ | ✅ |
| ayrilma_tarihi | ❌ | ❌ | ✅ |
| ayrilma_nedeni | ❌ | ❌ | ✅ |

**Öneri:** Üye formu TAM olarak yeniden tasarlanmalı (Faz ayrı)

---

### 4.2 Etkinlik Formu - Düzeltilmeli

| Frontend Alan | Backend Alan | Düzeltme |
|---------------|--------------|----------|
| etkinlik_turu | etkinlik_tipi | ✏️ Değiştir |
| tarih | baslangic_tarihi | ✏️ Değiştir |
| mekan | yer | ✏️ Değiştir |
| tahmini_gelir | tahmini_butce | ✏️ Değiştir |
| tahmini_gider | ❌ | 🗑️ Kaldır |
| gerceklesen_gelir | gerceklesen_butce | ✏️ Değiştir |
| gerceklesen_gider | ❌ | 🗑️ Kaldır |

---

### 4.3 Bütçe Formu - Düzeltilmeli

| Frontend Alan | Backend Alan | Düzeltme |
|---------------|--------------|----------|
| gelir_hedefi | planlanan_gelir | ✏️ Değiştir |
| gider_hedefi | planlanan_gider | ✏️ Değiştir |
| aciklama | ❌ | 🗑️ Kaldır |
| ❌ | kategori | ➕ Ekle |
| ❌ | alt_kategori | ➕ Ekle |

---

## 🟣 Faz 5: Eksik Backend Komutları

### 5.1 Mevcut Backend Komutları (main.rs)

**Tüm Kayıtlı Komutlar:**

| Modül | Komut | Frontend Kullanımı |
|-------|-------|-------------------|
| **Dashboard** | | |
| | get_dashboard_stats | ✅ Kullanılıyor |
| | get_uye_stats | ❌ Kullanılmıyor |
| | get_aidat_stats | ✅ Kullanılıyor |
| | get_kasa_stats | ✅ Kullanılıyor |
| **Üyeler** | | |
| | get_uyeler | ✅ |
| | get_uye_by_id | ✅ |
| | create_uye | ✅ |
| | update_uye | ⚠️ Eksik frontend |
| | delete_uye | ✅ |
| | count_uyeler | ✅ |
| **Aile Üyeleri** | | |
| | get_aile_uyeleri | ✅ |
| | create_aile_uyesi | ✅ |
| | update_aile_uyesi | ⚠️ Eksik frontend |
| | delete_aile_uyesi | ✅ |
| **Aidat** | | |
| | get_aidat_takip | ✅ |
| | create_aidat | ⚠️ |
| | kaydet_odeme | ✅ |
| | hesapla_gecikme | ❌ |
| | get_aidat_ozet | ✅ |
| | toplu_aidat_olustur | ✅ |
| | coklu_yil_odeme | ⚠️ |
| | kaydet_aidat_odeme_with_gelir | ⚠️ |
| | get_aidat_odemeleri | ⚠️ |
| | update_aidat_odeme | ⚠️ |
| | delete_aidat_odeme | ⚠️ |
| | update_aidat_tanimlama | ⚠️ |
| | delete_aidat_tanimlama | ⚠️ |
| **Mali** | | |
| | get_kasalar | ✅ |
| | create_kasa | ✅ |
| | update_kasa | ✅ |
| | delete_kasa | ✅ |
| | get_gelirler | ✅ |
| | create_gelir | ✅ |
| | update_gelir | ⚠️ |
| | delete_gelir | ✅ |
| | get_giderler | ✅ |
| | create_gider | ✅ |
| | update_gider | ⚠️ |
| | delete_gider | ✅ |
| | virman_yap | ✅ |
| | get_virmanlar | ✅ |
| | delete_virman | ✅ |
| | get_devir_onizleme | ⚠️ |
| | uygula_yil_sonu_devir | ⚠️ |
| | get_kasa_ozet | ✅ |
| **Etkinlikler** | | |
| | get_etkinlikler | ✅ |
| | get_etkinlik | ⚠️ |
| | create_etkinlik | ✅ |
| | update_etkinlik | ⚠️ |
| | delete_etkinlik | ✅ |
| **Toplantılar** | | |
| | get_toplantilar | ✅ |
| | get_toplanti | ⚠️ |
| | create_toplanti | ✅ |
| | update_toplanti | ⚠️ |
| | delete_toplanti | ✅ |
| **Bütçe** | | |
| | get_butce | ⚠️ Parametre uyumsuz |
| | get_butceler | ✅ |
| | create_butce | ✅ |
| | update_butce | ⚠️ |
| | delete_butce | ✅ |
| | update_butce_gerceklesen | ✅ |
| **Köy** | | |
| | get_koy_kasalar | ✅ |
| | create_koy_kasa | ✅ |
| | update_koy_kasa | ✅ |
| | delete_koy_kasa | ✅ |
| | get_koy_gelirler | ✅ |
| | create_koy_gelir | ✅ |
| | update_koy_gelir | ✅ |
| | delete_koy_gelir | ✅ |
| | get_koy_giderler | ✅ |
| | create_koy_gider | ✅ |
| | update_koy_gider | ✅ |
| | delete_koy_gider | ✅ |
| | get_koy_virmanlar | ✅ |
| | create_koy_virman | ✅ |
| | delete_koy_virman | ✅ |
| **Belgeler** | | |
| | get_belgeler | ✅ |
| | create_belge | ✅ |
| | update_belge | ⚠️ |
| | download_belge | ✅ |
| | delete_belge | ✅ |
| **Kullanıcılar** | | |
| | get_users | ⚠️ Frontend `list_users` diyor |
| | get_user | ⚠️ |
| | create_user | ✅ |
| | update_user | ⚠️ |
| | delete_user | ✅ |
| | activate_user | ⚠️ |
| **Export** | | |
| | export_uyeler_csv | ⚠️ |
| | export_aidat_raporu_csv | ⚠️ |
| | export_mali_raporu_csv | ⚠️ |

---

## 📁 Modül Bazlı Detaylı Analiz

### 📊 1. Dashboard Modülü

**Durum:** ✅ Çalışıyor

**Dosyalar:**
- `/desktop/src/pages/dashboard/index.tsx`

**Backend Komutları:**
- `get_dashboard_stats` ✅
- `get_aidat_stats` ✅
- `get_kasa_stats` ✅

**Eksikler:** Yok

---

### 👥 2. Üyeler Modülü

**Durum:** ⚠️ Form Eksik

**Dosyalar:**
- `/desktop/src/pages/uyeler/list.tsx`
- `/desktop/src/pages/uyeler/create.tsx`
- `/desktop/src/pages/uyeler/detail.tsx`

**Eksikler:**
1. Form sadece 9 alan içeriyor, 30+ alan olmalı
2. Update fonksiyonu frontend'de eksik
3. TC Kimlik validasyonu eksik

---

### 💳 3. Aidat Modülü

**Durum:** ⚠️ Kısmen Çalışıyor

**Dosyalar:**
- `/desktop/src/pages/aidat/list.tsx`
- `/desktop/src/pages/aidat/detail.tsx`
- `/desktop/src/pages/aidat/takip.tsx`
- `/desktop/src/pages/aidat/toplu-islemler.tsx`

**Eksikler:**
1. Çoklu yıl ödeme formu detaylı değil
2. Ödeme güncelleme/silme modal'ları eksik

---

### 💰 4. Mali Modülü

**Durum:** ✅ Büyük Ölçüde Çalışıyor

**Dosyalar:**
- `/desktop/src/pages/mali/kasalar.tsx`
- `/desktop/src/pages/mali/gelirler.tsx`
- `/desktop/src/pages/mali/giderler.tsx`
- `/desktop/src/pages/mali/virmanlar.tsx`
- `/desktop/src/pages/mali/gelir-turu-yonetimi.tsx`
- `/desktop/src/pages/mali/gider-turu-yonetimi.tsx`
- `/desktop/src/pages/mali/yilsonu-devir.tsx`

**Eksikler:**
1. Gelir/Gider güncelleme modal'ları kontrol edilmeli
2. Yıl sonu devir işlemi test edilmeli

---

### 📅 5. Etkinlikler Modülü

**Durum:** 🔴 Kritik Düzeltme Gerekli

**Dosyalar:**
- `/desktop/src/pages/etkinlikler/list.tsx`
- `/desktop/src/pages/etkinlikler/create.tsx`
- `/desktop/src/pages/etkinlikler/detail.tsx`

**Kritik Sorunlar:**
1. Interface alan isimleri yanlış
2. FormData alan isimleri yanlış
3. Backend ile uyumsuz

---

### 📋 6. Toplantılar Modülü

**Durum:** 🔴 Kritik Düzeltme Gerekli

**Dosyalar:**
- `/desktop/src/pages/toplantilar/list.tsx`
- `/desktop/src/pages/toplantilar/detail.tsx`

**Kritik Sorunlar:**
1. Interface alan isimleri yanlış
2. FormData alan isimleri yanlış
3. Backend ile uyumsuz
4. Create sayfası yok (modal ile)

---

### 📄 7. Belgeler Modülü

**Durum:** ✅ Çalışıyor

**Dosyalar:**
- `/desktop/src/pages/belgeler/list.tsx`

**Eksikler:** Yok

---

### 💵 8. Bütçe Modülü

**Durum:** 🔴 Kritik Düzeltme Gerekli

**Dosyalar:**
- `/desktop/src/pages/butce/list.tsx`
- `/desktop/src/pages/butce/detail.tsx`

**Kritik Sorunlar:**
1. Interface alan isimleri yanlış (gelir_hedefi → planlanan_gelir)
2. FormData alan isimleri yanlış
3. Kategori alanı eksik

---

### 🌾 9. Köy Modülü

**Durum:** ⚠️ Routes Eksik

**Dosyalar:**
- `/desktop/src/pages/koy/index.tsx` ✅
- `/desktop/src/pages/koy/kasalar.tsx` ✅
- `/desktop/src/pages/koy/gelirler.tsx` ✅
- `/desktop/src/pages/koy/giderler.tsx` ✅
- `/desktop/src/pages/koy/virmanlar.tsx` ✅

**Eksikler:**
1. Routes.tsx'e alt sayfalar eklenmeli
2. Navigation düzeltilmeli

---

### 📊 10. Raporlar Modülü

**Durum:** ⚠️ Basit

**Dosyalar:**
- `/desktop/src/pages/raporlar/mali.tsx`
- `/desktop/src/pages/raporlar/aidat.tsx`
- `/desktop/src/pages/raporlar/uyeler.tsx`

**Eksikler:**
1. Detaylı filtreleme yok
2. Grafik/chart yok
3. PDF export yok

---

### ⚙️ 11. Ayarlar Modülü

**Durum:** ⚠️ Küçük Düzeltme

**Dosyalar:**
- `/desktop/src/pages/ayarlar/genel.tsx`
- `/desktop/src/pages/ayarlar/kullanicilar.tsx`
- `/desktop/src/pages/ayarlar/yedekleme.tsx`

**Eksikler:**
1. `list_users` → `get_users` olmalı
2. Kullanıcı düzenleme eksik

---

## 🚀 Düzeltme Planı (Öncelik Sırasına Göre)

### Faz 1: Kritik Düzeltmeler (Öncelik: YÜKSEK)
1. ✅ Backend schema düzeltmeleri (TAMAMLANDI)
2. ⏳ Etkinlikler frontend interface/form düzeltmeleri
3. ⏳ Toplantılar frontend interface/form düzeltmeleri
4. ⏳ Bütçe frontend interface/form düzeltmeleri
5. ⏳ Kullanıcı yönetimi komut adı düzeltmesi

### Faz 2: Routes ve Navigation (Öncelik: ORTA)
1. ⏳ Köy modülü routes ekleme
2. ⏳ Sidebar navigation kontrolü

### Faz 3: Form Geliştirmeleri (Öncelik: ORTA)
1. ⏳ Üye formu tam alan ekleme (30+ alan)
2. ⏳ Aidat ödeme güncelleme/silme

### Faz 4: Rapor Geliştirmeleri (Öncelik: DÜŞÜK)
1. ⏳ Detaylı filtreleme
2. ⏳ Grafik ekleme
3. ⏳ PDF export

---

## ✅ Sonraki Adımlar

1. **Faz 1.2:** Etkinlikler frontend düzeltmeleri
2. **Faz 1.3:** Toplantılar frontend düzeltmeleri
3. **Faz 1.4:** Bütçe frontend düzeltmeleri
4. **Faz 1.5:** Kullanıcı yönetimi düzeltmesi
5. **Faz 2.1:** Köy modülü routes

Her faz tamamlandıktan sonra test edilecek.
