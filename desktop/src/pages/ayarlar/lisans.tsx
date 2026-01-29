import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useLicenseStore } from '@/store/licenseStore';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import {
    Key, Shield, Monitor, Globe, Smartphone, RefreshCw,
    Check, X, Calendar, Clock, Sparkles, Copy, Eye, EyeOff,
    AlertTriangle, CheckCircle2, Loader2
} from 'lucide-react';

interface LicenseDetails {
    key: string;
    type: string;
    desktop_enabled: boolean;
    web_enabled: boolean;
    mobile_enabled: boolean;
    sync_enabled: boolean;
    expires_at: string;
    is_active: boolean;
}

export const LisansAyarlari: React.FC = () => {
    const tenant = useAuthStore((state) => state.tenant);
    const license = useLicenseStore((state) => state.license);
    const mode = useLicenseStore((state) => state.mode);
    const setLicense = useLicenseStore((state) => state.setLicense);
    const setMode = useLicenseStore((state) => state.setMode);

    const [newLicenseKey, setNewLicenseKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isActivating, setIsActivating] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);
    const [validationResult, setValidationResult] = useState<{
        valid: boolean;
        message?: string;
        license?: any;
        already_assigned?: boolean;
        current_organization?: {
            id: string;
            name: string;
            slug?: string;
            created_at?: string;
        };
        can_transfer?: boolean;
    } | null>(null);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [newOrgSlug, setNewOrgSlug] = useState('');

    const currentLicense: LicenseDetails | null = license ? {
        key: license.key || '***-***-***-***',
        type: license.plan || mode || 'LOCAL',
        desktop_enabled: license.desktop_enabled ?? true,
        web_enabled: license.web_enabled ?? false,
        mobile_enabled: license.mobile_enabled ?? false,
        sync_enabled: license.sync_enabled ?? false,
        expires_at: license.expires_at || '',
        is_active: true
    } : null;

    const copyLicenseKey = () => {
        if (currentLicense?.key) {
            navigator.clipboard.writeText(currentLicense.key);
            toast.success('Lisans anahtarı kopyalandı');
        }
    };

    const validateLicenseKey = async () => {
        if (!newLicenseKey.trim()) {
            toast.error('Lütfen bir lisans anahtarı girin');
            return;
        }

        setIsValidating(true);
        setValidationResult(null);

        try {
            // Backend API'ye doğrulama isteği
            const response = await fetch('http://157.90.154.48:8000/api/v1/licenses/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ license_key: newLicenseKey })
            });

            const result = await response.json();
            setValidationResult(result);

            if (result.valid) {
                toast.success('Lisans geçerli!');
            } else if (result.already_assigned && result.can_transfer) {
                // Lisans başka organizasyona ait - transfer modal'ını aç
                setShowTransferModal(true);
                toast.warning('Bu lisans başka bir organizasyona ait');
            } else {
                toast.error(result.message || 'Geçersiz lisans');
            }
        } catch (error) {
            // Offline doğrulama dene
            try {
                const offlineResult = await invoke<any>('validate_license_offline', { licenseKey: newLicenseKey });
                setValidationResult(offlineResult);

                if (offlineResult.valid) {
                    toast.success('Lisans geçerli (Offline doğrulama)');
                } else {
                    toast.error(offlineResult.message || 'Geçersiz lisans');
                }
            } catch (e) {
                setValidationResult({ valid: false, message: 'Lisans doğrulanamadı' });
                toast.error('Lisans doğrulama hatası');
            }
        } finally {
            setIsValidating(false);
        }
    };

    const handleTransfer = async () => {
        if (!newOrgName.trim()) {
            toast.error('Lütfen organizasyon adı girin');
            return;
        }

        setIsTransferring(true);

        try {
            const response = await fetch('http://157.90.154.48:8000/api/v1/licenses/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    license_key: newLicenseKey,
                    tenant_name: newOrgName,
                    tenant_slug: newOrgSlug || newOrgName.toLowerCase().replace(/\s+/g, '-'),
                    confirm: true
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Lisans başarıyla transfer edildi!');
                setShowTransferModal(false);

                // Validation result'ı güncelle
                setValidationResult({
                    valid: true,
                    license: result.license
                });
            } else {
                toast.error(result.message || 'Transfer başarısız');
            }
        } catch (error: any) {
            toast.error(`Transfer hatası: ${error.message || error}`);
        } finally {
            setIsTransferring(false);
        }
    };

    const activateLicense = async () => {
        if (!validationResult?.valid || !validationResult?.license) {
            toast.error('Önce lisansı doğrulayın');
            return;
        }

        setIsActivating(true);

        try {
            // Lisansı aktive et
            const licenseData = validationResult.license;

            // Store'u güncelle
            setLicense({
                id: licenseData.id || '',
                key: newLicenseKey,
                license_key: newLicenseKey,
                plan: licenseData.type || 'HYBRID',
                features: {
                    modules: {
                        uye_yonetimi: true,
                        aidat_takip: true,
                        mali_islemler: true,
                        aile_modulu: true,
                        koy_modulu: true,
                        ocr: false,
                        web_erisim: licenseData.web_enabled,
                        mobil_erisim: licenseData.mobile_enabled,
                        sync: licenseData.sync_enabled,
                        api_access: true,
                        email_sms: false
                    },
                    limits: {
                        max_users: 100,
                        max_members: 10000,
                        max_kasalar: 20,
                        max_storage_mb: 5000
                    },
                    exports: {
                        pdf: true,
                        excel: true,
                        api: true
                    }
                },
                desktop_enabled: licenseData.desktop_enabled,
                web_enabled: licenseData.web_enabled,
                mobile_enabled: licenseData.mobile_enabled,
                sync_enabled: licenseData.sync_enabled,
                expires_at: licenseData.end_date || '',
                is_active: true
            });

            // Mode'u belirle
            if (licenseData.sync_enabled) {
                setMode('HYBRID');
            } else if (licenseData.web_enabled) {
                setMode('ONLINE');
            } else {
                setMode('LOCAL');
            }

            // Veritabanına kaydet
            await invoke('update_license', {
                licenseKey: newLicenseKey,
                licenseData: {
                    desktop_enabled: licenseData.desktop_enabled,
                    web_enabled: licenseData.web_enabled,
                    mobile_enabled: licenseData.mobile_enabled,
                    sync_enabled: licenseData.sync_enabled,
                    expires_at: licenseData.end_date,
                    plan: licenseData.type
                }
            });

            toast.success('Lisans başarıyla aktive edildi!');
            setNewLicenseKey('');
            setValidationResult(null);
        } catch (error: any) {
            toast.error(`Aktivasyon hatası: ${error.message || error}`);
        } finally {
            setIsActivating(false);
        }
    };

    const getDaysUntilExpiry = () => {
        if (!currentLicense?.expires_at) return null;
        const expiry = new Date(currentLicense.expires_at);
        const now = new Date();
        const diff = expiry.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const daysLeft = getDaysUntilExpiry();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Lisans Ayarları</h1>
                <p className="text-gray-600 mt-1">Lisans bilgilerinizi görüntüleyin ve güncelleyin</p>
            </div>

            {/* Mevcut Lisans Kartı */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Key className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Aktif Lisans</h2>
                            <p className="text-purple-200">{tenant?.name || 'Dernek'}</p>
                        </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-semibold ${currentLicense?.is_active ? 'bg-green-500/30 text-green-100' : 'bg-red-500/30 text-red-100'
                        }`}>
                        {currentLicense?.is_active ? '✓ Aktif' : '✗ Pasif'}
                    </div>
                </div>

                {/* Lisans Key */}
                <div className="mt-6 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-200 mb-1">Lisans Anahtarı</p>
                            <code className="text-lg font-mono font-semibold">
                                {showKey ? currentLicense?.key : currentLicense?.key?.replace(/./g, '•')}
                            </code>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                            >
                                {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={copyLicenseKey}
                                className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                            >
                                <Copy className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Lisans Tipi ve Süre */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="bg-white/10 rounded-xl p-4">
                        <p className="text-sm text-purple-200">Lisans Tipi</p>
                        <p className="text-xl font-bold mt-1">{currentLicense?.type || mode}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4">
                        <p className="text-sm text-purple-200">Kalan Süre</p>
                        <p className={`text-xl font-bold mt-1 ${daysLeft && daysLeft < 30 ? 'text-yellow-300' : ''}`}>
                            {daysLeft ? `${daysLeft} gün` : 'Süresiz'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Platform Erişimleri */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-600" />
                    Platform Erişimleri
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { key: 'desktop_enabled', label: 'Desktop', icon: Monitor, color: 'blue' },
                        { key: 'web_enabled', label: 'Web', icon: Globe, color: 'green' },
                        { key: 'mobile_enabled', label: 'Mobil', icon: Smartphone, color: 'yellow' },
                        { key: 'sync_enabled', label: 'Senkronizasyon', icon: RefreshCw, color: 'purple' },
                    ].map(({ key, label, icon: Icon, color }) => {
                        const isEnabled = currentLicense?.[key as keyof LicenseDetails] as boolean;
                        return (
                            <div
                                key={key}
                                className={`relative p-4 rounded-xl border-2 transition-all ${isEnabled
                                    ? `bg-${color}-50 border-${color}-300`
                                    : 'bg-gray-50 border-gray-200 opacity-60'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isEnabled ? `bg-${color}-500 text-white` : 'bg-gray-300 text-gray-500'
                                        }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{label}</p>
                                        <p className={`text-sm ${isEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                                            {isEnabled ? 'Aktif' : 'Kapalı'}
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute top-2 right-2">
                                    {isEnabled ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <X className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Lisans Güncelleme */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    Lisans Güncelle / Yükselt
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Yeni Lisans Anahtarı
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newLicenseKey}
                                onChange={(e) => setNewLicenseKey(e.target.value.toUpperCase())}
                                placeholder="BADER-XXXX-XXXX-XXXX-XXXX"
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-mono text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <button
                                onClick={validateLicenseKey}
                                disabled={isValidating || !newLicenseKey.trim()}
                                className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                {isValidating ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Check className="w-5 h-5" />
                                )}
                                Doğrula
                            </button>
                        </div>
                    </div>

                    {/* Doğrulama Sonucu */}
                    {validationResult && (
                        <div className={`p-4 rounded-xl ${validationResult.valid
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                            }`}>
                            <div className="flex items-start gap-3">
                                {validationResult.valid ? (
                                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                                ) : (
                                    <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                    <p className={`font-semibold ${validationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                                        {validationResult.valid ? 'Lisans Geçerli!' : 'Lisans Geçersiz'}
                                    </p>
                                    {validationResult.message && (
                                        <p className={`text-sm mt-1 ${validationResult.valid ? 'text-green-600' : 'text-red-600'}`}>
                                            {validationResult.message}
                                        </p>
                                    )}

                                    {validationResult.valid && validationResult.license && (
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Monitor className={`w-4 h-4 ${validationResult.license.desktop_enabled ? 'text-green-500' : 'text-gray-400'}`} />
                                                <span>Desktop: {validationResult.license.desktop_enabled ? 'Aktif' : 'Kapalı'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Globe className={`w-4 h-4 ${validationResult.license.web_enabled ? 'text-green-500' : 'text-gray-400'}`} />
                                                <span>Web: {validationResult.license.web_enabled ? 'Aktif' : 'Kapalı'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Smartphone className={`w-4 h-4 ${validationResult.license.mobile_enabled ? 'text-green-500' : 'text-gray-400'}`} />
                                                <span>Mobil: {validationResult.license.mobile_enabled ? 'Aktif' : 'Kapalı'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <RefreshCw className={`w-4 h-4 ${validationResult.license.sync_enabled ? 'text-green-500' : 'text-gray-400'}`} />
                                                <span>Sync: {validationResult.license.sync_enabled ? 'Aktif' : 'Kapalı'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {validationResult.valid && (
                                <button
                                    onClick={activateLicense}
                                    disabled={isActivating}
                                    className="mt-4 w-full py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold transition-colors"
                                >
                                    {isActivating ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-5 h-5" />
                                    )}
                                    {isActivating ? 'Aktive Ediliyor...' : 'Lisansı Aktive Et'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Bilgi Notu */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-blue-800 font-medium">Lisans Yükseltme Hakkında</p>
                        <p className="text-sm text-blue-600 mt-1">
                            Yeni bir lisans anahtarı aldıysanız, yukarıdaki alana girerek doğrulayabilir ve aktive edebilirsiniz.
                            Lisans yükseltmelerinde mevcut verileriniz korunur. HYBRID lisans ile tüm platformlarda
                            senkronize çalışabilirsiniz.
                        </p>
                    </div>
                </div>
            </div>

            {/* Transfer Onay Modal */}
            {showTransferModal && validationResult?.already_assigned && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Lisans Transfer</h3>
                                    <p className="text-amber-100 text-sm">Bu lisans başka bir organizasyona ait</p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Mevcut Organizasyon Bilgisi */}
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                                    <X className="w-4 h-4" />
                                    Mevcut Organizasyon
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-red-600">Organizasyon Adı:</span>
                                        <span className="font-semibold text-red-800">
                                            {validationResult.current_organization?.name || 'Bilinmiyor'}
                                        </span>
                                    </div>
                                    {validationResult.current_organization?.slug && (
                                        <div className="flex justify-between">
                                            <span className="text-red-600">Slug:</span>
                                            <span className="font-mono text-red-800">
                                                {validationResult.current_organization.slug}
                                            </span>
                                        </div>
                                    )}
                                    {validationResult.current_organization?.created_at && (
                                        <div className="flex justify-between">
                                            <span className="text-red-600">Kayıt Tarihi:</span>
                                            <span className="text-red-800">
                                                {new Date(validationResult.current_organization.created_at).toLocaleDateString('tr-TR')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Lisans Özellikleri */}
                            {validationResult.license && (
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                        <Key className="w-4 h-4" />
                                        Lisans Özellikleri
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Monitor className={`w-4 h-4 ${validationResult.license.desktop_enabled ? 'text-green-500' : 'text-gray-400'}`} />
                                            <span>Desktop: {validationResult.license.desktop_enabled ? 'Aktif' : 'Kapalı'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Globe className={`w-4 h-4 ${validationResult.license.web_enabled ? 'text-green-500' : 'text-gray-400'}`} />
                                            <span>Web: {validationResult.license.web_enabled ? 'Aktif' : 'Kapalı'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Smartphone className={`w-4 h-4 ${validationResult.license.mobile_enabled ? 'text-green-500' : 'text-gray-400'}`} />
                                            <span>Mobil: {validationResult.license.mobile_enabled ? 'Aktif' : 'Kapalı'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <RefreshCw className={`w-4 h-4 ${validationResult.license.sync_enabled ? 'text-green-500' : 'text-gray-400'}`} />
                                            <span>Sync: {validationResult.license.sync_enabled ? 'Aktif' : 'Kapalı'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Yeni Organizasyon Bilgileri */}
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Yeni Organizasyon Bilgileri
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-green-700 mb-1">
                                            Organizasyon Adı *
                                        </label>
                                        <input
                                            type="text"
                                            value={newOrgName}
                                            onChange={(e) => setNewOrgName(e.target.value)}
                                            placeholder="Dernek adınızı girin"
                                            className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-green-700 mb-1">
                                            Slug (opsiyonel)
                                        </label>
                                        <input
                                            type="text"
                                            value={newOrgSlug}
                                            onChange={(e) => setNewOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                            placeholder="dernek-slug"
                                            className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                                        />
                                        <p className="text-xs text-green-600 mt-1">
                                            Boş bırakırsanız otomatik oluşturulur
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Uyarı */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <div className="flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm text-amber-800 font-medium">Dikkat!</p>
                                        <p className="text-sm text-amber-700 mt-1">
                                            Bu işlem lisansı mevcut organizasyondan alıp sizin organizasyonunuza aktaracaktır.
                                            Eski organizasyonun lisansa erişimi kesilecektir.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowTransferModal(false);
                                    setNewOrgName('');
                                    setNewOrgSlug('');
                                }}
                                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleTransfer}
                                disabled={isTransferring || !newOrgName.trim()}
                                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 transition-all"
                            >
                                {isTransferring ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Sparkles className="w-5 h-5" />
                                )}
                                {isTransferring ? 'Transfer Ediliyor...' : 'Lisansı Transfer Et'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LisansAyarlari;
