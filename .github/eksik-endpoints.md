# 📋 Eksik Endpoint ve Özellikler Listesi

Karşılaştırma sonucu tespit edilen **implementasyonu gerekli** özellikler.

## ✅ VERİTABANI - TAMAMLANDI

- ✅ `gelirler.notlar` kolonu eklendi
- ✅ `roles` tablosu oluşturuldu (50 permission ile)
- ✅ `user_roles` tablosu oluşturuldu
- ✅ `permissions` tablosu oluşturuldu
- ✅ **32 tablo + 2 view** aktif

---

## 🔴 EKSİK API ENDPOINT'LERİ

### 1. Aidat İşlemleri

#### `POST /api/v1/aidat/toplu-olustur`
**Amaç:** Tüm aktif üyeler için yıllık aidat oluşturma

**Request:**
```json
{
  "yil": 2026,
  "varsayilan_tutar": 1000.00,
  "sadece_aktif_uyeler": true,
  "ozel_aidat_uygula": true  // Üyelerin özel aidat tutarını kullan
}
```

**Response:**
```json
{
  "success": true,
  "olusturulan_aidat_sayisi": 150,
  "toplam_tutar": 150000.00,
  "detaylar": [
    {"uye_id": 1, "uye_adi": "Ahmet Yılmaz", "tutar": 1000.00},
    ...
  ]
}
```

**İş Mantığı:**
1. Tüm aktif üyeleri getir (ayrilma_tarihi = NULL)
2. Her üye için `aidat_takip` tablosuna INSERT
3. Üyenin `ozel_aidat_tutari` varsa onu kullan, yoksa varsayılanı kullan
4. `durum` = "Beklemede", `aktarim_durumu` = "Bekliyor"

---

#### `POST /api/v1/aidat/coklu-yil-odeme`
**Amaç:** Bir üye için birden fazla yıl aidat ödemesi

**Request:**
```json
{
  "uye_id": 123,
  "baslangic_yili": 2024,
  "bitis_yili": 2026,
  "toplam_tutar": 3000.00,
  "odeme_tarihi": "2024-01-15",
  "kasa_id": 1,
  "dekont_no": "DKN-001"
}
```

**Response:**
```json
{
  "success": true,
  "odenen_yil_sayisi": 3,
  "yillar": [2024, 2025, 2026],
  "yillik_odeme_tutari": 1000.00,
  "aidat_ids": [45, 46, 47],
  "gelir_id": 789
}
```

**İş Mantığı:**
1. Başlangıç-bitiş yılları arasındaki her yıl için:
   - `aidat_takip` tablosunda kayıt var mı kontrol et
   - Yoksa oluştur
2. `aidat_odemeleri` tablosuna toplu ödeme kaydet
3. Her aidat için `durum` = "Tamamlandı" yap
4. **Otomatik gelir kaydı oluştur** (`gelirler` tablosu)
5. `aidat_takip.gelir_id` = oluşan gelir ID

---

#### `POST /api/v1/aidat/{aidat_id}/gelire-aktar`
**Amaç:** Aidat ödemesini otomatik olarak gelir kaydına aktarma

**Trigger:** `aidat_takip.durum` = "Tamamlandı" olduğunda otomatik çalışacak

**İş Mantığı:**
```python
async def transfer_aidat_to_gelir(aidat_id: int, db: Session):
    aidat = db.query(AidatTakip).filter(AidatTakip.id == aidat_id).first()
    
    # Gelir kaydı oluştur
    gelir = Gelirler(
        tenant_id=aidat.tenant_id,
        kasa_id=aidat.kasa_id,  # Aidat ödemesi yapılan kasa
        tarih=aidat.odemeleri[-1].tarih,  # Son ödeme tarihi
        gelir_turu="Aidat Geliri",
        aciklama=f"{aidat.uye.ad_soyad} - {aidat.yil} Aidat",
        tutar=aidat.yillik_aidat_tutari,
        aidat_id=aidat.id,
        uye_id=aidat.uye_id,
        ait_oldugu_yil=aidat.yil
    )
    db.add(gelir)
    db.flush()
    
    # Aidat kaydını güncelle
    aidat.gelir_id = gelir.id
    aidat.aktarim_durumu = "Aktarıldı"
    
    db.commit()
```

---

### 2. Yıl Sonu Devir İşlemleri

#### `GET /api/v1/devir/onizleme?yil=2026`
**Amaç:** Yıl sonu devir önizlemesi

