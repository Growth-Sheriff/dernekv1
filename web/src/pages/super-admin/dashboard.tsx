import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Shield, Building2, Key, Users, LogOut,
    Plus, Search, MoreVertical, Check, X, Edit2, Trash2,
    Calendar, Mail, Phone, Globe, Cpu, Smartphone, Monitor,
    RefreshCw, ChevronDown, Copy
} from 'lucide-react';
import { superAdminStore } from './login';

const API_URL = 'http://157.90.154.48:8000';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    contact_email: string;
    phone?: string;
    status: string;
    max_users: number;
    max_storage_mb: number;
    created_at: string;
}

interface License {
    id: string;
    tenant_id: string;
    key: string;
    license_type: string;
    is_active: boolean;
    start_date: string;
    end_date: string;
    desktop_enabled?: boolean;
    web_enabled?: boolean;
    mobile_enabled?: boolean;
    sync_enabled?: boolean;
}

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [licenses, setLicenses] = useState<License[]>([]);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'tenants' | 'licenses'>('dashboard');

    // Modals
    const [showTenantModal, setShowTenantModal] = useState(false);
    const [showLicenseModal, setShowLicenseModal] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [editingLicense, setEditingLicense] = useState<License | null>(null);

    const user = superAdminStore.getUser();
    const token = superAdminStore.getToken();

    useEffect(() => {
        if (!superAdminStore.isAuthenticated()) {
            navigate('/super-admin/login');
            return;
        }
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            // Load tenants
            const tenantsRes = await fetch(`${API_URL}/api/v1/tenants`, { headers });
            if (tenantsRes.ok) {
                const tenantsData = await tenantsRes.json();
                setTenants(Array.isArray(tenantsData) ? tenantsData : []);
            }

            // Load licenses
            const licensesRes = await fetch(`${API_URL}/api/v1/licenses`, { headers });
            if (licensesRes.ok) {
                const licensesData = await licensesRes.json();
                setLicenses(Array.isArray(licensesData) ? licensesData : []);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Veriler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        superAdminStore.clearAuth();
        toast.success('Çıkış yapıldı');
        navigate('/super-admin/login');
    };

    // ==================== TENANT CRUD ====================
    const createTenant = async (data: Partial<Tenant>) => {
        try {
            const res = await fetch(`${API_URL}/api/v1/tenants`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Dernek oluşturulamadı');
            toast.success('Dernek oluşturuldu!');
            setShowTenantModal(false);
            loadData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const deleteTenant = async (id: string) => {
        if (!confirm('Bu derneği silmek istediğinizden emin misiniz?')) return;
        try {
            const res = await fetch(`${API_URL}/api/v1/tenants/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Dernek silinemedi');
            toast.success('Dernek silindi');
            loadData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    // ==================== LICENSE CRUD ====================
    const generateLicenseKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const segments = [];
        for (let i = 0; i < 4; i++) {
            let segment = '';
            for (let j = 0; j < 4; j++) {
                segment += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            segments.push(segment);
        }
        return segments.join('-');
    };

    const createLicense = async (data: any) => {
        try {
            const res = await fetch(`${API_URL}/api/v1/licenses`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...data,
                    key: data.key || generateLicenseKey()
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Lisans oluşturulamadı');
            }
            toast.success('Lisans oluşturuldu!');
            setShowLicenseModal(false);
            loadData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const toggleLicenseActive = async (license: License) => {
        try {
            const res = await fetch(`${API_URL}/api/v1/licenses/${license.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: !license.is_active })
            });
            if (!res.ok) throw new Error('Lisans güncellenemedi');
            toast.success(license.is_active ? 'Lisans devre dışı bırakıldı' : 'Lisans aktif edildi');
            loadData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const copyLicenseKey = (key: string) => {
        navigator.clipboard.writeText(key);
        toast.success('Lisans anahtarı kopyalandı!');
    };

    // ==================== COMPONENTS ====================
    const StatCard = ({ title, value, icon: Icon, color }: any) => (
        <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-white/70 text-sm font-medium">{title}</p>
                    <p className="text-3xl font-bold mt-1">{value}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );

    // Tenant Modal
    const TenantModal = () => {
        const [form, setForm] = useState({
            name: editingTenant?.name || '',
            slug: editingTenant?.slug || '',
            contact_email: editingTenant?.contact_email || '',
            phone: editingTenant?.phone || '',
            max_users: editingTenant?.max_users || 10,
            max_storage_mb: editingTenant?.max_storage_mb || 1024,
        });

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            createTenant(form);
        };

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg">
                    <h3 className="text-xl font-bold text-white mb-6">
                        {editingTenant ? 'Derneği Düzenle' : 'Yeni Dernek Ekle'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Dernek Adı *</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Slug</label>
                            <input
                                type="text"
                                value={form.slug}
                                onChange={e => setForm({ ...form, slug: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={form.contact_email}
                                    onChange={e => setForm({ ...form, contact_email: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Telefon</label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Max Kullanıcı</label>
                                <input
                                    type="number"
                                    value={form.max_users}
                                    onChange={e => setForm({ ...form, max_users: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Max Depolama (MB)</label>
                                <input
                                    type="number"
                                    value={form.max_storage_mb}
                                    onChange={e => setForm({ ...form, max_storage_mb: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => { setShowTenantModal(false); setEditingTenant(null); }}
                                className="flex-1 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                            >
                                {editingTenant ? 'Güncelle' : 'Oluştur'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    // License Modal
    const LicenseModal = () => {
        const [form, setForm] = useState({
            tenant_id: '',
            license_type: 'HYBRID',
            key: generateLicenseKey(),
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            desktop_enabled: true,
            web_enabled: true,
            mobile_enabled: false,
            sync_enabled: true,
        });

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!form.tenant_id) {
                toast.error('Lütfen bir dernek seçin');
                return;
            }
            createLicense(form);
        };

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-bold text-white mb-6">Yeni Lisans Oluştur</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Dernek Seçimi */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Dernek *</label>
                            <select
                                value={form.tenant_id}
                                onChange={e => setForm({ ...form, tenant_id: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                                required
                            >
                                <option value="">Dernek Seçin...</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Lisans Tipi */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Lisans Tipi *</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['LOCAL', 'ONLINE', 'HYBRID'].map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setForm({ ...form, license_type: type })}
                                        className={`py-3 rounded-xl font-medium transition-all ${form.license_type === type
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Lisans Anahtarı */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Lisans Anahtarı</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={form.key}
                                    onChange={e => setForm({ ...form, key: e.target.value })}
                                    className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, key: generateLicenseKey() })}
                                    className="px-4 bg-slate-700 rounded-xl hover:bg-slate-600"
                                >
                                    <RefreshCw className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Tarihler */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Başlangıç</label>
                                <input
                                    type="date"
                                    value={form.start_date}
                                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Bitiş</label>
                                <input
                                    type="date"
                                    value={form.end_date}
                                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white"
                                />
                            </div>
                        </div>

                        {/* Platform Seçenekleri */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Platform Erişimleri</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { key: 'desktop_enabled', label: 'Desktop', icon: Monitor },
                                    { key: 'web_enabled', label: 'Web', icon: Globe },
                                    { key: 'mobile_enabled', label: 'Mobil', icon: Smartphone },
                                    { key: 'sync_enabled', label: 'Sync', icon: RefreshCw },
                                ].map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setForm({ ...form, [key]: !(form as any)[key] })}
                                        className={`flex items-center gap-2 py-3 px-4 rounded-xl transition-all ${(form as any)[key]
                                                ? 'bg-green-600/20 border border-green-500 text-green-400'
                                                : 'bg-slate-700 border border-slate-600 text-slate-400'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {label}
                                        {(form as any)[key] && <Check className="w-4 h-4 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowLicenseModal(false)}
                                className="flex-1 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                            >
                                Lisans Oluştur
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-800 border-r border-slate-700 p-4">
                <div className="flex items-center gap-3 px-2 py-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-white">BADER</h1>
                        <p className="text-xs text-slate-400">Super Admin</p>
                    </div>
                </div>

                <nav className="space-y-1">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: Shield },
                        { id: 'tenants', label: 'Dernekler', icon: Building2 },
                        { id: 'licenses', label: 'Lisanslar', icon: Key },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                                    ? 'bg-purple-600 text-white'
                                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* User */}
                <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-slate-700/50 rounded-xl p-3">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                                {user?.full_name?.charAt(0) || 'A'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
                                <p className="text-slate-400 text-xs truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            Çıkış Yap
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            {activeTab === 'dashboard' && 'Dashboard'}
                            {activeTab === 'tenants' && 'Dernek Yönetimi'}
                            {activeTab === 'licenses' && 'Lisans Yönetimi'}
                        </h1>
                        <p className="text-slate-400 mt-1">
                            {activeTab === 'dashboard' && 'Sistem durumu ve özet bilgiler'}
                            {activeTab === 'tenants' && 'Kayıtlı dernekleri yönetin'}
                            {activeTab === 'licenses' && 'Lisansları görüntüleyin ve yönetin'}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={loadData}
                            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        {activeTab === 'tenants' && (
                            <button
                                onClick={() => { setEditingTenant(null); setShowTenantModal(true); }}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Dernek Ekle
                            </button>
                        )}
                        {activeTab === 'licenses' && (
                            <button
                                onClick={() => setShowLicenseModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Lisans Oluştur
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Dashboard Tab */}
                        {activeTab === 'dashboard' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-4 gap-6">
                                    <StatCard title="Toplam Dernek" value={tenants.length} icon={Building2} color="from-blue-600 to-blue-700" />
                                    <StatCard title="Aktif Dernek" value={tenants.filter(t => t.status === 'active').length} icon={Check} color="from-green-600 to-green-700" />
                                    <StatCard title="Toplam Lisans" value={licenses.length} icon={Key} color="from-purple-600 to-purple-700" />
                                    <StatCard title="Aktif Lisans" value={licenses.filter(l => l.is_active).length} icon={Shield} color="from-pink-600 to-pink-700" />
                                </div>

                                {/* Quick Actions */}
                                <div className="bg-slate-800 rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Hızlı İşlemler</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <button
                                            onClick={() => { setActiveTab('tenants'); setShowTenantModal(true); }}
                                            className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors"
                                        >
                                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                                <Building2 className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <span className="text-white font-medium">Yeni Dernek</span>
                                        </button>
                                        <button
                                            onClick={() => { setActiveTab('licenses'); setShowLicenseModal(true); }}
                                            className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors"
                                        >
                                            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                                <Key className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <span className="text-white font-medium">Yeni Lisans</span>
                                        </button>
                                        <button
                                            onClick={loadData}
                                            className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors"
                                        >
                                            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                                <RefreshCw className="w-5 h-5 text-green-400" />
                                            </div>
                                            <span className="text-white font-medium">Verileri Yenile</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Recent Tenants */}
                                <div className="bg-slate-800 rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Son Kayıtlar</h3>
                                    <div className="space-y-3">
                                        {tenants.slice(0, 5).map((tenant) => (
                                            <div key={tenant.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                                        <Building2 className="w-5 h-5 text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">{tenant.name}</p>
                                                        <p className="text-slate-400 text-sm">{tenant.contact_email}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${tenant.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {tenant.status === 'active' ? 'Aktif' : 'Pasif'}
                                                </span>
                                            </div>
                                        ))}
                                        {tenants.length === 0 && (
                                            <p className="text-slate-400 text-center py-8">Henüz kayıtlı dernek yok</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tenants Tab */}
                        {activeTab === 'tenants' && (
                            <div className="bg-slate-800 rounded-2xl overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-700/50">
                                        <tr>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Dernek</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Email</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Slug</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Durum</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {tenants.map((tenant) => (
                                            <tr key={tenant.id} className="hover:bg-slate-700/30 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                                            {tenant.name.charAt(0)}
                                                        </div>
                                                        <span className="text-white font-medium">{tenant.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-slate-300">{tenant.contact_email}</td>
                                                <td className="py-4 px-6 text-slate-400 font-mono text-sm">{tenant.slug}</td>
                                                <td className="py-4 px-6">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${tenant.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        {tenant.status === 'active' ? 'Aktif' : 'Pasif'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <button
                                                        onClick={() => deleteTenant(tenant.id)}
                                                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {tenants.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center text-slate-400">
                                                    Henüz kayıtlı dernek yok. "Dernek Ekle" butonunu kullanarak yeni dernek ekleyebilirsiniz.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Licenses Tab */}
                        {activeTab === 'licenses' && (
                            <div className="bg-slate-800 rounded-2xl overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-700/50">
                                        <tr>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Lisans Key</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Dernek</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Tür</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Platformlar</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Durum</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Bitiş</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {licenses.map((license) => {
                                            const tenant = tenants.find(t => t.id === license.tenant_id);
                                            return (
                                                <tr key={license.id} className="hover:bg-slate-700/30 transition-colors">
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-2">
                                                            <code className="text-purple-400 font-mono text-sm">{license.key}</code>
                                                            <button
                                                                onClick={() => copyLicenseKey(license.key)}
                                                                className="p-1 text-slate-400 hover:text-white"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-slate-300">{tenant?.name || '-'}</td>
                                                    <td className="py-4 px-6">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${license.license_type === 'HYBRID' ? 'bg-purple-500/20 text-purple-400' :
                                                                license.license_type === 'ONLINE' ? 'bg-blue-500/20 text-blue-400' :
                                                                    'bg-gray-500/20 text-gray-400'
                                                            }`}>
                                                            {license.license_type}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex gap-1">
                                                            {license.desktop_enabled && <Monitor className="w-4 h-4 text-green-400" title="Desktop" />}
                                                            {license.web_enabled && <Globe className="w-4 h-4 text-blue-400" title="Web" />}
                                                            {license.mobile_enabled && <Smartphone className="w-4 h-4 text-yellow-400" title="Mobil" />}
                                                            {license.sync_enabled && <RefreshCw className="w-4 h-4 text-purple-400" title="Sync" />}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <button
                                                            onClick={() => toggleLicenseActive(license)}
                                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${license.is_active
                                                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                                }`}
                                                        >
                                                            {license.is_active ? 'Aktif' : 'Pasif'}
                                                        </button>
                                                    </td>
                                                    <td className="py-4 px-6 text-slate-400 text-sm">
                                                        {new Date(license.end_date).toLocaleDateString('tr-TR')}
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <button
                                                            onClick={() => copyLicenseKey(license.key)}
                                                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                                            title="Lisans anahtarını kopyala"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {licenses.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-slate-400">
                                                    Henüz kayıtlı lisans yok. "Lisans Oluştur" butonunu kullanarak yeni lisans ekleyebilirsiniz.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Modals */}
            {showTenantModal && <TenantModal />}
            {showLicenseModal && <LicenseModal />}
        </div>
    );
}
