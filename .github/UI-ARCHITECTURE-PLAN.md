# 🎨 BADER Desktop - UI Mimari Planı

> **Versiyon:** 1.0.0  
> **Tarih:** 12 Ocak 2026  
> **Referans:** Apple Human Interface Guidelines (developer.apple.com)

---

## 📋 İçindekiler

1. [Genel Bakış](#-genel-bakış)
2. [Mevcut Durum Analizi](#-mevcut-durum-analizi)
3. [Hedef Tasarım Sistemi](#-hedef-tasarım-sistemi)
4. [Design Tokens](#-design-tokens)
5. [Tipografi Sistemi](#-tipografi-sistemi)
6. [Bileşen Mimarisi](#-bileşen-mimarisi)
7. [Layout Sistemi](#-layout-sistemi)
8. [Sayfa Yapısı](#-sayfa-yapısı)
9. [Implementasyon Yol Haritası](#-implementasyon-yol-haritası)
10. [Teknik Bağımlılıklar](#-teknik-bağımlılıklar)
11. [Checklist](#-checklist)
12. [Referanslar](#-referanslar)

---

## 🎯 Genel Bakış

### Proje Bilgileri

| Özellik | Değer |
|---------|-------|
| **Uygulama** | BADER Desktop (Dernek Yönetim Sistemi) |
| **Framework** | Tauri + React 19 + TypeScript |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui |
| **Hedef Platform** | macOS, Windows, Linux |
| **Tasarım Referansı** | Apple Human Interface Guidelines |

### Hedefler

1. **macOS-native görünüm** - Finder, Notes, Mail uygulamaları tarzında
2. **Tutarlı bileşen sistemi** - CVA tabanlı varyantlar
3. **Erişilebilirlik** - WCAG 2.1 AA uyumlu
4. **Performans** - 60fps animasyonlar
5. **Dark Mode** - Tam karanlık mod desteği

---

## 📊 Mevcut Durum Analizi

### Bileşen Değerlendirmesi

| Bileşen | Durum | Puan | Notlar |
|---------|-------|------|--------|
| Button | ✅ Tam | ⭐⭐⭐⭐ | CVA varyantları mevcut |
| Input | ⚠️ Temel | ⭐⭐ | macOS stili eksik |
| Dialog | ✅ Tam | ⭐⭐⭐⭐ | Radix UI tabanlı |
| Select | ✅ Tam | ⭐⭐⭐ | Geliştirme gerekli |
| Table | 🔴 Placeholder | ⭐ | Sadece export var |
| Badge | 🔴 Placeholder | ⭐ | Implement edilmemiş |
| Toast | 🔴 Placeholder | ⭐ | alert() kullanılıyor |
| Tabs | 🔴 Placeholder | ⭐ | Sadece export var |
| DataTable | 🔴 Placeholder | ⭐ | Sadece boş component |
| StatCard | 🔴 Placeholder | ⭐ | TODO durumunda |
| Form | 🔴 Placeholder | ⭐ | Wrapper yok |
| Skeleton | ⚠️ Eksik | ⭐ | Loading state yok |

### Tespit Edilen Sorunlar

#### 1. Tutarsız Tablo Yapıları
Üç farklı tablo pattern'i tespit edildi:

```
📁 uyeler/list.tsx     → Inline <table> + Tailwind
📁 aidat/list.tsx      → Farklı inline <table>
📁 mali/gelirler.tsx   → Başka bir inline <table>
```

#### 2. Form Tutarsızlıkları
- 3 farklı input stili kullanımda
- Label pozisyonları tutarsız
- Validation gösterimi standart değil

#### 3. Bildirim Sistemi Eksikliği
- `alert()` kullanımı mevcut
- Toast sistemi placeholder durumunda
- Sonner kurulu ama entegre değil

#### 4. İki Paralel Stil Sistemi
- shadcn/ui HSL değişkenleri
- macOS özel değişkenleri
- Birleştirilmesi gerekiyor

### Mevcut CSS Değişkenleri

#### shadcn/ui Renk Sistemi (HSL Formatı)

| Değişken | Değer | Açıklama |
|----------|-------|----------|
| `--background` | `0 0% 100%` | Ana arka plan |
| `--foreground` | `222.2 84% 4.9%` | Ana metin rengi |
| `--card` | `0 0% 100%` | Kart arka planı |
| `--card-foreground` | `222.2 84% 4.9%` | Kart metin rengi |
| `--popover` | `0 0% 100%` | Popover arka planı |
| `--popover-foreground` | `222.2 84% 4.9%` | Popover metin rengi |
| `--primary` | `221.2 83.2% 53.3%` | Birincil renk (Mavi) |
| `--primary-foreground` | `210 40% 98%` | Birincil metin |
| `--secondary` | `210 40% 96.1%` | İkincil renk |
| `--secondary-foreground` | `222.2 47.4% 11.2%` | İkincil metin |
| `--muted` | `210 40% 96.1%` | Soluk renk |
| `--muted-foreground` | `215.4 16.3% 46.9%` | Soluk metin |
| `--accent` | `210 40% 96.1%` | Vurgu rengi |
| `--accent-foreground` | `222.2 47.4% 11.2%` | Vurgu metin |
| `--destructive` | `0 84.2% 60.2%` | Yıkıcı/Tehlikeli (Kırmızı) |
| `--destructive-foreground` | `210 40% 98%` | Yıkıcı metin |
| `--border` | `214.3 31.8% 91.4%` | Kenarlık rengi |
| `--input` | `214.3 31.8% 91.4%` | Input kenarlık |
| `--ring` | `221.2 83.2% 53.3%` | Focus ring |
| `--radius` | `0.5rem` | Köşe yuvarlatma |

#### macOS Renk Paleti

| Değişken | Değer | Açıklama |
|----------|-------|----------|
| `--macos-bg` | `#f5f5f7` | macOS arka plan |
| `--macos-surface` | `#ffffff` | Yüzey rengi |
| `--macos-border` | `#d2d2d7` | Kenarlık rengi |
| `--macos-text` | `#1d1d1f` | Ana metin |
| `--macos-text-secondary` | `#86868b` | İkincil metin |
| `--macos-accent` | `#007aff` | Apple mavi |
| `--macos-accent-hover` | `#0051d5` | Hover mavi |
| `--macos-shadow` | `0 2px 8px rgba(0,0,0,0.08)` | Hafif gölge |
| `--macos-shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | Büyük gölge |

### Mevcut UI Bileşenleri

#### shadcn/ui Temel Bileşenler
Konum: `src/components/ui/`

| Dosya | Durum | Açıklama |
|-------|-------|----------|
| `accordion.tsx` | 🔴 Placeholder | Katlanır panel |
| `alert-dialog.tsx` | ❓ İncelenmedi | Uyarı dialogu |
| `alert.tsx` | ❓ İncelenmedi | Uyarı mesajı |
| `avatar.tsx` | ❓ İncelenmedi | Kullanıcı avatarı |
| `badge.tsx` | 🔴 Placeholder | Etiket/rozet |
| `button.tsx` | ✅ **Tam** | CVA ile varyantlı buton |
| `calendar.tsx` | ❓ İncelenmedi | Takvim |
| `card.tsx` | ✅ **Temel** | Kart bileşeni |
| `checkbox.tsx` | ✅ **Tam** | Radix checkbox |
| `date-picker.tsx` | ❓ İncelenmedi | Tarih seçici |
| `dialog.tsx` | ✅ **Tam** | Modal dialog |
| `drawer.tsx` | ❓ İncelenmedi | Çekmece panel |
| `dropdown-menu.tsx` | ❓ İncelenmedi | Açılır menü |
| `form.tsx` | 🔴 Placeholder | Form wrapper |
| `input.tsx` | ✅ **Tam** | Text input |
| `label.tsx` | ❓ İncelenmedi | Form label |
| `popover.tsx` | ❓ İncelenmedi | Popover |
| `radio-group.tsx` | ❓ İncelenmedi | Radio butonlar |
| `select.tsx` | ✅ **Tam** | Radix select |
| `separator.tsx` | ❓ İncelenmedi | Ayırıcı çizgi |
| `sheet.tsx` | ❓ İncelenmedi | Yan panel |
| `skeleton.tsx` | ❓ İncelenmedi | Yükleme iskeleti |
| `table.tsx` | 🔴 Placeholder | Tablo |
| `tabs.tsx` | 🔴 Placeholder | Tab grupları |
| `textarea.tsx` | ❓ İncelenmedi | Metin alanı |
| `toast.tsx` | 🔴 Placeholder | Bildirim |
| `toaster.tsx` | ❓ İncelenmedi | Toaster provider |

#### Layout Bileşenleri
Konum: `src/components/layout/`

| Dosya | Açıklama |
|-------|----------|
| `layout.tsx` | Ana layout wrapper (Sidebar + Header + Outlet) |
| `sidebar.tsx` | Sol navigasyon menüsü, collapsible |
| `header.tsx` | Üst header, arama ve kullanıcı menüsü |
| `mobile-nav.tsx` | Mobil navigasyon |

#### Common Bileşenler
Konum: `src/components/common/`

| Dosya | Durum | Açıklama |
|-------|-------|----------|
| `data-table.tsx` | 🔴 Placeholder | Veri tablosu |
| `empty-state.tsx` | ❓ İncelenmedi | Boş durum gösterimi |
| `error-boundary.tsx` | ❓ İncelenmedi | Hata yakalayıcı |
| `export-button.tsx` | ❓ İncelenmedi | Dışa aktarma butonu |
| `feature-gate.tsx` | ❓ İncelenmedi | Feature flag gate |
| `loading-spinner.tsx` | ❓ İncelenmedi | Yükleme animasyonu |
| `search-input.tsx` | ❓ İncelenmedi | Arama kutusu |
| `stat-card.tsx` | 🔴 Placeholder | İstatistik kartı |

#### Form Bileşenleri
Konum: `src/components/forms/`

| Dosya | Durum | Açıklama |
|-------|-------|----------|
| `aidat-form.tsx` | ❓ İncelenmedi | Aidat formu |
| `belge-form.tsx` | ❓ İncelenmedi | Belge formu |
| `butce-form.tsx` | ❓ İncelenmedi | Bütçe formu |
| `etkinlik-form.tsx` | ❓ İncelenmedi | Etkinlik formu |
| `gelir-form.tsx` | ❓ İncelenmedi | Gelir formu |
| `gider-form.tsx` | ❓ İncelenmedi | Gider formu |
| `toplanti-form.tsx` | ❓ İncelenmedi | Toplantı formu |
| `uye-form.tsx` | 🔴 Placeholder | Üye formu |
| `virman-form.tsx` | ❓ İncelenmedi | Virman formu |

#### Chart Bileşenleri
Konum: `src/components/charts/`

| Dosya | Açıklama |
|-------|----------|
| `bar-chart.tsx` | Bar grafik |
| `donut-chart.tsx` | Halka grafik |
| `line-chart.tsx` | Çizgi grafik |
| `pie-chart.tsx` | Pasta grafik |

---

## 🍎 Hedef Tasarım Sistemi

### Apple Human Interface Guidelines Prensipleri

#### 1. Clarity (Netlik)
- Metin her boyutta okunabilir
- İkonlar anlaşılır ve kesin
- Süslemeler subtle ve uygun
- Fonksiyonellik tasarımı yönlendiriyor

#### 2. Deference (Saygı)
- Fluid motion içeriği anlamlandırıyor
- Subtle, güzel arayüz içeriği destekliyor
- Kenardan kenara içerik kullanımı

#### 3. Depth (Derinlik)
- Katmanlı arayüz hiyerarşiyi iletiyor
- Gerçekçi motion canlılık sağlıyor
- Keşfetme zevki yaratıyor

### macOS Tasarım Karakteristikleri

| Özellik | Açıklama |
|---------|----------|
| **Liquid Glass** | Yarı şeffaf, blur efektli yüzeyler |
| **8pt Grid** | Tutarlı spacing sistemi |
| **SF Pro** | San Francisco font ailesi |
| **Vibrancy** | Arka plan blur efektleri |
| **Shadows** | Subtle, layered gölgeler |

---

## 🎨 Design Tokens

### Renk Sistemi

#### Light Mode

```css
:root {
  /* === SEMANTIC COLORS === */
  
  /* Background */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f5f7;
  --color-bg-tertiary: #e8e8ed;
  --color-bg-elevated: #ffffff;
  
  /* Foreground */
  --color-fg-primary: #1d1d1f;
  --color-fg-secondary: #86868b;
  --color-fg-tertiary: #aeaeb2;
  --color-fg-quaternary: #c7c7cc;
  
  /* Accent */
  --color-accent: #007aff;
  --color-accent-hover: #0051d5;
  --color-accent-active: #003d99;
  
  /* Semantic */
  --color-success: #34c759;
  --color-warning: #ff9500;
  --color-error: #ff3b30;
  --color-info: #5ac8fa;
  
  /* Borders */
  --color-border-primary: #d2d2d7;
  --color-border-secondary: #e5e5ea;
  --color-border-focus: #007aff;
  
  /* === SHADOWS === */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.16);
  
  /* === SPACING (8pt Grid) === */
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  
  /* === RADIUS === */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --radius-full: 9999px;
  
  /* === TRANSITIONS === */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
  --transition-spring: 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
```

#### Dark Mode

```css
.dark {
  /* Background */
  --color-bg-primary: #1c1c1e;
  --color-bg-secondary: #2c2c2e;
  --color-bg-tertiary: #3a3a3c;
  --color-bg-elevated: #2c2c2e;
  
  /* Foreground */
  --color-fg-primary: #ffffff;
  --color-fg-secondary: #ebebf5;
  --color-fg-tertiary: #ebebf599;
  --color-fg-quaternary: #ebebf54d;
  
  /* Borders */
  --color-border-primary: #38383a;
  --color-border-secondary: #48484a;
  
  /* Shadows (daha az belirgin) */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
}
```

### Tailwind Config Güncellemesi

```typescript
// tailwind.config.ts
export default {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "var(--color-bg-primary)",
          secondary: "var(--color-bg-secondary)",
          tertiary: "var(--color-bg-tertiary)",
          elevated: "var(--color-bg-elevated)",
        },
        foreground: {
          DEFAULT: "var(--color-fg-primary)",
          secondary: "var(--color-fg-secondary)",
          tertiary: "var(--color-fg-tertiary)",
          quaternary: "var(--color-fg-quaternary)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          active: "var(--color-accent-active)",
        },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        info: "var(--color-info)",
        border: {
          DEFAULT: "var(--color-border-primary)",
          secondary: "var(--color-border-secondary)",
          focus: "var(--color-border-focus)",
        },
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      spacing: {
        0: "var(--space-0)",
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        10: "var(--space-10)",
        12: "var(--space-12)",
        16: "var(--space-16)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "200ms",
        slow: "300ms",
      },
    },
  },
}
```

---

## 📝 Tipografi Sistemi

### Font Ailesi

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", 
               "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-mono: "SF Mono", SFMono-Regular, ui-monospace, Menlo, 
               Monaco, "Cascadia Mono", monospace;
}
```

### Type Scale

| İsim | Boyut | Line Height | Weight | Kullanım |
|------|-------|-------------|--------|----------|
| `display` | 34px | 1.1 | 700 | Hero başlıklar |
| `title-1` | 28px | 1.2 | 700 | Sayfa başlıkları |
| `title-2` | 22px | 1.25 | 600 | Section başlıkları |
| `title-3` | 20px | 1.3 | 600 | Alt başlıklar |
| `headline` | 17px | 1.4 | 600 | Vurgulu metin |
| `body` | 15px | 1.5 | 400 | Normal metin |
| `callout` | 14px | 1.45 | 400 | Açıklama metni |
| `subhead` | 13px | 1.4 | 400 | Alt başlık |
| `footnote` | 12px | 1.35 | 400 | Dipnot |
| `caption` | 11px | 1.3 | 400 | Küçük etiket |

### Tailwind Typography Plugin

```typescript
// tailwind.config.ts
fontSize: {
  "display": ["34px", { lineHeight: "1.1", fontWeight: "700" }],
  "title-1": ["28px", { lineHeight: "1.2", fontWeight: "700" }],
  "title-2": ["22px", { lineHeight: "1.25", fontWeight: "600" }],
  "title-3": ["20px", { lineHeight: "1.3", fontWeight: "600" }],
  "headline": ["17px", { lineHeight: "1.4", fontWeight: "600" }],
  "body": ["15px", { lineHeight: "1.5", fontWeight: "400" }],
  "callout": ["14px", { lineHeight: "1.45", fontWeight: "400" }],
  "subhead": ["13px", { lineHeight: "1.4", fontWeight: "400" }],
  "footnote": ["12px", { lineHeight: "1.35", fontWeight: "400" }],
  "caption": ["11px", { lineHeight: "1.3", fontWeight: "400" }],
}
```

---

## 🧩 Bileşen Mimarisi

### Dosya Yapısı

```
src/components/
├── ui/                      # Primitive UI bileşenleri
│   ├── button.tsx          # ✅ Mevcut - Güncelle
│   ├── input.tsx           # ✅ Mevcut - Güncelle
│   ├── select.tsx          # ✅ Mevcut - Güncelle
│   ├── dialog.tsx          # ✅ Mevcut - Tamam
│   ├── checkbox.tsx        # ✅ Mevcut - Tamam
│   ├── badge.tsx           # 🔴 Yeniden yaz
│   ├── toast.tsx           # 🔴 Sonner entegre et
│   ├── table.tsx           # 🔴 Yeniden yaz
│   ├── tabs.tsx            # 🔴 Radix entegre et
│   ├── skeleton.tsx        # 🔴 Yeniden yaz
│   ├── avatar.tsx          # ⚠️ Kontrol et
│   ├── card.tsx            # ⚠️ Güncelle
│   ├── separator.tsx       # ⚠️ Kontrol et
│   └── typography.tsx      # 🆕 Yeni oluştur
│
├── common/                  # Ortak bileşenler
│   ├── data-table/         # 🔴 Yeniden yaz
│   │   ├── index.tsx
│   │   ├── columns.tsx
│   │   ├── pagination.tsx
│   │   ├── toolbar.tsx
│   │   └── row-actions.tsx
│   ├── empty-state.tsx     # ⚠️ Güncelle
│   ├── loading-spinner.tsx # ⚠️ Güncelle
│   ├── search-input.tsx    # ⚠️ Güncelle
│   ├── stat-card.tsx       # 🔴 Yeniden yaz
│   ├── page-header.tsx     # 🆕 Yeni oluştur
│   └── confirm-dialog.tsx  # 🆕 Yeni oluştur
│
├── forms/                   # Form bileşenleri
│   ├── form-field.tsx      # 🆕 Wrapper oluştur
│   ├── form-section.tsx    # 🆕 Yeni oluştur
│   └── [existing forms]    # Mevcut formlar
│
└── layout/                  # Layout bileşenleri
    ├── layout.tsx          # ⚠️ Güncelle
    ├── sidebar.tsx         # ⚠️ Güncelle
    ├── header.tsx          # ⚠️ Güncelle
    └── mobile-nav.tsx      # ⚠️ Güncelle
```

### Bileşen Detayları

#### 1. Button (Güncelleme)

```typescript
// components/ui/button.tsx
const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2
   font-medium transition-all duration-[var(--transition-fast)]
   focus-visible:outline-none focus-visible:ring-2 
   focus-visible:ring-accent focus-visible:ring-offset-2
   disabled:pointer-events-none disabled:opacity-50
   active:scale-[0.98]`,
  {
    variants: {
      variant: {
        primary: `bg-accent text-white 
                  hover:bg-accent-hover 
                  active:bg-accent-active
                  shadow-sm hover:shadow-md`,
        secondary: `bg-background-secondary text-foreground
                    border border-border
                    hover:bg-background-tertiary`,
        ghost: `hover:bg-background-secondary`,
        destructive: `bg-error text-white
                      hover:bg-error/90`,
        link: `text-accent underline-offset-4 
               hover:underline`,
      },
      size: {
        sm: "h-8 px-3 text-callout rounded-md",
        md: "h-10 px-4 text-body rounded-lg",
        lg: "h-12 px-6 text-headline rounded-lg",
        icon: "h-10 w-10 rounded-lg",
        "icon-sm": "h-8 w-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);
```

#### 2. Input (Güncelleme)

```typescript
// components/ui/input.tsx
const inputVariants = cva(
  `w-full bg-background border border-border rounded-lg
   text-body text-foreground placeholder:text-foreground-tertiary
   transition-all duration-[var(--transition-fast)]
   focus:outline-none focus:ring-2 focus:ring-accent/20 
   focus:border-accent
   disabled:opacity-50 disabled:cursor-not-allowed`,
  {
    variants: {
      size: {
        sm: "h-8 px-3 text-callout",
        md: "h-10 px-4 text-body",
        lg: "h-12 px-4 text-headline",
      },
      state: {
        default: "",
        error: "border-error focus:ring-error/20 focus:border-error",
        success: "border-success focus:ring-success/20 focus:border-success",
      },
    },
    defaultVariants: {
      size: "md",
      state: "default",
    },
  }
);
```

#### 3. Badge (Yeni)

```typescript
// components/ui/badge.tsx
const badgeVariants = cva(
  `inline-flex items-center rounded-full 
   font-medium transition-colors`,
  {
    variants: {
      variant: {
        default: "bg-background-secondary text-foreground-secondary",
        primary: "bg-accent/10 text-accent",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        error: "bg-error/10 text-error",
        info: "bg-info/10 text-info",
      },
      size: {
        sm: "px-2 py-0.5 text-caption",
        md: "px-2.5 py-1 text-footnote",
        lg: "px-3 py-1.5 text-callout",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}
```

#### 4. DataTable (Yeni)

```typescript
// components/common/data-table/index.tsx
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  searchPlaceholder?: string;
  searchKey?: keyof TData;
  pagination?: {
    pageSize?: number;
    pageSizeOptions?: number[];
  };
  selection?: {
    enabled: boolean;
    onSelectionChange?: (rows: TData[]) => void;
  };
  toolbar?: React.ReactNode;
  rowActions?: (row: TData) => React.ReactNode;
}

// Özellikler:
// - Sıralama (sortable columns)
// - Filtreleme (column filters)
// - Arama (global search)
// - Sayfalama (pagination)
// - Satır seçimi (row selection)
// - Skeleton loading
// - Empty state
// - Responsive tasarım
```

#### 5. Toast (Sonner Entegrasyonu)

```typescript
// components/ui/toast.tsx
import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';

export const Toaster = () => (
  <SonnerToaster
    position="bottom-right"
    toastOptions={{
      className: `
        bg-background-elevated border border-border
        shadow-lg rounded-xl p-4
        text-foreground
      `,
      duration: 4000,
    }}
    icons={{
      success: <CheckCircle className="text-success" />,
      error: <XCircle className="text-error" />,
      warning: <AlertTriangle className="text-warning" />,
      info: <Info className="text-info" />,
    }}
  />
);

export const toast = {
  success: (message: string, options?: ToastOptions) => 
    sonnerToast.success(message, options),
  error: (message: string, options?: ToastOptions) => 
    sonnerToast.error(message, options),
  warning: (message: string, options?: ToastOptions) => 
    sonnerToast.warning(message, options),
  info: (message: string, options?: ToastOptions) => 
    sonnerToast.info(message, options),
  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => sonnerToast.promise(promise, messages),
};
```

#### 6. Skeleton (Yeni)

```typescript
// components/ui/skeleton.tsx
const skeletonVariants = cva(
  "animate-pulse bg-background-tertiary rounded",
  {
    variants: {
      variant: {
        text: "h-4 w-full",
        title: "h-6 w-3/4",
        avatar: "rounded-full",
        button: "h-10 w-24",
        card: "h-32 w-full rounded-xl",
        table: "h-12 w-full",
      },
    },
    defaultVariants: {
      variant: "text",
    },
  }
);

// Özel skeleton bileşenleri
export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2">
    <Skeleton variant="table" className="h-10 bg-background-secondary" />
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} variant="table" />
    ))}
  </div>
);

export const SkeletonCard = () => (
  <div className="p-4 space-y-3 border border-border rounded-xl">
    <Skeleton variant="title" />
    <Skeleton variant="text" />
    <Skeleton variant="text" className="w-2/3" />
  </div>
);
```

#### 7. StatCard (Yeni)

```typescript
// components/common/stat-card.tsx
interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  loading?: boolean;
}

// Tasarım:
// - macOS widget tarzı
// - Subtle gradient background
// - Icon with accent color
// - Trend indicator with arrow
// - Hover elevation effect
```

#### 8. PageHeader (Yeni)

```typescript
// components/common/page-header.tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  tabs?: { label: string; value: string; href: string }[];
}

// macOS Finder tarzı header
// Breadcrumb navigasyonu
// Action butonları sağda
// Optional tab bar
```

#### 9. FormField (Yeni)

```typescript
// components/forms/form-field.tsx
interface FormFieldProps {
  label: string;
  name: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

// Label + Input + Description + Error wrapper
// Tutarlı form layout
// Erişilebilirlik için aria attributes
```

---

## 📐 Layout Sistemi

### Ana Layout Yapısı

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Container                             │
│  ┌───────────────┬─────────────────────────────────────────────┐│
│  │               │               Header (h-14)                  ││
│  │   Sidebar     │  ┌─ Breadcrumbs ─────────┐ ┌─ Actions ─────┐││
│  │   (w-64)      │  │ Home > Üyeler > Liste │ │ + Yeni Üye   │││
│  │               │  └───────────────────────┘ └───────────────┘││
│  │  ┌─────────┐  ├─────────────────────────────────────────────┤│
│  │  │  Logo   │  │                                             ││
│  │  └─────────┘  │              Page Content                   ││
│  │               │                                             ││
│  │  Navigation   │  ┌─ Page Header ───────────────────────────┐││
│  │  ┌─────────┐  │  │ Üye Listesi                 [Filtre v]  │││
│  │  │ Üyeler  │  │  │ 256 üye kayıtlı            [+ Ekle]    │││
│  │  │ Aidatlar│  │  └─────────────────────────────────────────┘││
│  │  │ Mali    │  │                                             ││
│  │  │ Belgeler│  │  ┌─ Data Table ────────────────────────────┐││
│  │  │ ...     │  │  │ □ Ad Soyad    TC No    Telefon  Durum  │││
│  │  └─────────┘  │  │ □ Ahmet Y.    123...   0532...  Aktif  │││
│  │               │  │ □ Mehmet K.   456...   0533...  Pasif  │││
│  │  ┌─────────┐  │  │ ...                                     │││
│  │  │ Footer  │  │  └─────────────────────────────────────────┘││
│  │  │ v1.0.0  │  │                                             ││
│  │  └─────────┘  │  ┌─ Pagination ────────────────────────────┐││
│  │               │  │ ◀ 1 2 3 ... 10 ▶   Sayfa başına: 20 v  │││
│  │               │  └─────────────────────────────────────────┘││
│  └───────────────┴─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Sidebar Güncellemesi

```typescript
// components/layout/sidebar.tsx

// macOS Finder tarzı sidebar
// - Collapsible gruplar
// - Active state indicator (sol bar)
// - Hover effects
// - Badge ile bildirim sayısı
// - Keyboard navigation

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  children?: NavItem[];
}

const navigation: NavGroup[] = [
  {
    title: "Ana Menü",
    items: [
      { label: "Dashboard", href: "/", icon: Home },
      { label: "Üyeler", href: "/uyeler", icon: Users, badge: 3 },
      // ...
    ],
  },
  // ...
];
```

### Responsive Breakpoints

| Breakpoint | Değer | Kullanım |
|------------|-------|----------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Laptop |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Large desktop |

---

## 📁 Sayfa Yapısı

### Sayfa Modülleri

| Modül | Konum | Sayfalar |
|-------|-------|----------|
| **Üyeler** | `pages/uyeler/` | list, detail, create, edit |
| **Aidatlar** | `pages/aidat/` | list, create, edit |
| **Aidat Takip** | `pages/aidat-takip/` | list, detail |
| **Mali** | `pages/mali/` | gelirler, giderler, kasalar |
| **Raporlar** | `pages/raporlar/` | multiple reports |
| **Bütçe** | `pages/butce/` | list, create |
| **Belgeler** | `pages/belgeler/` | list, create |
| **Toplantılar** | `pages/toplantilar/` | list, create |
| **Etkinlikler** | `pages/etkinlikler/` | list, create |
| **Demirbaşlar** | `pages/demirbaslar/` | list |
| **Cari** | `pages/cari/` | list, detail |
| **Vadeli İşlemler** | `pages/vadeli-islemler/` | list |
| **Ayarlar** | `pages/ayarlar/` | settings pages |
| **Dashboard** | `pages/dashboard/` | index |

### Standart Sayfa Template'i

```typescript
// Örnek: pages/uyeler/list.tsx

export default function UyelerListPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <PageHeader
        title="Üye Listesi"
        description="Tüm dernek üyelerini görüntüleyin ve yönetin"
        breadcrumbs={[
          { label: "Ana Sayfa", href: "/" },
          { label: "Üyeler" },
        ]}
        actions={
          <Button asChild>
            <Link to="/uyeler/yeni">
              <Plus className="w-4 h-4" />
              Yeni Üye
            </Link>
          </Button>
        }
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Toplam Üye" value={256} icon={Users} />
        <StatCard title="Aktif" value={230} variant="success" />
        <StatCard title="Pasif" value={26} variant="warning" />
        <StatCard title="Bu Ay Katılan" value={5} trend={{ value: 25, direction: 'up' }} />
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={members}
        loading={isLoading}
        searchPlaceholder="Üye ara..."
        searchKey="fullName"
        emptyState={
          <EmptyState
            icon={Users}
            title="Üye bulunamadı"
            description="Henüz kayıtlı üye bulunmuyor"
            action={
              <Button asChild>
                <Link to="/uyeler/yeni">İlk üyeyi ekle</Link>
              </Button>
            }
          />
        }
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
}
```

---

## 🚀 Implementasyon Yol Haritası

### Faz 1: Temel Altyapı (1-2 Hafta)

| Sıra | Görev | Dosya | Öncelik |
|------|-------|-------|---------|
| 1.1 | Design tokens CSS | `globals.css` | 🔴 Kritik |
| 1.2 | Tailwind config güncelleme | `tailwind.config.ts` | 🔴 Kritik |
| 1.3 | Button bileşeni güncelleme | `ui/button.tsx` | 🔴 Kritik |
| 1.4 | Input bileşeni güncelleme | `ui/input.tsx` | 🔴 Kritik |
| 1.5 | Badge bileşeni oluşturma | `ui/badge.tsx` | 🟡 Yüksek |
| 1.6 | Sonner toast entegrasyonu | `ui/toast.tsx` | 🟡 Yüksek |
| 1.7 | Typography bileşeni | `ui/typography.tsx` | 🟢 Normal |

**Tahmini Süre:** 15-20 saat

### Faz 2: Veri Görüntüleme (2 Hafta)

| Sıra | Görev | Dosya | Öncelik |
|------|-------|-------|---------|
| 2.1 | DataTable core | `common/data-table/index.tsx` | 🔴 Kritik |
| 2.2 | DataTable pagination | `common/data-table/pagination.tsx` | 🔴 Kritik |
| 2.3 | DataTable toolbar | `common/data-table/toolbar.tsx` | 🟡 Yüksek |
| 2.4 | Skeleton bileşeni | `ui/skeleton.tsx` | 🟡 Yüksek |
| 2.5 | EmptyState güncelleme | `common/empty-state.tsx` | 🟡 Yüksek |
| 2.6 | StatCard bileşeni | `common/stat-card.tsx` | 🟢 Normal |
| 2.7 | PageHeader bileşeni | `common/page-header.tsx` | 🟢 Normal |

**Tahmini Süre:** 25-30 saat

### Faz 3: Form ve Layout (1-2 Hafta)

| Sıra | Görev | Dosya | Öncelik |
|------|-------|-------|---------|
| 3.1 | FormField wrapper | `forms/form-field.tsx` | 🟡 Yüksek |
| 3.2 | FormSection bileşeni | `forms/form-section.tsx` | 🟢 Normal |
| 3.3 | SearchInput güncelleme | `common/search-input.tsx` | 🟡 Yüksek |
| 3.4 | Sidebar redesign | `layout/sidebar.tsx` | 🟡 Yüksek |
| 3.5 | Header güncelleme | `layout/header.tsx` | 🟢 Normal |
| 3.6 | Tabs bileşeni | `ui/tabs.tsx` | 🟢 Normal |
| 3.7 | Card güncelleme | `ui/card.tsx` | 🟢 Normal |

**Tahmini Süre:** 20-25 saat

### Faz 4: Polish ve Animasyonlar (1 Hafta)

| Sıra | Görev | Dosya | Öncelik |
|------|-------|-------|---------|
| 4.1 | Micro-interactions | Tüm bileşenler | 🟢 Normal |
| 4.2 | Loading states | Tüm sayfalar | 🟢 Normal |
| 4.3 | Error states | Tüm formlar | 🟢 Normal |
| 4.4 | Dark mode | `globals.css` | 🟢 Normal |
| 4.5 | Accessibility audit | Tüm bileşenler | 🟡 Yüksek |
| 4.6 | Performance optimization | Bundle analizi | 🟢 Normal |

**Tahmini Süre:** 15-20 saat

### Toplam Tahmini Süre: 75-95 saat

---

## 📦 Teknik Bağımlılıklar

### Mevcut Paketler

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.4.0",
    "lucide-react": "^0.562.0",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-select": "^2.2.6",
    "react-hook-form": "^7.49.0",
    "@hookform/resolvers": "^5.2.2",
    "zod": "^3.22.4",
    "recharts": "^2.10.0",
    "sonner": "^2.0.7",
    "date-fns": "^3.0.0"
  }
}
```

### Eklenecek Paketler

```bash
# DataTable için
npm install @tanstack/react-table

# Tabs için (henüz yok ise)
npm install @radix-ui/react-tabs

# Animations için (opsiyonel)
npm install framer-motion
```

### Utility Fonksiyonlar

```typescript
// lib/utils.ts - Mevcut
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// lib/format.ts - Eklenecek
export function formatCurrency(amount: number): string;
export function formatDate(date: Date, format?: string): string;
export function formatPhoneNumber(phone: string): string;

// lib/validators.ts - Eklenecek
export const tcKimlikSchema: ZodSchema;
export const phoneSchema: ZodSchema;
export const emailSchema: ZodSchema;
```

---

## 📋 Checklist

### Faz 1 Kontrol Listesi
- [x] Design tokens CSS değişkenleri eklendi ✅ (12 Ocak 2026)
- [x] Tailwind config güncellendi ✅ (12 Ocak 2026)
- [x] Button bileşeni yeni varyantlarla güncellendi ✅ (12 Ocak 2026)
- [x] Input bileşeni size ve state varyantları eklendi ✅ (12 Ocak 2026)
- [x] Badge bileşeni sıfırdan oluşturuldu ✅ (12 Ocak 2026)
- [x] Sonner toast sistemi entegre edildi ✅ (12 Ocak 2026)
- [x] Typography bileşeni oluşturuldu ✅ (12 Ocak 2026)
- [ ] Tüm alert() kullanımları toast ile değiştirildi

### Faz 2 Kontrol Listesi
- [x] DataTable core bileşeni oluşturuldu ✅ (12 Ocak 2026) - TanStack Table ile
- [x] Pagination bileşeni oluşturuldu ✅ (12 Ocak 2026) - DataTable'a entegre
- [x] Toolbar (arama, filtre) oluşturuldu ✅ (12 Ocak 2026)
- [x] Skeleton variants oluşturuldu ✅ (12 Ocak 2026) - 10 variant
- [x] EmptyState güncellendi ✅ (12 Ocak 2026)
- [x] StatCard bileşeni oluşturuldu ✅ (12 Ocak 2026) - Trend göstergeleri ile
- [x] PageHeader bileşeni oluşturuldu ✅ (12 Ocak 2026) - Breadcrumb ile
- [ ] Tüm liste sayfaları DataTable'a migrate edildi

### Faz 3 Kontrol Listesi
- [x] FormField wrapper oluşturuldu ✅ (12 Ocak 2026) - Label, error, helper text
- [x] FormSection bileşeni oluşturuldu ✅ (12 Ocak 2026) - Grid layout
- [x] SearchInput güncellendi ✅ (12 Ocak 2026) - Header'a entegre
- [x] Sidebar macOS tarzında yeniden tasarlandı ✅ (12 Ocak 2026) - Collapsible, nested nav
- [x] Header güncellendi ✅ (12 Ocak 2026) - Global search, user menu
- [x] Tabs bileşeni Radix ile oluşturuldu ✅ (12 Ocak 2026) - 3 varyant
- [x] Card bileşeni güncellendi ✅ (12 Ocak 2026) - CVA variants
- [ ] Tüm formlar yeni FormField ile güncellendi

### Faz 4 Kontrol Listesi
- [ ] Hover/focus/active animasyonları eklendi
- [ ] Page transition animasyonları eklendi
- [ ] Loading skeleton'lar tüm sayfalara eklendi
- [ ] Error boundary ve error states eklendi
- [ ] Dark mode tam çalışır durumda
- [ ] Accessibility audit tamamlandı
- [ ] Bundle size optimize edildi
- [ ] Performance audit tamamlandı

---

## 📚 Referanslar

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Class Variance Authority](https://cva.style/docs)
- [TanStack Table](https://tanstack.com/table/latest)
- [Sonner Toast](https://sonner.emilkowal.ski/)

---

## 📝 Değişiklik Geçmişi

| Tarih | Versiyon | Değişiklik | Yazar |
|-------|----------|------------|-------|
| 12 Ocak 2026 | 1.0.0 | İlk sürüm oluşturuldu | - |

---

> **Not:** Bu doküman, BADER Desktop uygulamasının UI geliştirme sürecinde referans olarak kullanılacaktır. Her faz tamamlandığında ilgili checklist işaretlenmeli ve gerekirse doküman güncellenmelidir.
