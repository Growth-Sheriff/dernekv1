import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '@/store/authStore';

interface Gelir {
  id: string;
  kasa_id: string;
  kasa_adi?: string;
  tarih: string;
  tutar: number;
  gelir_turu?: string;
  aciklama?: string;
  makbuz_no?: string;
  uye_id?: string;
  uye_ad_soyad?: string;
  aidat_id?: string;
  created_at: string;
}

interface UseGelirlerOptions {
  baslangicTarih?: string | null;
  bitisTarih?: string | null;
  gelirTuruId?: string | null;
  skip?: number;
  limit?: number;
  enabled?: boolean;
}

interface UseGelirlerReturn {
  gelirler: Gelir[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Gelirler verilerini fetch eden ve cache'leyen React Query hook'u
 *
 * @example
 * const { gelirler, isLoading } = useGelirler({
 *   baslangicTarih: '2024-01-01',
 *   bitisTarih: '2024-12-31',
 *   limit: 1000
 * });
 */
export const useGelirler = (options: UseGelirlerOptions = {}): UseGelirlerReturn => {
  const tenant = useAuthStore((state) => state.tenant);
  const {
    baslangicTarih = null,
    bitisTarih = null,
    gelirTuruId = null,
    skip = 0,
    limit = 1000,
    enabled = true,
  } = options;

  const {
    data: gelirler = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['gelirler', tenant?.id, baslangicTarih, bitisTarih, gelirTuruId, skip, limit],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant bulunamadı');

      const result = await invoke<Gelir[]>('get_gelirler', {
        tenantIdParam: tenant.id,
        baslangicTarih,
        bitisTarih,
        gelirTuruId,
        skip,
        limit,
      });

      return result;
    },
    enabled: enabled && !!tenant,
    staleTime: 3 * 60 * 1000, // 3 dakika fresh (mali kayıtlar için biraz kısa)
    gcTime: 10 * 60 * 1000, // 10 dakika cache
  });

  return {
    gelirler,
    isLoading,
    isError,
    error,
    refetch,
  };
};
