/**
 * Sütun Özelleştirme Sistem Tipleri
 *
 * Her liste sayfası için sütun görünürlüğü, sıralaması ve genişliklerini yönetir
 */

export interface ColumnConfig {
  visible: string[];      // Görünür sütunların ID'leri
  order: string[];        // Sütun sıralaması (tüm sütunlar)
  widths?: Record<string, number>; // Sütun genişlikleri (px)
}

export interface ColumnDefinition {
  id: string;             // Benzersiz sütun ID'si
  label: string;          // Kullanıcıya gösterilecek isim
  defaultWidth?: number;  // Varsayılan genişlik (px)
  minWidth?: number;      // Minimum genişlik (px)
  required?: boolean;     // Zorunlu sütun (gizlenemez)
  sortable?: boolean;     // Sıralama yapılabilir mi?
}

export interface PageColumnConfig {
  pageKey: string;        // Sayfa tanımlayıcı (örn: 'uyeler_list')
  defaultColumns: ColumnDefinition[]; // Sayfa için tüm sütun tanımları
  defaultVisible: string[]; // Varsayılan görünür sütunlar
}

// Preset görünüm tipleri
export type ColumnPreset = 'default' | 'minimal' | 'full' | 'custom';

export interface ColumnPresetConfig {
  name: string;
  label: string;
  description: string;
  visibleColumns: string[];
}

// Backend'den gelen response
export interface SaveColumnPreferencesResponse {
  success: boolean;
  message: string;
}

// Page key constants
export const PAGE_KEYS = {
  UYELER_LIST: 'uyeler_list',
  AIDAT_TAKIP_LIST: 'aidat_takip_list',
  GELIRLER_LIST: 'gelirler_list',
  GIDERLER_LIST: 'giderler_list',
  DEMIRBASLAR_LIST: 'demirbaslar_list',
  CARILER_LIST: 'cariler_list',
} as const;

export type PageKey = typeof PAGE_KEYS[keyof typeof PAGE_KEYS];
