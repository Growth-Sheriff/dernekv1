# 📋 AİDAT SİSTEMİ - BORÇLANDIRMA VE ÖDEME AKIŞI

> **Versiyon**: 3.0.0
> **Tarih**: 2026-01-21
> **Amaç**: Aidat sisteminin semantik akışını ve kullanıcı beklentilerini netleştirmek

---

## 🎯 TEMEL PRENSİP

Aidat sistemi **2 fazlı** çalışır:

1. **BORÇLANDIRMA FAZI** → Aidat borcunu oluştur
2. **ÖDEME FAZI** → Borcu tahsil et ve kasaya kaydet

**ÖNEMLİ**: Bu iki faz birbirinden ayrıdır. Borçlandırma ≠ Ödeme!

---

## 📊 FAZ 1: BORÇLANDIRMA (Toplu Aidat Oluşturma)

### Kullanım Senaryosu
Yıl başında (örneğin Ocak 2026) dernek, tüm üyeler için yıllık aidat borçlarını oluşturur.

### İşlem Akışı

```
[Toplu İşlemler Sayfası]
  ↓
[Önizleme Göster] ← YENİ! Kullanıcı hangi üyelerin kaç TL borçlandırılacağını görür
  ↓
[Üyelik Türü Dağılımı]
  - Asil Üye: 50 kişi x 1000 TL = 50,000 TL
  - Fahri Üye: 10 kişi x 500 TL = 5,000 TL
  - Öğrenci: 5 kişi x 200 TL = 1,000 TL
  Toplam: 65 üye → 56,000 TL borç
  ↓
[Aidatları Oluştur] ← Kullanıcı onaylar
  ↓
[Backend: toplu_aidat_olustur()]
  ↓
[SQLite: aidat_takip tablosu]
  INSERT INTO aidat_takip:
    - uye_id: "uuid-123"
    - yil: 2026
    - ay: 1 (Ocak)
    - tutar: 1000.00
    - odenen: 0.00
    - kalan: 1000.00
    - durum: "beklemede"  ← KRİTİK: Henüz ödenmedi!
```

### Borçlandırma Sonrası Durum

| Tablo | Değişiklik | Neden |
|-------|-----------|-------|
| `aidat_takip` | ✅ Yeni kayıt oluşturuldu | Borç kaydedildi |
| `gelirler` | ❌ Değişiklik yok | Henüz ödeme yapılmadı |
| `kasalar` | ❌ Değişiklik yok | Para kasaya girmedi |

**Kullanıcı Bakış Açısı:**
> "Ben sadece borçları tanımladım. Üyeler henüz ödeme yapmadı. Kasa değişmedi."

---

## 💰 FAZ 2: ÖDEME (Aidat Tahsilatı)

### Kullanım Senaryosu
Üye Ahmet, aidat borcunu ödemeye geldi. Muhasebeci ödemeyi kaydediyor.

### İşlem Akışı

```
[Aidat Takip Sayfası]
  ↓
[Üyenin Borç Listesi]
  - 2026 Ocak: 1000 TL (Beklemede)
  - 2025 Ocak: 1000 TL (Ödendi)
  ↓
[Ödeme Yap Butonu] ← Muhasebeci tıklar
  ↓
[Ödeme Formu]
  - Tutar: 1000 TL
  - Tarih: 21/01/2026
  - Kasa: Ana Kasa
  - Makbuz No: Auto-generated
  ↓
[Backend: add_aidat_odeme_with_gelir()] ← ÖNERİLEN FONKSİYON
  ↓
[TRANSACTION BEGIN]
  │
  ├─ 1. aidat_takip güncelle
  │    UPDATE aidat_takip SET
  │      odenen = 1000.00,
  │      kalan = 0.00,
  │      durum = "odendi",
  │      odeme_tarihi = "2026-01-21",
  │      gelir_id = "gelir-uuid-456"
  │
  ├─ 2. gelirler tablosuna kaydet
  │    INSERT INTO gelirler:
  │      - kasa_id: "ana-kasa-uuid"
  │      - gelir_turu: "Aidat"
  │      - tutar: 1000.00
  │      - tarih: "2026-01-21"
  │      - aciklama: "Aidat ödemesi - 2026 Ocak"
  │      - aidat_id: "aidat-uuid-123"
  │      - uye_id: "uye-uuid-789"
  │      - makbuz_no: "AIDAT-456ABC"
  │
  ├─ 3. kasalar tablosunu güncelle
  │    UPDATE kasalar SET
  │      bakiye = bakiye + 1000.00,
  │      toplam_gelir = toplam_gelir + 1000.00
  │    WHERE id = "ana-kasa-uuid"
  │
  └─ COMMIT (Tümü başarılı) veya ROLLBACK (Hata durumunda)
```

