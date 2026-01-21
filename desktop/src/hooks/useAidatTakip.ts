import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '@/store/authStore';

interface AidatTakip {
  id: string;
  uye_id: string;
  uye_ad_soyad: string;
  yil: number;
  tutar: number;
  odenen_tutar: number;
  kalan_tutar: number;
  son_odeme_tarihi?: string;
  durum: 'ÖDENDİ' | 'KISMİ' | 'ÖDENMEDİ' | 'GECİKMİŞ';
  created_at: string;
}

interface UseAidatTakipOptions {
  filterYil?: number | null;
  skip?: number;
  limit?: number;
  enabled?: boolean;
}

interface UseAidatTakipReturn {
  aidatlar: AidatTakip[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Aidat takip verilerini fetch eden ve cache'leyen React Query hook'u
 *
 * @example
 * const { aidatlar, isLoading } = useAidatTakip({
 *   filterYil: 2024,
 *   limit: 1000
 * });
 */
export const useAidatTakip = (options: UseAidatTakipOptions = {}): UseAidatTakipReturn => {
  const tenant = useAuthStore((state) => state.tenant);
  const {
    filterYil = null,
    skip = 0,
    limit = 1000,
    enabled = true,
  } = options;

  const {
    data: aidatlar = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['aidat_takip', tenant?.id, filterYil, skip, limit],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant bulunamadı');

      const result = await invoke<AidatTakip[]>('get_aidat_takip', {
        tenantIdParam: tenant.id,
        filterYil,
        skip,
        limit,
      });

      return result;
    },
    enabled: enabled && !!tenant,
    staleTime: 3 * 60 * 1000, // 3 dakika fresh (ödeme güncellemeleri için biraz daha kısa)
    gcTime: 10 * 60 * 1000, // 10 dakika cache
  });

  return {
    aidatlar,
    isLoading,
    isError,
    error,
    refetch,
  };
};
