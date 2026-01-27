export interface Tenant {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    contact_email: string;
    phone: string;
    address: string;
    created_at: string;
    max_users: number; // Lisans limiti
    max_storage_mb: number; // Depolama limiti
    modules: string[]; // Aktif modüller
}

export interface License {
    id: string;
    tenant_id: string;
    tenant_name: string;
    key: string;
    type: 'TRIAL' | 'STANDARD' | 'PRO' | 'ENTERPRISE';
    status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
    start_date: string;
    end_date: string;
    features: string[]; // ['AIDAT', 'MUHASEBE', 'SMS', ...]
    price: number;
}
