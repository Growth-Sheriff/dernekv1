/**
 * Uygulama Sabitleri
 * Tüm enum değerleri, sabit listeler ve konfigürasyonlar
 */

/**
 * Üye Durumları
 */
export const UYE_DURUMLARI = {
  AKTIF: 'Aktif',
  PASIF: 'Pasif',
  ASKIDA: 'Askıda',
  AYRILDI: 'Ayrıldı',
} as const;

export type UyeDurum = typeof UYE_DURUMLARI[keyof typeof UYE_DURUMLARI];

export const UYE_DURUM_LISTESI = [
  { value: UYE_DURUMLARI.AKTIF, label: 'Aktif', color: 'green' },
  { value: UYE_DURUMLARI.PASIF, label: 'Pasif', color: 'gray' },
  { value: UYE_DURUMLARI.ASKIDA, label: 'Askıda', color: 'yellow' },
  { value: UYE_DURUMLARI.AYRILDI, label: 'Ayrıldı', color: 'red' },
];

/**
 * Aidat Durumları
 */
export const AIDAT_DURUMLARI = {
  BEKLIYOR: 'bekliyor',
  ODENDI: 'odendi',
  GECIKTI: 'gecikti',
  KISMI: 'kismi',
  IPTAL: 'iptal',
} as const;

export type AidatDurum = typeof AIDAT_DURUMLARI[keyof typeof AIDAT_DURUMLARI];

export const AIDAT_DURUM_LISTESI = [
  { value: AIDAT_DURUMLARI.BEKLIYOR, label: 'Bekliyor', color: 'yellow' },
  { value: AIDAT_DURUMLARI.ODENDI, label: 'Ödendi', color: 'green' },
  { value: AIDAT_DURUMLARI.GECIKTI, label: 'Gecikti', color: 'red' },
  { value: AIDAT_DURUMLARI.KISMI, label: 'Kısmi Ödendi', color: 'orange' },
  { value: AIDAT_DURUMLARI.IPTAL, label: 'İptal', color: 'gray' },
];

/**
 * Vadeli İşlem Durumları
 */
export const VADELI_ISLEM_DURUMLARI = {
  BEKLIYOR: 'Bekliyor',
  GERCEKLESTI: 'Gerçekleşti',
  IPTAL: 'İptal',
  GECIKTI: 'Gecikti',
} as const;

export type VadeliIslemDurum = typeof VADELI_ISLEM_DURUMLARI[keyof typeof VADELI_ISLEM_DURUMLARI];

export const VADELI_ISLEM_DURUM_LISTESI = [
  { value: VADELI_ISLEM_DURUMLARI.BEKLIYOR, label: 'Bekliyor', color: 'yellow' },
  { value: VADELI_ISLEM_DURUMLARI.GERCEKLESTI, label: 'Gerçekleşti', color: 'green' },
  { value: VADELI_ISLEM_DURUMLARI.IPTAL, label: 'İptal', color: 'gray' },
  { value: VADELI_ISLEM_DURUMLARI.GECIKTI, label: 'Gecikti', color: 'red' },
];

/**
 * Kasa Türleri
 */
export const KASA_TURLERI = {
  NAKIT: 'nakit',
  BANKA: 'banka',
  KREDI_KARTI: 'kredi_karti',
  DIGER: 'diger',
} as const;

export type KasaTur = typeof KASA_TURLERI[keyof typeof KASA_TURLERI];

export const KASA_TUR_LISTESI = [
  { value: KASA_TURLERI.NAKIT, label: 'Nakit' },
  { value: KASA_TURLERI.BANKA, label: 'Banka' },
  { value: KASA_TURLERI.KREDI_KARTI, label: 'Kredi Kartı' },
  { value: KASA_TURLERI.DIGER, label: 'Diğer' },
];

/**
 * Cari Türleri
 */
export const CARI_TURLERI = {
  MUSTERI: 'musteri',
  TEDARIKCI: 'tedarikci',
  PERSONEL: 'personel',
  DIGER: 'diger',
} as const;

export type CariTur = typeof CARI_TURLERI[keyof typeof CARI_TURLERI];

export const CARI_TUR_LISTESI = [
  { value: CARI_TURLERI.MUSTERI, label: 'Müşteri' },
  { value: CARI_TURLERI.TEDARIKCI, label: 'Tedarikçi' },
  { value: CARI_TURLERI.PERSONEL, label: 'Personel' },
  { value: CARI_TURLERI.DIGER, label: 'Diğer' },
];

