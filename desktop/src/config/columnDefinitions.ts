import type { ColumnDefinition, ColumnPresetConfig, PageColumnConfig } from '@/types/columnConfig';
import { PAGE_KEYS } from '@/types/columnConfig';

/**
 * Tüm sayfalar için sütun tanımlamaları
 */

// ============ ÜYELER LİSTESİ ============
export const UYELER_COLUMNS: ColumnDefinition[] = [
  { id: 'uye_no', label: 'Üye No', defaultWidth: 100, minWidth: 80, required: true },
  { id: 'tc_no', label: 'TC No', defaultWidth: 130, minWidth: 110 },
  { id: 'ad_soyad', label: 'Ad Soyad', defaultWidth: 200, minWidth: 150, required: true, sortable: true },
  { id: 'uyelik_tipi', label: 'Üyelik Tipi', defaultWidth: 120, minWidth: 100 },
  { id: 'telefon', label: 'Telefon', defaultWidth: 150, minWidth: 120 },
  { id: 'email', label: 'E-posta', defaultWidth: 200, minWidth: 150 },
  { id: 'giris_tarihi', label: 'Giriş Tarihi', defaultWidth: 130, minWidth: 110, sortable: true },
  { id: 'kalan_borc', label: 'Kalan Borç', defaultWidth: 150, minWidth: 120, required: true, sortable: true },
  { id: 'durum', label: 'Durum', defaultWidth: 100, minWidth: 80, required: true },
  { id: 'actions', label: 'İşlemler', defaultWidth: 120, minWidth: 100, required: true },
];

export const UYELER_PRESETS: ColumnPresetConfig[] = [
  {
    name: 'default',
    label: 'Varsayılan',
    description: 'Standart görünüm',
    visibleColumns: ['uye_no', 'tc_no', 'ad_soyad', 'uyelik_tipi', 'telefon', 'kalan_borc', 'durum', 'actions'],
  },
  {
    name: 'minimal',
    label: 'Minimal',
    description: 'Sadece temel bilgiler',
    visibleColumns: ['uye_no', 'ad_soyad', 'telefon', 'kalan_borc', 'durum', 'actions'],
  },
  {
    name: 'full',
    label: 'Tam Görünüm',
    description: 'Tüm sütunlar',
    visibleColumns: UYELER_COLUMNS.map(c => c.id),
  },
  {
    name: 'financial',
    label: 'Mali Odaklı',
    description: 'Borç durumu odaklı',
    visibleColumns: ['uye_no', 'ad_soyad', 'telefon', 'kalan_borc', 'durum', 'actions'],
  },
];

export const UYELER_PAGE_CONFIG: PageColumnConfig = {
  pageKey: PAGE_KEYS.UYELER_LIST,
  defaultColumns: UYELER_COLUMNS,
  defaultVisible: UYELER_PRESETS[0].visibleColumns,
};

// ============ AİDAT TAKİP LİSTESİ ============
export const AIDAT_TAKIP_COLUMNS: ColumnDefinition[] = [
  { id: 'uye_ad_soyad', label: 'Üye', defaultWidth: 200, minWidth: 150, required: true, sortable: true },
  { id: 'yil', label: 'Yıl', defaultWidth: 80, minWidth: 70, required: true, sortable: true },
  { id: 'tutar', label: 'Tutar', defaultWidth: 120, minWidth: 100, required: true, sortable: true },
  { id: 'odenen_tutar', label: 'Ödenen', defaultWidth: 120, minWidth: 100, required: true, sortable: true },
  { id: 'kalan_tutar', label: 'Kalan', defaultWidth: 120, minWidth: 100, required: true, sortable: true },
  { id: 'son_odeme_tarihi', label: 'Son Ödeme', defaultWidth: 130, minWidth: 110 },
  { id: 'durum', label: 'Durum', defaultWidth: 120, minWidth: 100, required: true },
  { id: 'actions', label: 'İşlem', defaultWidth: 150, minWidth: 120, required: true },
];