### Ödeme Sonrası Durum

| Tablo | Değişiklik | Sonuç |
|-------|-----------|-------|
| `aidat_takip` | ✅ Güncellendi | durum: "odendi", kalan: 0 |
| `gelirler` | ✅ Yeni kayıt | 1000 TL gelir kaydedildi |
| `kasalar` | ✅ Güncellendi | bakiye +1000 TL arttı |

**Kullanıcı Bakış Açısı:**
> "Ahmet'in ödemeyi aldım. Para kasaya girdi. Makbuz verdim."

---

## ⚠️ YANLIŞ ANLAMALAR ve ÇÖZÜMLER

### ❌ Yanlış Anlama 1: "Toplu Aidat = Toplu Ödeme"

**Kullanıcı Düşüncesi:**
> "Toplu aidat oluştur dediğimde, tüm üyelerin ödemesi alınmış gibi olsun."

**Gerçek:**
- Toplu aidat = Sadece BORÇ tanımlama
- Ödemeler tek tek veya çoklu yıl ödemesi ile alınır

**Çözüm:**
- ✅ Frontend'te net açıklama eklendi: "Borçlandırma işlemi"
- ✅ Önizleme modal ile kullanıcı ne olacağını görüyor
- ✅ "Otomatik gelir oluştur" checkbox kaldırıldı (yanıltıcıydı)

---

### ❌ Yanlış Anlama 2: "Otomatik Gelir Oluştur = Para Kasaya Girsin"

**Eski Durum:**
```typescript
otomatik_gelir_olustur: true  // Checkbox vardı ama çalışmıyordu!
```

**Sorun:**
- Backend bu parametreyi hiç kullanmıyordu
- Kullanıcı "gelir oluşturulacak" sanıyordu
- Kasa güncelleniyormuş gibi algılanıyordu

**Çözüm:**
- ❌ Checkbox tamamen kaldırıldı
- ✅ Yerine açıklayıcı bilgi kutusu eklendi
- ✅ Flow netleştirildi: Borçlandırma ≠ Ödeme

---

### ❌ Yanlış Anlama 3: "Üyelik Türü Farkını Göremiyorum"

**Eski Durum:**
- Backend üyelik türüne göre farklı tutarlar uyguluyordu
- Ama kullanıcı bunu göremiyordu

**Çözüm:**
```typescript
// YENİ: Önizleme Modal
Üyelik Türü Dağılımı:
  Asil Üye:    50 kişi × 1000 TL = 50,000 TL
  Fahri Üye:   10 kişi ×  500 TL =  5,000 TL
  Öğrenci:      5 kişi ×  200 TL =  1,000 TL

Tutar Kaynağı:
  Özel Tutar:       3 üye (üyeye özel tanımlanmış)
  Tanım:           60 üye (aidat_tanimlari tablosundan)
  Varsayılan:       2 üye (form'daki varsayılan tutar)
```

---

## 🔄 FONKSİYON REFERANSI

### Borçlandırma Fonksiyonları

| Fonksiyon | Amaç | Gelir Oluşturur? | Kasa Günceller? |
|-----------|------|------------------|-----------------|
| `toplu_aidat_onizleme()` | Önizleme göster | ❌ | ❌ |
| `toplu_aidat_olustur()` | Tüm üyeler için borç oluştur | ❌ | ❌ |
| `toplu_aidat_kisi_bazli()` | Bir üye için yıl aralığı borç | ❌ | ❌ |

### Ödeme Fonksiyonları