/**
 * Aylar
 */
export const AYLAR = [
  { value: 1, label: 'Ocak', shortLabel: 'Oca' },
  { value: 2, label: 'Şubat', shortLabel: 'Şub' },
  { value: 3, label: 'Mart', shortLabel: 'Mar' },
  { value: 4, label: 'Nisan', shortLabel: 'Nis' },
  { value: 5, label: 'Mayıs', shortLabel: 'May' },
  { value: 6, label: 'Haziran', shortLabel: 'Haz' },
  { value: 7, label: 'Temmuz', shortLabel: 'Tem' },
  { value: 8, label: 'Ağustos', shortLabel: 'Ağu' },
  { value: 9, label: 'Eylül', shortLabel: 'Eyl' },
  { value: 10, label: 'Ekim', shortLabel: 'Eki' },
  { value: 11, label: 'Kasım', shortLabel: 'Kas' },
  { value: 12, label: 'Aralık', shortLabel: 'Ara' },
] as const;

/**
 * Cinsiyet
 */
export const CINSIYETLER = {
  ERKEK: 'Erkek',
  KADIN: 'Kadın',
} as const;

export const CINSIYET_LISTESI = [
  { value: CINSIYETLER.ERKEK, label: 'Erkek' },
  { value: CINSIYETLER.KADIN, label: 'Kadın' },
];

/**
 * Kan Grupları
 */
export const KAN_GRUPLARI = [
  { value: 'A+', label: 'A Rh+' },
  { value: 'A-', label: 'A Rh-' },
  { value: 'B+', label: 'B Rh+' },
  { value: 'B-', label: 'B Rh-' },
  { value: 'AB+', label: 'AB Rh+' },
  { value: 'AB-', label: 'AB Rh-' },
  { value: '0+', label: '0 Rh+' },
  { value: '0-', label: '0 Rh-' },
];

/**
 * Eğitim Durumları
 */
export const EGITIM_DURUMLARI = [
  { value: 'ilkokul', label: 'İlkokul' },
  { value: 'ortaokul', label: 'Ortaokul' },
  { value: 'lise', label: 'Lise' },
  { value: 'onlisans', label: 'Ön Lisans' },
  { value: 'lisans', label: 'Lisans' },
  { value: 'yukseklisans', label: 'Yüksek Lisans' },
  { value: 'doktora', label: 'Doktora' },
];

/**
 * Aile Yakınlık Tipleri
 */
export const YAKINLIK_TIPLERI = [
  { value: 'Eş', label: 'Eş' },
  { value: 'Çocuk', label: 'Çocuk' },
  { value: 'Anne', label: 'Anne' },
  { value: 'Baba', label: 'Baba' },
  { value: 'Kardeş', label: 'Kardeş' },
  { value: 'Diğer', label: 'Diğer' },
];

/**
 * Pagination varsayılan değerleri
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  MAX_PAGE_SIZE: 1000,
} as const;

/**
 * Gider Türleri
 */
export const GIDER_TURLERI = {
  GENEL: 'genel',
  PERSONEL: 'personel',
  KIRA: 'kira',
  FATURA: 'fatura',
  MALZEME: 'malzeme',
  DEMIRBAS: 'demirbas',
  ORGANIZASYON: 'organizasyon',
  BAKIM_ONARIM: 'bakim_onarim',
  DIGER: 'diger',
} as const;

export type GiderTur = typeof GIDER_TURLERI[keyof typeof GIDER_TURLERI];

export const GIDER_TUR_LISTESI = [
  { value: GIDER_TURLERI.GENEL, label: 'Genel Gider' },
  { value: GIDER_TURLERI.PERSONEL, label: 'Personel Gideri' },
  { value: GIDER_TURLERI.KIRA, label: 'Kira' },
  { value: GIDER_TURLERI.FATURA, label: 'Fatura (Elektrik, Su, Doğalgaz)' },
  { value: GIDER_TURLERI.MALZEME, label: 'Malzeme Alımı' },
  { value: GIDER_TURLERI.DEMIRBAS, label: 'Demirbaş Alımı' },
  { value: GIDER_TURLERI.ORGANIZASYON, label: 'Organizasyon/Etkinlik' },
  { value: GIDER_TURLERI.BAKIM_ONARIM, label: 'Bakım/Onarım' },
  { value: GIDER_TURLERI.DIGER, label: 'Diğer' },
];

