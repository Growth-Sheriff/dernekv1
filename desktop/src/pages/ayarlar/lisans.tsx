import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import {
    Key,
    Shield,
    CheckCircle2,
    XCircle,
    Clock,
    Copy,
    Eye,
    EyeOff,
    RefreshCw,
    Sparkles,
    AlertTriangle,
    Monitor,
    Globe,
    Smartphone,
    Loader2,
    X,
    Building2
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useLicenseStore } from '../../store/licenseStore';

// API URL - Dinamik
const API_URL = 'http://157.90.154.48:8000';

// Backend API Response Types
interface LicenseApiResponse {
    valid: boolean;
    message?: string;
    already_assigned?: boolean;
    can_transfer?: boolean;
    current_organization?: {
        id: string;
        name: string;
        slug?: string;
        created_at?: string;
    };
    license?: {
        id: string;
        key: string;
        type: string;
        desktop_enabled: boolean;
        web_enabled: boolean;
        mobile_enabled: boolean;
        sync_enabled: boolean;
        end_date: string;
    };
}

interface TransferApiResponse {
    success: boolean;
    message?: string;
    new_organization?: {
        id: string;
        name: string;
        slug: string;
    };
    license?: {
        id: string;
        key: string;
        type: string;
        desktop_enabled: boolean;
        web_enabled: boolean;
        mobile_enabled: boolean;
        sync_enabled: boolean;
        end_date: string;
    };
}

