/**
 * API Client - Web için Backend Bağlantısı
 *
 * Bu dosya Desktop'taki Tauri `invoke` çağrılarının Web karşılığıdır.
 * Her komut backend REST API'sine (/api/v1) çevrilir. MOCK DATA YOKTUR:
 * backend'e ulaşılamazsa veya komutun web karşılığı yoksa hata fırlatılır.
 *
 * Desteklenmeyen (desktop-only) modüller: toplantilar, belgeler, butce,
 * demirbaslar, cari, koy, vadeli işlemler, kurlar, devir, gelir/gider türleri,
 * aidat tanımları & toplu aidat işlemleri, aile üyeleri, kullanıcı yönetimi,
 * export (Excel/CSV), yerel sync kuyruğu, get_db_path, kolon tercihleri.
 */

import { API_BASE_URL } from '../config';
import { AIDAT_DURUM } from './enums';

const DESKTOP_ONLY_MESSAGE = "Bu özellik web'de kullanılamaz (desktop-only)";

/** Listeleme adapter'larında kullanılan üst sınır */
const LIST_LIMIT = 10000;

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

/** authStore (zustand persist) içinden Bearer token okur */
const getToken = (): string | null => {
  try {
    const store = localStorage.getItem('auth-storage');
    if (store) {
      const parsed = JSON.parse(store);
      return parsed.state?.token ?? null;
    }
  } catch {
    return null;
  }
  return null;
};

interface RequestOptions {
  /** Query string parametreleri (null/undefined atlanır) */
  query?: Record<string, unknown>;
  /** JSON body */
  body?: unknown;
  /** application/x-www-form-urlencoded / multipart body (login için) */
  form?: Record<string, string>;
  /** Ek header'lar */
  headers?: Record<string, string>;
}

