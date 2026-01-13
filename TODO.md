# BADER Sistemi - Öncelikli TODO Listesi

> **Durum:** Sistem %85-90 tamamlanmış  
> **Hedef:** %95+ tamamlanma, production-ready  
> **Tahmini Süre:** 10-12 iş günü

---

## 🔥 ÇOK ACİL (1-2 Gün)

### ✅ Gün 1: Kullanıcı Yönetimi + Bütçe Schema

#### Backend (`desktop/src-tauri/src/commands/kullanici.rs`)
- [ ] `get_users` komutunu ekle
  ```rust
  get_users(tenant_id: String, role: Option<String>, skip: i64, limit: i64) -> Vec<User>
  ```
- [ ] `update_user` komutunu ekle
  ```rust
  update_user(tenant_id: String, user_id: String, data: UpdateUserRequest) -> User
  ```
- [ ] `UpdateUserRequest` struct'ını tanımla
  ```rust
  struct UpdateUserRequest {
      ad: Option<String>,
      email: Option<String>,
      role: Option<String>,
      is_active: Option<bool>,
  }
  ```

#### Frontend (`desktop/src/pages/ayarlar/kullanicilar.tsx`)
- [ ] Kullanıcı listesi tablosunu ekle (`get_users` invoke)
- [ ] Kullanıcı düzenleme modal'ını ekle (`update_user` invoke)
- [ ] Rol seçimi dropdown'unu ekle
- [ ] Aktif/Pasif toggle'ını ekle

#### Database Migration
- [ ] Bütçe tablosuna eksik kolonları ekle:
  ```sql
  ALTER TABLE butce ADD COLUMN gerceklesen_gelir REAL DEFAULT 0.0;
  ALTER TABLE butce ADD COLUMN gerceklesen_gider REAL DEFAULT 0.0;
  ```

#### Backend (`desktop/src-tauri/src/commands/butce.rs`)
- [ ] `update_butce_gerceklesen` komutunu düzelt (yeni kolonları kullan)

---

### ✅ Gün 2: Aile Üyeleri + Gelir/Gider Türleri

#### Backend (`desktop/src-tauri/src/commands/aile_uyeleri.rs`)
- [ ] `update_aile_uyesi` komutunu ekle
  ```rust
  update_aile_uyesi(tenant_id: String, id: String, data: UpdateAileUyesiRequest) -> AileUyesi
  ```

#### Frontend (`desktop/src/pages/uyeler/detail.tsx`)
- [ ] Aile üyesi düzenleme modal'ını ekle

#### Backend (`desktop/src-tauri/src/commands/gelir_turleri.rs`)
- [ ] `update_gelir_turu` komutunu ekle
  ```rust
  update_gelir_turu(tenant_id: String, id: String, data: UpdateGelirTuruRequest) -> GelirTuru
  ```

#### Backend (`desktop/src-tauri/src/commands/gider_turleri.rs`)
- [ ] `update_gider_turu` komutunu ekle
  ```rust
  update_gider_turu(tenant_id: String, id: String, data: UpdateGiderTuruRequest) -> GiderTuru
  ```

#### Frontend
- [ ] `/mali/gelir-turu-yonetimi.tsx` - Düzenleme modal'ı ekle
- [ ] `/mali/gider-turu-yonetimi.tsx` - Düzenleme modal'ı ekle

---

## 🔴 ACİL (3-5 Gün)

### ✅ Gün 3-4: Raporlama Modülü

#### Frontend (`desktop/src/pages/raporlar/uyeler.tsx`)
- [ ] Filtre formu ekle (tarih aralığı, durum, vb)
- [ ] Önizleme tablosu ekle
- [ ] Grafik bileşeni ekle (Chart.js veya Recharts)
- [ ] PDF export butonu ekle

#### Frontend (`desktop/src/pages/raporlar/aidat.tsx`)
- [ ] Filtre formu ekle (yıl, ay, durum, üye)
- [ ] Ödeme takip tablosu ekle
- [ ] Gelir-gider grafiği ekle
- [ ] Detaylı rapor önizlemesi ekle

#### Frontend (`desktop/src/pages/raporlar/mali.tsx`)
- [ ] Filtre formu ekle (tarih, kasa, tür)
- [ ] Gelir/gider karşılaştırma tablosu ekle
- [ ] Kasa bazlı grafik ekle
- [ ] Excel/PDF export seçenekleri ekle

#### Backend (`desktop/src-tauri/src/commands/export.rs`)
- [ ] PDF export fonksiyonları ekle (printpdf crate kullan)
- [ ] Excel export fonksiyonları ekle (calamine veya xlsx crate)

---

### ✅ Gün 5: Dashboard İyileştirmeleri

#### Frontend (`desktop/src/pages/dashboard/index.tsx`)
- [ ] `get_dashboard_stats` invoke'unu ekle
- [ ] `get_aidat_stats` invoke'unu ekle
- [ ] `get_kasa_stats` invoke'unu ekle
- [ ] Üye istatistik kartları ekle
- [ ] Aidat özet kartları ekle
- [ ] Mali durum kartları ekle
- [ ] Son aktiviteler listesi ekle
- [ ] Yaklaşan etkinlikler widget'ı ekle

