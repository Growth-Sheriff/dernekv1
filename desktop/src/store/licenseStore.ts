import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type LicensePlan = 'LOCAL' | 'ONLINE' | 'HYBRID';

interface LicenseFeatures {
  modules: {
    uye_yonetimi: boolean;
    aidat_takip: boolean;
    mali_islemler: boolean;
    aile_modulu: boolean;
    koy_modulu: boolean;
    ocr: boolean;
    web_erisim: boolean;
    mobil_erisim: boolean;
    sync: boolean;
    api_access: boolean;
    email_sms: boolean;
  };
  limits: {
    max_users: number;
    max_members: number;
    max_kasalar: number;
    max_storage_mb: number;
  };
  exports: {
    pdf: boolean;
    excel: boolean;
    api: boolean;
  };
}

interface License {
  id: string;
  key?: string;
  license_key: string;
  plan: LicensePlan;
  features: LicenseFeatures;
  hardware_id?: string;
  expires_at?: string;
  is_active: boolean;
  // Platform enablement fields
  desktop_enabled?: boolean;
  web_enabled?: boolean;
  mobile_enabled?: boolean;
  sync_enabled?: boolean;
}

interface LicenseState {
  license: License | null;
  mode: LicensePlan;
  hardwareId: string | null;

  setLicense: (license: License) => void;
  setMode: (mode: LicensePlan) => void;
  setHardwareId: (id: string) => void;
  hasFeature: (feature: string) => boolean;
  isWithinLimit: (limit: string, current: number) => boolean;
  clearLicense: () => void;
}

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set, get) => ({
      license: null,
      mode: 'LOCAL',
      hardwareId: null,

      setLicense: (license) => set({ license, mode: license.plan }),

      setMode: (mode) => set({ mode }),

      setHardwareId: (id) => set({ hardwareId: id }),

      hasFeature: (feature) => {
        const { license } = get();
        if (!license) return false;

        const parts = feature.split('.');
        let value: any = license.features;

        for (const part of parts) {
          value = value?.[part];
        }

        return Boolean(value);
      },

      isWithinLimit: (limit, current) => {
        const { license } = get();
        if (!license) return false;

        const maxValue = license.features.limits[limit as keyof typeof license.features.limits];
        return current < maxValue;
      },

      clearLicense: () => set({
        license: null,
        mode: 'LOCAL',
        hardwareId: null,
      }),
    }),
    {
      name: 'license-storage',
    }
  )
);