**Response:**
```json
{
  "onceki_yil": 2026,
  "yeni_yil": 2027,
  "kasalar": [
    {
      "kasa_id": 1,
      "kasa_adi": "TL Kasa",
      "onceki_devir": 50000.00,
      "toplam_gelir": 200000.00,
      "toplam_gider": 180000.00,
      "virman_net": 10000.00,
      "fiziksel_bakiye": 80000.00,
      "tahakkuk_tutari": 15000.00,
      "serbest_bakiye": 65000.00,
      "yeni_devir": 80000.00  // Fiziksel bakiye yeni yıla aktarılacak
    }
  ],
  "toplam_devir_tutari": 80000.00
}
```

**İş Mantığı:**
1. Tüm kasaları getir
2. Her kasa için:
   - `fiziksel_bakiye` = `devir_bakiye + toplam_gelir - toplam_gider + (virman_giris - virman_cikis)`
   - Bu değer yeni yılın `devir_bakiye`'si olacak

---

#### `POST /api/v1/devir/uygula`
**Amaç:** Yıl sonu devir işlemini uygulama

**Request:**
```json
{
  "onceki_yil": 2026,
  "yeni_yil": 2027,
  "kasalar": [
    {"kasa_id": 1, "yeni_devir": 80000.00},
    {"kasa_id": 2, "yeni_devir": 25000.00}
  ],
  "aciklama": "2026 yıl sonu devir işlemi"
}
```

**Response:**
```json
{
  "success": true,
  "devir_islem_id": 15,
  "devir_tarihi": "2027-01-01T00:00:00Z",
  "toplam_devir": 105000.00
}
```

**İş Mantığı:**
1. `devir_islemleri` tablosuna kayıt ekle
2. Her kasa için:
   - `kasalar.devir_bakiye` = yeni devir tutarı
   - `kasalar.toplam_gelir` = 0
   - `kasalar.toplam_gider` = 0
   - `kasalar.virman_giris` = 0
   - `kasalar.virman_cikis` = 0
   - `kasalar.fiziksel_bakiye` = yeni devir tutarı
3. Transaction ile güvenli işlem

---

### 3. Global Arama

#### `GET /api/v1/arama?q={query}&modul={modul}`
**Amaç:** Tüm modüllerde arama

**Query Params:**
- `q`: Arama terimi (min 2 karakter)
- `modul`: `all | uyeler | gelir | gider | aidat | etkinlik | toplanti`
- `limit`: Sonuç limiti (default: 50)

**Response:**
```json
{
  "query": "ahmet",
  "total_results": 15,
  "results": {
    "uyeler": [
      {
        "id": 123,
        "tip": "uye",
        "baslik": "Ahmet Yılmaz",
        "alt_baslik": "Üye No: 001",
        "tarih": "2020-01-15",
        "link": "/uyeler/123"
      }
    ],
    "gelirler": [
      {
        "id": 456,
        "tip": "gelir",
        "baslik": "Aidat Geliri - Ahmet Yılmaz",
        "alt_baslik": "1000.00 TL",
        "tarih": "2026-01-08",
        "link": "/mali/gelirler/456"
      }
    ],
    "etkinlikler": [
      {
        "id": 789,
        "tip": "etkinlik",
        "baslik": "Ahmet Bey Anma Töreni",
        "alt_baslik": "Sorumlu: Mehmet Demir",
        "tarih": "2026-05-20",
        "link": "/etkinlikler/789"
      }
    ]
  }
}
```

**İş Mantığı:**
```python
async def global_search(query: str, modul: str, db: Session):
    results = {}
    
    if modul in ['all', 'uyeler']:
        uyeler = db.query(Uyeler).filter(
            or_(
                Uyeler.ad_soyad.ilike(f"%{query}%"),
                Uyeler.tc_kimlik.ilike(f"%{query}%"),
                Uyeler.telefon.ilike(f"%{query}%"),
                Uyeler.email.ilike(f"%{query}%")
            )
        ).limit(10).all()
        results['uyeler'] = [format_uye(u) for u in uyeler]
    
    if modul in ['all', 'gelir']:
        gelirler = db.query(Gelirler).filter(
            or_(
                Gelirler.aciklama.ilike(f"%{query}%"),
                Gelirler.gelir_turu.ilike(f"%{query}%"),
                Gelirler.belge_no.ilike(f"%{query}%")
            )
        ).limit(10).all()
        results['gelirler'] = [format_gelir(g) for g in gelirler]
    
    # ... diğer modüller
    
    return results
```

---

### 4. Excel/PDF Export

