# BADER V3 - Finansal Sistem Semantiği

> **Amaç:** Muhasebe mantığı, kullanıcı zihinsel modeli ve SaaS ürün yapısına uygun finansal kavramların tanımı

---

## 🎯 Temel Ayrımlar

### 1. TAHAKKUK vs TAHSİLAT

| Kavram | İngilizce | Anlamı | Örnek |
|--------|-----------|--------|-------|
| **Tahakkuk** | Accrual | Borç doğuşu (para henüz gelmedi) | Aidat borçlandırma |
| **Tahsilat** | Collection | Para girişi (alacak tahsil edildi) | Aidat ödemesi |

**Kritik Nokta:** Tahakkuk ≠ Gelir. Gelir ancak para tahsil edildiğinde oluşur.

---

## 💰 Finansal Kavramlar Haritası

### Aidat (Membership Dues)

```
┌─────────────────────────────────────────────────────────┐
│ AIDAT SİSTEMİ                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. TAHAKKUK (Borç Oluşumu)                            │
│     └─ aidat_takip.durum = 'beklemede'                 │
│     └─ tutar = X, odenen = 0, kalan = X                │
│     └─ Gelir kaydı YOK                                 │
│                                                         │
│  2. TAHSİLAT (Ödeme Alınması)                          │
│     └─ aidat_takip.durum = 'ödendi' | 'kısmi'        │
│     └─ odenen += Y, kalan -= Y                         │
│     └─ GELİR KAYDI OLUŞUR                             │
│     └─ KASA BAKİYESİ ARTAR                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Öncelik Sırası (Aidat Tutarı):**
1. Üyenin özel aidat tutarı (`uyeler.ozel_aidat_tutari`)
2. Üyelik türü tanımı (`aidat_tanimlari.uye_turu`)
3. Varsayılan tutar (UI'dan girilen)

---

### Gelir (Income)

```
┌─────────────────────────────────────────────────────────┐
│ GELİR KAYDI                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Para Girişi Olayları:                                 │
│    ✓ Aidat tahsilatı                                   │
│    ✓ Bağış                                             │
│    ✓ Etkinlik geliri                                   │
│    ✓ Diğer para giriş                                  │
│                                                         │
│  Etki:                                                  │
│    → gelirler tablosuna kayıt                          │
│    → kasalar.bakiye += tutar                           │
│    → Raporlamada "Gelir" olarak görünür               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Kritik:** Gelir = Nakit giriş. Borçlandırma gelir DEĞİLDİR.

---

### Gider (Expense)

```
┌─────────────────────────────────────────────────────────┐
│ GİDER KAYDI                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Para Çıkışı Olayları:                                 │
│    ✓ Demirbaş alımı                                    │
│    ✓ Fatura ödemesi                                    │
│    ✓ Personel maaşı                                    │
│    ✓ Diğer para çıkışı                                 │
│                                                         │
│  Etki:                                                  │
│    → giderler tablosuna kayıt                          │
│    → kasalar.bakiye -= tutar                           │
│    → Raporlamada "Gider" olarak görünür               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Alacak - Verecek (Receivables - Payables)

```
┌─────────────────────────────────────────────────────────┐
│ ALACAK-VERECEK TAKİBİ                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ALACAK (Receivable):                                   │
│    → Üyelerden tahsil edilecek                         │
│    → aidat_takip.kalan > 0                             │
│    → Henüz ödenmemiş borçlar                           │
│                                                         │
│  VERECEK (Payable):                                     │
│    → Tedarikçilere / 3. kişilere ödenecek             │
│    → (Şu an sistemde YOK - ihtiyaç varsa eklenecek)   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Terminology Tablosu

### ÖNCE vs SONRA

| YANLIŞ Terim | DOĞRU Terim | Açıklama |
|--------------|-------------|----------|
| Aidat Oluştur | **Aidat Borçlandır** | Tahakkuk işlemi, borç kaydı |
| Çoklu Yıl Ödemesi | **Çoklu Dönem Tahsilatı** | Para tahsil etme işlemi |
| Gelir Oluştur | **Gelir Kaydet** | Gelir zaten oluşmuş, kaydediyoruz |
| Aidat Geliri | **Aidat Tahsilatı** | Aidat ödemesi gelir doğurur |

---

## 🔄 İş Akışları

### 1. Toplu Aidat Borçlandırma

