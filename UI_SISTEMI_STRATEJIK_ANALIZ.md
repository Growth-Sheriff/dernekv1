# 🎯 WinForms Benzeri UI Sistemi - Stratejik Mühendislik Analizi

> **Versiyon:** 2.0 | **Tarih:** 2025 | **Yaklaşım:** Yüksek Mühendislik Stratejik Düşünme

---

## 📋 İçindekiler

1. [Yönetici Özeti](#1-yönetici-özeti)
2. [Mevcut Durum - Derin Analiz](#2-mevcut-durum---derin-analiz)
3. [Kritik Sorunlar ve Riskler](#3-kritik-sorunlar-ve-riskler)
4. [2025 Yazılım Mühendisliği Trendleri](#4-2025-yazılım-mühendisliği-trendleri)
5. [Stratejik Mimari Önerileri](#5-stratejik-mimari-önerileri)
6. [Config-Driven UI Detaylı Tasarım](#6-config-driven-ui-detaylı-tasarım)
7. [Risk Analizi ve Trade-off Değerlendirmesi](#7-risk-analizi-ve-trade-off-değerlendirmesi)
8. [Implementasyon Yol Haritası](#8-implementasyon-yol-haritası)
9. [Başarı Metrikleri](#9-başarı-metrikleri)

---

## 1. Yönetici Özeti

### 🔴 Kritik Bulgular

| Metrik | Değer | Durum | Etki |
|--------|-------|-------|------|
| **Toplam useState kullanımı** | 430+ adet | 🔴 Kritik | State yönetimi kaotik |
| **React Hook Form kullanımı** | Sadece 2 sayfa | 🔴 Kritik | Form standartı yok |
| **Zod validasyon** | Sadece 2 sayfa | 🔴 Kritik | Veri bütünlüğü riski |
| **DataTable kullanımı** | Sadece 1 sayfa | 🔴 Kritik | Tablo standardı yok |
| **tableId/sütun persist** | Sadece 1 sayfa | 🟡 Orta | Kullanıcı deneyimi kaybı |
| **En büyük dosya** | 1175 satır | 🔴 Kritik | Bakım zorluğu |
| **500+ satır dosya sayısı** | 14 adet | 🔴 Kritik | Teknik borç yüksek |

### 📊 Dosya Boyutu Analizi (Top 10 Kritik)

| Sıra | Dosya | Satır | Sorun Seviyesi |
|------|-------|-------|----------------|
| 1 | uyeler/list.tsx | **1175** | 🔴 Acil refactor gerekli |
| 2 | mali/giderler.tsx | **940** | 🔴 Acil refactor gerekli |
| 3 | uyeler/detail.tsx | **881** | 🔴 Refactor gerekli |
| 4 | mali/gelirler.tsx | **765** | 🔴 Refactor gerekli |
| 5 | mali/kurlar.tsx | **633** | 🟡 Optimize edilebilir |
| 6 | etkinlikler/list.tsx | **618** | 🟡 Optimize edilebilir |
| 7 | settings/users.tsx | **611** | 🟡 Optimize edilebilir |
| 8 | mali/virmanlar.tsx | **605** | 🟡 Optimize edilebilir |
| 9 | aidat-takip/list.tsx | **602** | 🟡 Optimize edilebilir |
| 10 | toplantilar/list.tsx | **566** | 🟡 Optimize edilebilir |

---

## 2. Mevcut Durum - Derin Analiz

### 2.1 State Yönetimi Krizi

**Problem:** 430+ useState kullanımı = Merkezi state stratejisi yok

```
📁 pages/ (Toplam useState: 430+)
├── uyeler/
│   ├── list.tsx      → ~35 useState (loading, search, modals, formData...)
│   ├── detail.tsx    → ~25 useState (her aile alanı ayrı state)
│   └── create.tsx    → ~5 useState ✅ (RHF kullanıyor)
├── mali/
│   ├── giderler.tsx  → ~30 useState (20+ form alanı ayrı ayrı)
│   ├── gelirler.tsx  → ~25 useState
│   └── kasalar.tsx   → ~15 useState
└── ... (diğer modüller)
```

**Somut Örnek - uyeler/detail.tsx Satır 80-104:**
```typescript
// ❌ Anti-pattern: Her alan için ayrı useState
const [yakinlik, setYakinlik] = useState<string>('');
const [adSoyad, setAdSoyad] = useState<string>('');
const [dogumTarihi, setDogumTarihi] = useState<string>('');
const [aileTelefon, setAileTelefon] = useState<string>('');
const [aileTcNo, setAileTcNo] = useState<string>('');
const [aileCinsiyet, setAileCinsiyet] = useState<string>('');
const [aileMeslek, setAileMeslek] = useState<string>('');
const [aileIsYeri, setAileIsYeri] = useState<string>('');
const [aileEgitimDurumu, setAileEgitimDurumu] = useState<string>('');
const [aileEmail, setAileEmail] = useState<string>('');
const [aileKanGrubu, setAileKanGrubu] = useState<string>('');
const [aileOzelDurum, setAileOzelDurum] = useState<string>('');
const [aileNotlar, setAileNotlar] = useState<string>('');
```

**Olması gereken:**
```typescript
// ✅ Tek formData objesi veya useForm
const { register, handleSubmit } = useForm<AileUyesiForm>({
  resolver: zodResolver(aileUyesiSchema)
});
```

### 2.2 Form Standardı Yokluğu

**Mevcut Kullanım Haritası:**

| Yaklaşım | Sayfa Sayısı | Yüzde | Kalite |
|----------|-------------|-------|--------|
| Zod + react-hook-form | 2 | %4 | ✅ İyi |
| Manuel useState + inline validation | 45+ | %96 | ❌ Kötü |

**Sorunlu Sayfalar Listesi:**
- `mali/giderler.tsx` - 940 satır, 0 Zod, 0 RHF
- `mali/gelirler.tsx` - 765 satır, 0 Zod, 0 RHF
- `uyeler/list.tsx` - 1175 satır, 0 Zod, 0 RHF
- `uyeler/detail.tsx` - 881 satır, 0 Zod, 0 RHF
- `etkinlikler/list.tsx` - 618 satır, 0 Zod, 0 RHF
- `toplantilar/list.tsx` - 566 satır, 0 Zod, 0 RHF
- (ve daha fazlası...)

### 2.3 Tablo Sistemi Kullanılmıyor

**Şaşırtıcı Gerçek:**
- `DataTable` bileşeni var ve çalışıyor (550 satır, iyi yazılmış)
- `useColumnVisibility` hook'u var ve çalışıyor (119 satır)
- **AMA:** Sadece `aidat/list.tsx`'de kullanılıyor!

**Diğer tüm liste sayfaları:**
- Manuel `<table>` HTML
- Sütun gizleme yok
- Sıralama yok
- Pagination manuel

### 2.4 Kod Tekrarı Analizi

**Aynı pattern 40+ kez tekrarlanıyor:**

```typescript
// Her liste sayfasında:
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [showCreateModal, setShowCreateModal] = useState(false);
const [showEditModal, setShowEditModal] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);

useEffect(() => {
  loadData();
}, []);

const loadData = async () => {
  try {
    setLoading(true);
    const result = await invoke('get_xxx');
    setData(result);
  } catch (error) {
    toast.error('Yüklenirken hata');
  } finally {
    setLoading(false);
  }
};

const handleCreate = async () => { ... };
const handleEdit = async () => { ... };
const handleDelete = async () => { ... };
```

**Bu pattern:**
- ~150 satır kod
- 40+ sayfada tekrarlanıyor
- = **6000+ satır duplicate kod**

---

## 3. Kritik Sorunlar ve Riskler

### 3.1 Teknik Borç Matrisi

| Sorun | Şiddet | Etki Alanı | Düzeltme Maliyeti |
|-------|--------|------------|-------------------|
| State sprawl (430+ useState) | 🔴 Kritik | Tüm proje | Yüksek |
| Form standardı yok | 🔴 Kritik | Veri bütünlüğü | Orta |
| Büyük dosyalar (500+ satır) | 🔴 Kritik | Bakım | Orta |
| DataTable kullanılmıyor | 🟡 Orta | UX | Düşük |
| Kod tekrarı | 🟡 Orta | Bakım | Orta |
| Error handling tutarsız | 🟡 Orta | Güvenilirlik | Düşük |

### 3.2 Potansiyel Riskler

#### 🔴 Veri Bütünlüğü Riski
- %96 form validasyonsuz
- TC Kimlik No, IBAN gibi kritik alanlar kontrol edilmiyor
- Kullanıcı hatalı veri girebilir

#### 🔴 Bakım Maliyeti Riski
- Yeni özellik eklemek zorlaşıyor
- Bug fix'ler riskli (neyi bozduğunu bilemezsin)
- Onboarding süresi uzun

#### 🟡 Performans Riski
- Çok fazla re-render (her useState değişiminde)
- Memoization yok
- Virtual scrolling yok

#### 🟡 UX Tutarsızlığı Riski
- Form davranışları farklı
- Validasyon mesajları tutarsız
- Loading state'leri tutarsız

### 3.3 Tespit Edilen Yanlışlar ve Eksikler

| # | Yanlış/Eksik | Açıklama | Düzeltme Önerisi |
|---|--------------|----------|------------------|
| 1 | `components/forms/*.tsx` boş | Placeholder dosyalar, gerçek bileşen yok | Sil veya doldur |
| 2 | useColumnVisibility kullanılmıyor | Sadece 1 yerde aktif | Tüm tablolara ekle |
| 3 | DataTable kullanılmıyor | Manuel table HTML | Geçiş yap |
| 4 | Zod şemaları eksik | Sadece 2 dosyada var | Tüm formlara ekle |
| 5 | React Query yok | package.json'da var, kullanılmıyor | Aktif et |
| 6 | Zustand az kullanılıyor | Global state yönetimi yetersiz | Genişlet |

---

## 4. 2025 Yazılım Mühendisliği Trendleri

### 4.1 State Yönetimi Trendleri

| Trend | Açıklama | Bu Proje İçin |
|-------|----------|---------------|
| **Server State vs Client State** | TanStack Query ile API state ayrımı | ✅ Uygulanmalı |
| **Signals** | Fine-grained reactivity (Solid, Preact) | 🟡 İzlenmeli |
| **Colocation** | State'i kullanıldığı yere yakın tut | ✅ Uygulanmalı |
| **Derived State** | Computed values, useMemo | ✅ Uygulanmalı |

**Önerilen Strateji:**
```
┌─────────────────────────────────────────────┐
│              State Katmanları               │
├─────────────────────────────────────────────┤
│ 1. Server State → TanStack Query           │
│    (API verileri, cache, refetch)           │
├─────────────────────────────────────────────┤
│ 2. Global UI State → Zustand               │
│    (tema, sidebar, user session)            │
├─────────────────────────────────────────────┤
│ 3. Form State → react-hook-form            │
│    (form değerleri, validasyon)             │
├─────────────────────────────────────────────┤
│ 4. Local UI State → useState               │
│    (dropdown açık/kapalı, geçici modal)     │
└─────────────────────────────────────────────┘
```

### 4.2 Form Mühendisliği Trendleri

| Trend | 2024 | 2025 | Öneri |
|-------|------|------|-------|
| Schema-first | Yükseliyor | Standart | Zod everywhere |
| Config-driven forms | Deneysel | Production-ready | Değerlendir |
| Server validation | Client-only | Full-stack | Tauri'de backend'e ekle |
| Progressive enhancement | İhmal ediliyor | Önemli | Form fallback'leri |

### 4.3 UI Architecture Trendleri

| Trend | Açıklama | Tauri İçin Uygunluk |
|-------|----------|---------------------|
| **Compound Components** | Esnek, composable UI | ✅ Çok uygun |
| **Headless UI** | Logic/style ayrımı | ✅ shadcn/ui zaten yapıyor |
| **Islands Architecture** | Partial hydration | ❌ SPA için geçersiz |
| **RSC (React Server Components)** | Server-side React | ❌ Tauri için geçersiz |

### 4.4 Desktop App Trendleri (Tauri Özel)

| Trend | Durum | Aksiyon |
|-------|-------|---------|
| Native vibrancy/blur | macOS/Windows ready | ✅ Ekle |
| System tray integration | Tauri 2.0 destekliyor | ✅ Ekle |
| Auto-update | Plugin mevcut | ✅ Ekle |
| Deep linking | Plugin mevcut | 🟡 Değerlendir |
| Multi-window | Tauri 2.0 destekliyor | 🟡 Değerlendir |

---

## 5. Stratejik Mimari Önerileri

### 5.1 Kısa Vadeli (Sprint 1-2): Quick Wins

```
Hedef: Mevcut kodu bozmadan hızlı iyileştirmeler
Süre: 2 hafta
ROI: Yüksek
```

**Aksiyon Listesi:**

1. **Tüm liste sayfalarına DataTable geçişi**
   - Mevcut `<table>` → `<DataTable>` değişimi
   - `tableId` ve `showColumnToggle` ekleme
   - **Etki:** Tüm tablolarda sütun gizleme, sıralama

2. **components/forms/ temizliği**
   - Boş placeholder dosyaları sil
   - Ya da gerçek shared component'lere dönüştür

3. **Zod şemalarını merkezi yap**
   ```
   src/
   └── schemas/
       ├── uye.schema.ts
       ├── aidat.schema.ts
       ├── gider.schema.ts
       └── index.ts
   ```

### 5.2 Orta Vadeli (Sprint 3-6): Refactoring

```
Hedef: Kritik sayfaları modernize et
Süre: 4-6 hafta
ROI: Orta-Yüksek
```

**Öncelik Sırası:**

| Sıra | Dosya | Satır | Aksiyon |
|------|-------|-------|---------|
| 1 | mali/giderler.tsx | 940 | Zod + RHF + parçala |
| 2 | mali/gelirler.tsx | 765 | Zod + RHF + parçala |
| 3 | uyeler/list.tsx | 1175 | Custom hook'lara çıkar |
| 4 | uyeler/detail.tsx | 881 | RHF geçişi + parçala |

**Parçalama Stratejisi:**
```
pages/mali/giderler.tsx (940 satır)
↓ Bölünecek:
├── pages/mali/giderler/index.tsx (ana sayfa, ~200 satır)
├── components/gider/GiderForm.tsx (form, ~150 satır)
├── components/gider/GiderTable.tsx (tablo, ~100 satır)
├── components/gider/GiderFilters.tsx (filtreler, ~80 satır)
├── hooks/useGiderCrud.ts (CRUD logic, ~150 satır)
└── schemas/gider.schema.ts (validasyon, ~50 satır)
```

### 5.3 Uzun Vadeli (Sprint 7+): Config-Driven System

```
Hedef: WinForms benzeri deklaratif UI sistemi
Süre: 6-8 hafta
ROI: Uzun vadede çok yüksek
```

**Detaylar Bölüm 6'da →**

---

## 6. Config-Driven UI Detaylı Tasarım

### 6.1 Temel Felsefe

**WinForms'tan Esinlenen Prensipler:**

| WinForms | React Karşılığı |
|----------|-----------------|
| Form Designer (görsel) | Config dosyası (kod) |
| Properties panel | TypeScript interface |
| Events | Callback functions |
| Data binding | react-hook-form + Zod |
| Layout manager | Grid system + sections |

### 6.2 EntityConfig Interface (Geliştirilmiş)

```typescript
// src/config/types.ts

export interface EntityConfig<T = any> {
  /** Benzersiz entity kimliği */
  id: string;
  
  /** Görüntüleme metinleri */
  labels: EntityLabels;
  
  /** Alan tanımları */
  fields: FieldConfig[];
  
  /** Form bölümleri */
  sections?: FormSection[];
  
  /** Tablo sütunları */
  columns: ColumnConfig[];
  
  /** Zod validasyon şeması */
  schema: z.ZodSchema<T>;
  
  /** Tauri API komutları */
  api: ApiConfig;
  
  /** Varsayılan değerler */
  defaults: Partial<T>;
  
  /** Filtreleme seçenekleri */
  filters?: FilterConfig[];
  
  /** Sayfa davranışları */
  behavior?: BehaviorConfig;
  
  /** Yetkilendirme kuralları */
  permissions?: PermissionConfig;
}

interface EntityLabels {
  singular: string;      // 'Gider'
  plural: string;        // 'Giderler'
  accusative?: string;   // 'Gideri' (Türkçe -i hali)
  createTitle: string;   // 'Yeni Gider Ekle'
  editTitle: string;     // 'Gider Düzenle'
  deleteConfirm: string; // 'Bu gideri silmek istediğinize emin misiniz?'
}

interface FieldConfig {
  /** Alan adı (form key) */
  name: string;
  
  /** Alan tipi */
  type: FieldType;
  
  /** Görüntüleme etiketi */
  label: string;
  
  /** Zorunlu mu? (validasyondan ayrı, UI gösterimi için) */
  required?: boolean;
  
  /** Placeholder */
  placeholder?: string;
  
  /** Yardımcı metin */
  description?: string;
  
  /** Grid genişliği */
  colSpan?: 1 | 2 | 3 | 4 | 6 | 12;
  
  /** Varsayılan değer */
  defaultValue?: any;
  
  /** Görünürlük koşulu */
  visible?: (values: Record<string, any>) => boolean;
  
  /** Etkinlik koşulu */
  disabled?: (values: Record<string, any>) => boolean;
  
  /** Salt okunur */
  readOnly?: boolean;
  
  /** Tip'e özel ayarlar */
  options?: FieldOptions;
  
  /** Bağımlılık (başka alanın değerine göre) */
  dependsOn?: string[];
}

type FieldType = 
  // Temel tipler
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'time'
  | 'checkbox'
  | 'switch'
  
  // Seçim tipleri
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'combobox'      // Arama + select
  
  // Türkiye'ye özel
  | 'tcno'          // TC Kimlik No (11 hane, algoritma)
  | 'telefon'       // Telefon (0XXX XXX XX XX)
  | 'iban'          // IBAN (TR00 0000 ...)
  | 'vergi-no'      // Vergi numarası
  | 'plaka'         // Araç plakası
  
  // Finansal
  | 'currency'      // Para birimi (₺, $, €)
  | 'percentage'    // Yüzde
  
  // İlişkisel (lookup)
  | 'entity-select' // Başka entity'den seç
  
  // Dosya
  | 'file'
  | 'image'
  
  // Gelişmiş
  | 'rich-text'
  | 'code'
  | 'json'
  | 'custom';       // Özel bileşen

interface FieldOptions {
  // Select/Radio için
  items?: Array<{ value: string; label: string; disabled?: boolean }>;
  
  // Entity-select için
  entity?: string;  // 'uye', 'kasa', 'cari'
  displayField?: string;
  valueField?: string;
  filter?: Record<string, any>;
  
  // Number/Currency için
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;  // '₺'
  suffix?: string;  // '%'
  
  // Text için
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  
  // Date için
  minDate?: string | 'today';
  maxDate?: string | 'today';
  format?: string;
  
  // Textarea için
  rows?: number;
  maxRows?: number;
  
  // Custom için
  component?: React.ComponentType<any>;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: string[];  // Field name'leri
  collapsed?: boolean;
  collapsible?: boolean;
}

interface ColumnConfig {
  id: string;
  label: string;
  field?: string;   // data field (id'den farklıysa)
  type?: 'text' | 'number' | 'date' | 'currency' | 'badge' | 'actions';
  sortable?: boolean;
  filterable?: boolean;
  hidden?: boolean;  // Varsayılan gizli
  width?: string;    // '200px', '20%'
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
  badge?: {
    // Badge renkleri
    colors: Record<string, 'default' | 'success' | 'warning' | 'error'>;
    labels?: Record<string, string>;
  };
}

interface ApiConfig {
  list: string;    // 'get_giderler'
  create: string;  // 'create_gider'
  update: string;  // 'update_gider'
  delete: string;  // 'delete_gider'
  detail?: string; // 'get_gider'
  
  // Ek API'ler
  custom?: Record<string, string>;
}

interface FilterConfig {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date-range' | 'number-range';
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
}

interface BehaviorConfig {
  createMode: 'modal' | 'sheet' | 'page';
  editMode: 'modal' | 'sheet' | 'page' | 'inline';
  deleteConfirm: boolean;
  pagination: boolean;
  pageSize: number;
  search: boolean;
  export: ('pdf' | 'excel' | 'csv')[];
  print: boolean;
}

interface PermissionConfig {
  create?: string;  // 'gider:create'
  read?: string;    // 'gider:read'
  update?: string;  // 'gider:update'
  delete?: string;  // 'gider:delete'
}
```

### 6.3 Örnek Entity Config

```typescript
// src/config/entities/gider.config.ts

import { z } from 'zod';
import type { EntityConfig } from '../types';

export const giderSchema = z.object({
  aciklama: z.string().min(3, 'En az 3 karakter'),
  tutar: z.number().positive('Tutar pozitif olmalı'),
  tarih: z.string().min(1, 'Tarih gerekli'),
  kasa_id: z.string().min(1, 'Kasa seçin'),
  gider_turu_id: z.string().optional(),
  belge_no: z.string().optional(),
  cari_id: z.string().optional(),
  kdv_orani: z.number().min(0).max(100).default(18),
  notlar: z.string().optional(),
});

export type GiderForm = z.infer<typeof giderSchema>;

export const giderConfig: EntityConfig<GiderForm> = {
  id: 'gider',
  
  labels: {
    singular: 'Gider',
    plural: 'Giderler',
    accusative: 'Gideri',
    createTitle: 'Yeni Gider Ekle',
    editTitle: 'Gider Düzenle',
    deleteConfirm: 'Bu gideri silmek istediğinize emin misiniz?',
  },
  
  schema: giderSchema,
  
  fields: [
    {
      name: 'tarih',
      type: 'date',
      label: 'Tarih',
      required: true,
      colSpan: 4,
      options: { maxDate: 'today' },
    },
    {
      name: 'kasa_id',
      type: 'entity-select',
      label: 'Kasa',
      required: true,
      colSpan: 4,
      options: {
        entity: 'kasa',
        displayField: 'ad',
        valueField: 'id',
      },
    },
    {
      name: 'gider_turu_id',
      type: 'entity-select',
      label: 'Gider Türü',
      colSpan: 4,
      options: {
        entity: 'gider_turu',
        displayField: 'ad',
        valueField: 'id',
      },
    },
    {
      name: 'tutar',
      type: 'currency',
      label: 'Tutar',
      required: true,
      colSpan: 4,
      options: { prefix: '₺', min: 0 },
    },
    {
      name: 'kdv_orani',
      type: 'percentage',
      label: 'KDV Oranı',
      colSpan: 4,
      options: { min: 0, max: 100, suffix: '%' },
    },
    {
      name: 'belge_no',
      type: 'text',
      label: 'Belge No',
      colSpan: 4,
      placeholder: 'Fatura/Fiş numarası',
    },
    {
      name: 'cari_id',
      type: 'entity-select',
      label: 'Cari Hesap',
      colSpan: 6,
      options: {
        entity: 'cari',
        displayField: 'unvan',
        valueField: 'id',
      },
    },
    {
      name: 'aciklama',
      type: 'text',
      label: 'Açıklama',
      required: true,
      colSpan: 6,
    },
    {
      name: 'notlar',
      type: 'textarea',
      label: 'Notlar',
      colSpan: 12,
      options: { rows: 3 },
    },
  ],
  
  sections: [
    {
      id: 'temel',
      title: 'Temel Bilgiler',
      fields: ['tarih', 'kasa_id', 'gider_turu_id'],
    },
    {
      id: 'tutar',
      title: 'Tutar Bilgileri',
      fields: ['tutar', 'kdv_orani', 'belge_no'],
    },
    {
      id: 'detay',
      title: 'Detaylar',
      fields: ['cari_id', 'aciklama', 'notlar'],
      collapsible: true,
    },
  ],
  
  columns: [
    { id: 'tarih', label: 'Tarih', type: 'date', sortable: true },
    { id: 'aciklama', label: 'Açıklama', sortable: true },
    { id: 'tutar', label: 'Tutar', type: 'currency', align: 'right' },
    { id: 'kasa_ad', label: 'Kasa' },
    { id: 'gider_turu_ad', label: 'Tür' },
    { id: 'belge_no', label: 'Belge No', hidden: true },
  ],
  
  api: {
    list: 'get_giderler',
    create: 'create_gider',
    update: 'update_gider',
    delete: 'delete_gider',
    custom: {
      byKasa: 'get_giderler_by_kasa',
      summary: 'get_gider_summary',
    },
  },
  
  defaults: {
    tarih: new Date().toISOString().split('T')[0],
    kdv_orani: 18,
  },
  
  filters: [
    { name: 'tarih', label: 'Tarih Aralığı', type: 'date-range' },
    {
      name: 'kasa_id',
      label: 'Kasa',
      type: 'select',
      options: [], // Runtime'da doldurulur
    },
  ],
  
  behavior: {
    createMode: 'sheet',
    editMode: 'sheet',
    deleteConfirm: true,
    pagination: true,
    pageSize: 20,
    search: true,
    export: ['pdf', 'excel'],
    print: true,
  },
  
  permissions: {
    create: 'gider:create',
    read: 'gider:read',
    update: 'gider:update',
    delete: 'gider:delete',
  },
};
```

### 6.4 Bileşen Mimarisi

```
src/
├── config/
│   ├── types.ts              # EntityConfig interface'leri
│   ├── registry.ts           # Tüm entity'lerin kaydı
│   └── entities/
│       ├── gider.config.ts
│       ├── gelir.config.ts
│       ├── uye.config.ts
│       ├── aidat.config.ts
│       └── ...
│
├── components/
│   └── dynamic/
│       ├── DynamicForm/
│       │   ├── index.tsx     # Ana form bileşeni
│       │   ├── FormRenderer.tsx
│       │   ├── SectionRenderer.tsx
│       │   └── fields/       # Field bileşenleri
│       │       ├── TextField.tsx
│       │       ├── NumberField.tsx
│       │       ├── CurrencyField.tsx
│       │       ├── SelectField.tsx
│       │       ├── EntitySelectField.tsx
│       │       ├── TcnoField.tsx
│       │       ├── TelefonField.tsx
│       │       ├── IbanField.tsx
│       │       └── registry.ts
│       │
│       ├── DynamicTable/
│       │   ├── index.tsx
│       │   ├── ColumnRenderer.tsx
│       │   └── cells/
│       │       ├── TextCell.tsx
│       │       ├── CurrencyCell.tsx
│       │       ├── DateCell.tsx
│       │       ├── BadgeCell.tsx
│       │       └── ActionsCell.tsx
│       │
│       ├── DynamicFilters/
│       │   ├── index.tsx
│       │   └── filters/
│       │       ├── TextFilter.tsx
│       │       ├── SelectFilter.tsx
│       │       └── DateRangeFilter.tsx
│       │
│       └── CrudPage/
│           ├── index.tsx     # Full CRUD sayfası
│           ├── ListMode.tsx
│           ├── CreateMode.tsx
│           └── EditMode.tsx
│
└── hooks/
    ├── useEntityCrud.ts      # Generic CRUD operations
    ├── useEntityData.ts      # Data fetching + cache
    └── useFieldDependencies.ts # Alan bağımlılıkları
```

### 6.5 Kullanım Örneği

```tsx
// pages/mali/giderler/index.tsx
// Önceki: 940 satır
// Sonraki: ~20 satır

import { CrudPage } from '@/components/dynamic/CrudPage';
import { giderConfig } from '@/config/entities/gider.config';

export default function GiderlerPage() {
  return <CrudPage config={giderConfig} />;
}
```

```tsx
// Daha fazla özelleştirme gerekirse:
import { CrudPage } from '@/components/dynamic/CrudPage';
import { giderConfig } from '@/config/entities/gider.config';
import { GiderSummaryCard } from './components/GiderSummaryCard';

export default function GiderlerPage() {
  return (
    <CrudPage 
      config={giderConfig}
      headerExtra={<GiderSummaryCard />}
      tableProps={{
        onRowClick: (row) => console.log('Clicked:', row),
      }}
      formProps={{
        onBeforeSubmit: (values) => {
          // Özel transform
          return { ...values, tutar: values.tutar * 100 }; // kuruş
        },
      }}
    />
  );
}
```

---

## 7. Risk Analizi ve Trade-off Değerlendirmesi

### 7.1 Config-Driven Yaklaşımın Trade-off'ları

| Avantaj | Dezavantaj |
|---------|------------|
| ✅ Hızlı geliştirme (config yaz, sayfa hazır) | ❌ Öğrenme eğrisi |
| ✅ Tutarlı UI/UX | ❌ Özelleştirme sınırlamaları |
| ✅ Merkezi değişiklik (config'de değiştir, tüm sayfalar güncellenir) | ❌ Debugging zorluğu |
| ✅ Tip güvenliği (TypeScript) | ❌ Initial setup maliyeti |
| ✅ Test edilebilirlik | ❌ Karmaşık senaryolarda yetersiz kalabilir |

### 7.2 Risk Senaryoları

| Risk | Olasılık | Etki | Mitigation |
|------|----------|------|------------|
| Config sistemi çok karmaşık | Orta | Yüksek | Basit başla, ihtiyaç oldukça ekle |
| Mevcut kodla çakışma | Düşük | Orta | Kademeli geçiş, eski kod çalışmaya devam etsin |
| Performans sorunları | Düşük | Orta | Benchmark + lazy loading |
| Ekip adaptasyonu zor | Orta | Orta | Dokümantasyon + pair programming |

### 7.3 Karar Matrisi

**Soru: Config-driven sistem mi, yoksa sadece refactoring mi?**

| Kriter | Sadece Refactor | Config-Driven |
|--------|-----------------|---------------|
| Kısa vadeli maliyet | ⭐⭐⭐⭐⭐ (düşük) | ⭐⭐ (yüksek) |
| Uzun vadeli maliyet | ⭐⭐ (yüksek) | ⭐⭐⭐⭐⭐ (düşük) |
| Geliştirme hızı | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Tutarlılık | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Esneklik | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Risk | ⭐⭐⭐⭐ (düşük) | ⭐⭐⭐ (orta) |

**Öneri: Hibrit yaklaşım**
1. Önce kritik sayfaları refactor et (kısa vade)
2. Refactor sırasında pattern'leri belirle
3. Pattern'lerden config sistemi çıkar (orta vade)
4. Yeni sayfaları config ile yap (uzun vade)

---

## 8. Implementasyon Yol Haritası

### Faz 0: Hazırlık (1 hafta)

- [ ] Mevcut raporu ekiple paylaş
- [ ] Karar: Hangi yaklaşım? (Hibrit önerilir)
- [ ] Öncelikleri belirle
- [ ] Sprint planla

### Faz 1: Quick Wins (2 hafta)

**Sprint 1:**
- [ ] Tüm liste sayfalarına `tableId` ekle
- [ ] Boş `components/forms/` dosyalarını kaldır
- [ ] Zod şemalarını `src/schemas/` klasörüne taşı

**Sprint 2:**
- [ ] `mali/giderler.tsx` refactor başla
- [ ] Custom hook: `useGiderCrud.ts`
- [ ] Form parçala: `GiderForm.tsx`

### Faz 2: Core Refactoring (4 hafta)

**Sprint 3-4:**
- [ ] `mali/giderler.tsx` tamamla (940→~200 satır)
- [ ] `mali/gelirler.tsx` refactor (765→~200 satır)
- [ ] Ortak pattern'leri belirle

**Sprint 5-6:**
- [ ] `uyeler/list.tsx` refactor (1175→~300 satır)
- [ ] `uyeler/detail.tsx` refactor (881→~300 satır)
- [ ] Pattern dokümentasyonu

### Faz 3: Config System Foundation (3 hafta)

**Sprint 7:**
- [ ] `EntityConfig` TypeScript interface
- [ ] Field registry sistemi
- [ ] Temel field component'leri (text, number, select, date)

**Sprint 8:**
- [ ] `DynamicForm` bileşeni
- [ ] Section rendering
- [ ] Validation integration

**Sprint 9:**
- [ ] `DynamicTable` bileşeni
- [ ] `CrudPage` bileşeni
- [ ] İlk entity config: `gider.config.ts`

### Faz 4: Migration (4 hafta)

**Sprint 10-13:**
- [ ] Tüm entity config'leri yaz
- [ ] Sayfaları CrudPage'e geçir
- [ ] Test ve bug fix
- [ ] Dokümantasyon

### Faz 5: Polish (2 hafta)

**Sprint 14-15:**
- [ ] macOS native özellikler (vibrancy, titlebar)
- [ ] Performans optimizasyonu
- [ ] Accessibility review
- [ ] Final test

---

## 9. Başarı Metrikleri

### 9.1 Kod Kalitesi Metrikleri

| Metrik | Şimdiki | Hedef | Ölçüm |
|--------|---------|-------|-------|
| useState sayısı | 430+ | <100 | grep count |
| RHF kullanım oranı | %4 | %100 | form sayfaları |
| Zod kullanım oranı | %4 | %100 | form sayfaları |
| Ortalama dosya boyutu | ~400 satır | <300 satır | wc -l |
| Maks dosya boyutu | 1175 satır | <500 satır | wc -l |
| Kod tekrarı | ~6000 satır | <1000 satır | estimate |

### 9.2 Geliştirme Metrikleri

| Metrik | Şimdiki | Hedef |
|--------|---------|-------|
| Yeni CRUD sayfası süresi | 2-3 gün | 2-3 saat |
| Bug fix süresi | 1-2 saat | 15-30 dk |
| Onboarding süresi | 2 hafta | 3-5 gün |

### 9.3 UX Metrikleri

| Metrik | Şimdiki | Hedef |
|--------|---------|-------|
| Form tutarlılığı | %60 | %100 |
| Validasyon coverage | %4 | %100 |
| Sütun özelleştirme | %2 | %100 |
| Loading state tutarlılığı | %70 | %100 |

---

## 📎 Ekler

### Ek A: Kritik Dosya Listesi

```
/desktop/src/pages/uyeler/list.tsx     - 1175 satır 🔴
/desktop/src/pages/mali/giderler.tsx   - 940 satır 🔴
/desktop/src/pages/uyeler/detail.tsx   - 881 satır 🔴
/desktop/src/pages/mali/gelirler.tsx   - 765 satır 🔴
/desktop/src/pages/mali/kurlar.tsx     - 633 satır 🟡
/desktop/src/pages/etkinlikler/list.tsx - 618 satır 🟡
/desktop/src/pages/settings/users.tsx  - 611 satır 🟡
/desktop/src/pages/mali/virmanlar.tsx  - 605 satır 🟡
/desktop/src/pages/aidat-takip/list.tsx - 602 satır 🟡
```

### Ek B: Mevcut Stack

```json
{
  "framework": "Tauri 2.0",
  "frontend": {
    "react": "^19.0.0",
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^5.2.2",
    "@tanstack/react-query": "^5.17.0",
    "@tanstack/react-table": "^8.21.3",
    "zustand": "^4.4.7"
  },
  "ui": {
    "tailwindcss": "^3.4.0",
    "shadcn/ui": "radix-based",
    "lucide-react": "^0.562.0",
    "framer-motion": "^12.26.1"
  }
}
```

### Ek C: Referanslar

- [uniforms.tools](https://uniforms.tools/)
- [react-jsonschema-form](https://rjsf-team.github.io/react-jsonschema-form/)
- [Tauri 2.0 Docs](https://tauri.app/v2/)
- [react-hook-form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [TanStack Table](https://tanstack.com/table/)

---

> **Doküman Durumu:** Stratejik Analiz Tamamlandı  
> **Sonraki Adım:** Ekiple paylaşım ve karar toplantısı  
> **Tahmini ROI:** Orta-uzun vadede %40-60 geliştirme hızı artışı
