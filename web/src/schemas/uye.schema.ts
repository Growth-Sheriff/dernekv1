import * as z from 'zod';
import { validateTcNo, validateTelefon } from '@/lib/validators';

/**
 * Üye Form Şeması
 * 
 * Tüm üye CRUD işlemlerinde kullanılır.
 * TC Kimlik No ve Telefon için özel validatörler içerir.
 */
export const uyeSchema = z.object({
  // Temel Bilgiler
  uye_no: z.string().optional(),
  tc_no: z.string()
    .length(11, 'TC No 11 haneli olmalı')
    .refine((val) => validateTcNo(val), { message: 'Geçersiz TC kimlik numarası' }),
  ad: z.string().min(2, 'Ad en az 2 karakter olmalı'),
  soyad: z.string().min(2, 'Soyad en az 2 karakter olmalı'),
  uyelik_tipi: z.enum(['Asil', 'Onursal', 'Fahri', 'Kurumsal']).optional(),
  durum: z.enum(['Aktif', 'Pasif', 'Ayrıldı']),
  giris_tarihi: z.string().min(1, 'Giriş tarihi zorunlu'),
  
  // İletişim
  telefon: z.string()
    .optional()
    .refine((val) => !val || validateTelefon(val), { message: 'Geçerli bir telefon numarası girin' }),
  telefon2: z.string()
    .optional()
    .refine((val) => !val || validateTelefon(val), { message: 'Geçerli bir telefon numarası girin' }),
  email: z.string().email('Geçerli email giriniz').optional().or(z.literal('')),
  
  // Kişisel
  cinsiyet: z.enum(['Erkek', 'Kadın', '']).optional(),
  dogum_tarihi: z.string().optional(),
  dogum_yeri: z.string().optional(),
  kan_grubu: z.string().optional(),
  aile_durumu: z.enum(['Bekar', 'Evli', 'Dul', '']).optional(),
  cocuk_sayisi: z.number().min(0).optional(),
  
  // Meslek
  egitim_durumu: z.string().optional(),
  meslek: z.string().optional(),
  is_yeri: z.string().optional(),
  
  // Adres
  il: z.string().optional(),
  ilce: z.string().optional(),
  mahalle: z.string().optional(),
  adres: z.string().optional(),
  posta_kodu: z.string().optional(),
  
  // Aidat
  ozel_aidat_tutari: z.number().optional(),
  aidat_indirimi_yuzde: z.number().min(0).max(100).optional(),
  
  // Referans
  referans_uye_id: z.number().optional(),
  
  // Notlar
  notlar: z.string().optional(),
});

export type UyeForm = z.infer<typeof uyeSchema>;

/**
 * Aile Üyesi Form Şeması
 */
export const aileUyesiSchema = z.object({
  yakinlik: z.string().min(1, 'Yakınlık belirtilmeli'),
  ad_soyad: z.string().min(2, 'Ad soyad en az 2 karakter olmalı'),
  tc_no: z.string()
    .length(11, 'TC No 11 haneli olmalı')
    .refine((val) => validateTcNo(val), { message: 'Geçersiz TC kimlik numarası' })
    .optional()
    .or(z.literal('')),
  telefon: z.string()
    .optional()
    .refine((val) => !val || validateTelefon(val), { message: 'Geçerli bir telefon numarası girin' }),
  dogum_tarihi: z.string().optional(),
  cinsiyet: z.enum(['Erkek', 'Kadın', '']).optional(),
  meslek: z.string().optional(),
  is_yeri: z.string().optional(),
  egitim_durumu: z.string().optional(),
  email: z.string().email('Geçerli email giriniz').optional().or(z.literal('')),
  kan_grubu: z.string().optional(),
  ozel_durum: z.string().optional(),
  notlar: z.string().optional(),
});

export type AileUyesiForm = z.infer<typeof aileUyesiSchema>;