async function request<T = any>(
  method: string,
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  let url = `${API_BASE_URL}${path}`;

  if (opts.query) {
    const params = new URLSearchParams();
    Object.entries(opts.query).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = { ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const init: RequestInit = { method, headers };

  if (opts.form) {
    const formData = new FormData();
    Object.entries(opts.form).forEach(([k, v]) => formData.append(k, v));
    init.body = formData;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    throw new Error(
      `Sunucuya ulaşılamadı (${method} ${path}). İnternet bağlantınızı kontrol edin.`
    );
  }

  if (!response.ok) {
    let detail: string | null = null;
    try {
      const errData = await response.json();
      if (typeof errData?.detail === 'string') detail = errData.detail;
      else if (errData?.detail) detail = JSON.stringify(errData.detail);
    } catch {
      // body yok veya JSON değil
    }
    throw new Error(detail || `İstek başarısız (HTTP ${response.status})`);
  }

  // 204 No Content (DELETE) → body yok
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/** tenantIdParam gibi Tauri'ye özgü alanları body'den temizler */
const stripTauriArgs = (args: Record<string, any> = {}): Record<string, any> => {
  const { tenantIdParam, ...rest } = args;
  return rest;
};

/** 'aktif' → 'Aktif' (backend üye durumları büyük harfle başlar) */
const normalizeUyeDurum = (durum?: string | null): string | undefined => {
  if (!durum) return undefined;
  return durum.charAt(0).toLocaleUpperCase('tr-TR') + durum.slice(1);
};

/** Ödenen/tutar bilgisinden aidat durumunu hesaplar */
const hesaplaAidatDurum = (tutar: number, odenen: number): string => {
  if (tutar > 0 && odenen >= tutar) return AIDAT_DURUM.ODENDI;
  if (odenen > 0) return AIDAT_DURUM.KISMI_ODENDI;
  return AIDAT_DURUM.ODENMEDI;
};

/** Aidat listesini opsiyonel yıl filtresiyle çeker */
const fetchAidatList = (yil?: number | null): Promise<any[]> =>
  request<any[]>('GET', '/aidat/', { query: { yil, limit: LIST_LIMIT } });

// ---------------------------------------------------------------------------
// Komut → Endpoint eşlemesi
// ---------------------------------------------------------------------------

type CommandHandler = (args: any) => Promise<any>;

const COMMAND_MAP: Record<string, CommandHandler> = {
  // ========== AUTH ==========
  login: async (args) => {
    const email = args?.email ?? args?.request?.email;
    const password = args?.password ?? args?.request?.password;
    const data = await request<any>('POST', '/auth/token', {
      form: { username: email, password },
      headers: { 'X-Platform': 'web' },
    });
    // Backend yapısı → Frontend'in beklediği yapı
    return {
      success: true,
      user: data.user,
      token: data.access_token,
      tenant: data.tenant,
      license: data.license,
      message: 'Giriş başarılı',
    };
  },

  // ========== DASHBOARD ==========
  get_dashboard_stats: () => request('GET', '/dashboard/stats'),

  // ========== UYELER ==========
  get_uyeler: (a) =>
    request('GET', '/uyeler/', {
      query: {
        search: a?.search,
        durum: a?.durum,
        skip: a?.skip,
        limit: a?.limit,
      },
    }),
  get_uye_by_id: (a) => request('GET', `/uyeler/${a.uyeId ?? a.id}`),
  get_uye: (a) => request('GET', `/uyeler/${a.uyeId ?? a.id}`),
  create_uye: (a) => request('POST', '/uyeler/', { body: a.data }),
  update_uye: (a) => request('PUT', `/uyeler/${a.uyeId ?? a.id}`, { body: a.data }),
  delete_uye: (a) => request('DELETE', `/uyeler/${a.uyeId ?? a.id}`),

  /** Backend'de count endpoint'i yok → liste uzunluğundan hesaplanır */
  count_uyeler: async (a) => {
    const uyeler = await request<any[]>('GET', '/uyeler/', {
      query: {
        durum: normalizeUyeDurum(a?.durum ?? a?.durumFilter),
        limit: LIST_LIMIT,
      },
    });
    return uyeler.length;
  },

  /** Üye borç durumları aidat kayıtlarından türetilir */
  get_uye_borc_durumlari: async (a) => {
    const aidatlar = await fetchAidatList();
    const byUye: Record<
      string,
      { uye_id: string; toplam_borc: number; odenen: number; kalan_borc: number }
    > = {};
    for (const aidat of aidatlar) {
      if (aidat.durum === AIDAT_DURUM.IPTAL) continue;
      const entry = (byUye[aidat.uye_id] ??= {
        uye_id: aidat.uye_id,
        toplam_borc: 0,
        odenen: 0,
        kalan_borc: 0,
      });
      entry.toplam_borc += aidat.tutar || 0;
      entry.odenen += aidat.odenen || 0;
      entry.kalan_borc = entry.toplam_borc - entry.odenen;
    }
    const list = Object.values(byUye);
    const uyeIds: string[] | undefined = a?.uyeIds;
    return uyeIds?.length ? list.filter((b) => uyeIds.includes(b.uye_id)) : list;
  },

  // ========== GELIRLER ==========
  get_gelirler: (a) =>
    request('GET', '/gelirler/', {
      query: {
        search: a?.search,
        kasa_id: a?.kasaId ?? a?.kasaIdFilter,
        gelir_turu_id: a?.gelirTuruId,
        baslangic: a?.baslangicTarih,
        bitis: a?.bitisTarih,
        skip: a?.skip,
        limit: a?.limit,
      },
    }),
  get_gelir: (a) => request('GET', `/gelirler/${a.recordId ?? a.id}`),
  create_gelir: (a) => request('POST', '/gelirler/', { body: a.data }),
  update_gelir: (a) => request('PUT', `/gelirler/${a.recordId ?? a.id}`, { body: a.data }),
  delete_gelir: (a) => request('DELETE', `/gelirler/${a.recordId ?? a.id}`),

  /** Backend liste endpoint'i uye_id filtresi desteklemiyor → istemcide filtrelenir */
  get_uyeye_ait_gelirler: async (a) => {
    const gelirler = await request<any[]>('GET', '/gelirler/', {
      query: { limit: LIST_LIMIT },
    });
    return gelirler.filter((g) => g.uye_id === (a?.uyeId ?? a?.id));
  },

  // ========== GIDERLER ==========
  get_giderler: (a) =>
    request('GET', '/giderler/', {
      query: {
        search: a?.search,
        kasa_id: a?.kasaId ?? a?.kasaIdFilter,
        gider_turu_id: a?.giderTuruId,
        baslangic: a?.baslangicTarih,
        bitis: a?.bitisTarih,
        skip: a?.skip,
        limit: a?.limit,
      },
    }),
  get_gider: (a) => request('GET', `/giderler/${a.recordId ?? a.id}`),
  create_gider: (a) => request('POST', '/giderler/', { body: a.data }),
  update_gider: (a) => request('PUT', `/giderler/${a.recordId ?? a.id}`, { body: a.data }),
  delete_gider: (a) => request('DELETE', `/giderler/${a.recordId ?? a.id}`),

  get_giderler_paginated: async (a) => {
    const pageSize = a?.pageSize ?? 100;
    const skip = (a?.page ?? 0) * pageSize;
    const data = await request<any[]>('GET', '/giderler/', {
      query: {
        kasa_id: a?.kasaIdFilter ?? a?.kasaId,
        baslangic: a?.baslangicTarih,
        bitis: a?.bitisTarih,
        skip,
        limit: pageSize,
      },
    });
    // Backend toplam kayıt sayısı endpoint'i sunmuyor; yaklaşık değer döner
    return { data, total: skip + data.length };
  },

  // ========== KASALAR ==========
  get_kasalar: (a) =>
    request('GET', '/kasalar/', {
      query: { search: a?.search, skip: a?.skip, limit: a?.limit },
    }),
  get_kasa: (a) => request('GET', `/kasalar/${a.id ?? a.kasaId}`),
  create_kasa: (a) => request('POST', '/kasalar/', { body: a.data ?? a.request }),
  update_kasa: (a) =>
    request('PUT', `/kasalar/${a.id ?? a.kasaId}`, { body: a.request ?? a.data }),
  delete_kasa: (a) => request('DELETE', `/kasalar/${a.id ?? a.kasaId}`),

  /** Kasa özeti listeden hesaplanır (backend'de özet endpoint'i yok) */
  get_kasa_ozet: async () => {
    const kasalar = await request<any[]>('GET', '/kasalar/', {
      query: { limit: LIST_LIMIT },
    });
    const aktifler = kasalar.filter((k) => k.is_active !== false);
    return {
      toplam_bakiye: aktifler.reduce((sum, k) => sum + (k.bakiye || 0), 0),
      toplam_gelir: aktifler.reduce((sum, k) => sum + (k.toplam_gelir || 0), 0),
      toplam_gider: aktifler.reduce((sum, k) => sum + (k.toplam_gider || 0), 0),
      kasa_sayisi: aktifler.length,
    };
  },

  // ========== VIRMANLAR ==========
  get_virmanlar: (a) =>
    request('GET', '/virmanlar/', {
      query: {
        search: a?.search,
        kasa_id: a?.kasaId ?? a?.kasaIdFilter,
        baslangic: a?.baslangicTarih,
        bitis: a?.bitisTarih,
        skip: a?.skip,
        limit: a?.limit,
      },
    }),
  get_virman: (a) => request('GET', `/virmanlar/${a.recordId ?? a.id}`),
  create_virman: (a) => request('POST', '/virmanlar/', { body: a.data }),
  update_virman: (a) =>
    request('PUT', `/virmanlar/${a.recordId ?? a.id}`, { body: a.data }),
  delete_virman: (a) => request('DELETE', `/virmanlar/${a.recordId ?? a.id}`),

  // ========== ETKINLIKLER ==========
  get_etkinlikler: (a) =>
    request('GET', '/etkinlikler/', {
      query: {
        search: a?.search,
        durum: a?.durum,
        etkinlik_tipi: a?.etkinlikTipi,
        skip: a?.skip,
        limit: a?.limit,
      },
    }),
  get_etkinlik: (a) => request('GET', `/etkinlikler/${a.etkinlikId ?? a.id}`),
  create_etkinlik: (a) => request('POST', '/etkinlikler/', { body: a.data }),
  update_etkinlik: (a) =>
    request('PUT', `/etkinlikler/${a.etkinlikId ?? a.id}`, { body: a.data }),
  delete_etkinlik: (a) => request('DELETE', `/etkinlikler/${a.etkinlikId ?? a.id}`),

  // ========== AIDAT ==========
  /**
   * Aidat takip listesi. Backend sadece yıl filtresi destekler;
   * üye/ay/durum filtreleri istemci tarafında uygulanır.
   */
  get_aidat_takip: async (a) => {
    let aidatlar = await fetchAidatList(a?.filterYil ?? a?.yil);
    if (a?.filterUyeId) aidatlar = aidatlar.filter((x) => x.uye_id === a.filterUyeId);
    if (a?.filterAy) aidatlar = aidatlar.filter((x) => x.ay === a.filterAy);
    if (a?.filterDurum) {
      aidatlar = aidatlar.filter((x) =>
        a.filterDurum === AIDAT_DURUM.ODENMEDI
          ? x.durum === AIDAT_DURUM.ODENMEDI || x.durum === AIDAT_DURUM.BEKLEMEDE
          : x.durum === a.filterDurum
      );
    }
    const skip = a?.skip ?? 0;
    const limit = a?.limit ?? aidatlar.length;
    return aidatlar.slice(skip, skip + limit);
  },

  /** Aidat listesi + üye bilgileri (JOIN istemci tarafında yapılır) */
  get_aidat_takip_with_uye: async (a) => {
    const [aidatlar, uyeler] = await Promise.all([
      COMMAND_MAP.get_aidat_takip(a),
      request<any[]>('GET', '/uyeler/', { query: { limit: LIST_LIMIT } }),
    ]);
    const uyeMap = new Map<string, any>(uyeler.map((u) => [u.id, u]));
    return aidatlar.map((aidat: any) => {
      const uye = uyeMap.get(aidat.uye_id);
      return {
        ...aidat,
        uye_no: uye?.uye_no,
        uye_ad_soyad: uye?.ad_soyad,
        uye_telefon: uye?.telefon,
      };
    });
  },

  /** Tüm aidat kayıtları (raporlar: bilanço, kesin hesap) */
  get_all_aidat: (a) => fetchAidatList(a?.yil),

  /** Aidat özeti listeden hesaplanır (backend'de özet endpoint'i yok) */
  get_aidat_ozet: async (a) => {
    const aidatlar = (await fetchAidatList(a?.yil)).filter(
      (x) => x.durum !== AIDAT_DURUM.IPTAL
    );
    const toplam_tutar = aidatlar.reduce((sum, x) => sum + (x.tutar || 0), 0);
    const toplam_odenen = aidatlar.reduce((sum, x) => sum + (x.odenen || 0), 0);
    const odenen_adet = aidatlar.filter(
      (x) => x.durum === AIDAT_DURUM.ODENDI || ((x.tutar || 0) > 0 && (x.odenen || 0) >= x.tutar)
    ).length;
    return {
      toplam_tutar,
      toplam_odenen,
      toplam_kalan: toplam_tutar - toplam_odenen,
      odenen_adet,
      geciken_adet: aidatlar.length - odenen_adet,
    };
  },

  get_aidat_by_id: (a) => request('GET', `/aidat/${a.aidatId ?? a.id}`),
  create_aidat: (a) => request('POST', '/aidat/', { body: a.data }),
  update_aidat: (a) => request('PUT', `/aidat/${a.aidatId ?? a.id}`, { body: a.data }),
  delete_aidat: (a) => request('DELETE', `/aidat/${a.aidatId ?? a.id}`),
  delete_aidat_odeme: (a) => request('DELETE', `/aidat/${a.odemeId ?? a.id}`),

  /** Ödeme güncelleme: tutar/ödenen değişince durum yeniden hesaplanır */
  update_aidat_odeme: (a) => {
    const tutar = Number(a?.tutar ?? 0);
    const odenen = Number(a?.odenen ?? 0);
    return request('PUT', `/aidat/${a.odemeId ?? a.id}`, {
      body: {
        tutar,
        odenen,
        odeme_tarihi: a?.odemeTarihi ?? null,
        durum: hesaplaAidatDurum(tutar, odenen),
      },
    });
  },

  // ========== LICENSES ==========
  check_license: () => request('GET', '/licenses/my-license'),
  validate_license: (a) =>
    request('POST', '/licenses/validate', { body: a?.request ?? stripTauriArgs(a) }),
  upgrade_license: (a) =>
    request('POST', '/licenses/upgrade', { body: a?.request ?? stripTauriArgs(a) }),
  get_all_licenses: () => request('GET', '/licenses/all'),
  create_license: (a) =>
    request('POST', '/licenses/generate', { body: a?.data ?? stripTauriArgs(a) }),
  assign_license: (a) =>
    request('POST', '/licenses/assign', { body: a?.data ?? stripTauriArgs(a) }),

  // ========== KOLON TERCİHLERİ ==========
  // Web'de sütun tercihleri backend'e değil localStorage'a yazılır
  // (useColumnConfig hook'u zaten localStorage'a persist ediyor).
  // null / no-op dönmek hook'un localStorage akışını devreye sokar.
  get_column_preferences: async () => null,
  save_column_preferences: async () => undefined,
  reset_column_preferences: async () => undefined,

  // ========== TENANTS (Super Admin) ==========
  get_tenants_list: () => request('GET', '/tenants'),
  create_tenant: (a) =>
    request('POST', '/tenants', { body: a?.data ?? stripTauriArgs(a) }),
  update_tenant: (a) => {
    const { tenantId, ...rest } = stripTauriArgs(a);
    return request('PUT', `/tenants/${tenantId}`, { body: a?.data ?? rest });
  },
  delete_tenant: (a) => request('DELETE', `/tenants/${a.tenantId ?? a.id}`),
};

// ---------------------------------------------------------------------------
// invoke (Tauri uyumlu giriş noktası)
// ---------------------------------------------------------------------------

export async function invoke<T>(command: string, args?: any): Promise<T> {
  const handler = COMMAND_MAP[command];
  if (!handler) {
    // Web'de karşılığı olmayan komutlar için açık hata (sessiz mock YOK)
    throw new Error(`${DESKTOP_ONLY_MESSAGE}: ${command}`);
  }
  return handler(args ?? {}) as Promise<T>;
}
