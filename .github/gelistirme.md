# 📊 BADER Dernek Yönetim Sistemi - Kapsamlı Geliştirme Planı

**Tarih:** 12 Ocak 2026  
**Versiyon:** 3.0  
**Durum:** Planlama Aşaması

---

## 📋 İÇİNDEKİLER

1. [Demirbaş/Envanter Yönetimi](#modül-1-demirbaşenvanter-yönetimi)
2. [Gelişmiş Kasa Yönetimi](#modül-2-gelişmiş-kasa-yönetimi)
3. [Cari İşlemler](#modül-3-cari-i̇şlemler)
4. [Gelişmiş Aidat Yönetimi](#modül-4-gelişmiş-aidat-yönetimi)
5. [Gelişmiş Raporlar](#modül-5-gelişmiş-raporlar)
6. [Aile Üyesi Detayları](#modül-6-aile-üyesi-detayları)
7. [Soft Delete Mekanizması](#modül-7-soft-delete-pasife-alma)
8. [Veritabanı Migrasyonları](#veritabanı-migrasyonları)
9. [Backend Komutları](#backend-komutları)
10. [Uygulama Adımları](#uygulama-adımları)

---

## MODÜL 1: Demirbaş/Envanter Yönetimi

### Yeni Tablo: `demirbaslar`

| Alan | Tip | Açıklama |
|------|-----|----------|
| id | TEXT | Primary Key (UUID) |
| tenant_id | TEXT | FK → tenants |
| demirbaş_no | TEXT | Sicil numarası |
| ad | TEXT | Demirbaş adı |
| kategori | TEXT | Mobilya/Elektronik/Araç/Makine/Diğer |
| marka_model | TEXT | Marka ve model |
| seri_no | TEXT | Seri numarası |
| alis_tarihi | DATE | Alış tarihi |
| alis_bedeli | REAL | Alış bedeli (TL) |
| amortisman_suresi | INTEGER | Yıl cinsinden |
| amortisman_turu | TEXT | Doğrusal/Azalan Bakiyeler |
| guncel_deger | REAL | Hesaplanan güncel değer |
| konum | TEXT | Fiziksel konum |
| sorumlu_uye_id | TEXT | FK → uyeler (zimmetli kişi) |
| durum | TEXT | Aktif/Bakımda/Hurda/Satıldı |
| garanti_bitis | DATE | Garanti bitiş tarihi |
| fatura_no | TEXT | Alış fatura numarası |
| tedarikci | TEXT | Satın alınan yer |
| notlar | TEXT | Ek notlar |
| is_active | BOOLEAN | Soft delete |
| created_at | TIMESTAMP | Oluşturulma tarihi |
| updated_at | TIMESTAMP | Güncelleme tarihi |

### Frontend Sayfaları

| Sayfa | Yol | Açıklama |
|-------|-----|----------|
| Liste | `/demirbaslar` | Demirbaş listesi + filtreleme + arama |
| Oluştur | `/demirbaslar/create` | Yeni demirbaş ekleme formu |
| Detay | `/demirbaslar/:id` | Detay görünümü + amortisman tablosu |

### Özellikler

- [ ] Kategori bazlı filtreleme
- [ ] Durum bazlı filtreleme (Aktif/Bakımda/Hurda)
- [ ] Amortisman otomatik hesaplama
- [ ] Yıllık amortisman tablosu görüntüleme
- [ ] Demirbaş sayım raporu
- [ ] QR kod/barkod desteği (opsiyonel)
- [ ] Fotoğraf ekleme (opsiyonel)

---

## MODÜL 2: Gelişmiş Kasa Yönetimi

### 2.1 Kasa Ekleme

**Konum:** `mali/kasalar.tsx` içine modal veya ayrı sayfa

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| kasa_adi | TEXT | ✅ | Kasa adı |
| kasa_tipi | TEXT | ✅ | Nakit/Banka/Diğer |
| para_birimi | TEXT | ✅ | TRY/USD/EUR |
| devir_bakiye | REAL | ❌ | Açılış bakiyesi |
| iban | TEXT | ❌ | Banka hesabı için |
| banka_adi | TEXT | ❌ | Banka adı |
| sube | TEXT | ❌ | Şube bilgisi |
| hesap_no | TEXT | ❌ | Hesap numarası |
| aciklama | TEXT | ❌ | Ek açıklama |

### 2.2 Kasa Detay Sayfası

**Yeni Sayfa:** `mali/kasa-detay.tsx`

#### Özet Kartları
| Kart | İçerik |
|------|--------|
| Mevcut Bakiye | Anlık kasa bakiyesi |
| Toplam Giren | Dönem içi toplam gelir |
| Toplam Çıkan | Dönem içi toplam gider |
| Beklenen Gelir | Vadeli gelir toplamı |
| Beklenen Gider | Vadeli gider toplamı |
| Net Projeksiyon | Tahmini gelecek bakiye |

#### Hareket Listesi
- Tüm gelir/gider/virman hareketleri
- Kronolojik sıralama
- Tarih aralığı filtresi
- İşlem türü filtresi
- Tutar aralığı filtresi
- Excel/CSV export

### 2.3 Vadeli İşlem Yönetimi

**Yeni Tablo:** `vadeli_islemler`

| Alan | Tip | Açıklama |
|------|-----|----------|
| id | TEXT | Primary Key |
| tenant_id | TEXT | FK → tenants |
| kasa_id | TEXT | FK → kasalar |
| islem_tipi | TEXT | Gelir/Gider |
| tutar | REAL | Beklenen tutar |
| vade_tarihi | DATE | Vade tarihi |
| aciklama | TEXT | İşlem açıklaması |
| kategori | TEXT | Gelir/Gider türü |
| tekrar_tipi | TEXT | Tek Seferlik/Haftalık/Aylık/Yıllık |
| tekrar_sayisi | INTEGER | Kaç kez tekrar edecek |
| ilgili_kisi | TEXT | Kime/Kimden |
| cari_id | TEXT | FK → cariler (opsiyonel) |
| durum | TEXT | Bekliyor/Gerçekleşti/İptal/Gecikti |
| gerceklesen_id | TEXT | Gerçekleşen gelir/gider ID |
| gerceklesme_tarihi | DATE | Gerçekleşme tarihi |
| hatirlatma_gun | INTEGER | Kaç gün önce hatırlat |
| notlar | TEXT | Notlar |
| is_active | BOOLEAN | Soft delete |

#### Vadeli İşlem Özellikleri
- [ ] Otomatik tekrarlayan işlem oluşturma
- [ ] Vade yaklaşınca dashboard uyarısı
- [ ] Tek tıkla "gerçekleştir" (gelir/gider kaydına dönüştür)
- [ ] Geciken vadeli işlemler listesi
- [ ] Aylık nakit akış tahmini

---

## MODÜL 3: Cari İşlemler

### Yeni Tablo: `cariler`

| Alan | Tip | Açıklama |
|------|-----|----------|
| id | TEXT | Primary Key |
| tenant_id | TEXT | FK → tenants |
| cari_kodu | TEXT | Otomatik kod (C-0001) |
| cari_tipi | TEXT | Tedarikçi/Müşteri/Üye/Kurum/Diğer |
| unvan | TEXT | Firma/Kişi adı |
| vergi_dairesi | TEXT | Vergi dairesi |
| vergi_no | TEXT | VKN (10 hane) |
| tc_no | TEXT | TCKN (11 hane) |
| yetkili_kisi | TEXT | Yetkili kişi adı |
| telefon | TEXT | Telefon |
| telefon2 | TEXT | İkinci telefon |
| email | TEXT | E-posta |
| web | TEXT | Web sitesi |
| adres | TEXT | Açık adres |
| il | TEXT | İl |
| ilce | TEXT | İlçe |
| posta_kodu | TEXT | Posta kodu |
| banka_adi | TEXT | Banka |
| iban | TEXT | IBAN |
| borc_bakiye | REAL | Toplam borç (hesaplanan) |
| alacak_bakiye | REAL | Toplam alacak (hesaplanan) |
| kredi_limiti | REAL | Kredi limiti |
| odeme_vadesi | INTEGER | Varsayılan vade (gün) |
| notlar | TEXT | Notlar |
| is_active | BOOLEAN | Aktif/Pasif |
| created_at | TIMESTAMP | Oluşturulma |
| updated_at | TIMESTAMP | Güncelleme |

### Yeni Tablo: `cari_hareketler`

| Alan | Tip | Açıklama |
|------|-----|----------|
| id | TEXT | Primary Key |
| tenant_id | TEXT | FK → tenants |
| cari_id | TEXT | FK → cariler |
| hareket_tipi | TEXT | Borç/Alacak |
| tarih | DATE | İşlem tarihi |
| vade_tarihi | DATE | Vade tarihi |
| tutar | REAL | İşlem tutarı |
| odenen | REAL | Ödenen tutar |
| kalan | REAL | Kalan bakiye |
| belge_turu | TEXT | Fatura/Makbuz/Dekont/Senet/Çek |
| belge_no | TEXT | Belge numarası |
| kasa_id | TEXT | FK → kasalar |
| gelir_id | TEXT | FK → gelirler |
| gider_id | TEXT | FK → giderler |
| aciklama | TEXT | Açıklama |
| durum | TEXT | Açık/Kapandı/Kısmi Ödendi |
| kapanma_tarihi | DATE | Kapanma tarihi |
| is_active | BOOLEAN | Soft delete |

### Frontend Sayfaları

| Sayfa | Yol | Açıklama |
|-------|-----|----------|
| Liste | `/cari` | Cari listesi + bakiye özeti |
| Oluştur | `/cari/create` | Yeni cari ekleme |
| Detay | `/cari/:id` | Cari detay + hareket geçmişi + ekstre |

### Cari Özellikleri

- [ ] Cari tipi filtreleme
- [ ] Borçlu/Alacaklı filtreleme
- [ ] Cari ekstre görüntüleme
- [ ] Ekstre yazdırma (PDF)
- [ ] Gelir/gider kaydederken otomatik cari hareketi
- [ ] Cari mutabakat raporu
- [ ] Vadesi geçen borçlar listesi
- [ ] Cari bazlı toplam analiz

---

## MODÜL 4: Gelişmiş Aidat Yönetimi

### 4.1 Yıllık Aidat Tutarı Tanımlama

**Yeni Tablo:** `aidat_tanimlari`

| Alan | Tip | Açıklama |
|------|-----|----------|
| id | TEXT | Primary Key |
| tenant_id | TEXT | FK → tenants |
| yil | INTEGER | Geçerli yıl |
| aidat_tipi | TEXT | Yıllık/Aylık |
| tutar | REAL | Varsayılan aidat tutarı |
| gecikme_faiz_orani | REAL | Aylık gecikme faizi (%) |
| son_odeme_gunu | INTEGER | Aylık aidat için son ödeme günü |
| aciklama | TEXT | Açıklama |
| is_active | BOOLEAN | Aktif |

**Yeni Sayfa:** `aidat/tanim.tsx`

- Yıl bazlı aidat tutarı tanımlama
- Geçmiş yılların tutarlarını görüntüleme
- Gecikme faizi oranı belirleme

### 4.2 Aidat Eklerken Kasa Tanımlama

**Güncelleme:** `aidat/list.tsx`

Ödeme kaydederken:
- [ ] Kasa seçimi zorunlu alan
- [ ] Otomatik gelir kaydı oluşturma
- [ ] Makbuz numarası otomatik atama

### 4.3 Kişi Bazlı Toplu Aidat Ekleme (Yıl Bazlı)

**Yeni Sayfa:** `aidat/kisi-bazli-toplu.tsx`

| Adım | İşlem |
|------|-------|
| 1 | Üye seçimi (arama/dropdown) |
| 2 | Başlangıç yılı seçimi |
| 3 | Bitiş yılı seçimi |
| 4 | Aidat tipi (Yıllık/Aylık) |
| 5 | Tutar kaynağı (Tanım/Üye Özel/Manuel) |
| 6 | Kasa seçimi |
| 7 | Önizleme (oluşturulacak kayıtlar) |
| 8 | Toplu oluştur |

**Örnek Senaryo:**
- Üye: Ahmet Yılmaz
- Yıl Aralığı: 2020-2026
- Tip: Yıllık
- Sonuç: 7 adet aidat kaydı oluşturulur

### 4.4 Çoklu Üye Çoklu Aidat Ekleme (Yıl Bazlı)

**Yeni Sayfa:** `aidat/coklu-toplu.tsx`

| Adım | İşlem |
|------|-------|
| 1 | Üye filtreleme (Tümü/Aktifler/Seçim) |
| 2 | Checkbox ile çoklu üye seçimi |
| 3 | Yıl seçimi (tek veya çoklu) |
| 4 | Ay seçimi (Tümü veya belirli aylar) |
| 5 | Tutar kaynağı seçimi |
| 6 | Kasa seçimi |
| 7 | Önizleme tablosu |
| 8 | Toplu oluştur butonu |

**Önizleme Bilgileri:**
- Seçilen üye sayısı
- Oluşturulacak toplam kayıt sayısı
- Toplam tutar
- Kasa bilgisi

---

## MODÜL 5: Gelişmiş Raporlar

### 5.1 Bilanço Raporu

**Yeni Sayfa:** `raporlar/bilanco.tsx`

#### AKTİF (Varlıklar)
| Hesap | Açıklama |
|-------|----------|
| Kasa | Nakit kasalar toplamı |
| Bankalar | Banka hesapları toplamı |
| Alacaklar | Üye alacakları + Cari alacaklar |
| Demirbaşlar | Net defter değeri |
| Diğer Varlıklar | Diğer aktifler |

#### PASİF (Kaynaklar)
| Hesap | Açıklama |
|-------|----------|
| Borçlar | Cari borçlar |
| Alınan Avanslar | Peşin alınan aidatlar |
| Öz Kaynaklar | Sermaye + Dönem Karı |

#### Özellikler
- [ ] Dönem sonu seçimi
- [ ] Önceki dönem karşılaştırması
- [ ] PDF export
- [ ] Excel export

### 5.2 Mizan Raporu

**Yeni Sayfa:** `raporlar/mizan.tsx`

| Sütun | Açıklama |
|-------|----------|
| Hesap Kodu | Hesap numarası |
| Hesap Adı | Hesap açıklaması |
| Borç Toplamı | Dönem borç hareketleri |
| Alacak Toplamı | Dönem alacak hareketleri |
| Borç Bakiye | Net borç bakiyesi |
| Alacak Bakiye | Net alacak bakiyesi |

#### Özellikler
- [ ] Tarih aralığı filtresi
- [ ] Hesap tipi filtresi
- [ ] Sadece bakiyeli hesaplar
- [ ] PDF/Excel export

### 5.3 Kesin Hesap Raporu

**Yeni Sayfa:** `raporlar/kesin-hesap.tsx`

Genel Kurul'a sunulacak yıllık mali rapor.

#### İçerik
1. **Dönem Bilgisi:** 01.01.YYYY - 31.12.YYYY
2. **Açılış Bilançosu:** Dönem başı varlık/kaynak
3. **Gelir Tablosu:**
   - Aidat gelirleri
   - Bağış gelirleri
   - Etkinlik gelirleri
   - Diğer gelirler
   - **Toplam Gelir**
4. **Gider Tablosu:**
   - Kira giderleri
   - Personel giderleri
   - Fatura giderleri
   - Etkinlik giderleri
   - Yönetim giderleri
   - Diğer giderler
   - **Toplam Gider**
5. **Dönem Sonucu:** Kar/Zarar
6. **Kapanış Bilançosu:** Dönem sonu varlık/kaynak
7. **Bütçe Karşılaştırması:** Planlanan vs Gerçekleşen

#### Özellikler
- [ ] Dernekler Yönetmeliği formatında
- [ ] PDF export (imza alanları ile)
- [ ] Yönetim kurulu onay alanı

### 5.4 Kasa Bazlı Rapor

**Yeni Sayfa:** `raporlar/kasa.tsx`

| Bölüm | İçerik |
|-------|--------|
| Kasa Seçimi | Dropdown (tek/çoklu) |
| Dönem | Tarih aralığı |
| Özet Tablo | Açılış, Giren, Çıkan, Kapanış |
| Hareket Listesi | Detaylı hareket dökümü |
| Kategori Dağılımı | Pasta grafik |
| Aylık Trend | Çizgi grafik |

---

## MODÜL 6: Aile Üyesi Detayları

### Genişletilmiş Aile Üyesi Tablosu

**Güncelleme:** `uye_aile_uyeleri` tablosuna ek alanlar

| Alan | Tip | Açıklama |
|------|-----|----------|
| tc_no | TEXT | TC Kimlik No |
| cinsiyet | TEXT | Erkek/Kadın |
| meslek | TEXT | Meslek |
| is_yeri | TEXT | İş yeri |
| egitim_durumu | TEXT | İlkokul/Ortaokul/Lise/Üniversite/Lisansüstü |
| email | TEXT | E-posta adresi |
| kan_grubu | TEXT | Kan grubu |
| ozel_durum | TEXT | Engel durumu/Kronik hastalık |
| notlar | TEXT | Ek notlar |
| is_active | BOOLEAN | Aktif/Pasif |

### UI Güncellemeleri

**Konum:** `uyeler/detail.tsx`

- [ ] Aile üyesi ekleme formuna yeni alanlar
- [ ] Aile üyesi düzenleme modal'ı ekleme
- [ ] Aile üyesi pasife alma (silme yerine)
- [ ] Aile üyeleri genişletilmiş tablo görünümü

---

## MODÜL 7: Soft Delete (Pasife Alma)

### Etkilenen Tablolar

| Tablo | Yeni Alanlar |
|-------|--------------|
| uyeler | `is_active`, `pasife_alinma_tarihi`, `pasife_alma_nedeni` |
| kasalar | `is_active` (mevcut) |
| gelirler | `is_active`, `iptal_tarihi`, `iptal_nedeni` |
| giderler | `is_active`, `iptal_tarihi`, `iptal_nedeni` |
| aidat_takip | `is_active`, `iptal_nedeni` |
| demirbaslar | `is_active`, `durum` |
| cariler | `is_active`, `pasife_alma_nedeni` |
| cari_hareketler | `is_active` |
| vadeli_islemler | `is_active` |
| uye_aile_uyeleri | `is_active` |

### UI Değişiklikleri

Tüm liste sayfalarına:
- [ ] "Pasifleri Göster" toggle butonu
- [ ] Silme yerine "Pasife Al" butonu
- [ ] Pasife alma nedeni modal'ı
- [ ] Pasif kayıtlar için gri/soluk görünüm
- [ ] "Aktife Al" geri alma seçeneği
- [ ] Pasif kayıt sayısı badge'i

### Silme Davranışı
