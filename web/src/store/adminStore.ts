import { create } from 'zustand';
import { Tenant, License } from '../types/license';

interface AdminState {
    tenants: Tenant[];
    licenses: License[];
    isLoading: boolean;
    selectedTenantId: string | null;

    // Actions
    fetchTenants: () => Promise<void>;
    fetchLicenses: () => Promise<void>;
    createLicense: (license: Omit<License, 'id'>) => Promise<void>;
    suspendTenant: (tenantId: string) => Promise<void>;
}

// Mock Data
const MOCK_TENANTS: Tenant[] = [
    {
        id: '1',
        name: 'Demo Dernek',
        slug: 'demo',
        contact_email: 'demo@dernek.com',
        phone: '0555 111 22 33',
        address: 'İstanbul, Türkiye',
        created_at: '2025-01-01T10:00:00Z',
        max_users: 1000,
        max_storage_mb: 5000,
        modules: ['AIDAT', 'MUHASEBE', 'UYELER']
    },
    {
        id: '2',
        name: 'Bader Yazılım A.Ş.',
        slug: 'bader',
        contact_email: 'info@baderyazilim.com',
        phone: '0850 111 22 33',
        address: 'Teknopark İstanbul',
        created_at: '2025-02-15T10:00:00Z',
        max_users: 50000,
        max_storage_mb: 100000,
        modules: ['ALL']
    }
];

const MOCK_LICENSES: License[] = [
    {
        id: 'L-1001',
        tenant_id: '1',
        tenant_name: 'Demo Dernek',
        key: 'XXXX-YYYY-ZZZZ-1111',
        type: 'STANDARD',
        status: 'ACTIVE',
        start_date: '2025-01-01',
        end_date: '2026-01-01',
        features: ['AIDAT', 'MUHASEBE'],
        price: 1500
    },
    {
        id: 'L-1002',
        tenant_id: '2',
        tenant_name: 'Bader Yazılım A.Ş.',
        key: 'AAAA-BBBB-CCCC-2222',
        type: 'ENTERPRISE',
        status: 'ACTIVE',
        start_date: '2025-02-15',
        end_date: '2030-02-15',
        features: ['ALL'],
        price: 0
    }
];

export const useAdminStore = create<AdminState>((set, get) => ({
    tenants: [],
    licenses: [],
    isLoading: false,
    selectedTenantId: null,

    fetchTenants: async () => {
        set({ isLoading: true });
        // Simulate API call
        setTimeout(() => {
            set({ tenants: MOCK_TENANTS, isLoading: false });
        }, 500);
    },

    fetchLicenses: async () => {
        set({ isLoading: true });
        setTimeout(() => {
            set({ licenses: MOCK_LICENSES, isLoading: false });
        }, 500);
    },

    createLicense: async (license) => {
        const newLicense = { ...license, id: `L-${Date.now()}` };
        set((state) => ({ licenses: [...state.licenses, newLicense] }));
    },

    suspendTenant: async (tenantId) => {
        set((state) => ({
            licenses: state.licenses.map(l =>
                l.tenant_id === tenantId ? { ...l, status: 'SUSPENDED' } : l
            )
        }));
    }
}));
