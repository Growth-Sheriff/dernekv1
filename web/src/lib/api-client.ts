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

const API_BASE_URL = 'http://157.90.154.48:8000/api/v1';

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
  'login': { method: 'POST', url: '/auth/token' },
  'get_dashboard_stats': { method: 'GET', url: '/dashboard/stats' },
  'get_uyeler': { method: 'GET', url: '/members' },
  'get_uye_borc_durumlari': { method: 'POST', url: '/members/debts' },
  'get_gelirler': { method: 'GET', url: '/gelirler' },
  'create_gelir': { method: 'POST', url: '/gelirler' },
  'delete_gelir': { method: 'DELETE', url: '/gelirler/:id' },
  'get_giderler': { method: 'GET', url: '/giderler' },
  'create_gider': { method: 'POST', url: '/giderler' },
  'delete_gider': { method: 'DELETE', url: '/giderler/:id' },

  // Etkinlikler
  'get_etkinlikler': { method: 'GET', url: '/etkinlikler' },
  'create_etkinlik': { method: 'POST', url: '/etkinlikler' },
  'update_etkinlik': { method: 'PUT', url: '/etkinlikler/:etkinlikId' },
  'delete_etkinlik': { method: 'DELETE', url: '/etkinlikler/:etkinlikId' },

  // Aidat
  'get_aidat_takip': { method: 'GET', url: '/aidat' },
  'create_aidat': { method: 'POST', url: '/aidat' }, // Frontend'de henüz yoksa da ekleyelim
  'update_aidat_odeme': { method: 'PUT', url: '/aidat/:odemeId' },
  'delete_aidat_odeme': { method: 'DELETE', url: '/aidat/:odemeId' },

  // Backup / Sync / License
  'sync_push': { method: 'POST', url: '/sync/push' },
  'sync_pull': { method: 'POST', url: '/sync/pull' },
  'check_license': { method: 'GET', url: '/licenses/my-license' },
  'upgrade_license': { method: 'POST', url: '/licenses/upgrade' },

  // Super Admin
  'get_tenants_list': { method: 'GET', url: '/tenants/' },
  'create_tenant': { method: 'POST', url: '/tenants/' },
  'update_tenant': { method: 'PUT', url: '/tenants/:tenantId' },
  'delete_tenant': { method: 'DELETE', url: '/tenants/:tenantId' },
  'get_all_licenses': { method: 'GET', url: '/licenses/all' },
  'create_license': { method: 'POST', url: '/licenses/' },
  'assign_license': { method: 'POST', url: '/licenses/assign' },

  // Kasalar
  'get_kasalar': { method: 'GET', url: '/kasalar' },
  'get_kasa_ozet': { method: 'GET', url: '/kasalar/ozet' },
  'create_kasa': { method: 'POST', url: '/kasalar' },
  'update_kasa': { method: 'PUT', url: '/kasalar/:id' },
  'delete_kasa': { method: 'DELETE', url: '/kasalar/:id' },

  // Aidat Ekstra
  'get_aidat_ozet': { method: 'GET', url: '/aidat/ozet' },
};

// Token helper
const getToken = () => {
  try {
    const store = localStorage.getItem('auth-storage');
    // ... code truncated for brevity, same as before ...
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
      let url = `${API_BASE_URL}${endpoint.url}`;

      // URL Parametrelerini Değiştir (Örn: :etkinlikId -> args.etkinlikId)
      if (args) {
        Object.keys(args).forEach(key => {
          if (url.includes(`:${key}`)) {
            url = url.replace(`:${key}`, args[key]);
          }
        });
      }

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
        formData.append('username', args.email);
        formData.append('password', args.password);
        options.body = formData;
        // Platform bilgisini gönder - Web'den giriş yapılıyor
        (options.headers as any)['X-Platform'] = 'web';
      } else {
        (options.headers as any)['Content-Type'] = 'application/json';
        if (args) {
          if (endpoint.method === 'GET') {
            // GET: Query Params
            const queryParams = new URLSearchParams();
            Object.keys(args).forEach(key => {
              if (args[key] !== null && args[key] !== undefined && !url.includes(args[key])) { // URL param değilse query'e ekle
                queryParams.append(key, String(args[key]));
              }
            });
            if (queryParams.toString()) {
              url += `?${queryParams.toString()}`;
            }
          } else {
            // POST/PUT: Body
            // Eğer args içinde 'data' varsa onu gönder (Tauri pattern'i)
            if (args.data) {
              options.body = JSON.stringify(args.data);
            } else {
              // Filtrele: URL parametreleri body'de gitmesin (optional, temizlik için)
              const bodyArgs = { ...args };
              // URL'deki parametreleri body'den temizlemek karmaşık olabilir, şimdilik olduğu gibi bırakalım
              // Pydantic extra='ignore' yapmazsa hata verebilir, ama genellikle payload body'de 'data' wrapper içinde geliyor
              options.body = JSON.stringify(bodyArgs);
            }
          }
        }
      }


      const response = await fetch(url, options);

      if (response.ok) {
        const data = await response.json();
        // LOGIN RESPONSE ADAPTASYONU (Backend yapısı -> Frontend'in beklediği yapı)
        if (command === 'login') {
          return {
            success: true,
            user: data.user,
            token: data.access_token,
            tenant: data.tenant,
            license: data.license, // Lisans bilgisini ekle
            message: 'Giriş başarılı'
          } as any;
        }
        return data;
      } else {
        // 401 Unauthorized ise login hatasıdır
        if (response.status === 401 && command === 'login') {
          throw new Error('Hatalı e-posta veya şifre');
        }
        // 403 Forbidden ise lisans hatasıdır
        if (response.status === 403 && command === 'login') {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Bu platformda erişim yetkiniz yok. Lisansınızı yükseltin.');
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
