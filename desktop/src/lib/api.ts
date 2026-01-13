/**
 * BADER Desktop API Client
 * Sunucu ile iletişim için HTTP client
 */

import { fetch } from '@tauri-apps/plugin-http';

// API Base URL - Production'da değiştirilecek
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.bader.app/api/v1';

// API Response tipi
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API Error sınıfı
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Token storage
let authToken: string | null = null;
let tenantId: string | null = null;

/**
 * Auth token'ı ayarla
 */
export function setAuthToken(token: string | null) {
  authToken = token;
}

/**
 * Tenant ID'yi ayarla
 */
export function setTenantId(id: string | null) {
  tenantId = id;
}

/**
 * API isteği gönder
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  // Auth token ekle
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  // Tenant ID ekle
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // JSON yanıtı parse et
    const data = await response.json() as ApiResponse<T>;
    
    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.error || 'UNKNOWN_ERROR',
        data.message || 'Bir hata oluştu'
      );
    }
    
    return data.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network hatası
    throw new ApiError(0, 'NETWORK_ERROR', 'Sunucuya bağlanılamadı');
  }
}

/**
 * GET isteği
 */
export function get<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'GET' });
}

/**
 * POST isteği
 */
export function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT isteği
 */
export function put<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE isteği
 */
export function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE' });
}

/**
 * PATCH isteği
 */
export function patch<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ==========================================
// LİSANS API
// ==========================================

export interface LicenseValidation {
  valid: boolean;
  license: {
    id: string;
    plan: string;
    features: string[];
    expires_at: string;
    max_users: number;
    max_members: number;
  } | null;
  message?: string;
}

export interface LicenseActivation {
  success: boolean;
  license_key: string;
  activated_at: string;
}

export const licenseApi = {
  /**
   * Lisans doğrula
   */
  validate: (licenseKey: string, hardwareId: string) =>
    post<LicenseValidation>('/licenses/validate', { license_key: licenseKey, hardware_id: hardwareId }),
  
  /**
   * Lisans aktive et
   */
  activate: (licenseKey: string, hardwareId: string, tenantName: string) =>
    post<LicenseActivation>('/licenses/activate', {
      license_key: licenseKey,
      hardware_id: hardwareId,
      tenant_name: tenantName,
    }),
  
  /**
   * Lisans bilgilerini getir
   */
  get: (licenseId: string) =>
    get<LicenseValidation['license']>(`/licenses/${licenseId}`),
};

// ==========================================
// SYNC API
// ==========================================

export interface SyncPushRequest {
  tenant_id: string;
  device_id: string;
  changes: SyncChange[];
  last_sync_at?: string;
}

export interface SyncChange {
  table_name: string;
  record_id: string;
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  local_updated_at: string;
}

export interface SyncPushResponse {
  success: boolean;
  synced_count: number;
  conflicts: SyncConflict[];
}

export interface SyncPullRequest {
  tenant_id: string;
  device_id: string;
  last_sync_at?: string;
  tables?: string[];
}

export interface SyncPullResponse {
  success: boolean;
  changes: SyncChange[];
  server_time: string;
}

export interface SyncConflict {
  table_name: string;
  record_id: string;
  local_data: Record<string, unknown>;
  server_data: Record<string, unknown>;
  conflict_type: 'update_update' | 'update_delete' | 'delete_update';
}

export interface ConflictResolution {
  conflict_id: string;
  resolution: 'keep_local' | 'keep_server' | 'merge';
  merged_data?: Record<string, unknown>;
}

export const syncApi = {
  /**
   * Değişiklikleri sunucuya gönder
   */
  push: (request: SyncPushRequest) =>
    post<SyncPushResponse>('/sync/push', request),
  
  /**
   * Sunucudan değişiklikleri çek
   */
  pull: (request: SyncPullRequest) =>
    post<SyncPullResponse>('/sync/pull', request),
  
  /**
   * Conflict'leri çöz
   */
  resolveConflicts: (resolutions: ConflictResolution[]) =>
    post<{ success: boolean }>('/sync/conflicts/resolve', { resolutions }),
  
  /**
   * Bekleyen conflict'leri getir
   */
  getConflicts: (tenantId: string) =>
    get<SyncConflict[]>(`/sync/conflicts?tenant_id=${tenantId}`),
};

// ==========================================
// AUTH API
// ==========================================

export interface LoginRequest {
  email: string;
  password: string;
  tenant_id?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenant_id: string;
    is_superuser: boolean;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  tenant_name: string;
  license_key?: string;
}

export const authApi = {
  /**
   * Giriş yap
   */
  login: (request: LoginRequest) =>
    post<LoginResponse>('/auth/login', request),
  
  /**
   * Kayıt ol
   */
  register: (request: RegisterRequest) =>
    post<LoginResponse>('/auth/register', request),
  
  /**
   * Token yenile
   */
  refreshToken: (refreshToken: string) =>
    post<{ access_token: string }>('/auth/refresh', { refresh_token: refreshToken }),
  
  /**
   * Çıkış yap
   */
  logout: () =>
    post<{ success: boolean }>('/auth/logout'),
  
  /**
   * Mevcut kullanıcı bilgisi
   */
  me: () =>
    get<LoginResponse['user']>('/auth/me'),
};

// ==========================================
// TENANT API
// ==========================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'pending' | 'suspended';
  created_at: string;
  license_plan?: string;
}

export const tenantApi = {
  /**
   * Tenant bilgilerini getir
   */
  get: (tenantId: string) =>
    get<Tenant>(`/tenants/${tenantId}`),
  
  /**
   * Tenant güncelle
   */
  update: (tenantId: string, data: Partial<Tenant>) =>
    put<Tenant>(`/tenants/${tenantId}`, data),
};

// ==========================================
// EXPORT DEFAULT
// ==========================================

export default {
  setAuthToken,
  setTenantId,
  get,
  post,
  put,
  del,
  patch,
  license: licenseApi,
  sync: syncApi,
  auth: authApi,
  tenant: tenantApi,
};