| Fonksiyon | Amaç | Gelir Oluşturur? | Kasa Günceller? | Önerilen? |
|-----------|------|------------------|-----------------|-----------|
| `add_aidat_odeme_with_gelir()` | Tekil ödeme (TAM ENTEGRASYON) | ✅ | ✅ | ✅ ÖNERİLEN |
| `coklu_yil_odeme()` | Çoklu yıl ödemesi | ✅ (her yıl için) | ✅ | ✅ ÖNERİLEN |
| ~~`kaydet_odeme()`~~ | Sadece aidat güncelle | ❌ | ❌ | ❌ ESKİ - KULLANMA |
| ~~`add_aidat_odeme()`~~ | Sadece aidat güncelle | ❌ | ❌ | ❌ ESKİ - KULLANMA |

---

## 📈 TUTAR BELİRLEME HİYERARŞİSİ

Backend, aidat tutarını şu öncelik sırasıyla belirler:

```rust
1. ÖNCE: uye.ozel_aidat_tutari kontrol edilir
   ↓ Varsa → Bu tutar kullanılır
   ↓ Yoksa ↓

2. SONRA: aidat_tanimlari tablosuna bakılır
   Query: "SELECT tutar WHERE yil = ? AND uye_turu = ?"
   ↓ Varsa → Bu tutar kullanılır
   ↓ Yoksa ↓

3. EN SON: data.varsayilan_tutar kullanılır
   (Form'da girilen varsayılan tutar)
```

### Örnek Senaryo

```
Üye 1: Ahmet (Asil Üye)
  - ozel_aidat_tutari: NULL
  - aidat_tanimlari'nda Asil için 2026 → 1200 TL tanımlı
  → Tutar: 1200 TL ✅

Üye 2: Mehmet (Fahri Üye)
  - ozel_aidat_tutari: 800 TL (özel indirim)
  - aidat_tanimlari'nda Fahri için 2026 → 600 TL tanımlı
  → Tutar: 800 TL ✅ (özel tutar öncelikli)

Üye 3: Ayşe (Öğrenci)
  - ozel_aidat_tutari: NULL
  - aidat_tanimlari'nda Öğrenci için 2026 tanımı YOK
  → Tutar: 1000 TL ✅ (varsayılan tutar)
```

---

## 🎨 KULLANICI DENEYİMİ İYİLEŞTİRMELERİ

### 1. Önizleme Modal (YENİ!)

**Önceki Durum:**
```
[Form Doldur] → [Oluştur] → ❓ Ne oldu?
```

**Yeni Durum:**
```
[Form Doldur] → [📊 Önizleme Göster] → [Detaylı İstatistikler] → [Devam Et ve Oluştur]
```

**Kullanıcı Görecekler:**
- Kaç üye borçlandırılacak
- Üyelik türü dağılımı
- Toplam tutar
- Uyarılar (örn: "5 üyenin zaten aidatı var")

### 2. Açıklayıcı Bilgi Kutusu

**Eski:**
```
☑ Otomatik gelir kaydı oluştur
```

**Yeni:**
```
ℹ️ Borçlandırma İşlemi
• Sadece aidat BORÇ kaydı oluşturulur (durum: beklemede)
• Gelir kaydı ve kasa güncellemesi ÖDEME yapıldığında gerçekleşir
• Üyelik türüne göre farklı tutarlar uygulanabilir
```

### 3. Önizleme → Onay → Oluştur Akışı

```
1. Kullanıcı formu doldurur
   ↓
2. "📊 Önizleme Göster" tıklar
   ↓
3. Modal açılır, istatistikler görülür
   ↓
4. "Devam Et ve Oluştur" tıklar
   ↓
5. Son onay dialogu
   ↓
6. İşlem gerçekleşir
```

---

## 🔐 VERİ TUTARLILIĞI

### Transaction Garantisi

Ödeme işlemleri `add_aidat_odeme_with_gelir()` fonksiyonunda **ACID transaction** ile korunur:

```rust
conn.transaction::<_, diesel::result::Error, _>(|conn| {
    // 1. Aidat güncelle
    UPDATE aidat_takip ...

    // 2. Gelir kaydet
    INSERT INTO gelirler ...

    // 3. Kasa güncelle
    UPDATE kasalar SET bakiye = bakiye + ?

    // Herhangi biri başarısız olursa ROLLBACK
    Ok(())
})
```

