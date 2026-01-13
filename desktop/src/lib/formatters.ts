/**
 * Formatters Utilities
 * Tarih, para birimi ve diğer formatlama fonksiyonları
 */

/**
 * Tarih formatı seçenekleri
 */
export type DateFormatType = 'short' | 'long' | 'full' | 'iso' | 'input';

/**
 * Tarihi Türkçe formatla
 * @param date - Date objesi veya tarih string'i
 * @param format - Format tipi
 * @returns Formatlanmış tarih string'i
 */
export function formatDate(date: Date | string | null | undefined, format: DateFormatType = 'short'): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '-';
  
  switch (format) {
    case 'short':
      // 13.01.2026
      return dateObj.toLocaleDateString('tr-TR');
    
    case 'long':
      // 13 Ocak 2026
      return dateObj.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    
    case 'full':
      // 13 Ocak 2026 Salı
      return dateObj.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long',
      });
    
    case 'iso':
      // 2026-01-13
      return dateObj.toISOString().split('T')[0];
    
    case 'input':
      // 2026-01-13 (HTML input için)
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    
    default:
      return dateObj.toLocaleDateString('tr-TR');
  }
}

/**
 * Tarih ve saat formatla
 * @param date - Date objesi veya tarih string'i
 * @returns Formatlanmış tarih ve saat string'i
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '-';
  
  return dateObj.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Para birimi formatla (TRY)
 * @param amount - Tutar
 * @param showCurrency - Para birimi gösterilsin mi
 * @returns Formatlanmış tutar string'i
 */
export function formatCurrency(amount: number | null | undefined, showCurrency = true): string {
  if (amount === null || amount === undefined) return '-';
  
  if (showCurrency) {
    return amount.toLocaleString('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  
  return amount.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Kısa para formatı (K, M, B)
 * @param amount - Tutar
 * @returns Kısa formatlanmış tutar
 */
export function formatCurrencyShort(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)}B ₺`;
  }
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M ₺`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K ₺`;
  }
  
  return `${amount.toFixed(2)} ₺`;
}

/**
 * Sayıyı formatla
 * @param value - Sayı
 * @param decimals - Ondalık hane sayısı
 * @returns Formatlanmış sayı string'i
 */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return '-';
  
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Telefon numarasını formatla
 * @param telefon - Telefon numarası
 * @returns Formatlanmış telefon (5XX XXX XX XX)
 */
export function formatTelefon(telefon: string | null | undefined): string {
  if (!telefon) return '-';
  
  // Sadece rakamları al
  const digits = telefon.replace(/\D/g, '');
  
  // Son 10 haneyi al
  const last10 = digits.slice(-10);
  
  if (last10.length !== 10) return telefon;
  
  // 5XX XXX XX XX formatı
  return `${last10.slice(0, 3)} ${last10.slice(3, 6)} ${last10.slice(6, 8)} ${last10.slice(8, 10)}`;
}

/**
 * TC Kimlik numarasını maskele
 * @param tcNo - TC kimlik numarası
 * @returns Maskelenmiş TC (XXX XXX XXX XX)
 */
export function formatTcNo(tcNo: string | null | undefined): string {
  if (!tcNo) return '-';
  
  // 11 haneli olmalı
  if (tcNo.length !== 11) return tcNo;
  
  // XXX XXX XXX XX formatı
  return `${tcNo.slice(0, 3)} ${tcNo.slice(3, 6)} ${tcNo.slice(6, 9)} ${tcNo.slice(9, 11)}`;
}

/**
 * Ay numarasını Türkçe aya çevir
 * @param ay - Ay numarası (1-12)
 * @returns Türkçe ay adı
 */
export function formatAy(ay: number): string {
  const aylar = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  
  if (ay < 1 || ay > 12) return '-';
  return aylar[ay - 1];
}

/**
 * Dönem formatla (Ay Yıl)
 * @param yil - Yıl
 * @param ay - Ay numarası
 * @returns Formatlanmış dönem (Ocak 2026)
 */
export function formatDonem(yil: number, ay: number): string {
  return `${formatAy(ay)} ${yil}`;
}

/**
 * İsmi baş harflerle kısalt
 * @param fullName - Tam isim
 * @returns Baş harfler
 */
export function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return '??';
  
  const words = fullName.trim().split(/\s+/);
  if (words.length === 0) return '??';
  
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Dosya boyutunu formatla
 * @param bytes - Byte cinsinden boyut
 * @returns Formatlanmış boyut (KB, MB, GB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Yüzde formatla
 * @param value - Değer (0-100 arası veya 0-1 arası)
 * @param isDecimal - 0-1 arası mı
 * @returns Formatlanmış yüzde
 */
export function formatPercent(value: number, isDecimal = false): string {
  const percentage = isDecimal ? value * 100 : value;
  return `%${percentage.toFixed(1)}`;
}
