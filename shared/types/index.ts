/**
 * Shared Types
 */

// Ortak tipler
export interface User {
  id: number;
  tenant_id: number;
  email: string;
  ad_soyad: string;
  rol: string;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: number;
  ad: string;
  kod: string;
  email: string;
  telefon: string;
  adres: string;
  il: string;
  ilce: string;
  vergi_no: string;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface Uye {
  id: number;
  tenant_id: number;
  ad: string;
  soyad: string;
  email: string;
  telefon: string;
  adres: string;
  uyelik_tarihi: string;
  uyelik_durumu: string;
  created_at: string;
  updated_at: string;
}

export interface Gelir {
  id: number;
  tenant_id: number;
  kasa_id: number;
  kategori: string;
  tutar: number;
  tarih: string;
  aciklama: string;
  belge_no: string;
  created_at: string;
  updated_at: string;
}

export interface Gider {
  id: number;
  tenant_id: number;
  kasa_id: number;
  kategori: string;
  tutar: number;
  tarih: string;
  aciklama: string;
  belge_no: string;
  created_at: string;
  updated_at: string;
}

export interface Kasa {
  id: number;
  tenant_id: number;
  ad: string;
  tip: string;
  bakiye: number;
  aciklama: string;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface Virman {
  id: number;
  tenant_id: number;
  kaynak_kasa_id: number;
  hedef_kasa_id: number;
  tutar: number;
  tarih: string;
  aciklama: string;
  created_at: string;
  updated_at: string;
}

export interface AidatTakip {
  id: number;
  tenant_id: number;
  uye_id: number;
  yil: number;
  ay: number;
  tutar: number;
  odeme_durumu: string;
  son_odeme_tarihi: string;
  created_at: string;
  updated_at: string;
}

export interface Etkinlik {
  id: number;
  tenant_id: number;
  baslik: string;
  etkinlik_tipi: string;
  baslangic_tarihi: string;
  bitis_tarihi: string;
  yer: string;
  aciklama: string;
  tahmini_butce: number;
  durum: string;
  created_at: string;
  updated_at: string;
}

export interface Toplanti {
  id: number;
  tenant_id: number;
  baslik: string;
  toplanti_tipi: string;
  tarih: string;
  yer: string;
  gundem: string;
  kararlar: string;
  katilimci_sayisi: number;
  durum: string;
  created_at: string;
  updated_at: string;
}

export interface Belge {
  id: number;
  tenant_id: number;
  baslik: string;
  dosya_yolu: string;
  dosya_tipi: string;
  boyut: number;
  kategori: string;
  created_at: string;
  updated_at: string;
}

export interface ButcePlani {
  id: number;
  tenant_id: number;
  yil: number;
  kategori: string;
  planlanan_gelir: number;
  planlanan_gider: number;
  gerceklesen_gelir: number;
  gerceklesen_gider: number;
  notlar: string;
  created_at: string;
  updated_at: string;
}

// API yanıt tipleri
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
