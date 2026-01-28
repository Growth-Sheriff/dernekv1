import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  full_name: string;
  tenant_id: string;
  role?: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
}

interface License {
  key: string;
  type: string;  // LOCAL, ONLINE, HYBRID
  desktop_enabled: boolean;
  web_enabled: boolean;
  mobile_enabled: boolean;
  sync_enabled: boolean;
  end_date: string;
}

interface SavedCredentials {
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  license: License | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  savedCredentials: SavedCredentials | null;
  _hasHydrated: boolean;

  login: (user: User, tenant: Tenant, token: string, license?: License | null) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  updateLicense: (license: License) => void;
  setRememberMe: (value: boolean) => void;
  saveCredentials: (email: string, password: string) => void;
  clearCredentials: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      token: null,
      license: null,
      isAuthenticated: false,
      rememberMe: true,
      savedCredentials: null,
      _hasHydrated: false,

      login: (user, tenant, token, license = null) => {
        // Configure sync service based on license
        const licenseMode = license?.type?.toLowerCase() === 'hybrid' ? 'hybrid'
          : license?.type?.toLowerCase() === 'online' ? 'online'
            : 'local';

        // Try to configure sync service (async import to avoid issues)
        import('@/services/syncService').then(({ syncService }) => {
          syncService.configure(token, licenseMode as any);
          console.log(`🔄 SyncService configured: ${licenseMode}`);
        }).catch(e => console.warn('SyncService not available:', e));

        set({
          user,
          tenant,
          token,
          license,
          isAuthenticated: true,
        });
      },

      logout: () => set({
        user: null,
        tenant: null,
        token: null,
        license: null,
        isAuthenticated: false,
      }),

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),

      updateLicense: (license) => set({ license }),

      setRememberMe: (value) => set({ rememberMe: value }),

      saveCredentials: (email, password) => set({
        savedCredentials: { email, password },
      }),

      clearCredentials: () => set({
        savedCredentials: null,
      }),

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) =>
        state.rememberMe
          ? {
            user: state.user,
            tenant: state.tenant,
            token: state.token,
            license: state.license,
            isAuthenticated: state.isAuthenticated,
            rememberMe: state.rememberMe,
            savedCredentials: state.savedCredentials,
          }
          : { rememberMe: state.rememberMe, savedCredentials: state.savedCredentials },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);

        // Re-configure sync service on rehydration
        if (state?.token && state?.license) {
          const licenseMode = state.license.type?.toLowerCase() === 'hybrid' ? 'hybrid'
            : state.license.type?.toLowerCase() === 'online' ? 'online'
              : 'local';

          import('@/services/syncService').then(({ syncService }) => {
            syncService.configure(state.token!, licenseMode as any);
          }).catch(() => { });
        }
      },
    }
  )
);
