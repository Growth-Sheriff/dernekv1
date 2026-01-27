import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

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

      loadSyncStatus: async (tenantId: string) => {
        try {
          const status = await invoke<{
            pending_changes: number;
            last_sync_at: string | null;
            is_syncing: boolean;
          }>('get_sync_status', { tenantIdParam: tenantId });
          
          set({
            pendingChanges: status.pending_changes,
            lastSyncAt: status.last_sync_at,
            isSyncing: status.is_syncing,
          });
        } catch (error) {
          console.error('Failed to load sync status:', error);
        }
      },

      triggerManualSync: async (tenantId: string, apiUrl: string, authToken: string) => {
        set({ isSyncing: true, syncErrors: [] });
        
        try {
          const result = await invoke<{
            success: boolean;
            synced_count: number;
            failed_count: number;
            errors: string[];
          }>('manual_sync', {
            tenantIdParam: tenantId,
            apiUrl,
            authToken,
          });

          if (result.success) {
            set({
              isSyncing: false,
              lastSyncAt: new Date().toISOString(),
              pendingChanges: 0,
              syncErrors: [],
            });
          } else {
            set({
              isSyncing: false,
              syncErrors: result.errors,
            });
          }
        } catch (error) {
          set({
            isSyncing: false,
            syncErrors: [String(error)],
          });
        }
      },
    }),
    {
      name: 'sync-storage',
    }
  )
);
