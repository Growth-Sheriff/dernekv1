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

interface SavedCredentials {
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  savedCredentials: SavedCredentials | null;
  
  login: (user: User, tenant: Tenant, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setRememberMe: (value: boolean) => void;
  saveCredentials: (email: string, password: string) => void;
  clearCredentials: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      token: null,
      isAuthenticated: false,
      rememberMe: true,
      savedCredentials: null,
      
      login: (user, tenant, token) => set({
        user,
        tenant,
        token,
        isAuthenticated: true,
      }),
      
      logout: () => set({
        user: null,
        tenant: null,
        token: null,
        isAuthenticated: false,
      }),
        
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),

      setRememberMe: (value) => set({ rememberMe: value }),
      
      saveCredentials: (email, password) => set({
        savedCredentials: { email, password },
      }),
      
      clearCredentials: () => set({
        savedCredentials: null,
      }),
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
              isAuthenticated: state.isAuthenticated, 
              rememberMe: state.rememberMe,
              savedCredentials: state.savedCredentials,
            }
          : { rememberMe: state.rememberMe },
    }
  )
);
