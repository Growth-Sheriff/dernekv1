/**
 * BADER Desktop - Merkezi Konfigürasyon
 * 
 * Tüm API URL'leri buradan okunur. IP değişikliği sadece .env dosyasından yapılır.
 * Başka hiçbir dosyada hardcoded IP bulunmamalıdır.
 */

// Tek kaynak: .env dosyası
export const API_BASE_URL = import.meta.env.VITE_API_URL as string;
export const API_BASE = import.meta.env.VITE_API_BASE as string;

// Validasyon - env değişkenleri yoksa uyar
if (!API_BASE_URL) {
  console.error('❌ VITE_API_URL tanımlı değil! .env dosyasını kontrol edin.');
}
if (!API_BASE) {
  console.error('❌ VITE_API_BASE tanımlı değil! .env dosyasını kontrol edin.');
}