export const LisansAyarlari: React.FC = () => {
    const tenant = useAuthStore((state) => state.tenant);
    const license = useLicenseStore((state) => state.license);
    const mode = useLicenseStore((state) => state.mode);
    const setLicense = useLicenseStore((state) => state.setLicense);
    const setMode = useLicenseStore((state) => state.setMode);

    // Form State
    const [newLicenseKey, setNewLicenseKey] = useState('');
    const [showKey, setShowKey] = useState(false);

    // Loading States
    const [isValidating, setIsValidating] = useState(false);
    const [isActivating, setIsActivating] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // API Response State
    const [validationResult, setValidationResult] = useState<LicenseApiResponse | null>(null);

    // Transfer Modal State
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [newOrgSlug, setNewOrgSlug] = useState('');

    // Mevcut lisans bilgilerini göster
    const currentLicenseDisplay = license ? {
        key: license.key || license.license_key || '***-***-***-***',
        type: license.plan || mode || 'LOCAL',
        desktop_enabled: license.desktop_enabled ?? true,
        web_enabled: license.web_enabled ?? false,
        mobile_enabled: license.mobile_enabled ?? false,
        sync_enabled: license.sync_enabled ?? false,
        expires_at: license.expires_at || '',
        is_active: license.is_active ?? true
    } : null;

    // Lisans anahtarını kopyala
    const copyLicenseKey = () => {
        if (currentLicenseDisplay?.key) {
            navigator.clipboard.writeText(currentLicenseDisplay.key);
            toast.success('Lisans anahtarı kopyalandı');
        }
    };

    // Backend API'den lisans doğrula
    const validateLicenseKey = async () => {
        if (!newLicenseKey.trim()) {
            toast.error('Lütfen bir lisans anahtarı girin');
            return;
        }

        setIsValidating(true);
        setValidationResult(null);

        try {
            const response = await fetch(`${API_URL}/api/v1/licenses/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ license_key: newLicenseKey.toUpperCase() })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const result: LicenseApiResponse = await response.json();
            setValidationResult(result);

            if (result.valid) {
                toast.success('✅ Lisans geçerli! Aktive edebilirsiniz.');
            } else if (result.already_assigned && result.can_transfer) {
                setShowTransferModal(true);
                toast.warning('⚠️ Bu lisans başka bir organizasyona ait. Transfer edebilirsiniz.');
            } else {
                toast.error(result.message || 'Geçersiz lisans');
            }
        } catch (error: any) {
            console.error('Validation error:', error);
            toast.error(`Bağlantı hatası: ${error.message}`);
            setValidationResult({ valid: false, message: 'Sunucuya bağlanılamadı' });
        } finally {
            setIsValidating(false);
        }
    };

    // Lisans transfer et
    const handleTransfer = async () => {
        if (!newOrgName.trim()) {
            toast.error('Lütfen organizasyon adı girin');
            return;
        }

        setIsTransferring(true);

        try {
            const response = await fetch(`${API_URL}/api/v1/licenses/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    license_key: newLicenseKey.toUpperCase(),
                    tenant_name: newOrgName,
                    tenant_slug: newOrgSlug || newOrgName.toLowerCase().replace(/\s+/g, '-'),
                    confirm: true
                })
            });

            const result: TransferApiResponse = await response.json();

            if (result.success && result.license) {
                toast.success('✅ Lisans başarıyla transfer edildi!');
                setShowTransferModal(false);

                // Validation result'ı güncelle - artık aktivasyon için hazır
                setValidationResult({
                    valid: true,
                    license: result.license
                });

                setNewOrgName('');
                setNewOrgSlug('');
            } else {
                toast.error(result.message || 'Transfer başarısız');
            }
        } catch (error: any) {
            console.error('Transfer error:', error);
            toast.error(`Transfer hatası: ${error.message}`);
        } finally {
            setIsTransferring(false);
        }
    };

    // Lisansı aktive et - Store + Local DB güncelle
    const activateLicense = async () => {
        if (!validationResult?.valid || !validationResult?.license) {
            toast.error('Önce lisansı doğrulayın');
            return;
        }

        setIsActivating(true);

        try {
            const licenseData = validationResult.license;

            // 1. Zustand Store'u güncelle
            setLicense({
                id: licenseData.id,
                key: licenseData.key,
                license_key: licenseData.key,
                plan: licenseData.type,
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
                expires_at: licenseData.end_date,
                is_active: true
            });

            // 2. Mode'u belirle
            if (licenseData.sync_enabled && licenseData.web_enabled) {
                setMode('HYBRID');
            } else if (licenseData.web_enabled) {
                setMode('ONLINE');
            } else {
                setMode('LOCAL');
            }

            // 3. Local SQLite veritabanına kaydet
            await invoke('update_license', {
                licenseKey: licenseData.key,
                licenseData: {
                    desktop_enabled: licenseData.desktop_enabled,
                    web_enabled: licenseData.web_enabled,
                    mobile_enabled: licenseData.mobile_enabled,
                    sync_enabled: licenseData.sync_enabled,
                    expires_at: licenseData.end_date,
                    plan: licenseData.type
                }
            });

            toast.success('🎉 Lisans başarıyla aktive edildi!');
            setNewLicenseKey('');
            setValidationResult(null);

        } catch (error: any) {
            console.error('Activation error:', error);
            toast.error(`Aktivasyon hatası: ${error}`);
        } finally {
            setIsActivating(false);
        }
    };

    // Kalan gün hesapla
    const getDaysUntilExpiry = () => {
        if (!currentLicenseDisplay?.expires_at) return null;
        try {
            const expiry = new Date(currentLicenseDisplay.expires_at);
            const now = new Date();
            const diff = expiry.getTime() - now.getTime();
            return Math.ceil(diff / (1000 * 60 * 60 * 24));
        } catch {
            return null;
        }
    };

    const daysLeft = getDaysUntilExpiry();

    // Lisans tipi renkleri
    const getTypeColor = (type: string) => {
        switch (type?.toUpperCase()) {
            case 'HYBRID': return 'from-purple-500 to-indigo-600';
            case 'ONLINE': return 'from-blue-500 to-cyan-600';
            case 'LOCAL': return 'from-green-500 to-emerald-600';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Lisans Yönetimi</h1>
                    <p className="text-gray-500 mt-1">Lisans bilgilerinizi görüntüleyin ve yönetin</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-white font-semibold bg-gradient-to-r ${getTypeColor(currentLicenseDisplay?.type || mode)}`}>
                    {currentLicenseDisplay?.type || mode || 'LOCAL'} Lisans
                </div>
            </div>

            {/* Mevcut Lisans Kartı */}
            {currentLicenseDisplay && (
                <div className={`bg-gradient-to-br ${getTypeColor(currentLicenseDisplay.type)} rounded-2xl p-6 text-white shadow-xl`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <Shield className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">BADER Lisans</h2>
                                <p className="text-white/80 text-sm">{tenant?.name || 'Yerel Kullanım'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {currentLicenseDisplay.is_active ? (
                                <span className="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">
                                    <CheckCircle2 className="w-4 h-4" /> Aktif
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 px-3 py-1 bg-red-500/50 rounded-full text-sm backdrop-blur-sm">
                                    <XCircle className="w-4 h-4" /> Pasif
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Lisans Anahtarı */}
                    <div className="mt-6 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Key className="w-5 h-5 text-white/70" />
                                <code className="font-mono text-lg tracking-wider">
                                    {showKey ? currentLicenseDisplay.key : currentLicenseDisplay.key.replace(/./g, '•')}
                                </code>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowKey(!showKey)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    title={showKey ? 'Gizle' : 'Göster'}
                                >
                                    {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={copyLicenseKey}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    title="Kopyala"
                                >
                                    <Copy className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Süre Bilgisi */}
                    {daysLeft !== null && (
                        <div className="mt-4 flex items-center gap-2 text-white/90">
                            <Clock className="w-5 h-5" />
                            <span>
                                {daysLeft > 0
                                    ? `${daysLeft} gün kaldı`
                                    : daysLeft === 0
                                        ? 'Bugün sona eriyor!'
                                        : `${Math.abs(daysLeft)} gün önce sona erdi`}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Platform Erişimleri */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    Platform Erişimleri
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { key: 'desktop', label: 'Desktop', icon: Monitor, enabled: currentLicenseDisplay?.desktop_enabled },
                        { key: 'web', label: 'Web', icon: Globe, enabled: currentLicenseDisplay?.web_enabled },
                        { key: 'mobile', label: 'Mobil', icon: Smartphone, enabled: currentLicenseDisplay?.mobile_enabled },
                        { key: 'sync', label: 'Senkronizasyon', icon: RefreshCw, enabled: currentLicenseDisplay?.sync_enabled }
                    ].map((platform) => (
                        <div
                            key={platform.key}
                            className={`p-4 rounded-xl border-2 transition-all ${platform.enabled
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${platform.enabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'
                                    }`}>
                                    <platform.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{platform.label}</p>
                                    <p className={`text-sm ${platform.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                                        {platform.enabled ? 'Aktif' : 'Kapalı'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Yeni Lisans Girişi */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Lisans Güncelle
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Yeni Lisans Anahtarı
                        </label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newLicenseKey}
                                onChange={(e) => setNewLicenseKey(e.target.value.toUpperCase())}
                                placeholder="BADER-XXXX-XXXX-XXXX-XXXX"
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-lg tracking-wider"
                            />
                            <button
                                onClick={validateLicenseKey}
                                disabled={isValidating || !newLicenseKey.trim()}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold transition-colors"
                            >
                                {isValidating ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-5 h-5" />
                                )}
                                Doğrula
                            </button>
                        </div>
                    </div>

                    {/* Doğrulama Sonucu */}
                    {validationResult && (
                        <div className={`p-4 rounded-xl border-2 ${validationResult.valid
                                ? 'border-green-500 bg-green-50'
                                : validationResult.already_assigned
                                    ? 'border-amber-500 bg-amber-50'
                                    : 'border-red-500 bg-red-50'
                            }`}>
                            <div className="flex items-start gap-3">
                                {validationResult.valid ? (
                                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                                ) : validationResult.already_assigned ? (
                                    <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                                ) : (
                                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                    <p className={`font-semibold ${validationResult.valid ? 'text-green-800'
                                            : validationResult.already_assigned ? 'text-amber-800'
                                                : 'text-red-800'
                                        }`}>
                                        {validationResult.valid ? 'Lisans Geçerli!'
                                            : validationResult.already_assigned ? 'Lisans Başka Organizasyona Ait'
                                                : validationResult.message}
                                    </p>

                                    {validationResult.license && (
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                            <div><span className="text-gray-600">Tip:</span> <strong>{validationResult.license.type}</strong></div>
                                            <div><span className="text-gray-600">Desktop:</span> <strong>{validationResult.license.desktop_enabled ? '✓' : '✗'}</strong></div>
                                            <div><span className="text-gray-600">Web:</span> <strong>{validationResult.license.web_enabled ? '✓' : '✗'}</strong></div>
                                            <div><span className="text-gray-600">Mobil:</span> <strong>{validationResult.license.mobile_enabled ? '✓' : '✗'}</strong></div>
                                            <div><span className="text-gray-600">Sync:</span> <strong>{validationResult.license.sync_enabled ? '✓' : '✗'}</strong></div>
                                            <div><span className="text-gray-600">Bitiş:</span> <strong>{validationResult.license.end_date ? new Date(validationResult.license.end_date).toLocaleDateString('tr-TR') : 'Süresiz'}</strong></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Aktive Et Butonu */}
                            {validationResult.valid && validationResult.license && (
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

                            {/* Transfer Butonu */}
                            {validationResult.already_assigned && validationResult.can_transfer && (
                                <button
                                    onClick={() => setShowTransferModal(true)}
                                    className="mt-4 w-full py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 flex items-center justify-center gap-2 font-semibold transition-colors"
                                >
                                    <Building2 className="w-5 h-5" />
                                    Lisansı Transfer Et
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

            {/* Transfer Modal */}
            {showTransferModal && validationResult?.already_assigned && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Lisans Transfer</h3>
                                        <p className="text-amber-100 text-sm">Bu lisans başka bir organizasyona ait</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowTransferModal(false)}
                                    className="text-white/80 hover:text-white"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Mevcut Organizasyon Bilgisi */}
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                                    <XCircle className="w-4 h-4" />
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
                                    </div>
                                </div>
                            </div>

                            {/* Uyarı */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <div className="flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                    <p className="text-sm text-amber-700">
                                        Bu işlem lisansı mevcut organizasyondan alıp sizin organizasyonunuza aktaracaktır.
                                    </p>
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
                                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleTransfer}
                                disabled={isTransferring || !newOrgName.trim()}
                                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
                            >
                                {isTransferring ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Sparkles className="w-5 h-5" />
                                )}
                                {isTransferring ? 'Transfer Ediliyor...' : 'Transfer Et'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LisansAyarlari;
