import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '@/store/authStore';

interface Uye {
  id: string;
  uye_no: string;
  tc_no: string;
  ad_soyad: string;
  telefon?: string;
  email?: string;
  giris_tarihi: string;
  durum: string;
  uyelik_tipi?: string;
  is_active?: boolean;
}

interface UyeBorcDurumu {
  uye_id: string;
  toplam_borc: number;
  odenen: number;
  kalan_borc: number;
}

interface UseUyelerOptions {
  search?: string | null;
  durum?: string | null;
  skip?: number;
  limit?: number;
  enabled?: boolean; // Query'i aktif etmek için
}

interface UseUyelerReturn {
  uyeler: Uye[];
  borcDurumlari: Record<string, UyeBorcDurumu>;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Üyeleri fetch eden ve cache'leyen React Query hook'u
 *
 * @example
 * const { uyeler, borcDurumlari, isLoading } = useUyeler({
 *   search: 'ahmet',
 *   durum: 'Aktif',
 *   limit: 100
 * });
 */
export const useUyeler = (options: UseUyelerOptions = {}): UseUyelerReturn => {
  const tenant = useAuthStore((state) => state.tenant);
  const {
    search = null,
    durum = null,
    skip = 0,
    limit = 100,
    enabled = true,
  } = options;

  // Üyeleri fetch et
  const {
    data: uyeler = [],
    isLoading: uyelerLoading,
    isError: uyelerError,
    error: uyelerErrorObj,
    refetch: refetchUyeler,
  } = useQuery({
    queryKey: ['uyeler', tenant?.id, search, durum, skip, limit],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant bulunamadı');

      const result = await invoke<Uye[]>('get_uyeler', {
        tenantIdParam: tenant.id,
        search,
        durum,
        skip,
        limit,
      });

      return result;
    },
    enabled: enabled && !!tenant,
    staleTime: 5 * 60 * 1000, // 5 dakika fresh
    gcTime: 10 * 60 * 1000, // 10 dakika cache
  });

  // Borç durumlarını fetch et
  const {
    data: borcDurumlariArray = [],
    isLoading: borcLoading,
    isError: borcError,
  } = useQuery({
    queryKey: ['uye_borc_durumlari', tenant?.id, uyeler.map(u => u.id)],
    queryFn: async () => {
      if (!tenant || uyeler.length === 0) return [];

      try {
        const uyeIds = uyeler.map(u => u.id);
        const result = await invoke<UyeBorcDurumu[]>('get_uye_borc_durumlari', {
          tenantIdParam: tenant.id,
          uyeIds,
        });
        return result;
      } catch (error) {
        console.error('Borç durumları yüklenemedi:', error);
        return [];
      }
    },
    enabled: enabled && !!tenant && uyeler.length > 0,
    staleTime: 2 * 60 * 1000, // 2 dakika fresh (borçlar daha sık değişebilir)
  });

  // Borç durumlarını map'e çevir (hızlı erişim için)
  const borcDurumlari = useMemo(() => {
    return borcDurumlariArray.reduce((acc, borc) => {
      acc[borc.uye_id] = borc;
      return acc;
    }, {} as Record<string, UyeBorcDurumu>);
  }, [borcDurumlariArray]);

  return {
    uyeler,
    borcDurumlari,
    isLoading: uyelerLoading || borcLoading,
    isError: uyelerError || borcError,
    error: uyelerErrorObj,
    refetch: refetchUyeler,
  };
};

/**
 * Üye sayısını fetch eden hook
 *
 * @example
 * const { count } = useUyelerCount();
 */
export const useUyelerCount = () => {
  const tenant = useAuthStore((state) => state.tenant);

  return useQuery({
    queryKey: ['uyeler_count', tenant?.id],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant bulunamadı');

      const result = await invoke<{ count: number }>('count_uyeler', {
        tenantIdParam: tenant.id,
      });

      return result.count;
    },
    enabled: !!tenant,
    staleTime: 10 * 60 * 1000, // 10 dakika fresh
  });
};
