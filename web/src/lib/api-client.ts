/**
 * API Client - Web için Backend Bağlantısı
 * 
 * Bu dosya Desktop'taki Tauri `invoke` çağrılarının Web karşılığıdır.
 * Backend'e ulaşamazsa MOCK DATA döner.
 */

// Basit UUID üretici
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const API_BASE_URL = 'http://localhost:8000/api/v1';

// MOCK DATA GENERATORS
const mockUyeler = Array.from({ length: 25 }).map((_, i) => ({
  id: uuidv4(),
  uye_no: `2024-${100 + i}`,
  tc_no: `123456789${i.toString().padStart(2, '0')}`,
  ad_soyad: `Test Üye ${i + 1}`,
  telefon: `555 123 45 ${i.toString().padStart(2, '0')}`,
  email: `uye${i + 1}@test.com`,
  giris_tarihi: new Date().toISOString(),
  durum: i % 5 === 0 ? 'Pasif' : 'Aktif',
  uyelik_tipi: i % 3 === 0 ? 'Onursal' : 'Asil',
  is_active: true
}));

const mockGelirler = Array.from({ length: 15 }).map((_, i) => ({
  id: uuidv4(),
  tarih: new Date().toISOString(),
  aciklama: `Test Gelir İşlemi ${i + 1}`,
  tutar: (i + 1) * 1500,
  kategori: 'Aidat',
  makbuz_no: `G-${202400 + i}`
}));

const mockGiderler = Array.from({ length: 10 }).map((_, i) => ({
  id: uuidv4(),
  tarih: new Date().toISOString(),
  aciklama: `Test Gider İşlemi ${i + 1}`,
  tutar: (i + 1) * 500,
  kategori: 'Genel Gider',
  fis_no: `F-${202400 + i}`
}));

const mockStats = {
  toplam_uye: 156,
  aktif_uye: 142,
  aylik_gelir: 45200,
  aylik_gider: 12800,
  kasa_bakiyesi: 32400
};

export async function invoke<T>(command: string, args?: any): Promise<T> {
  console.log(`[Shim] invoke called: ${command}`, args);

  // 1. Önce Backend'e istek atmayı dene (İleride aktif olacak)
  /*
  try {
    const response = await fetch(`${API_BASE_URL}/${command}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
    });
    if (response.ok) return await response.json();
  } catch (e) {
    console.warn('[Shim] Backend connection failed, falling back to mock data');
  }
  */

  // 2. MOCK DATA DÖN (Şimdilik her zaman burası çalışacak)
  return new Promise((resolve) => {
    setTimeout(() => {
      switch (command) {
        case 'get_uyeler':
          resolve(mockUyeler as any);
          break;
        case 'get_borc_durumlari':
          const borclar: any = {};
          mockUyeler.forEach(u => {
            borclar[u.id] = { uye_id: u.id, toplam_borc: 1200, odenen: 0, kalan_borc: 1200 };
          });
          resolve(borclar as any);
          break;
        case 'get_gelirler':
          resolve(mockGelirler as any);
          break;
        case 'get_giderler':
          resolve(mockGiderler as any);
          break;
        case 'get_dashboard_stats':
          resolve(mockStats as any);
          break;
        case 'get_kasa_bakiyesi':
          resolve(32400 as any);
          break;
        case 'login':
          resolve({
            user: { id: '1', email: 'admin@dernek.com', full_name: 'Admin User' },
            token: 'mock-token',
            tenant: { id: '1', name: 'Demo Dernek' }
          } as any);
          break;
        default:
          console.warn(`[Shim] No mock data for command: ${command}`);
          resolve([] as any);
      }
    }, 500); // 500ms network delay simulation
  });
}
