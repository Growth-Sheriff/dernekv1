# BADER - Finansal Sistem Mimarisi

## 📊 Mevcut Durum Özeti

### Veritabanı Tabloları

| Tablo | Durum | Açıklama |
|-------|-------|----------|
| `kasalar` | ✅ | Ana kasa/hesaplar |
| `gelirler` | ✅ | Gelir kayıtları |
| `giderler` | ✅ | Gider kayıtları |
| `gelir_turleri` | ✅ | Dinamik gelir kategorileri |
| `gider_turleri` | ✅ | Dinamik gider kategorileri |
| `virmanlar` | ✅ | Kasalar arası transfer |
| `aidat_takip` | ✅ | Üye aidat ödemeleri |
| `aidat_tanimlari` | ✅ | Yıllık aidat tanımları |
| `cariler` | ✅ | Müşteri/Tedarikçi hesapları |
| `cari_hareketler` | ✅ | Cari hesap hareketleri |
| `vadeli_islemler` | ✅ | Planlanan gelir/giderler |
| `demirbaslar` | ✅ | Sabit kıymetler |

---

## 🔗 Veri Akış Diyagramı

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BADER FİNANSAL SİSTEM                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌───────────┐      ┌──────────────┐      ┌───────────┐                       │
│   │   ÜYELER  │      │   CARİLER    │      │    KÖY    │                       │
│   └─────┬─────┘      └──────┬───────┘      └─────┬─────┘                       │
│         │                   │                    │                              │
│         ▼                   ▼                    ▼                              │
│   ┌───────────┐      ┌──────────────┐      ┌───────────┐                       │
│   │  AİDATLAR │      │CARİ HAREKET  │      │KÖY KASASI │                       │
│   └─────┬─────┘      └──────┬───────┘      └─────┬─────┘                       │
│         │                   │                    │                              │
│         │    ┌──────────────┼────────────────────┘                              │
│         │    │              │                                                   │
│         ▼    ▼              ▼                                                   │
│   ┌────────────────────────────────────────────────┐                           │
│   │                    KASALAR                     │                           │
│   │  ┌─────────────────────────────────────────┐  │                           │
│   │  │  Bakiye = Devir + Gelirler - Giderler   │  │                           │
│   │  │         + Virman Giriş - Virman Çıkış   │  │                           │
│   │  └─────────────────────────────────────────┘  │                           │
│   └────────────────────────────────────────────────┘                           │
│         ▲           ▲           ▲           ▲                                  │
│         │           │           │           │                                  │
│   ┌─────┴────┐ ┌────┴────┐ ┌────┴────┐ ┌────┴──────┐                          │
│   │ GELİRLER │ │GİDERLER │ │VIRMANLAR│ │VADELİ İŞL.│                          │
│   └──────────┘ └─────────┘ └─────────┘ └───────────┘                          │
│         ▲           ▲                                                          │
│         │           │                                                          │
│   ┌─────┴────┐ ┌────┴────┐                                                     │
│   │GELİR TÜR │ │GİDER TÜR│                                                     │
│   │ (Dinamik)│ │(Dinamik)│                                                     │
│   └──────────┘ └─────────┘                                                     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Semantik İlişkiler

### 1. Aidat → Gelir Entegrasyonu

```
AİDAT ÖDEMESİ YAPILDIĞINDA:
├── aidat_takip tablosu güncellenir
│   ├── odenen_tutar += ödeme
│   ├── durum = "Kısmi" veya "Odendi"
│   └── gelire_aktarildi = true
│
├── gelirler tablosuna kayıt eklenir
│   ├── kasa_id = seçilen kasa
│   ├── gelir_turu = "Aidat"
│   ├── tutar = ödeme tutarı
│   └── ilgili_aidat_id = aidat.id
│
└── kasalar tablosu güncellenir
    └── bakiye += ödeme tutarı
```

### 2. Cari Hareket Entegrasyonu

```
GELİR/GİDER OLUŞTURULDUĞUNDA (Cari varsa):
├── gelirler/giderler tablosuna kayıt
│   └── cari_id = seçilen cari
│
├── cari_hareketler tablosuna kayıt
│   ├── hareket_tipi = "ALACAK" veya "BORC"
│   ├── tutar = işlem tutarı
│   └── gelir_id/gider_id = ilgili kayıt
│
└── cariler tablosu güncellenir
    └── borc_bakiye veya alacak_bakiye güncellenir
```

### 3. Vadeli İşlem → Gerçek İşlem

```
VADELİ İŞLEM GERÇEKLEŞTİRİLDİĞİNDE:
├── islem_tipi = "GELIR" ise
│   ├── gelirler tablosuna kayıt
│   └── kasa bakiyesi artırılır
│
├── islem_tipi = "GIDER" ise
│   ├── giderler tablosuna kayıt
│   └── kasa bakiyesi azaltılır
│
├── vadeli_islemler tablosu güncellenir
│   ├── durum = "GERCEKLESTI"
│   ├── gerceklesen_id = oluşan gelir/gider id
│   └── gerceklesme_tarihi = şimdi
│
└── Cari varsa → cari_hareketler güncellenir
```

