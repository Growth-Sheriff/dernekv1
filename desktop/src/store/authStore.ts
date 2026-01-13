import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isAuthenticated: boolean;
  
  login: (user: User, tenant: Tenant, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      token: null,
      isAuthenticated: false,
      
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
    }),
    {
      name: 'auth-storage',
    }
  )
);
