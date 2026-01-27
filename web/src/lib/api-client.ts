/**
 * API Client - Web için Backend Bağlantısı
 * 
 * Bu dosya Desktop'taki Tauri `invoke` çağrılarının Web karşılığıdır.
 * Tüm backend istekleri buradan geçer.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private token: string | null = null;
  private tenantId: string | null = null;

  setAuth(token: string, tenantId: string) {
    this.token = token;
    this.tenantId = tenantId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('tenant_id', tenantId);
    }
  }

  clearAuth() {
    this.token = null;
    this.tenantId = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('tenant_id');
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    return headers;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Hydrate from localStorage on init
  hydrate() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      this.tenantId = localStorage.getItem('tenant_id');
    }
  }
}

export const apiClient = new ApiClient();

// ============================================================================
// Tauri `invoke` Yerine Geçen Fonksiyon
// Desktop kodlarındaki invoke() çağrılarını bu fonksiyona yönlendireceğiz
// ============================================================================

type InvokeCommand =
  | 'login'
  | 'get_uyeler'
  | 'create_uye'
  | 'update_uye'
  | 'delete_uye'
  | 'get_gelirler'
  | 'create_gelir'
  | 'get_giderler'
  | 'create_gider'
  | 'get_dashboard_stats'
  | 'get_kasalar'
  | 'get_aidat_tanimlari'
  | 'get_belgeler'
  | 'create_belge'
  | string; // Fallback for other commands

/**
 * Desktop'taki `invoke` fonksiyonunun Web karşılığı
 * Tauri komutu -> HTTP endpoint dönüşümü yapar
 */
export async function invoke<T>(command: InvokeCommand, args?: Record<string, unknown>): Promise<T> {
  // Command -> Endpoint mapping
  const commandMap: Record<string, { method: string; endpoint: string }> = {
    // Auth
    'login': { method: 'POST', endpoint: '/auth/login' },
    'logout': { method: 'POST', endpoint: '/auth/logout' },

    // Üyeler
    'get_uyeler': { method: 'GET', endpoint: '/uyeler' },
    'get_uye': { method: 'GET', endpoint: '/uyeler/{id}' },
    'create_uye': { method: 'POST', endpoint: '/uyeler' },
    'update_uye': { method: 'PUT', endpoint: '/uyeler/{id}' },
    'delete_uye': { method: 'DELETE', endpoint: '/uyeler/{id}' },

    // Mali İşlemler - Gelirler
    'get_gelirler': { method: 'GET', endpoint: '/gelirler' },
    'create_gelir': { method: 'POST', endpoint: '/gelirler' },
    'update_gelir': { method: 'PUT', endpoint: '/gelirler/{id}' },
    'delete_gelir': { method: 'DELETE', endpoint: '/gelirler/{id}' },

    // Mali İşlemler - Giderler
    'get_giderler': { method: 'GET', endpoint: '/giderler' },
    'create_gider': { method: 'POST', endpoint: '/giderler' },
    'update_gider': { method: 'PUT', endpoint: '/giderler/{id}' },
    'delete_gider': { method: 'DELETE', endpoint: '/giderler/{id}' },

    // Kasalar
    'get_kasalar': { method: 'GET', endpoint: '/kasalar' },
    'create_kasa': { method: 'POST', endpoint: '/kasalar' },

    // Dashboard
    'get_dashboard_stats': { method: 'GET', endpoint: '/dashboard/stats' },

    // Aidat
    'get_aidat_tanimlari': { method: 'GET', endpoint: '/aidat/tanimlar' },
    'get_aidatlar': { method: 'GET', endpoint: '/aidat' },

    // Belgeler
    'get_belgeler': { method: 'GET', endpoint: '/belgeler' },
    'create_belge': { method: 'POST', endpoint: '/belgeler' },
    'download_belge': { method: 'GET', endpoint: '/belgeler/{id}/download' },

    // Virmanlar
    'get_virmanlar': { method: 'GET', endpoint: '/virmanlar' },
    'create_virman': { method: 'POST', endpoint: '/virmanlar' },

    // Gelir/Gider Türleri
    'get_gelir_turleri': { method: 'GET', endpoint: '/gelir-turleri' },
    'get_gider_turleri': { method: 'GET', endpoint: '/gider-turleri' },

    // Licenses (Admin)
    'get_licenses': { method: 'GET', endpoint: '/licenses' },
    'create_license': { method: 'POST', endpoint: '/licenses' },
    'validate_license': { method: 'POST', endpoint: '/licenses/validate' },
  };

  const mapping = commandMap[command];

  if (!mapping) {
    console.warn(`[API] Unknown command: ${command}, using mock response`);
    return {} as T;
  }

  let endpoint = mapping.endpoint;

  // URL parametrelerini değiştir (örn. {id} -> args.id)
  if (args) {
    Object.entries(args).forEach(([key, value]) => {
      endpoint = endpoint.replace(`{${key}}`, String(value));
    });
  }

  // Query parametreleri ekle (GET istekleri için)
  if (mapping.method === 'GET' && args) {
    const queryParams = new URLSearchParams();
    Object.entries(args).forEach(([key, value]) => {
      if (!endpoint.includes(key) && value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }
  }

  switch (mapping.method) {
    case 'GET':
      return apiClient.get<T>(endpoint);
    case 'POST':
      return apiClient.post<T>(endpoint, args);
    case 'PUT':
      return apiClient.put<T>(endpoint, args);
    case 'DELETE':
      return apiClient.delete<T>(endpoint);
    default:
      throw new Error(`Unknown method: ${mapping.method}`);
  }
}

// Initialize on load
if (typeof window !== 'undefined') {
  apiClient.hydrate();
}
