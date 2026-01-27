/**
 * Validators Utilities
 * TC Kimlik, Telefon, Email ve diğer doğrulama fonksiyonları
 */

/**
 * TC Kimlik Numarası Doğrulama (Mod11 Algoritması)
 * @param tcNo - 11 haneli TC kimlik numarası
 * @returns Geçerli ise true, değilse false
 */
export function validateTcNo(tcNo: string): boolean {
  // Temel kontroller
  if (!tcNo || !/^\d{11}$/.test(tcNo)) {
    return false;
  }

  // İlk hane 0 olamaz
  if (tcNo[0] === '0') {
    return false;
  }

  const digits = tcNo.split('').map(Number);

  // 10. hane kontrolü: ((1, 3, 5, 7, 9. haneler toplamı * 7) - (2, 4, 6, 8. haneler toplamı)) mod 10
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const digit10 = (oddSum * 7 - evenSum) % 10;
  
  // Negatif mod düzeltmesi
  const correctedDigit10 = digit10 < 0 ? digit10 + 10 : digit10;

  if (correctedDigit10 !== digits[9]) {
    return false;
  }

  // 11. hane kontrolü: (ilk 10 hanenin toplamı) mod 10
  const sumFirst10 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  const digit11 = sumFirst10 % 10;

  return digit11 === digits[10];
}

/**
 * TC Kimlik Numarası Doğrulama Hatası Mesajı
 * @param tcNo - TC kimlik numarası
 * @returns Hata mesajı veya boş string
 */
export function getTcNoError(tcNo: string): string {
  if (!tcNo) {
    return 'TC kimlik numarası zorunludur';
  }
  if (!/^\d+$/.test(tcNo)) {
    return 'TC kimlik numarası sadece rakamlardan oluşmalıdır';
  }
  if (tcNo.length !== 11) {
    return 'TC kimlik numarası 11 haneli olmalıdır';
  }
  if (tcNo[0] === '0') {
    return 'TC kimlik numarası 0 ile başlayamaz';
  }
  if (!validateTcNo(tcNo)) {
    return 'Geçersiz TC kimlik numarası';
  }
  return '';
}

/**
 * Telefon Numarası Doğrulama (Türkiye formatı)
 * Kabul edilen formatlar: 
 * - 5XXXXXXXXX (10 hane)
 * - 05XXXXXXXXX (11 hane)
 * - +905XXXXXXXXX (13 hane)
 * - 905XXXXXXXXX (12 hane)
 * @param telefon - Telefon numarası
 * @returns Geçerli ise true, değilse false
 */
export function validateTelefon(telefon: string): boolean {
  if (!telefon) return true; // Opsiyonel alan
  
  // Boşluk, tire ve parantezleri temizle
  const cleaned = telefon.replace(/[\s\-\(\)]/g, '');
  
  // Türkiye GSM formatları
  const patterns = [
    /^5\d{9}$/,           // 5XXXXXXXXX
    /^05\d{9}$/,          // 05XXXXXXXXX
    /^\+905\d{9}$/,       // +905XXXXXXXXX
    /^905\d{9}$/,         // 905XXXXXXXXX
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
}

/**
 * Telefon Numarası Hata Mesajı
 * @param telefon - Telefon numarası
 * @returns Hata mesajı veya boş string
 */
export function getTelefonError(telefon: string): string {
  if (!telefon) return ''; // Opsiyonel
  if (!validateTelefon(telefon)) {
    return 'Geçerli bir telefon numarası girin (örn: 5XX XXX XX XX)';
  }
  return '';
}

/**
 * Email Doğrulama
 * @param email - Email adresi
 * @returns Geçerli ise true, değilse false
 */
export function validateEmail(email: string): boolean {
  if (!email) return true; // Opsiyonel alan
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Email Hata Mesajı
 * @param email - Email adresi
 * @returns Hata mesajı veya boş string
 */
export function getEmailError(email: string): string {
  if (!email) return ''; // Opsiyonel
  if (!validateEmail(email)) {
    return 'Geçerli bir email adresi girin';
  }
  return '';
}

/**
 * Tutar Doğrulama (Pozitif sayı)
 * @param tutar - Tutar değeri
 * @returns Geçerli ise true, değilse false
 */
export function validateTutar(tutar: number | string): boolean {
  const numericValue = typeof tutar === 'string' ? parseFloat(tutar) : tutar;
  return !isNaN(numericValue) && numericValue >= 0;
}

/**
 * Tutar Hata Mesajı
 * @param tutar - Tutar değeri
 * @param zorunlu - Zorunlu alan mı
 * @returns Hata mesajı veya boş string
 */
export function getTutarError(tutar: number | string, zorunlu = true): string {
  if (tutar === '' || tutar === undefined || tutar === null) {
    return zorunlu ? 'Tutar zorunludur' : '';
  }
  if (!validateTutar(tutar)) {
    return 'Geçerli bir tutar girin';
  }
  return '';
}

/**
 * IBAN Doğrulama (Türkiye formatı)
 * @param iban - IBAN numarası
 * @returns Geçerli ise true, değilse false
 */
export function validateIban(iban: string): boolean {
  if (!iban) return true; // Opsiyonel alan
  
  // Boşlukları temizle
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  
  // Türkiye IBAN formatı: TR + 2 kontrol hanesi + 22 hane = 26 karakter
  if (!/^TR\d{24}$/.test(cleaned)) {
    return false;
  }
  
  // IBAN mod 97 kontrolü
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  const numericIban = rearranged.replace(/[A-Z]/g, (char) => 
    (char.charCodeAt(0) - 55).toString()
  );
  
  // Büyük sayı mod 97 hesaplama
  let remainder = 0;
  for (let i = 0; i < numericIban.length; i++) {
    remainder = parseInt(remainder.toString() + numericIban[i]) % 97;
  }
  
  return remainder === 1;
}

/**
 * Zorunlu Alan Kontrolü
 * @param value - Kontrol edilecek değer
 * @param fieldName - Alan adı (hata mesajı için)
 * @returns Hata mesajı veya boş string
 */
export function getRequiredError(value: string | number | null | undefined, fieldName: string): string {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} zorunludur`;
  }
  return '';
}
