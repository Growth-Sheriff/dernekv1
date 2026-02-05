import React, { useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { Users, Building2, Key, CreditCard, TrendingUp } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    </div>
);

export default function AdminDashboard() {
    const { fetchStats, tenants, licenses } = useAdminStore((state) => ({
        tenants: state.tenants,
        licenses: state.licenses,
        fetchStats: async () => { await state.fetchTenants(); await state.fetchLicenses(); }
    }));

    useEffect(() => {
        fetchStats();
    }, []);

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Süper Admin Paneli</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard title="Toplam Dernek" value={tenants.length} icon={Building2} color="bg-blue-500" />
                <StatCard title="Aktif Lisans" value={licenses.filter(l => l.is_active).length} icon={Key} color="bg-green-500" />
                <StatCard title="Toplam Kullanıcı" value="52,140" icon={Users} color="bg-indigo-500" />
                <StatCard title="Aylık Ciro" value="₺124,500" icon={TrendingUp} color="bg-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Son Kayıt Olanlar */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800">Son Kayıt Olan Dernekler</h2>
                        <button className="text-sm text-blue-600 hover:underline">Tümünü Gör</button>
                    </div>
                    <div className="p-6">
                        {tenants.length === 0 ? (
                            <p className="text-center text-slate-500">Kayıt bulunamadı.</p>
                        ) : (
                            <div className="space-y-4">
                                {tenants.slice(0, 5).map(tenant => (
                                    <div key={tenant.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600">
                                                {tenant.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">{tenant.name}</p>
                                                <p className="text-xs text-slate-500">{new Date(tenant.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Aktif</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Lisans Durumu */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800">Yaklaşan Lisans Yenilemeleri</h2>
                        <button className="text-sm text-blue-600 hover:underline">Rapor</button>
                    </div>
                    <div className="p-6">
                        {licenses.length === 0 ? (
                            <p className="text-center text-slate-500">Kayıt bulunamadı.</p>
                        ) : (
                            <div className="space-y-4">
                                {licenses.slice(0, 5).map(lic => (
                                    <div key={lic.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-slate-800">{lic.tenant_name}</p>
                                            <p className="text-xs text-slate-500">Bitiş: {new Date(lic.end_date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-700">{(lic as any).price || 0} TL</p>
                                            <p className="text-xs text-slate-500">{lic.license_type}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