**Garanti:**
- Ya 3'ü birden başarılı olur
- Ya hiçbiri olmaz (rollback)
- Yarım ödeme durumu ASLA olmaz

### Optimistic Locking

Çakışma durumlarını önlemek için `version` column kullanılır:

```sql
UPDATE aidat_takip
SET odenen = ?, kalan = ?, version = version + 1
WHERE id = ? AND version = ?
```

Eğer version uyuşmazsa → İşlem reddedilir → Kullanıcı uyarılır

---

## 📚 KULLANICI REHBERİ

### Senaryo 1: Yıl Başı Borçlandırma

**Adımlar:**
1. Toplu İşlemler → Toplu Aidat Oluştur
2. Yıl: 2026
3. Varsayılan Tutar: 1000 TL
4. ☑ Sadece aktif üyeler
5. Kasa: Ana Kasa (ileride ödemeler bu kasaya girecek)
6. **"📊 Önizleme Göster"** ← İlk bunu tıkla!
7. İstatistikleri incele
8. "Devam Et ve Oluştur"
9. Son onay

**Sonuç:**
- Tüm aktif üyeler için borç oluştu
- Durum: beklemede
- Kasa değişmedi (henüz ödeme yok)

### Senaryo 2: Tekil Ödeme Alma

**Adımlar:**
1. Aidat Takip → Üye ara
2. Üyenin bekleyen aidatlarını gör
3. "Ödeme Yap" butonu
4. Tutar, tarih, makbuz bilgilerini gir
5. Kaydet

**Sonuç:**
- Aidat durumu: beklemede → ödendi
- Gelir kaydı oluştu
- Kasa bakiyesi arttı
- Makbuz numarası otomatik oluştu

### Senaryo 3: Çoklu Yıl Ödemesi

**Adımlar:**
1. Toplu İşlemler → Çoklu Yıl Ödemesi
2. Üye seç
3. Başlangıç: 2023, Bitiş: 2026
4. Toplam Tutar: 4000 TL (4 yıl × 1000 TL)
5. Kasa seç
6. Kaydet

**Sonuç:**
- 2023, 2024, 2025, 2026 aidatları ödendi
- Her yıl için ayrı gelir kaydı
- Kasa +4000 TL

---

## 🚨 SORUN GİDERME

### S: "Toplu aidat oluşturdum ama kasa değişmedi?"
**C:** Normal! Toplu aidat = borçlandırma. Ödeme almadığınız için kasa değişmez.

### S: "Üyenin aidatı iki kere oluştu?"
**C:** Önizleme'de "zaten aidat var" uyarısını kontrol edin. Aynı yıl için tekrar oluşturma yapılamaz.

### S: "Üyelik türüne göre farklı tutarlar nasıl oluyor?"
**C:** Önizleme modalında "Üyelik Türü Dağılımı" bölümüne bakın. Hangi üye türüne kaç TL uygulandığını görebilirsiniz.

### S: "Öğrenciler için indirimli aidat nasıl tanımlarım?"
**C:** Ayarlar → Aidat Tanımları → Yıl: 2026, Üye Türü: Öğrenci, Tutar: 200 TL

---

## 🔄 VERSİYON GEÇMİŞİ

### v3.0.0 (2026-01-21)
- ✅ `toplu_aidat_onizleme()` fonksiyonu eklendi
- ✅ Frontend önizleme modal implementasyonu
- ✅ "Otomatik gelir" checkbox kaldırıldı
- ✅ Açıklayıcı bilgi kutusu eklendi
- ✅ Flow dökümanı oluşturuldu

### v2.0.0 (Önceki)
- `add_aidat_odeme_with_gelir()` fonksiyonu eklendi
- Transaction desteği
- Optimistic locking

---

## 📞 DESTEK

Bu döküman hakkında sorularınız için:
- GitHub Issues: https://github.com/Growth-Sheriff/dernekv1/issues
- Bu dosya: `/Users/adiguzel/Desktop/baderone/AIDAT_FLOW.md`

**Not:** Bu döküman teknik ve kullanıcı perspektiflerini birleştirerek aidat sisteminin tüm yönlerini kapsar.
