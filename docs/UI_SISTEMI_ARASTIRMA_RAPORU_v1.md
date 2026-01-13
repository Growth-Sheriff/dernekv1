# 🖥️ BADER Desktop - UI Sistemi Araştırma Raporu

> **Tarih:** Ocak 2026  
> **Amaç:** WinForms/macOS benzeri config-driven UI sistemi için araştırma ve analiz  
> **Durum:** Sadece araştırma ve planlama - kod yazımı yapılmadı

---

## 📋 İçindekiler

1. [Mevcut Durum Analizi](#1-mevcut-durum-analizi)
2. [İnternet Araştırması Sonuçları](#2-i̇nternet-araştırması-sonuçları)
3. [Config-Driven UI Yaklaşımları](#3-config-driven-ui-yaklaşımları)
4. [Tauri macOS Native Özellikleri](#4-tauri-macos-native-özellikleri)
5. [Önerilen Sistem Mimarisi](#5-önerilen-sistem-mimarisi)
6. [Implementasyon Planı](#6-implementasyon-planı)
7. [Sonuç ve Öneriler](#7-sonuç-ve-öneriler)

---

## 1. Mevcut Durum Analizi

### 1.1 Form Sayfaları (pages/ klasöründe)

#### ✅ Yapılandırılmış Form Sayfaları

**Örnek: `pages/uyeler/create.tsx` (~340 satır)**
- ✅ Zod schema ile validasyon
- ✅ react-hook-form entegrasyonu
- ✅ FormSection ile gruplandırma
- ✅ FormField ile label/error yönetimi
- ✅ Düzgün hata gösterimi

```tsx
// Mevcut yapı (iyi):
const uyeSchema = z.object({
  tc_no: z.string().length(11).refine(validateTcNo),
  ad: z.string().min(2),
  soyad: z.string().min(2),
  // ...
});

<FormSection title="Temel Bilgiler" columns={3}>
  <FormField label="TC Kimlik No" required error={errors.tc_no?.message}>
    <Input {...register('tc_no')} maxLength={11} />
  </FormField>
</FormSection>
```

**Örnek: `pages/mali/giderler.tsx` (~941 satır)**
- ⚠️ useState ile manuel form state
- ⚠️ Manuel validasyon (if/else)
- ⚠️ Inline form içinde Dialog
- ⚠️ CRUD işlemleri aynı dosyada

#### Form Sayfaları Karşılaştırması

| Sayfa | Zod | react-hook-form | FormSection | Manuel State | Satır |
|-------|-----|-----------------|-------------|--------------|-------|
| `uyeler/create.tsx` | ✅ | ✅ | ✅ | ❌ | 340 |
| `cari/create.tsx` | ✅ | ✅ | ✅ | ❌ | ~300 |
| `etkinlikler/create.tsx` | ✅ | ✅ | ✅ | ❌ | ~250 |
| `mali/giderler.tsx` | ❌ | ❌ | ❌ | ✅ | 941 |
| `mali/gelirler.tsx` | ❌ | ❌ | ❌ | ✅ | ~800 |
| `aidat/list.tsx` | ⚠️ | ⚠️ | ⚠️ | ✅ | ~500 |

#### 🔴 components/forms/ Klasörü (Placeholder)
Bu klasördeki dosyalar kullanılmıyor, sadece boş placeholder:
- `uye-form.tsx`, `gider-form.tsx`, `gelir-form.tsx` vb. (~15 satır TODO)

### 1.2 Tablo Sistemi

#### ✅ DataTable Bileşeni (Çalışıyor)
Konum: `desktop/src/components/common/data-table.tsx` (~550 satır)

**Özellikler:**
- TanStack Table tabanlı
- Sıralama, filtreleme, pagination
- Sütun görünürlük toggle
- Row selection
- Server-side pagination desteği
- localStorage'da sütun tercihleri

**Sütun Özelleştirme Kullanımı:**
| Sayfa | tableId | showColumnToggle | Durum |
|-------|---------|------------------|-------|
| `aidat/list.tsx` | ✅ `aidat_list` | ✅ `true` | **Aktif** |
| Diğer sayfalar | ❌ | ❌ | Kullanılmıyor |

⚠️ **Not:** Sütun özelleştirme sistemi hazır ama sadece 1 sayfada kullanılıyor.

#### ✅ useColumnVisibility Hook (Çalışıyor)
Konum: `desktop/src/hooks/useColumnVisibility.ts` (~119 satır)

**Özellikler:**
- localStorage'da persist
- `toggleColumn()`, `isColumnVisible()`, `resetVisibility()`
- `showAllColumns()`, `hideColumns()`
- Varsayılan görünürlük ayarları

```tsx
// Mevcut hook kullanımı:
const {
  columnVisibility,
  setColumnVisibility,
  toggleColumn,
  isColumnVisible,
  resetVisibility,
  showAllColumns,
  hideColumns,
} = useColumnVisibility('uyeler_list', defaultVisibility);
```

### 1.3 Mevcut Sayfa Yapısı

#### Tipik Sayfa Yapısı (Inline Form Sorunu)
```
📁 pages/uyeler/
├── list.tsx      (~500-800 satır) - Liste + inline formlar
├── create.tsx    (~400-600 satır) - Create formu
├── edit.tsx      (~400-600 satır) - Edit formu (benzer kod)
└── detail.tsx    (~300 satır) - Detay görünümü
```

**Sorunlar:**
1. Her sayfa için create/edit formları yeniden yazılıyor
2. Validasyon mantığı tekrarlanıyor
3. Alan tanımları tutarsız
4. Değişiklik yapmak zor

### 1.4 Validasyon Sistemi

**Mevcut Durum:**
- Bazı sayfalarda Zod kullanılıyor
- Bazı sayfalarda manuel if/else validasyon
- react-hook-form ile entegrasyon var ama tutarsız

---

## 2. İnternet Araştırması Sonuçları

### 2.1 React Form Kütüphaneleri

#### **uniforms** (uniforms.tools)
- ⭐ 2,088 GitHub Stars
- 📦 3,800,599+ Downloads
- ✅ JSON Schema, GraphQL, Zod desteği
- ✅ AntD, Bootstrap, MUI, Semantic UI temaları
- ✅ Otomatik form layout
- ✅ Custom field desteği

**Avantajlar:**
- Schema-first yaklaşım
- Birden fazla schema formatı desteği
- Hazır tema entegrasyonları

**Dezavantajlar:**
- Öğrenme eğrisi
- shadcn/ui için özel adapter gerekli

#### **react-jsonschema-form (RJSF)**
- JSON Schema tabanlı form builder
- Otomatik UI generation
- Validasyon entegrasyonu

**Avantajlar:**
- Standart JSON Schema formatı
- Geniş ekosistem

**Dezavantajlar:**
- Daha karmaşık
- Custom widget geliştirme zor olabilir

#### **Formik**
- Form state management
- Yup validation entegrasyonu
- Field, Form, ErrorMessage components

**Avantajlar:**
- Yaygın kullanım
- İyi dokümantasyon

**Dezavantajlar:**
- Config-driven değil
- Yine de form kodlaması gerekli

### 2.2 Config-Driven UI Yaklaşımları

#### **Forminer (Ticari)**
- uniforms üzerine kurulu
- No-code form builder
- Schema-first yaklaşım

#### **React JSON Schema Form**
- Tam declarative
- Widget sistem

### 2.3 Değerlendirme Matrisi

| Kütüphane | Schema Desteği | Tema | Öğrenme | shadcn Uyumu |
|-----------|----------------|------|---------|--------------|
| uniforms | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| RJSF | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| Formik | ⭐⭐ | - | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Özel Sistem | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 3. Config-Driven UI Yaklaşımları

### 3.1 WinForms Benzeri Yaklaşım

WinForms'un temel felsefesi:
1. **Deklaratif tanım** - Form ve alanlar config ile tanımlanır
2. **Otomatik layout** - Grid/Flow layout otomatik
3. **Event-driven** - Olaylar merkezi işlenir
4. **Data binding** - Veri otomatik bağlanır

### 3.2 Önerilen EntityConfig Yapısı

```typescript
interface EntityConfig {
  /** Entity kimliği (örn: 'uye', 'aidat', 'gider') */
  id: string;
  
  /** Görüntüleme adları */
  labels: {
    singular: string;   // 'Üye'
    plural: string;     // 'Üyeler'
    createTitle: string; // 'Yeni Üye Ekle'
    editTitle: string;   // 'Üye Düzenle'
  };
  
  /** Alan tanımları */
  fields: FieldConfig[];
  
  /** Tablo sütunları (liste için) */
  columns: ColumnConfig[];
  
  /** Validasyon şeması (Zod) */
  validation: z.ZodSchema;
  
  /** API endpoint'leri */
  api: {
    list: string;
    create: string;
    update: string;
    delete: string;
    detail: string;
  };
  
  /** Varsayılan değerler */
  defaultValues: Record<string, any>;
  
  /** Form bölümleri (gruplandırma) */
  sections?: FormSection[];
}
```

### 3.3 Field Tanımları

```typescript
interface FieldConfig {
  /** Alan adı (form state key) */
  name: string;
  
  /** Alan tipi */
  type: FieldType;
  
  /** Görüntüleme etiketi */
  label: string;
  
  /** Zorunlu mu? */
  required?: boolean;
  
  /** Yardımcı metin */
  helperText?: string;
  
  /** Placeholder */
  placeholder?: string;
  
  /** Grid genişliği (1-12) */
  width?: 1 | 2 | 3 | 4 | 6 | 12 | 'full';
  
  /** Varsayılan değer */
  defaultValue?: any;
  
  /** Görünürlük koşulu */
  visible?: (values: Record<string, any>) => boolean;
  
  /** Salt okunur mu? */
  readOnly?: boolean;
  
  /** Tip'e özel seçenekler */
  options?: FieldOptions;
}

type FieldType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'tcno'        // TC Kimlik No (özel format)
  | 'telefon'     // Telefon (özel format)
  | 'email'
  | 'iban'        // IBAN (özel format)
  | 'plaka'       // Araç plakası
  | 'file'
  | 'image'
  | 'rich-text'
  | 'autocomplete'
  | 'uye-select'  // Üye seçici
  | 'kasa-select' // Kasa seçici
  | 'cari-select' // Cari seçici
  | 'custom';     // Özel bileşen
```

### 3.4 Örnek Entity Tanımı

```typescript
// entities/uye.config.ts
export const uyeConfig: EntityConfig = {
  id: 'uye',
  
  labels: {
    singular: 'Üye',
    plural: 'Üyeler',
    createTitle: 'Yeni Üye Ekle',
    editTitle: 'Üye Düzenle',
  },
  
  fields: [
    { name: 'uye_no', type: 'text', label: 'Üye No', width: 4, readOnly: true },
    { name: 'ad', type: 'text', label: 'Ad', width: 4, required: true },
    { name: 'soyad', type: 'text', label: 'Soyad', width: 4, required: true },
    { name: 'tc_no', type: 'tcno', label: 'TC Kimlik No', width: 6 },
    { name: 'telefon', type: 'telefon', label: 'Telefon', width: 6 },
    { name: 'email', type: 'email', label: 'E-posta', width: 6 },
    { name: 'dogum_tarihi', type: 'date', label: 'Doğum Tarihi', width: 6 },
    { name: 'uyelik_durumu', type: 'select', label: 'Üyelik Durumu', width: 4,
      options: { items: [
        { value: 'aktif', label: 'Aktif' },
        { value: 'pasif', label: 'Pasif' },
        { value: 'askiya_alinmis', label: 'Askıya Alınmış' },
      ]}
    },
    { name: 'adres', type: 'textarea', label: 'Adres', width: 12 },
    { name: 'notlar', type: 'textarea', label: 'Notlar', width: 12 },
  ],
  
  sections: [
    { id: 'temel', title: 'Temel Bilgiler', fields: ['uye_no', 'ad', 'soyad'] },
    { id: 'kimlik', title: 'Kimlik Bilgileri', fields: ['tc_no', 'dogum_tarihi'] },
    { id: 'iletisim', title: 'İletişim', fields: ['telefon', 'email', 'adres'] },
    { id: 'diger', title: 'Diğer', fields: ['uyelik_durumu', 'notlar'] },
  ],
  
  columns: [
    { id: 'uye_no', label: 'Üye No', sortable: true },
    { id: 'ad_soyad', label: 'Ad Soyad', render: (row) => `${row.ad} ${row.soyad}` },
    { id: 'telefon', label: 'Telefon' },
    { id: 'uyelik_durumu', label: 'Durum', type: 'badge' },
  ],
  
  validation: z.object({
    ad: z.string().min(2, 'En az 2 karakter'),
    soyad: z.string().min(2, 'En az 2 karakter'),
    tc_no: z.string().length(11, '11 haneli olmalı').optional(),
    telefon: z.string().optional(),
    email: z.string().email('Geçerli e-posta').optional(),
  }),
  
  api: {
    list: 'get_uyeler',
    create: 'create_uye',
    update: 'update_uye',
    delete: 'delete_uye',
    detail: 'get_uye',
  },
  
  defaultValues: {
    uyelik_durumu: 'aktif',
  },
};
```

---

## 4. Tauri macOS Native Özellikleri

### 4.1 Window API

Tauri 2.0 pencere özellikleri:

```rust
// Pencere efektleri (macOS)
window.set_effects(
  EffectsBuilder::new()
    .effect(Effect::Popover)     // veya Vibrancy, Blur
    .state(EffectState::Active)
    .radius(5.0)
    .color(Color(0, 0, 0, 255))
    .build()
)?;

// Title bar stili
window.set_title_bar_style(TitleBarStyle::Overlay)?; // veya Transparent

// Tema
window.set_theme(Some(Theme::Dark))?; // veya Light
```

### 4.2 macOS Specific Features

| Özellik | API | Platform |
|---------|-----|----------|
| Vibrancy/Blur | `set_effects()` | macOS, Windows 10/11 |
| Title Bar Style | `set_title_bar_style()` | macOS |
| Shadow | `set_shadow()` | macOS, Windows |
| Background Color | `set_background_color()` | All |
| Transparency | `transparent: true` | All |
| Full Screen | `set_fullscreen()` | All |
| Simple Full Screen | `set_simple_fullscreen()` | macOS |

### 4.3 Custom Title Bar

Tauri ile custom titlebar oluşturma:

```html
<!-- data-tauri-drag-region ile sürüklenebilir alan -->
<div data-tauri-drag-region class="titlebar">
  <div class="titlebar-buttons">
    <button id="minimize">−</button>
    <button id="maximize">□</button>
    <button id="close">×</button>
  </div>
</div>
```

```javascript
import { getCurrentWindow } from '@tauri-apps/api/window';

const appWindow = getCurrentWindow();
document.getElementById('minimize').onclick = () => appWindow.minimize();
document.getElementById('maximize').onclick = () => appWindow.toggleMaximize();
document.getElementById('close').onclick = () => appWindow.close();
```

### 4.4 Önerilen macOS Deneyimi

1. **Transparent titlebar** - İçerik titlebar'a kadar uzansın
2. **Vibrancy effect** - Sidebar'da blur efekti
3. **Native shadows** - Pencere gölgeleri
4. **Dark mode sync** - Sistem temasıyla uyumlu
5. **Smooth animations** - 60fps geçişler

---

## 5. Önerilen Sistem Mimarisi

### 5.1 Klasör Yapısı

```
desktop/src/
├── config/
│   └── entities/           # Entity config dosyaları
│       ├── index.ts        # Tüm entity'leri export
│       ├── uye.config.ts
│       ├── aidat.config.ts
│       ├── gider.config.ts
│       ├── gelir.config.ts
│       ├── belge.config.ts
│       ├── demirbaslar.config.ts
│       ├── etkinlik.config.ts
│       ├── toplanti.config.ts
│       └── cari.config.ts
│
├── components/
│   └── dynamic/            # Config-driven bileşenler
│       ├── DynamicForm.tsx       # Config'den form oluşturur
│       ├── DynamicTable.tsx      # Config'den tablo oluşturur
│       ├── DynamicFilter.tsx     # Config'den filtre oluşturur
│       ├── CrudPage.tsx          # Tam CRUD sayfası
│       └── fields/               # Field renderers
│           ├── TextField.tsx
│           ├── NumberField.tsx
│           ├── SelectField.tsx
│           ├── DateField.tsx
│           ├── TcnoField.tsx     # TC Kimlik No
│           ├── TelefonField.tsx  # Telefon formatı
│           ├── IbanField.tsx     # IBAN formatı
│           ├── CurrencyField.tsx # Para birimi
│           └── index.ts          # Field registry
│
├── hooks/
│   ├── useDynamicForm.ts    # Form state yönetimi
│   ├── useEntityCrud.ts     # CRUD operasyonları
│   └── useColumnVisibility.ts # (mevcut - çalışıyor)
│
└── pages/
    └── uyeler/
        ├── index.tsx         # CrudPage kullanarak
        └── [id].tsx          # Detay sayfası
```

### 5.2 Temel Bileşenler

#### DynamicForm
```tsx
interface DynamicFormProps<T> {
  config: EntityConfig;
  mode: 'create' | 'edit' | 'view';
  initialValues?: Partial<T>;
  onSubmit: (values: T) => Promise<void>;
  onCancel?: () => void;
}

// Kullanım:
<DynamicForm
  config={uyeConfig}
  mode="create"
  onSubmit={handleCreate}
/>
```

#### DynamicTable
```tsx
interface DynamicTableProps<T> {
  config: EntityConfig;
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
}

// Kullanım:
<DynamicTable
  config={uyeConfig}
  data={uyeler}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

#### CrudPage
```tsx
interface CrudPageProps {
  config: EntityConfig;
}

// Kullanım:
const UyelerPage = () => <CrudPage config={uyeConfig} />;
```

### 5.3 Field Registry Pattern

```typescript
// fields/index.ts
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { SelectField } from './SelectField';
import { DateField } from './DateField';
import { TcnoField } from './TcnoField';
import { TelefonField } from './TelefonField';

export const fieldRegistry: Record<FieldType, React.ComponentType<FieldProps>> = {
  text: TextField,
  textarea: TextField, // with multiline prop
  number: NumberField,
  currency: NumberField, // with currency formatting
  date: DateField,
  datetime: DateField,
  select: SelectField,
  multiselect: SelectField,
  checkbox: CheckboxField,
  radio: RadioField,
  tcno: TcnoField,
  telefon: TelefonField,
  email: TextField, // with email validation
  iban: IbanField,
  // ...
};

export function renderField(field: FieldConfig, props: FieldProps) {
  const Component = fieldRegistry[field.type];
  if (!Component) {
    console.warn(`Unknown field type: ${field.type}`);
    return <TextField {...props} />;
  }
  return <Component {...props} />;
}
```

---

## 6. Implementasyon Planı

### Faz 1: Temel Altyapı (2-3 gün)
1. [ ] `EntityConfig` ve `FieldConfig` TypeScript tipleri
2. [ ] Field registry sistemi
3. [ ] Temel field renderers (text, number, select, date)

### Faz 2: Form Sistemi (3-4 gün)
1. [ ] `DynamicForm` bileşeni
2. [ ] Form validasyon entegrasyonu (Zod)
3. [ ] Form section/grouping desteği
4. [ ] Conditional field visibility

### Faz 3: Tablo Sistemi (2-3 gün)
1. [ ] `DynamicTable` bileşeni (mevcut DataTable üzerine)
2. [ ] Column config'den sütun oluşturma
3. [ ] Custom cell renderers

### Faz 4: CRUD Sayfası (2-3 gün)
1. [ ] `CrudPage` bileşeni
2. [ ] List + Create + Edit + Delete entegrasyonu
3. [ ] Dialog/Sheet form gösterimi

### Faz 5: Entity Configs (3-4 gün)
1. [ ] Tüm entity'ler için config dosyaları
2. [ ] Mevcut sayfaları config-driven yapıya taşıma
3. [ ] Test ve hata düzeltme

### Faz 6: macOS Deneyimi (2-3 gün)
1. [ ] Transparent titlebar
2. [ ] Vibrancy effect (sidebar)
3. [ ] Theme sync
4. [ ] Smooth animations

### Toplam: ~14-20 gün

---

## 7. Sonuç ve Öneriler

### 7.1 Ana Bulgular

1. **Form sistemi karışık** - Bazı sayfalar iyi yapılandırılmış (Zod + react-hook-form), bazıları manuel state ile yazılmış
2. **İyi yapılandırılmış formlar var:**
   - `uyeler/create.tsx` - Zod, react-hook-form, FormSection ✅
   - `cari/create.tsx` - Zod, react-hook-form, FormSection ✅
   - `etkinlikler/create.tsx` - Zod, react-hook-form, FormSection ✅
3. **Manuel state ile yazılmış formlar:**
   - `mali/giderler.tsx` - 941 satır, 20+ useState, manuel validasyon ⚠️
   - `mali/gelirler.tsx` - ~800 satır, manuel state ⚠️
4. **DataTable ve useColumnVisibility çalışıyor** - Sadece 1 sayfada aktif
5. **FormField, FormSection, FormActions bileşenleri mevcut** - Bazı sayfalarda kullanılıyor

### 7.2 Gerçek Sorunlar

| Sorun | Açıklama | Etkilenen Sayfalar |
|-------|----------|-------------------|
| Tutarsız form yapısı | Bazı sayfalar Zod+RHF, bazıları manuel | mali/, aidat/ |
| Büyük dosyalar | 800-941 satırlık tek dosyalar | giderler.tsx, gelirler.tsx |
| Tekrar eden kod | Her sayfada benzer form state | Tüm CRUD sayfaları |
| Sütun toggle eksik | Sadece aidat'ta aktif | Liste sayfaları |

### 7.3 Önerilen Yaklaşım

**Hibrit yaklaşım önerilir:**

1. **Mevcut iyi yapıları koru** - uyeler, cari, etkinlikler sayfaları düzgün
2. **Sorunlu sayfaları refactor et** - giderler, gelirler sayfalarını Zod+RHF yapısına taşı
3. **Config-driven sistemi kademeli ekle** - Önce tablo sütunları, sonra formlar
4. **Sütun özelleştirmeyi yaygınlaştır** - Tüm liste sayfalarına tableId ekle

### 7.4 Öncelik Sırası

1. **Hemen yapılabilir:**
   - Tüm liste sayfalarına `tableId` ve `showColumnToggle` ekle
   - `components/forms/` placeholder'ları kaldır veya gerçek bileşenlere dönüştür

2. **Orta vadeli:**
   - `giderler.tsx` ve `gelirler.tsx` dosyalarını Zod+RHF yapısına refactor et
   - Form bölümlerini ayrı component'lere çıkar

3. **Uzun vadeli:**
   - Config-driven EntityConfig sistemi
   - DynamicForm, DynamicTable bileşenleri

---

## Referanslar

- [uniforms.tools](https://uniforms.tools/) - React form library
- [react-jsonschema-form](https://rjsf-team.github.io/react-jsonschema-form/) - JSON Schema forms
- [Tauri Window API](https://docs.rs/tauri/latest/tauri/window/struct.Window.html)
- [Tauri Window Customization](https://v1.tauri.app/v1/guides/features/window-customization/)
- [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Table](https://tanstack.com/table/)

---

> **Not:** Bu doküman sadece araştırma ve planlama amaçlıdır. Kod yazımı bu dokümanın onaylanmasından sonra başlayacaktır.