/**
 * Demirbaş Kategorileri
 */
export const DEMIRBAS_KATEGORILERI = {
  MOBILYA: 'mobilya',
  ELEKTRONIK: 'elektronik',
  ARAC: 'arac',
  MAKINE: 'makine',
  OFIS_MALZEMESI: 'ofis_malzemesi',
  MUTFAK: 'mutfak',
  SPOR_EKIPMANI: 'spor_ekipmani',
  DIGER: 'diger',
} as const;

export type DemirbasKategori = typeof DEMIRBAS_KATEGORILERI[keyof typeof DEMIRBAS_KATEGORILERI];

export const DEMIRBAS_KATEGORI_LISTESI = [
  { value: DEMIRBAS_KATEGORILERI.MOBILYA, label: 'Mobilya' },
  { value: DEMIRBAS_KATEGORILERI.ELEKTRONIK, label: 'Elektronik' },
  { value: DEMIRBAS_KATEGORILERI.ARAC, label: 'Araç' },
  { value: DEMIRBAS_KATEGORILERI.MAKINE, label: 'Makine/Teçhizat' },
  { value: DEMIRBAS_KATEGORILERI.OFIS_MALZEMESI, label: 'Ofis Malzemesi' },
  { value: DEMIRBAS_KATEGORILERI.MUTFAK, label: 'Mutfak Eşyası' },
  { value: DEMIRBAS_KATEGORILERI.SPOR_EKIPMANI, label: 'Spor Ekipmanı' },
  { value: DEMIRBAS_KATEGORILERI.DIGER, label: 'Diğer' },
];

/**
 * Demirbaş Durumları
 */
export const DEMIRBAS_DURUMLARI = {
  AKTIF: 'aktif',
  ARIZALI: 'arizali',
  BAKIMDA: 'bakimda',
  KULLANIM_DISI: 'kullanim_disi',
  SATILDI: 'satildi',
  HURDA: 'hurda',
} as const;

export type DemirbasDurum = typeof DEMIRBAS_DURUMLARI[keyof typeof DEMIRBAS_DURUMLARI];

export const DEMIRBAS_DURUM_LISTESI = [
  { value: DEMIRBAS_DURUMLARI.AKTIF, label: 'Aktif', color: 'green' },
  { value: DEMIRBAS_DURUMLARI.ARIZALI, label: 'Arızalı', color: 'red' },
  { value: DEMIRBAS_DURUMLARI.BAKIMDA, label: 'Bakımda', color: 'yellow' },
  { value: DEMIRBAS_DURUMLARI.KULLANIM_DISI, label: 'Kullanım Dışı', color: 'gray' },
  { value: DEMIRBAS_DURUMLARI.SATILDI, label: 'Satıldı', color: 'blue' },
  { value: DEMIRBAS_DURUMLARI.HURDA, label: 'Hurda', color: 'gray' },
];

/**
 * API Timeout değerleri (ms)
 */
export const TIMEOUTS = {
  DEFAULT: 30000,
  LONG: 60000,
  SHORT: 10000,
} as const;

/**
 * Renk paletleri (Badge ve UI için)
 */
export const STATUS_COLORS = {
  success: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  error: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  info: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  neutral: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
} as const;

/**
 * Durum rengini al
 */
export function getStatusColor(status: string): typeof STATUS_COLORS[keyof typeof STATUS_COLORS] {
  const statusMap: Record<string, keyof typeof STATUS_COLORS> = {
    // Başarılı durumlar
    'Aktif': 'success',
    'odendi': 'success',
    'Ödendi': 'success',
    'Gerçekleşti': 'success',
    'Tamamlandı': 'success',
    
    // Uyarı durumları
    'Askıda': 'warning',
    'bekliyor': 'warning',
    'Bekliyor': 'warning',
    'Beklemede': 'warning',
    'kismi': 'warning',
    'Kısmi Ödendi': 'warning',
    
    // Hata durumları
    'Pasif': 'error',
    'Ayrıldı': 'error',
    'gecikti': 'error',
    'Gecikti': 'error',
    
    // Nötr durumlar
    'iptal': 'neutral',
    'İptal': 'neutral',
  };
  
  return STATUS_COLORS[statusMap[status] || 'neutral'];
}