#### `GET /api/v1/export/excel/{modul}`
**Amaç:** Modül verilerini Excel olarak export

**Modüller:**
- `uyeler`: Üye listesi
- `aidat`: Aidat raporu
- `gelirler`: Gelir raporu
- `giderler`: Gider raporu
- `kasalar`: Kasa özeti
- `tam-rapor`: Tüm modüller (çoklu sayfa)

**Query Params:**
- `baslangic_tarihi`: Tarih filtresi (opsiyonel)
- `bitis_tarihi`: Tarih filtresi (opsiyonel)
- `yil`: Yıl filtresi (opsiyonel)

**Response:** Excel dosyası (Content-Type: application/vnd.openxmlformats)

**Dosya Yapısı (tam-rapor):**
```
Sayfa 1: Üyeler
  - Üye No, Ad Soyad, TC, Telefon, Email, Aidat Durumu
  
Sayfa 2: Aidat Özeti
  - Yıl, Toplam Aidat, Ödenen, Kalan, Ödeme Oranı
  
Sayfa 3: Gelirler
  - Tarih, Gelir Türü, Açıklama, Tutar, Kasa
  
Sayfa 4: Giderler
  - Tarih, Gider Türü, Açıklama, Tutar, Kasa
  
Sayfa 5: Kasa Özeti
  - Kasa Adı, Devir, Gelir, Gider, Fiziksel Bakiye
```

**Kütüphane:** `openpyxl` (Python)

---

#### `GET /api/v1/export/pdf/{modul}`
**Amaç:** Modül verilerini PDF olarak export

**Kütüphane:** `reportlab` veya `WeasyPrint` (Python)

---

### 5. Bütçe Otomatik Güncelleme

#### Background Job: `update_butce_gerceklesen`
**Amaç:** Bütçe gerçekleşen tutarlarını otomatik güncelleme

**Çalışma:** Günlük (Celery/ARQ ile)

**İş Mantığı:**
```python
@celery.task
def update_butce_gerceklesen():
    current_year = datetime.now().year
    
    # Gelir kategorileri için
    gelir_sum = db.query(
        Gelirler.gelir_turu,
        func.sum(Gelirler.tutar).label('toplam')
    ).filter(
        func.extract('year', Gelirler.tarih) == current_year
    ).group_by(Gelirler.gelir_turu).all()
    
    for kategori, toplam in gelir_sum:
        db.query(ButcePlanlari).filter(
            ButcePlanlari.yil == current_year,
            ButcePlanlari.tur == 'Gelir',
            ButcePlanlari.kategori == kategori
        ).update({'gerceklesen_tutar': toplam})
    
    # Gider kategorileri için
    gider_sum = db.query(
        Giderler.gider_turu,
        func.sum(Giderler.tutar).label('toplam')
    ).filter(
        func.extract('year', Giderler.tarih) == current_year
    ).group_by(Giderler.gider_turu).all()
    
    for kategori, toplam in gider_sum:
        db.query(ButcePlanlari).filter(
            ButcePlanlari.yil == current_year,
            ButcePlanlari.tur == 'Gider',
            ButcePlanlari.kategori == kategori
        ).update({'gerceklesen_tutar': toplam})
    
    db.commit()
```

---

### 6. Kasa Bakiye Otomatik Hesaplama

#### Trigger: `update_kasa_bakiye_trigger`
**Amaç:** Her gelir/gider/virman işleminde kasa bakiyesini otomatik güncelle

