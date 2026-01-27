import { invoke } from '@tauri-apps/api/core';

// Tauri ortamında olup olmadığımızı kontrol ediyoruz
// @ts-ignore
const IS_TAURI = typeof window !== 'undefined' && !!(window.__TAURI_INTERNALS__ || window.__TAURI__);

/**
 * Bu istemci, uygulamanın hem Masaüstü (Tauri) hem de Web ortamında çalışmasını sağlar.
 * Masaüstünde: Rust backend'i ile 'invoke' üzerinden konuşur (Local SQLite).
 * Webde: HTTP istekleri veya Mock veri ile konuşur (Cloud DB Simulasyonu).
 */
export const apiClient = {
  async call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    if (IS_TAURI) {
      try {
        return await invoke<T>(command, args);
      } catch (error) {
        console.error(`[TAURI] Command '${command}' failed:`, error);
        throw error;
      }
    } else {
      // WEB MODE
      return mockWebBackend(command, args) as Promise<T>;
    }
  },

  isDesktop: IS_TAURI,
  isWeb: !IS_TAURI
};

// ============================================================================
// WEB MODU İÇİN MOCK BACKEND (SIMULATOR)
// Gerçek bir API yazılana kadar, web arayüzünü test etmek için burayı kullanacağız.
// ============================================================================
async function mockWebBackend(command: string, args: any): Promise<any> {
  console.log(`%c[WEB API] ${command}`, 'color: #3b82f6; font-weight: bold;', args);
  
  // Yapay gecikme (Network latency)
  await new Promise(resolve => setTimeout(resolve, 600));

  // Komutlara göre mock cevaplar
  switch (command) {
    case 'login':
      if (args.email === 'admin@bader.org' && args.password === '123456') {
        return {
          user: { 
            id: 'super-admin-web', 
            email: 'admin@bader.org', 
            full_name: 'Bader Süper Admin', 
            role: 'superadmin',
            tenant_id: 'system' 
          },
          tenant: { id: 'system', name: 'Bader Yönetim', slug: 'bader-system' },
          token: 'mock_jwt_token_superadmin'
        };
      }
      throw "Hatalı e-posta veya şifre (Web Mock)";

    case 'get_dashboard_stats':
      return {
        total_uyeler: 1540,
        aktif_uyeler: 1200,
        pasif_uyeler: 340,
        bekleyen_uyeler: 15
      };

    // Süper Admin Komutları
    case 'admin_create_license':
      return {
        id: Math.random().toString(),
        license_key: `BADER-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        plan: args.plan,
        is_active: true,
        expiry_date: '2027-01-01'
      };

    case 'admin_get_tenants':
      return [
        { id: '1', name: 'Örnek Dernek A', plan: 'HYBRID', user_count: 5, status: 'active' },
        { id: '2', name: 'Demo Spor Kulübü', plan: 'LOCAL', user_count: 1, status: 'active' },
        { id: '3', name: 'Test Vakfı', plan: 'ONLINE', user_count: 10, status: 'expired' },
      ];

    default:
      console.warn(`[WEB API] Mock handler not defined for: ${command}`);
      // Geçici olarak boş obje dönelim ki app çökmesin
      return {};
  }
}