```
┌───────────────────────────────────────────────────────────┐
│ TOPLU BORÇLANDIRMA AKIŞI                                 │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  1. Üye türü seç (Asil/Fahri/Onursal/Kurumsal)          │
│  2. Yıl seç                                              │
│  3. Varsayılan tutar gir                                 │
│  4. Önizleme göster:                                     │
│     - Kaç üye borçlandırılacak                           │
│     - Üye türü dağılımı                                  │
│     - Toplam borçlandırılacak tutar                      │
│  5. Onayla → Borç kayıtları oluştur                      │
│                                                           │
│  SONUÇ:                                                   │
│    ✓ aidat_takip kayıtları (durum: beklemede)           │
│    ✗ Gelir kaydı YOK (henüz ödeme yok)                  │
│    ✗ Kasa etkilenmez                                     │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### 2. Çoklu Dönem Tahsilatı

```
┌───────────────────────────────────────────────────────────┐
│ ÇOKLU DÖNEM TAHSİLAT AKIŞI                               │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  1. Üye seç                                              │
│  2. Borçlu olduğu dönemler otomatik listelenir           │
│     (sadece kalan > 0 olanlar)                           │
│  3. Yılları seç (multi-select)                           │
│  4. Ödeme tutarı gir                                     │
│  5. Kısmi/Tam ödeme otomatik belirlenir                  │
│  6. Kaydet                                               │
│                                                           │
│  SONUÇ (Transaction içinde):                             │
│    ✓ aidat_takip.odenen += X                             │
│    ✓ aidat_takip.kalan -= X                              │
│    ✓ aidat_takip.durum = 'ödendi' | 'kısmi'            │
│    ✓ GELİR KAYDI OLUŞUR (gelirler tablosu)              │
│    ✓ KASA BAKİYESİ ARTAR                                │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## ⚠️ Yaygın Hatalar ve Çözümler

### Hata 1: "Aidat oluşturduk ama gelirler raporunda görünmüyor"

**Neden:** Aidat borçlandırma ≠ Gelir. Gelir ancak ödeme yapıldığında oluşur.

**Çözüm:**
- Borçlandırma sonrası "Aidat Ödemesi" ekranından tahsilat yap
- Veya "Çoklu Dönem Tahsilatı" ile toplu tahsil et

### Hata 2: "Toplu aidat oluştururken varsayılan tutar uygulanmıyor"

**Neden:** Üyenin özel tutarı veya tanım tutarı öncelikli.

**Çözüm:**
- Önizleme ekranında "Tutar Kaynağı" bölümünü kontrol et
- Özel Tutar / Tanım / Varsayılan dağılımını gör

### Hata 3: "Kasa bakiyesi güncellenmiyor"

**Neden:** Sadece borç kaydı oluşturdunuz, ödeme almadınız.

**Çözüm:**
- Kasa bakiyesi sadece gelir/gider kayıtlarında değişir
- Aidat ödemesi yapın (tahsilat)

---

## 🏗️ Mimari Prensipler

### 1. Single Source of Truth

- **Aidat Borç Durumu:** `aidat_takip` tablosu
- **Para Hareketleri:** `gelirler` + `giderler` tabloları
- **Kasa Bakiyesi:** `kasalar.bakiye` (transaction içinde güncellenir)

### 2. Transaction Integrity

Tüm para hareketleri transaction içinde:
```rust
conn.transaction(|conn| {
    // 1. Aidat kaydını güncelle
    // 2. Gelir kaydı oluştur
    // 3. Kasa bakiyesini güncelle
    Ok(())
})
```

### 3. Audit Trail

Her kayıtta:
- `created_at`: Kayıt oluşturulma zamanı
- `updated_at`: Son güncellenme zamanı
- `tenant_id`: Multi-tenant izolasyon

---

## 📈 Raporlama Mantığı

### Gelir Raporu

```sql
SELECT SUM(tutar) FROM gelirler
WHERE tenant_id = ? AND tarih BETWEEN ? AND ?
```

**İçerik:**
- Aidat tahsilatları
- Bağışlar
- Etkinlik gelirleri
- Diğer gelirler

### Alacak Raporu

```sql
SELECT SUM(kalan) FROM aidat_takip
WHERE tenant_id = ? AND kalan > 0
```

**İçerik:**
- Henüz ödenmemiş aidat borçları
- Üye bazında detay

### Kasa Durumu

```sql
SELECT bakiye FROM kasalar WHERE tenant_id = ? AND id = ?
```

**Formül:**
```
Bakiye = Açılış Bakiyesi + Σ Gelirler - Σ Giderler
```

---

## 🎓 Kullanıcı Eğitimi İçin Öneriler

### UI'da Kullanıcıya Gösterilecek Açıklamalar

**Aidat Borçlandırma Ekranında:**
> ℹ️ Bu işlem sadece borç kaydı oluşturur. Gelir kaydı ve kasa güncellemesi ödeme yapıldığında gerçekleşir.

**Aidat Ödeme Ekranında:**
> ℹ️ Ödeme kaydedildiğinde gelir kaydı oluşturulacak ve kasa bakiyesi güncellenecektir.

**Raporlarda:**
> 💡 Gelir Raporu = Tahsil edilen tutarlar
> 💡 Alacak Raporu = Henüz ödenmemiş borçlar

---

## 📝 Sonuç

Bu semantik yapı:
- ✅ Muhasebe mantığına uygun
- ✅ Kullanıcı zihnine net oturan
- ✅ UX'te yanlış anlam üretmeyen
- ✅ Raporlamayı bozmayan
- ✅ SaaS ürün mantığına uygun

**Prensip:** Her terim bir şeyi ifade eder, iki farklı anlama gelmez. Tahakkuk ile tahsilat kesinlikle ayrıştırılmıştır.

---

*Dokümantasyon Tarihi: 2026-01-24*
*BADER V3 - Finansal Sistem Semantiği*