**PostgreSQL Function:**
```sql
CREATE OR REPLACE FUNCTION update_kasa_bakiye()
RETURNS TRIGGER AS $$
BEGIN
    -- Kasa bakiyelerini yeniden hesapla
    UPDATE kasalar SET
        toplam_gelir = COALESCE((
            SELECT SUM(tutar) FROM gelirler 
            WHERE kasa_id = kasalar.id AND is_deleted = false
        ), 0),
        toplam_gider = COALESCE((
            SELECT SUM(tutar) FROM giderler 
            WHERE kasa_id = kasalar.id AND is_deleted = false
        ), 0),
        virman_giris = COALESCE((
            SELECT SUM(tutar) FROM virmanlar 
            WHERE hedef_kasa_id = kasalar.id AND is_deleted = false
        ), 0),
        virman_cikis = COALESCE((
            SELECT SUM(tutar) FROM virmanlar 
            WHERE kaynak_kasa_id = kasalar.id AND is_deleted = false
        ), 0),
        fiziksel_bakiye = devir_bakiye + 
            COALESCE((SELECT SUM(tutar) FROM gelirler WHERE kasa_id = kasalar.id AND is_deleted = false), 0) -
            COALESCE((SELECT SUM(tutar) FROM giderler WHERE kasa_id = kasalar.id AND is_deleted = false), 0) +
            COALESCE((SELECT SUM(tutar) FROM virmanlar WHERE hedef_kasa_id = kasalar.id AND is_deleted = false), 0) -
            COALESCE((SELECT SUM(tutar) FROM virmanlar WHERE kaynak_kasa_id = kasalar.id AND is_deleted = false), 0),
        serbest_bakiye = fiziksel_bakiye - tahakkuk_tutari
    WHERE id = NEW.kasa_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ları ekle
CREATE TRIGGER gelir_kasa_update AFTER INSERT OR UPDATE OR DELETE ON gelirler
    FOR EACH ROW EXECUTE FUNCTION update_kasa_bakiye();

CREATE TRIGGER gider_kasa_update AFTER INSERT OR UPDATE OR DELETE ON giderler
    FOR EACH ROW EXECUTE FUNCTION update_kasa_bakiye();

CREATE TRIGGER virman_kasa_update AFTER INSERT OR UPDATE OR DELETE ON virmanlar
    FOR EACH ROW EXECUTE FUNCTION update_kasa_bakiye();
```

---

## 🎨 EKSİK UI COMPONENT'LERİ

### 1. DataTable Component - Gelişmiş Özellikler

**Dosya:** `src/components/common/DataTable.tsx`

**Eksik Özellikler:**

#### Debounced Search (300ms)
```typescript
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  if (debouncedSearch) {
    performSearch(debouncedSearch);
  }
}, [debouncedSearch]);
```

#### Excel Export Button
```typescript
const exportToExcel = async () => {
  const response = await fetch(`/api/v1/export/excel/${module}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${module}_${Date.now()}.xlsx`;
  a.click();
};

// UI
<Button onClick={exportToExcel}>
  <FileSpreadsheet className="mr-2" />
  Excel'e Aktar
</Button>
```

#### Filtreleme Dropdown'ları
```typescript
<Select onValueChange={(val) => setFilters({...filters, status: val})}>
  <SelectTrigger>
    <SelectValue placeholder="Durum Filtrele" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Tümü</SelectItem>
    <SelectItem value="active">Aktif</SelectItem>
    <SelectItem value="inactive">Pasif</SelectItem>
  </SelectContent>
</Select>
```

---

### 2. Drawer Component - Animasyon

**Dosya:** `src/components/ui/drawer.tsx`

**Eksik:** Right-side slide animasyon

```typescript
import { motion, AnimatePresence } from 'framer-motion';

export const Drawer = ({ isOpen, onClose, children }: DrawerProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />
          
          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-xl z-50 p-6 overflow-y-auto"
          >
            <Button onClick={onClose} className="absolute top-4 right-4">
              <X />
            </Button>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
```

---

### 3. ChartWidget - Donut Chart

**Dosya:** `src/components/common/ChartWidget.tsx`

**Eksik:** Donut chart variant

```typescript
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const DonutChart = ({ data }: { data: ChartData[] }) => {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}  // Bu donut yapar
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};
```

---

### 4. Global Search Component

**Dosya:** `src/components/common/GlobalSearch.tsx`

**Özellikler:**
- Tüm modüllerde arama
- Keyboard shortcut (Cmd+K / Ctrl+K)
- Modal dialog ile sonuç gösterimi
- Modül bazlı gruplama

```typescript
import { Command, CommandInput, CommandList, CommandGroup } from '@/components/ui/command';

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { data: results } = useQuery(['global-search', query], 
    () => api.get(`/arama?q=${query}`),
    { enabled: query.length >= 2 }
  );
  
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Üye, gelir, gider, etkinlik ara..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {results?.uyeler?.length > 0 && (
          <CommandGroup heading="Üyeler">
            {results.uyeler.map((uye) => (
              <CommandItem key={uye.id} onSelect={() => navigate(uye.link)}>
                <User className="mr-2" />
                {uye.baslik} - {uye.alt_baslik}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        
        {results?.gelirler?.length > 0 && (
          <CommandGroup heading="Gelirler">
            {results.gelirler.map((gelir) => (
              <CommandItem key={gelir.id} onSelect={() => navigate(gelir.link)}>
                <TrendingUp className="mr-2" />
                {gelir.baslik}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        
        {/* ... diğer modüller */}
      </CommandList>
    </CommandDialog>
  );
};
```

