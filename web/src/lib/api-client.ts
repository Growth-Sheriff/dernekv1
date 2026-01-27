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

// Command Mapping: Desktop komutlarını Backend Endpointlerine çevirir
const COMMAND_MAP: Record<string, { method: string, url: string }> = {
  'login': { method: 'POST', url: '/auth/token' }, // Özel işlem gerekiyor (Form Data)
  'get_uyeler': { method: 'GET', url: '/members' },
  // Diğerleri için şimdilik map yok, mock dönecek
};

// Token helper
const getToken = () => {
  try {
    const store = localStorage.getItem('auth-storage');
    if (store) {
      const parsed = JSON.parse(store);
      return parsed.state?.token;
    }
  } catch (e) {
    return null;
  }
  return null;
};

export async function invoke<T>(command: string, args?: any): Promise<T> {
  // console.log(`[Shim] invoke called: ${command}`, args);

  // 1. Backend'e bağlanmayı dene (Eğer mapping varsa)
  if (COMMAND_MAP[command]) {
    try {
      const endpoint = COMMAND_MAP[command];
      const url = `${API_BASE_URL}${endpoint.url}`;
      const token = getToken();

      let options: RequestInit = {
        method: endpoint.method,
        headers: {}
      };

      if (token) {
        (options.headers as any)['Authorization'] = `Bearer ${token}`;
      }

      // LOGIN ÖZEL DURUM: Form Data gönderilmeli
      if (command === 'login') {
        const formData = new FormData();
        formData.append('username', args.email); // Backend username bekliyor
        formData.append('password', args.password);
        options.body = formData;
      } else {
        (options.headers as any)['Content-Type'] = 'application/json';
        if (args) {
          // GET isteklerinde query params
          if (endpoint.method === 'GET') {
            // Basit query params dönüşümü (args objesini url'e ekle)
            // Şimdilik pas geçiyorum, backend zaten her şeyi döndürüyor
          } else {
            options.body = JSON.stringify(args);
          }
        }
      }

      const response = await fetch(url, options);

      if (response.ok) {
        const data = await response.json();
        // LOGIN RESPONSE ADAPTASYONU (Backend yapısı -> Frontend'in beklediği yapı)
        if (command === 'login') {
          return {
            user: data.user,
            token: data.access_token,
            tenant: data.tenant
          } as any;
        }
        return data;
      } else {
        // 401 Unauthorized ise login hatasıdır
        if (response.status === 401 && command === 'login') {
          throw new Error('Giriş başarısız');
        }
        if (response.status === 401) {
          console.warn('Token geçersiz, logout yapılmalı?');
        }
      }
    } catch (e) {
      console.warn(`[Shim] Backend request failed for ${command}:`, e);
      if (command === 'login') throw e; // Login hatasını yutma, kullanıcıya göster
    }
  }


  // 2. MOCK DATA DÖN (Backend başarısızsa veya map yoksa)
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
          // Mock login (Fallback)
          if (args?.email?.includes('admin')) {
            resolve({
              user: { id: '1', email: args.email, full_name: 'Mock Admin', role: 'admin' },
              token: 'mock-token',
              tenant: { id: '1', name: 'Mock Dernek' }
            } as any);
          } else {
            // Hata fırlat (Promise reject)
            // resolve(null as any); 
          }
          break;
        default:
          //   console.warn(`[Shim] No mock data for command: ${command}`);
          resolve([] as any);
      }
    }, 500);
  });
}
