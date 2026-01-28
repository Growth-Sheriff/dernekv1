import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { useLicenseStore } from '@/store/licenseStore';
import { ShieldCheck, Calendar, Activity, Lock, CheckCircle, AlertTriangle } from 'lucide-react';

export const LisansPage: React.FC = () => {
    const tenant = useAuthStore((state) => state.tenant);
    const license = useLicenseStore((state) => state.license);
    const mode = useLicenseStore((state) => state.mode);

    if (!tenant) return null;

    const isActive = license?.is_active;
    const expiresAt = license?.expires_at ? new Date(license.expires_at) : null;
    const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Lisans Bilgileri</h1>
                <p className="text-gray-600 mt-1">Mevcut lisans ve abonelik durumu</p>
            </div>

            {/* License Status Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{tenant.name}</h2>
                            <p className="text-sm text-gray-500">Tenant ID: {tenant.id}</p>
                        </div>
                    </div>
                    <div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5 ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {isActive ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            {isActive ? 'Aktif Lisans' : 'Lisans Geçersiz'}
                        </span>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Plan
                        </p>
                        <p className="text-2xl font-bold text-gray-900">{license?.plan || 'Free'}</p>
                        <p className="text-xs text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded">
                            {mode} Modu
                        </p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Bitiş Tarihi
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                            {expiresAt ? expiresAt.toLocaleDateString('tr-TR') : 'Süresiz'}
                        </p>
                        {daysLeft > 0 && daysLeft < 30 && (
                            <p className="text-xs text-orange-600 font-medium">{daysLeft} gün kaldı</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                            <Lock className="w-4 h-4" /> Lisans Anahtarı
                        </p>
                        <p className="text-sm font-mono bg-gray-100 p-2 rounded text-gray-600 select-all border">
                            {license?.license_key || '--------------------------------'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Features List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Kullanılabilir Özellikler</h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {license?.features && Object.entries(license.features.modules).map(([key, enabled]) => (
                            <div key={key} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                                <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                                <span className="text-sm font-medium text-gray-700 capitalize">
                                    {key.replace(/_/g, ' ')}
                                </span>
                                {enabled ? (
                                    <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                                ) : (
                                    <Lock className="w-4 h-4 text-gray-300 ml-auto" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Limits */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">K limit ve Kotalar</h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {license?.features?.limits && Object.entries(license.features.limits).map(([key, limit]) => (
                            <div key={key} className="p-4 bg-gray-50 rounded-lg space-y-1">
                                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">{key.replace('max_', '')}</p>
                                <p className="text-xl font-bold text-gray-900">{limit === -1 ? 'Sınırsız' : limit}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LisansPage;