---

## 🔧 EKSİK ÖZELLIKLER (İLERİ SEVİYE)

### 1. OCR (Optical Character Recognition)

**Kütüphane:** Tesseract.js (Frontend) veya pytesseract (Backend)

**Kullanım:**
```typescript
// Frontend - Tauri command
invoke('scan_document', { imagePath: file.path }).then((text) => {
  // Dekont/fatura bilgilerini parse et
  const parsed = parseDecont(text);
  setFormData({
    belge_no: parsed.belgeNo,
    tutar: parsed.tutar,
    tarih: parsed.tarih
  });
});
```

**Backend:**
```python
from PIL import Image
import pytesseract

def scan_document(image_path: str) -> dict:
    img = Image.open(image_path)
    text = pytesseract.image_to_string(img, lang='tur')
    
    # Regex ile bilgi çıkar
    belge_no = extract_belge_no(text)
    tutar = extract_tutar(text)
    tarih = extract_tarih(text)
    
    return {
        "belge_no": belge_no,
        "tutar": tutar,
        "tarih": tarih,
        "raw_text": text
    }
```

---

### 2. Email/SMS Bildirimleri

**Email:** SendGrid veya AWS SES

**Kullanım:**
- Aidat hatırlatması (aylık)
- Etkinlik davetiyesi
- Toplantı bildirimi

**Endpoint:**
```python
@router.post("/notifications/send-aidat-reminder")
async def send_aidat_reminder(year: int, db: Session):
    unpaid_aidats = db.query(AidatTakip).filter(
        AidatTakip.yil == year,
        AidatTakip.durum != 'Tamamlandı'
    ).all()
    
    for aidat in unpaid_aidats:
        send_email(
            to=aidat.uye.email,
            subject=f"{year} Aidat Hatırlatması",
            body=f"Sayın {aidat.uye.ad_soyad}, {year} yılı aidatınız beklemektedir..."
        )
    
    return {"sent": len(unpaid_aidats)}
```

---

### 3. White-label Özelleştirme

**Özellikler:**
- Logo upload
- Renk teması (primary, secondary)
- Custom domain

**Ayarlar Tablosu:**
```sql
INSERT INTO ayarlar (tenant_id, kategori, anahtar, deger) VALUES
(tenant_id, 'branding', 'logo_url', 'https://cdn.example.com/logos/dernek-logo.png'),
(tenant_id, 'branding', 'primary_color', '#3B82F6'),
(tenant_id, 'branding', 'secondary_color', '#10B981'),
(tenant_id, 'branding', 'custom_domain', 'dernek.bader.app');
```

**Frontend:**
```typescript
const { data: branding } = useQuery(['branding'], () => api.get('/ayarlar/branding'));

// Tailwind CSS değişkenleri güncelle
document.documentElement.style.setProperty('--color-primary', branding.primary_color);
```

---

## 📊 ÖNCELİK SIRASI

### Faz 1: Kritik Backend (1 gün)
1. ✅ Veritabanı migration (TAMAMLANDI)
2. ⏳ Toplu aidat endpoint
3. ⏳ Çoklu yıl ödeme endpoint
4. ⏳ Aidat → Gelir otomatik aktarım
5. ⏳ Kasa bakiye trigger'ları

### Faz 2: Raporlar ve Export (1 gün)
6. ⏳ Global search endpoint
7. ⏳ Excel export (çoklu sayfa)
8. ⏳ PDF export
9. ⏳ Yıl sonu devir endpoint'leri

### Faz 3: UI Components (1 gün)
10. ⏳ DataTable gelişmiş özellikler
11. ⏳ Drawer animasyon
12. ⏳ Global search modal
13. ⏳ Donut chart

### Faz 4: Background Jobs (0.5 gün)
14. ⏳ Bütçe otomatik güncelleme (Celery)
15. ⏳ Email notification scheduler

### Faz 5: İleri Seviye (Opsiyonel)
16. ⏳ OCR entegrasyonu
17. ⏳ SMS bildirimleri
18. ⏳ White-label özelleştirme

---

## 🎯 SONRAKI ADIM

**Desktop uygulamasını yazmaya başlayabiliriz!**

Eksikler dokümante edildi. Bu endpoint'ler Desktop uygulaması çalıştıktan sonra eklenebilir.

**Tavsiye:** Önce **LOCAL mode** (SQLite) ile Desktop uygulamasını bitir, sonra backend API'yi yaz ve HYBRID mode'u ekle.
