/**
 * Backend Enum / Sabit Değerleri
 *
 * Kaynak: backend/app/models/base.py ve backend/app/api/licenses.py
 * Bu değerler backend ile birebir aynı olmalıdır; UI etiketleri için
 * lib/constants.ts kullanılır.
 */

/** backend/app/models/base.py → UserRole */
export const USER_ROLE = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

/** backend/app/models/base.py → TenantStatus */
export const TENANT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  TRIAL: 'trial',
} as const;

export type TenantStatus = (typeof TENANT_STATUS)[keyof typeof TENANT_STATUS];

/**
 * Aidat durumu (aidat_takip.durum).
 * Backend varsayılanı 'beklemede'; ödeme kaydı girildikçe
 * odenmedi / kismi_odendi / odendi değerleri kullanılır.
 */
export const AIDAT_DURUM = {
  ODENMEDI: 'odenmedi',
  KISMI_ODENDI: 'kismi_odendi',
  ODENDI: 'odendi',
  IPTAL: 'iptal',
  BEKLEMEDE: 'beklemede',
} as const;

export type AidatDurum = (typeof AIDAT_DURUM)[keyof typeof AIDAT_DURUM];

/**
 * Lisans tipi (platform bitlerinden türetilen ad).
 * Kaynak: License.get_license_type_name() ve /licenses/generate preset'leri.
 * LOCAL = sadece desktop, ONLINE = web+mobil+sync, HYBRID = tüm platformlar.
 */
export const LICENSE_TYPE = {
  LOCAL: 'LOCAL',
  ONLINE: 'ONLINE',
  HYBRID: 'HYBRID',
} as const;

export type LicenseType = (typeof LICENSE_TYPE)[keyof typeof LICENSE_TYPE];
