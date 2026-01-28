import { create } from 'zustand';
import { invoke } from '@/lib/api-client';

// Types (Backend'e uygun)
interface Tenant {
    id: string;
    name: string;
    slug: string;
    contact_email: string;
    phone?: string;
    max_users: number;
    max_storage_mb: number;
    status: string;
    created_at: string;
}

interface License {
    id: string;
    tenant_id: string;
    tenant_name?: string;
    key: string;
    license_type: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
}

interface AdminState {
    tenants: Tenant[];
    licenses: License[];
    isLoading: boolean;

    // Actions
    fetchTenants: () => Promise<void>;
    createTenant: (data: any) => Promise<void>;
    deleteTenant: (id: string) => Promise<void>;
    suspendTenant: (id: string) => Promise<void>;

    fetchLicenses: () => Promise<void>;
    createLicense: (data: any) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
    tenants: [],
    licenses: [],
    isLoading: false,

    fetchTenants: async () => {
        set({ isLoading: true });
        try {
            const data = await invoke<Tenant[]>('get_tenants_list');
            set({ tenants: data || [] });
        } catch (error) {
            console.error(error);
        } finally {
            set({ isLoading: false });
        }
    },

    createTenant: async (data) => {
        set({ isLoading: true });
        try {
            await invoke('create_tenant', { ...data });
            await get().fetchTenants();
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    deleteTenant: async (id) => {
        try {
            await invoke('delete_tenant', { tenantId: id });
            await get().fetchTenants();
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    suspendTenant: async (id) => {
        try {
            await invoke('update_tenant', { tenantId: id, status: 'suspended' });
            await get().fetchTenants();
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    fetchLicenses: async () => {
        set({ isLoading: true });
        try {
            const data = await invoke<License[]>('get_all_licenses');
            set({ licenses: data || [] });
        } catch (error) {
            console.error(error);
        } finally {
            set({ isLoading: false });
        }
    },

    createLicense: async (data) => {
        set({ isLoading: true });
        try {
            await invoke('create_license', { ...data }); // API endpoint is create_license mapped to POST /licenses/
            await get().fetchLicenses();
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    }
}));