---

## 🗂️ Kategori Hiyerarşisi

### Gelir Türleri (Dinamik)
```
gelir_turleri
├── id, tenant_id
├── ad (örn: "Aidat", "Bağış", "Kira")
├── kod (örn: "AIDAT", "BAGIS", "KIRA")
├── aciklama
├── varsayilan_makbuz_prefix
└── is_active

gelir_alt_kategorileri (ÖNERİLEN)
├── id, tenant_id
├── gelir_turu_id → FK
├── ad (örn: "Yıllık Aidat", "Aylık Aidat")
├── kod
└── is_active
```

### Gider Türleri (Dinamik)
```
gider_turleri
├── id, tenant_id
├── ad (örn: "Elektrik", "Su", "Personel")
├── kod
├── aciklama
├── varsayilan_fatura_prefix
└── is_active

gider_alt_kategorileri (ÖNERİLEN)
├── id, tenant_id
├── gider_turu_id → FK
├── ad (örn: "Aydınlatma", "Isıtma")
├── kod
└── is_active
```

---

## 🔄 İşlem Akışları

### A. Yeni Gelir Ekleme
1. Kullanıcı gelir formunu doldurur
2. Kasa seçilir (zorunlu)
3. Gelir türü seçilir (dinamik listeden)
4. Cari seçilebilir (opsiyonel)
5. Kaydet:
   - `gelirler` tablosuna insert
   - `kasalar` bakiye güncelle
   - Cari varsa → `cari_hareketler` ekle

### B. Yeni Gider Ekleme
1. Kullanıcı gider formunu doldurur
2. Kasa seçilir (zorunlu)
3. Gider türü seçilir (dinamik listeden)
4. Cari seçilebilir (opsiyonel - tedarikçi)
5. Kaydet:
   - `giderler` tablosuna insert
   - `kasalar` bakiye güncelle
   - Cari varsa → `cari_hareketler` ekle

### C. Aidat Ödeme
1. Üyenin aidat kaydı seçilir
2. Ödeme tutarı girilir
3. Kasa seçilir
4. Kaydet:
   - `aidat_takip` güncelle
   - `gelirler` tablosuna aidat geliri ekle
   - `kasalar` bakiye güncelle

### D. Virman İşlemi
1. Kaynak kasa seçilir
2. Hedef kasa seçilir
3. Tutar girilir
4. Kaydet:
   - `virmanlar` tablosuna insert
   - Kaynak kasa bakiyesi azalt
   - Hedef kasa bakiyesi artır

### E. Vadeli İşlem Gerçekleştirme
1. Vadesi gelen işlem seçilir
2. "Gerçekleştir" butonu
3. Otomatik:
   - Gelir/Gider kaydı oluştur
   - Kasa bakiyesi güncelle
   - Vadeli işlem durumunu güncelle

---

## 📊 Kasa Detay Bilgileri

Bir kasanın detay sayfasında gösterilmesi gerekenler:

```
KASA DETAY
├── Özet Bilgiler
│   ├── Kasa Adı
│   ├── Para Birimi
│   ├── Güncel Bakiye
│   ├── Devir Bakiyesi
│   ├── Toplam Gelir
│   ├── Toplam Gider
│   └── Serbest Bakiye
│
├── Son Hareketler (Timeline)
│   ├── Gelirler (bu kasaya)
│   ├── Giderler (bu kasadan)
│   ├── Virman Girişler
│   ├── Virman Çıkışlar
│   └── Aidat Ödemeleri (bu kasaya)
│
├── Vadeli İşlemler
│   ├── Yaklaşan Vadeli Gelirler
│   └── Yaklaşan Vadeli Giderler
│
└── Grafikler
    ├── Aylık Gelir/Gider
    └── Kategori Dağılımı
```

---

## 🚀 Uygulama Planı

### Faz 1: Kategori Yönetimi Zenginleştirme
- [ ] Alt kategori tablolarını ekle
- [ ] Backend komutlarını güncelle
- [ ] Frontend yönetim sayfalarını güncelle

### Faz 2: Sidebar ve Navigation
- [ ] Aidat alt menülerini ekle
- [ ] Mali işlemlere Gelir/Gider Türleri ekle

### Faz 3: Entegrasyon Geliştirmeleri
- [ ] Aidat → Gelir otomatik kayıt
- [ ] Cari hareket otomatik kayıt
- [ ] Vadeli işlem gerçekleştirme

### Faz 4: Kasa Detay Zenginleştirme
- [ ] Tüm bağlı işlemleri göster
- [ ] Timeline görünümü
- [ ] Grafikler

---

## 📝 Notlar

- Tüm finansal işlemler `tenant_id` ile izole edilmiştir
- Silme işlemleri soft delete (`is_active = false`)
- Makbuz/fatura numaraları seri bazlı otomatik üretilir
- Audit log için ayrı tablo düşünülebilir
