import { useState, useEffect, useCallback } from 'react';
import { VisibilityState } from '@tanstack/react-table';

const STORAGE_KEY_PREFIX = 'bader_column_visibility_';

/**
 * Sütun görünürlük tercihlerini localStorage'da saklar
 * @param tableId - Benzersiz tablo ID'si (örn: 'uyeler_list', 'giderler_list')
 * @param defaultVisibility - Varsayılan görünürlük durumu
 */
export function useColumnVisibility(
  tableId: string,
  defaultVisibility: VisibilityState = {}
) {
  const storageKey = `${STORAGE_KEY_PREFIX}${tableId}`;
  
  // localStorage'dan başlangıç değerini oku
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window === 'undefined') return defaultVisibility;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Column visibility localStorage okuma hatası:', error);
    }
    return defaultVisibility;
  });

  // Değişiklikleri localStorage'a kaydet
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
    } catch (error) {
      console.error('Column visibility localStorage yazma hatası:', error);
    }
  }, [columnVisibility, storageKey]);

  // Görünürlük durumunu sıfırla
  const resetVisibility = useCallback(() => {
    setColumnVisibility(defaultVisibility);
  }, [defaultVisibility]);

  // Tek bir sütunun görünürlüğünü değiştir
  const toggleColumn = useCallback((columnId: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: prev[columnId] === false ? true : false,
    }));
  }, []);

  // Sütunun görünür olup olmadığını kontrol et
  const isColumnVisible = useCallback((columnId: string): boolean => {
    return columnVisibility[columnId] !== false;
  }, [columnVisibility]);

  // Tüm sütunları göster
  const showAllColumns = useCallback(() => {
    setColumnVisibility({});
  }, []);

  // Belirli sütunları gizle (ID listesi)
  const hideColumns = useCallback((columnIds: string[]) => {
    setColumnVisibility(prev => {
      const next = { ...prev };
      columnIds.forEach(id => {
        next[id] = false;
      });
      return next;
    });
  }, []);

  return {
    columnVisibility,
    setColumnVisibility,
    toggleColumn,
    isColumnVisible,
    resetVisibility,
    showAllColumns,
    hideColumns,
  };
}

/**
 * Tablo için varsayılan sütun görünürlük ayarları
 */
export const DEFAULT_COLUMN_VISIBILITY: Record<string, VisibilityState> = {
  uyeler_list: {
    // Varsayılan olarak tüm sütunlar görünür
  },
  giderler_list: {
    created_at: false, // Oluşturulma tarihi varsayılan gizli
    updated_at: false,
  },
  gelirler_list: {
    created_at: false,
    updated_at: false,
  },
  aidat_list: {
    created_at: false,
  },
  demirbaslar_list: {
    created_at: false,
    updated_at: false,
  },
  cariler_list: {
    created_at: false,
  },
  kasalar_list: {},
  belgeler_list: {
    created_at: false,
  },
};

export default useColumnVisibility;