export const AIDAT_TAKIP_PRESETS: ColumnPresetConfig[] = [
  {
    name: 'default',
    label: 'Varsayılan',
    description: 'Standart görünüm',
    visibleColumns: AIDAT_TAKIP_COLUMNS.map(c => c.id),
  },
  {
    name: 'minimal',
    label: 'Minimal',
    description: 'Sadece temel bilgiler',
    visibleColumns: ['uye_ad_soyad', 'yil', 'kalan_tutar', 'durum', 'actions'],
  },
  {
    name: 'payment_focused',
    label: 'Ödeme Odaklı',
    description: 'Ödeme durumu odaklı',
    visibleColumns: ['uye_ad_soyad', 'yil', 'tutar', 'odenen_tutar', 'kalan_tutar', 'durum', 'actions'],
  },
];

export const AIDAT_TAKIP_PAGE_CONFIG: PageColumnConfig = {
  pageKey: PAGE_KEYS.AIDAT_TAKIP_LIST,
  defaultColumns: AIDAT_TAKIP_COLUMNS,
  defaultVisible: AIDAT_TAKIP_PRESETS[0].visibleColumns,
};

// ============ GELİRLER LİSTESİ ============
export const GELIRLER_COLUMNS: ColumnDefinition[] = [
  { id: 'tarih', label: 'Tarih', defaultWidth: 130, minWidth: 110, required: true, sortable: true },
  { id: 'tutar', label: 'Tutar', defaultWidth: 130, minWidth: 110, required: true, sortable: true },
  { id: 'aciklama', label: 'Açıklama', defaultWidth: 250, minWidth: 200, required: true },
  { id: 'makbuz_no', label: 'Makbuz No', defaultWidth: 140, minWidth: 120 },
  { id: 'uye', label: 'Üye', defaultWidth: 120, minWidth: 100 },
  { id: 'aidat', label: 'Aidat', defaultWidth: 100, minWidth: 80 },
  { id: 'actions', label: 'İşlemler', defaultWidth: 120, minWidth: 100, required: true },
];

export const GELIRLER_PRESETS: ColumnPresetConfig[] = [
  {
    name: 'default',
    label: 'Varsayılan',
    description: 'Standart görünüm',
    visibleColumns: GELIRLER_COLUMNS.map(c => c.id),
  },
  {
    name: 'minimal',
    label: 'Minimal',
    description: 'Sadece temel bilgiler',
    visibleColumns: ['tarih', 'tutar', 'aciklama', 'actions'],
  },
  {
    name: 'detailed',
    label: 'Detaylı',
    description: 'Tüm bilgiler',
    visibleColumns: GELIRLER_COLUMNS.map(c => c.id),
  },
];

export const GELIRLER_PAGE_CONFIG: PageColumnConfig = {
  pageKey: PAGE_KEYS.GELIRLER_LIST,
  defaultColumns: GELIRLER_COLUMNS,
  defaultVisible: GELIRLER_PRESETS[0].visibleColumns,
};

// ============ EXPORT ============
export const PAGE_COLUMN_CONFIGS: Record<string, PageColumnConfig> = {
  [PAGE_KEYS.UYELER_LIST]: UYELER_PAGE_CONFIG,
  [PAGE_KEYS.AIDAT_TAKIP_LIST]: AIDAT_TAKIP_PAGE_CONFIG,
  [PAGE_KEYS.GELIRLER_LIST]: GELIRLER_PAGE_CONFIG,
};

export const PAGE_PRESETS: Record<string, ColumnPresetConfig[]> = {
  [PAGE_KEYS.UYELER_LIST]: UYELER_PRESETS,
  [PAGE_KEYS.AIDAT_TAKIP_LIST]: AIDAT_TAKIP_PRESETS,
  [PAGE_KEYS.GELIRLER_LIST]: GELIRLER_PRESETS,
};
