import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Shield, Building2, Key, Users, Settings, LogOut,
    TrendingUp, Activity, Server, Database,
    Plus, Search, MoreVertical, Check, X, ExternalLink
} from 'lucide-react';
import { superAdminStore } from './login';

const API_URL = 'http://157.90.154.48:8000';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    contact_email: string;
    status: string;
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
}

interface DashboardStats {
    total_tenants: number;
    active_tenants: number;
    total_licenses: number;
    active_licenses: number;
}

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [licenses, setLicenses] = useState<License[]>([]);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'tenants' | 'licenses'>('dashboard');

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
                setTenants(tenantsData);
            }

            // Load licenses
            const licensesRes = await fetch(`${API_URL}/api/v1/licenses`, { headers });
            if (licensesRes.ok) {
                const licensesData = await licensesRes.json();
                setLicenses(licensesData);
            }

            // Calculate stats
            setStats({
                total_tenants: tenants.length,
                active_tenants: tenants.filter(t => t.status === 'active').length,
                total_licenses: licenses.length,
                active_licenses: licenses.filter(l => l.is_active).length,
            });
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

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-800 border-r border-slate-700 p-4">
                {/* Logo */}
                <div className="flex items-center gap-3 px-2 py-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-white">BADER</h1>
                        <p className="text-xs text-slate-400">Super Admin</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="space-y-1">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: Activity },
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
                    <button
                        onClick={loadData}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                        Yenile
                    </button>
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
                                {/* Stats */}
                                <div className="grid grid-cols-4 gap-6">
                                    <StatCard title="Toplam Dernek" value={tenants.length} icon={Building2} color="from-blue-600 to-blue-700" />
                                    <StatCard title="Aktif Dernek" value={tenants.filter(t => t.status === 'active').length} icon={Check} color="from-green-600 to-green-700" />
                                    <StatCard title="Toplam Lisans" value={licenses.length} icon={Key} color="from-purple-600 to-purple-700" />
                                    <StatCard title="Aktif Lisans" value={licenses.filter(l => l.is_active).length} icon={Activity} color="from-pink-600 to-pink-700" />
                                </div>

                                {/* Recent Activity */}
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
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Kayıt</th>
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
                                                <td className="py-4 px-6 text-slate-400 text-sm">
                                                    {new Date(tenant.created_at).toLocaleDateString('tr-TR')}
                                                </td>
                                            </tr>
                                        ))}
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
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Tür</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Durum</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Başlangıç</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Bitiş</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {licenses.map((license) => (
                                            <tr key={license.id} className="hover:bg-slate-700/30 transition-colors">
                                                <td className="py-4 px-6 font-mono text-purple-400">{license.key}</td>
                                                <td className="py-4 px-6">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${license.license_type === 'HYBRID' ? 'bg-purple-500/20 text-purple-400' :
                                                        license.license_type === 'ONLINE' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                        {license.license_type}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${license.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        {license.is_active ? 'Aktif' : 'Pasif'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-slate-400 text-sm">
                                                    {new Date(license.start_date).toLocaleDateString('tr-TR')}
                                                </td>
                                                <td className="py-4 px-6 text-slate-400 text-sm">
                                                    {new Date(license.end_date).toLocaleDateString('tr-TR')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