#### Backend (`desktop/src-tauri/src/commands/dashboard.rs`)
- [ ] `get_aidat_stats` komutundaki `odeme_durumu` -> `durum` hatası düzelt
- [ ] `get_son_aktiviteler` komutunu ekle (opsiyonel)
- [ ] `get_yaklasan_etkinlikler` komutunu ekle (opsiyonel)

---

## 🟡 ORTA (6-8 Gün)

### Belge Yönetimi İyileştirmeleri

#### Backend (`desktop/src-tauri/src/commands/belgeler.rs`)
- [ ] `download_belge_with_dialog` fonksiyonunu ekle (Tauri file dialog kullan)
- [ ] Dosya yükleme için helper fonksiyon ekle
- [ ] Dosya boyutu kontrolü ekle

#### Frontend (`desktop/src/pages/belgeler/list.tsx`)
- [ ] Dosya yükleme modal'ını iyileştir
- [ ] Drag & drop yükleme ekle
- [ ] Önizleme (preview) özelliği ekle (PDF, resim)

---

### Aidat Klasör Birleştirme

- [ ] `/aidat` ve `/aidat-takip` klasörlerini birleştir
- [ ] Routing yapısını düzenle
- [ ] Duplike kod'ları temizle

---

### Senkronizasyon UI

#### Frontend (Navbar veya Ayarlar)
- [ ] Senkronizasyon durumu göstergesi ekle
- [ ] Manuel sync butonu ekle
- [ ] Bekleyen değişiklik sayısını göster
- [ ] Son sync zamanını göster

---

## 🟢 DÜŞÜK ÖNCELİK (9-12 Gün)

### PDF/Excel Export

- [ ] PDF export için `printpdf` crate entegrasyonu
- [ ] Excel export için `rust_xlsxwriter` crate entegrasyonu
- [ ] Template tasarımları oluştur

---

### Kullanıcı Profil Sayfası

- [ ] `/ayarlar/profil` sayfası oluştur
- [ ] Şifre değiştirme formu ekle
- [ ] Kullanıcı bilgileri güncelleme formu ekle

---

### Gecikme Faizi Hesaplama UI

- [ ] `/aidat/gecikme-hesapla` sayfası oluştur
- [ ] Faiz oranı girişi ekle
- [ ] Hesaplama sonuçlarını göster
- [ ] Toplu faiz uygulama özelliği ekle

---

## 📊 İLERLEME TAKİP

### Backend
- [x] Üyeler (%100)
- [ ] Aile Üyeleri (%75 - update eksik)
- [x] Aidat (%100)
- [x] Mali (%100)
- [ ] Gelir/Gider Türleri (%75 - update eksik)
- [x] Köy Modülü (%100)
- [x] Etkinlikler (%100)
- [x] Toplantılar (%100)
- [x] Belgeler (%100)
- [ ] Bütçe (%80 - schema hatası)
- [ ] Dashboard (%90 - düzeltme gerekli)
- [ ] Kullanıcı (%67 - get_users, update_user eksik)
- [x] Raporlar (%100 - backend)
- [x] Yedekleme (%100)
- [x] Lisans (%100)
- [x] Senkronizasyon (%100)

**Genel Backend:** %92

### Frontend
- [x] Üyeler (%100)
- [ ] Aidat (%85 - klasör duplikasyonu)
- [ ] Mali (%90)
- [x] Köy (%100)
- [x] Etkinlikler (%100)
- [x] Toplantılar (%100)
- [ ] Belgeler (%90 - indirme geliştirmesi)
- [ ] Bütçe (%70 - takip ekranı eksik)
- [ ] Dashboard (%60 - entegrasyon zayıf)
- [ ] Ayarlar (%70 - kullanıcı yönetimi eksik)
- [ ] Raporlar (%40 - UI çok basit)

**Genel Frontend:** %85

---

## 🎯 BAŞARI KRİTERLERİ

### Sprint 1 (Gün 1-2) - ACİL
- ✅ Kullanıcı CRUD tam çalışıyor
- ✅ Bütçe schema hatası düzeltilmiş
- ✅ Aile üyeleri güncellenebiliyor
- ✅ Gelir/Gider türleri güncellenebiliyor

### Sprint 2 (Gün 3-5) - YÜKSEK
- ✅ Raporlama sayfaları dolu ve işlevsel
- ✅ Dashboard tam entegre
- ✅ Grafikler çalışıyor

### Sprint 3 (Gün 6-8) - ORTA
- ✅ Belge indirme çalışıyor
- ✅ Aidat klasörleri birleştirilmiş
- ✅ Sync UI eklenmiş

### Sprint 4 (Gün 9-12) - DÜŞÜK
- ✅ PDF/Excel export çalışıyor
- ✅ Kullanıcı profil sayfası var
- ✅ Gecikme faizi UI tamamlanmış

---

## 🚀 PRODUCTION CHECKLIST

- [ ] Tüm kritik komutlar tamamlanmış
- [ ] Schema hataları düzeltilmiş
- [ ] UI boşlukları doldurulmuş
- [ ] Test coverage %80+
- [ ] Security audit yapılmış
- [ ] Performance testleri geçmiş
- [ ] Kullanıcı dökümanları hazırlanmış
- [ ] Deployment scripti hazırlanmış

---

**Hazırlayan:** GitHub Copilot  
**Son Güncelleme:** 11 Ocak 2026  
**Hedef Tamamlanma:** 25 Ocak 2026
