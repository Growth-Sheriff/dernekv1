import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '@/store/authStore';
import type { ColumnConfig, PageKey, SortConfig, SortDirection } from '@/types/columnConfig';
import { getNextSortDirection } from '@/utils/sorting';

interface UseColumnConfigOptions {
  pageKey: PageKey;
  defaultVisible: string[];
  defaultOrder: string[];
}

interface UseColumnConfigReturn {
  config: ColumnConfig | null;
  isLoading: boolean;
  saveConfig: (config: ColumnConfig) => Promise<void>;
  resetConfig: () => Promise<void>;
  updateVisibleColumns: (visible: string[]) => Promise<void>;
  updateColumnOrder: (order: string[]) => Promise<void>;
  updateSort: (columnId: string, direction: SortDirection) => Promise<void>;
  toggleSort: (columnId: string) => Promise<void>;
}

/**
 * Sütun yapılandırmasını yöneten React hook
 *
 * - Backend'den kullanıcı tercihlerini çeker
 * - LocalStorage fallback sağlar
 * - Değişiklikleri otomatik kaydeder
 */
export const useColumnConfig = ({
  pageKey,
  defaultVisible,
  defaultOrder,
}: UseColumnConfigOptions): UseColumnConfigReturn => {
  const tenant = useAuthStore((state) => state.tenant);
  const user = useAuthStore((state) => state.user);

  const [config, setConfig] = useState<ColumnConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Default değerleri ref ile sabitle (sonsuz döngü önleme)
  const defaultVisibleRef = useRef(defaultVisible);
  const defaultOrderRef = useRef(defaultOrder);

  // LocalStorage key
  const localStorageKey = `column_config_${pageKey}_${tenant?.id}_${user?.id}`;

  // Backend'den config'i yükle
  const loadConfig = useCallback(async () => {
    if (!tenant || !user || hasLoaded) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Backend'den yükle
      const result = await invoke<ColumnConfig | null>('get_column_preferences', {
        tenantIdParam: tenant.id,
        userId: user.id,
        pageKey,
      });

      if (result) {
        setConfig(result);
        // LocalStorage'a da kaydet (offline fallback)
        localStorage.setItem(localStorageKey, JSON.stringify(result));
      } else {
        // Backend'de yoksa LocalStorage'a bak
        const cached = localStorage.getItem(localStorageKey);
        if (cached) {
          setConfig(JSON.parse(cached));
        } else {
          // Hiçbiri yoksa default config kullan
          const defaultConfig: ColumnConfig = {
            visible: defaultVisibleRef.current,
            order: defaultOrderRef.current,
          };
          setConfig(defaultConfig);
        }
      }
      setHasLoaded(true);
    } catch (error) {
      console.error('Failed to load column config:', error);

      // Hata durumunda LocalStorage'tan yükle
      const cached = localStorage.getItem(localStorageKey);
      if (cached) {
        try {
          setConfig(JSON.parse(cached));
        } catch {
          // Parse hatası varsa default
          setConfig({
            visible: defaultVisibleRef.current,
            order: defaultOrderRef.current,
          });
        }
      } else {
        setConfig({
          visible: defaultVisibleRef.current,
          order: defaultOrderRef.current,
        });
      }
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, user?.id, pageKey, localStorageKey, hasLoaded]);

  // Component mount'ta yükle
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Config'i kaydet
  const saveConfig = useCallback(async (newConfig: ColumnConfig) => {
    if (!tenant || !user) {
      console.warn('Cannot save config: no tenant or user');
      return;
    }

    try {
      // Önce state'i güncelle (optimistic update)
      setConfig(newConfig);
      localStorage.setItem(localStorageKey, JSON.stringify(newConfig));

      // Backend'e kaydet
      await invoke('save_column_preferences', {
        tenantIdParam: tenant.id,
        userId: user.id,
        request: {
          page_key: pageKey,
          columns_config: newConfig,
        },
      });
    } catch (error) {
      console.error('Failed to save column config:', error);
      // Hata durumunda en azından LocalStorage'da kalır
    }
  }, [tenant, user, pageKey, localStorageKey]);

  // Config'i sıfırla
  const resetConfig = useCallback(async () => {
    if (!tenant || !user) return;

    try {
      await invoke('reset_column_preferences', {
        tenantIdParam: tenant.id,
        userId: user.id,
        pageKey,
      });

      // Default config'e dön
      const defaultConfig: ColumnConfig = {
        visible: defaultVisible,
        order: defaultOrder,
      };

      setConfig(defaultConfig);
      localStorage.removeItem(localStorageKey);
    } catch (error) {
      console.error('Failed to reset column config:', error);
    }
  }, [tenant, user, pageKey, defaultVisible, defaultOrder, localStorageKey]);

  // Sadece visible columns'ı güncelle
  const updateVisibleColumns = useCallback(async (visible: string[]) => {
    if (!config) return;

    const newConfig: ColumnConfig = {
      ...config,
      visible,
    };

    await saveConfig(newConfig);
  }, [config, saveConfig]);

  // Sadece column order'ı güncelle
  const updateColumnOrder = useCallback(async (order: string[]) => {
    if (!config) return;

    const newConfig: ColumnConfig = {
      ...config,
      order,
    };

    await saveConfig(newConfig);
  }, [config, saveConfig]);

  // Sıralama yapılandırmasını güncelle
  const updateSort = useCallback(async (columnId: string, direction: SortDirection) => {
    if (!config) return;

    const sortConfig: SortConfig | undefined = direction
      ? { columnId, direction }
      : undefined;

    const newConfig: ColumnConfig = {
      ...config,
      sort: sortConfig,
    };

    await saveConfig(newConfig);
  }, [config, saveConfig]);

  // Sıralamayı toggle et (null -> asc -> desc -> null)
  const toggleSort = useCallback(async (columnId: string) => {
    if (!config) return;

    const currentDirection = config.sort?.columnId === columnId
      ? config.sort.direction
      : null;

    const nextDirection = getNextSortDirection(currentDirection);

    await updateSort(columnId, nextDirection);
  }, [config, updateSort]);

  return {
    config,
    isLoading,
    saveConfig,
    resetConfig,
    updateVisibleColumns,
    updateColumnOrder,
    updateSort,
    toggleSort,
  };
};
