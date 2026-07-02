import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// NOT: Web her zaman çevrimiçi çalışır ve doğrudan backend API'sini kullanır.
// Yerel veritabanı senkronizasyonu (manual_sync / get_sync_status) desktop'a
// özgüdür; bu store web'de no-op olarak davranır.
const SYNC_DESKTOP_ONLY_MESSAGE =
  'Senkronizasyon web sürümünde kullanılamaz: web her zaman çevrimiçi çalışır ve verileriniz doğrudan sunucuya kaydedilir.';

interface SyncState {
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingChanges: number;
  syncErrors: string[];
  
  startSync: () => void;
  finishSync: (success: boolean) => void;
  setPendingChanges: (count: number) => void;
  addSyncError: (error: string) => void;
  clearSyncErrors: () => void;
  
  loadSyncStatus: (tenantId: string) => Promise<void>;
  triggerManualSync: (tenantId: string, apiUrl: string, authToken: string) => Promise<void>;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      isSyncing: false,
      lastSyncAt: null,
      pendingChanges: 0,
      syncErrors: [],
      
      startSync: () => set({ isSyncing: true }),
      
      finishSync: (success) => set({
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
        ...(success && { pendingChanges: 0, syncErrors: [] }),
      }),
      
      setPendingChanges: (count) => set({ pendingChanges: count }),
      
      addSyncError: (error) => set((state) => ({
        syncErrors: [...state.syncErrors, error],
      })),
      
      clearSyncErrors: () => set({ syncErrors: [] }),

      loadSyncStatus: async (_tenantId: string) => {
        // Web online-only: bekleyen yerel değişiklik olamaz → no-op
        set({ pendingChanges: 0, isSyncing: false });
      },

      triggerManualSync: async (_tenantId: string, _apiUrl: string, _authToken: string) => {
        // Web online-only: manuel senkronizasyon desktop'a özgüdür → no-op + açıklama
        console.info(SYNC_DESKTOP_ONLY_MESSAGE);
        set({
          isSyncing: false,
          pendingChanges: 0,
          syncErrors: [SYNC_DESKTOP_ONLY_MESSAGE],
        });
      },
    }),
    {
      name: 'sync-storage',
    }
  )
);
