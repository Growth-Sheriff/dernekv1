import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ConnectionMode = 'online' | 'offline' | 'hybrid';
type ThemeMode = 'light' | 'dark' | 'system';

interface AppState {
  // Bağlantı durumu
  isOnline: boolean;
  connectionMode: ConnectionMode;
  lastOnlineCheck: string | null;
  
  // Tema
  theme: ThemeMode;
  
  // Uygulama durumu
  isInitialized: boolean;
  isLoading: boolean;
  currentTenantId: string | null;
  
  // Bildirimler
  unreadNotifications: number;
  
  // Aksiyonlar
  setOnline: (online: boolean) => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  setTheme: (theme: ThemeMode) => void;
  setInitialized: (initialized: boolean) => void;
  setLoading: (loading: boolean) => void;
  setCurrentTenant: (tenantId: string | null) => void;
  setUnreadNotifications: (count: number) => void;
  incrementNotifications: () => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      isOnline: navigator.onLine,
      connectionMode: 'hybrid',
      lastOnlineCheck: null,
      theme: 'system',
      isInitialized: false,
      isLoading: false,
      currentTenantId: null,
      unreadNotifications: 0,

      // Aksiyonlar
      setOnline: (online) => set({ 
        isOnline: online,
        lastOnlineCheck: new Date().toISOString(),
      }),
      
      setConnectionMode: (mode) => set({ connectionMode: mode }),
      
      setTheme: (theme) => set({ theme }),
      
      setInitialized: (initialized) => set({ isInitialized: initialized }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setCurrentTenant: (tenantId) => set({ currentTenantId: tenantId }),
      
      setUnreadNotifications: (count) => set({ unreadNotifications: count }),
      
      incrementNotifications: () => set((state) => ({ 
        unreadNotifications: state.unreadNotifications + 1 
      })),
      
      clearNotifications: () => set({ unreadNotifications: 0 }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        // Sadece persist edilmesi gereken alanlar
        theme: state.theme,
        connectionMode: state.connectionMode,
        currentTenantId: state.currentTenantId,
      }),
    }
  )
);

export default useAppStore;
