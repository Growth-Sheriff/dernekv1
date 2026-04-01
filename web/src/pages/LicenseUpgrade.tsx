import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'http://35.195.123.84:8000');

export function LicenseUpgradePage() {
    const { license, updateLicense, token } = useAuthStore();
    const [newLicenseKey, setNewLicenseKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleUpgrade = async () => {
        if (!newLicenseKey.trim()) {
            setError('Lütfen yeni lisans anahtarını girin');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/licenses/upgrade`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ new_license_key: newLicenseKey })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.detail || 'Lisans yükseltme başarısız');
            }

            const data = await response.json();
            if (data.new_license) {
                updateLicense(data.new_license);
            }
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Lisans yükseltme başarısız');
        } finally {
            setLoading(false);
        }
    };

    const getLicenseTypeBadgeColor = (type: string) => {
        switch (type) {
            case 'LOCAL': return 'bg-gray-500';
            case 'ONLINE': return 'bg-blue-500';
            case 'HYBRID': return 'bg-green-500';
            default: return 'bg-purple-500';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                    <h1 className="text-3xl font-bold text-white mb-8">Lisans Yönetimi</h1>

                    {/* Mevcut Lisans Bilgisi */}
                    {license && (
                        <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
                            <h2 className="text-lg font-semibold text-white mb-4">Mevcut Lisans</h2>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-400">Lisans Tipi:</span>
                                    <span className={`ml-2 px-2 py-1 rounded text-white ${getLicenseTypeBadgeColor(license.type)}`}>
                                        {license.type}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-gray-400">Son Geçerlilik:</span>
                                    <span className="ml-2 text-white">
                                        {license.end_date ? new Date(license.end_date).toLocaleDateString('tr-TR') : 'Belirsiz'}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-gray-400">Desktop:</span>
                                    <span className={`ml-2 ${license.desktop_enabled ? 'text-green-400' : 'text-red-400'}`}>
                                        {license.desktop_enabled ? '✓ Aktif' : '✗ Pasif'}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-gray-400">Web:</span>
                                    <span className={`ml-2 ${license.web_enabled ? 'text-green-400' : 'text-red-400'}`}>
                                        {license.web_enabled ? '✓ Aktif' : '✗ Pasif'}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-gray-400">Mobil:</span>
                                    <span className={`ml-2 ${license.mobile_enabled ? 'text-green-400' : 'text-red-400'}`}>
                                        {license.mobile_enabled ? '✓ Aktif' : '✗ Pasif'}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-gray-400">Senkronizasyon:</span>
                                    <span className={`ml-2 ${license.sync_enabled ? 'text-green-400' : 'text-red-400'}`}>
                                        {license.sync_enabled ? '✓ Aktif' : '✗ Pasif'}
                                    </span>
                                </div>
                            </div>

                            {license.expiry_warning && (
                                <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-300 text-sm">
                                    ⚠️ Lisansınızın süresi {license.days_until_expiry} gün içinde dolacak. Lütfen yenileyin.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Lisans Yükseltme Form */}
                    {success ? (
                        <div className="p-6 bg-green-500/20 border border-green-500/50 rounded-xl text-center">
                            <div className="text-4xl mb-4">🎉</div>
                            <h3 className="text-xl font-semibold text-green-400 mb-2">Lisans Yükseltildi!</h3>
                            <p className="text-gray-300">Yeni lisansınız başarıyla aktive edildi.</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                                Sayfayı Yenile
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white">Lisans Yükseltme</h2>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">
                                    Yeni Lisans Anahtarı
                                </label>
                                <input
                                    type="text"
                                    value={newLicenseKey}
                                    onChange={(e) => setNewLicenseKey(e.target.value.toUpperCase())}
                                    placeholder="BADER-XXXX-XXXX-XXXX-XXXX"
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleUpgrade}
                                disabled={loading}
                                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Yükseltiliyor...' : 'Lisansı Yükselt'}
                            </button>

                            <p className="text-xs text-gray-500 text-center">
                                Mevcut lisansınız pasife alınacak ve yeni lisans aktive edilecektir.
                            </p>
                        </div>
                    )}
                </div>

                {/* Lisans Tipleri Bilgisi */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-500/20 rounded-xl border border-gray-500/50">
                        <h3 className="font-semibold text-white mb-2">LOCAL</h3>
                        <p className="text-sm text-gray-400">Sadece masaüstü uygulaması. Offline çalışır.</p>
                        <ul className="text-xs text-gray-500 mt-2 space-y-1">
                            <li>✓ Desktop</li>
                            <li>✗ Web</li>
                            <li>✗ Mobil</li>
                            <li>✗ Sync</li>
                        </ul>
                    </div>

                    <div className="p-4 bg-blue-500/20 rounded-xl border border-blue-500/50">
                        <h3 className="font-semibold text-white mb-2">ONLINE</h3>
                        <p className="text-sm text-gray-400">Web ve mobil erişim. Bulut tabanlı.</p>
                        <ul className="text-xs text-gray-500 mt-2 space-y-1">
                            <li>✗ Desktop</li>
                            <li>✓ Web</li>
                            <li>✓ Mobil</li>
                            <li>✓ Sync</li>
                        </ul>
                    </div>

                    <div className="p-4 bg-green-500/20 rounded-xl border border-green-500/50">
                        <h3 className="font-semibold text-white mb-2">HYBRID</h3>
                        <p className="text-sm text-gray-400">Tüm platformlar. Tam senkronizasyon.</p>
                        <ul className="text-xs text-gray-500 mt-2 space-y-1">
                            <li>✓ Desktop</li>
                            <li>✓ Web</li>
                            <li>✓ Mobil</li>
                            <li>✓ Sync</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LicenseUpgradePage;
