/**
 * Sync Settings Page - Senkronizasyon Ayarları
 * 
 * Manuel sync, ilk kurulum sync, sync durumu görüntüleme.
 */
import React, { useState, useEffect } from 'react';
import {
    RefreshCw,
    Cloud,
    CloudOff,
    Check,
    X,
    Upload,
    Download,
    Database,
    Activity,
    Clock,
    AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { syncService } from '@/services/syncService';
import { cn } from '@/lib/utils';

interface SyncStats {
    pushed: number;
    pulled: number;
    failed: number;
    lastSync: string | null;
}

export default function SyncPage() {
    const { tenant, license, token } = useAuthStore();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isInitialSyncing, setIsInitialSyncing] = useState(false);
    const [stats, setStats] = useState<SyncStats>({ pushed: 0, pulled: 0, failed: 0, lastSync: null });
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [syncMode, setSyncMode] = useState<string>('local');

    useEffect(() => {
        // Online/offline listener
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Sync durumunu al
        const status = syncService.getStatus();
        setSyncMode(status.mode);
        setStats(status.stats);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleManualSync = async () => {
        if (!tenant?.id) {
            setMessage({ type: 'error', text: 'Tenant bilgisi bulunamadı' });
            return;
        }

        setIsSyncing(true);
        setMessage({ type: 'info', text: 'Senkronizasyon başlatılıyor...' });

        try {
            const result = await syncService.manualSync();
            setStats({
                pushed: result.pushed,
                pulled: result.pulled,
                failed: result.failed,
                lastSync: new Date().toISOString()
            });
            setMessage({
                type: result.failed > 0 ? 'error' : 'success',
                text: `Sync tamamlandı: ${result.pushed} gönderildi, ${result.pulled} alındı${result.failed > 0 ? `, ${result.failed} başarısız` : ''}`
            });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Sync hatası' });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleInitialSync = async () => {
        if (!tenant?.id) {
            setMessage({ type: 'error', text: 'Tenant bilgisi bulunamadı' });
            return;
        }

        if (!confirm('Tüm yerel veriler sunucuya gönderilecek. Bu işlem birkaç dakika sürebilir. Devam etmek istiyor musunuz?')) {
            return;
        }

        setIsInitialSyncing(true);
        setMessage({ type: 'info', text: 'İlk senkronizasyon başlatılıyor... Lütfen bekleyin.' });

        try {
            const result = await syncService.initialSync(tenant.id);
            if (result.success) {
                const total = Object.values(result.counts).reduce((a, b) => a + b, 0);
                setMessage({
                    type: 'success',
                    text: `İlk sync tamamlandı! ${total} kayıt sunucuya gönderildi.`
                });
                setStats(prev => ({ ...prev, pushed: total, lastSync: new Date().toISOString() }));
            } else {
                setMessage({ type: 'error', text: 'İlk sync başarısız oldu' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'İlk sync hatası' });
        } finally {
            setIsInitialSyncing(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Hiç';
        try {
            return new Date(dateStr).toLocaleString('tr-TR');
        } catch {
            return dateStr;
        }
    };

    const isHybridMode = license?.type?.toLowerCase() === 'hybrid';

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Senkronizasyon</h1>
                    <p className="text-muted-foreground mt-1">
                        Desktop ve sunucu arasında veri senkronizasyonu
                    </p>
                </div>
                <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                    isOnline ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                    {isOnline ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
                    {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={cn(
                    "p-4 rounded-lg flex items-center gap-3",
                    message.type === 'success' && "bg-green-500/10 text-green-500",
                    message.type === 'error' && "bg-red-500/10 text-red-500",
                    message.type === 'info' && "bg-blue-500/10 text-blue-500"
                )}>
                    {message.type === 'success' && <Check className="w-5 h-5" />}
                    {message.type === 'error' && <X className="w-5 h-5" />}
                    {message.type === 'info' && <Activity className="w-5 h-5 animate-pulse" />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* License Mode Warning */}
            {!isHybridMode && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                        <p className="font-medium text-yellow-500">Senkronizasyon Devre Dışı</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Mevcut lisans modunuz: <strong>{license?.type || 'LOCAL'}</strong>.
                            Senkronizasyon için HYBRID lisansa ihtiyacınız var.
                        </p>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Upload className="w-4 h-4" />
                        <span>Gönderilen</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">{stats.pushed}</p>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Download className="w-4 h-4" />
                        <span>Alınan</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">{stats.pulled}</p>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <X className="w-4 h-4" />
                        <span>Başarısız</span>
                    </div>
                    <p className="text-2xl font-bold mt-2 text-red-500">{stats.failed}</p>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Clock className="w-4 h-4" />
                        <span>Son Sync</span>
                    </div>
                    <p className="text-sm font-medium mt-2">{formatDate(stats.lastSync)}</p>
                </div>
            </div>

            {/* Sync Info */}
            <div className="p-4 rounded-lg bg-card border border-border">
                <h3 className="font-medium flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Bağlantı Bilgileri
                </h3>
                <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Sunucu:</span>
                        <span className="font-mono">http://157.90.154.48:8000</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Tenant ID:</span>
                        <span className="font-mono text-xs">{tenant?.id || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Lisans Modu:</span>
                        <span className={cn(
                            "font-medium",
                            isHybridMode ? "text-green-500" : "text-yellow-500"
                        )}>
                            {license?.type || 'LOCAL'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Sync Modu:</span>
                        <span className={cn(
                            "font-medium",
                            syncMode === 'hybrid' ? "text-green-500" : "text-muted-foreground"
                        )}>
                            {syncMode.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Manual Sync */}
                <button
                    onClick={handleManualSync}
                    disabled={isSyncing || !isOnline || !isHybridMode}
                    className={cn(
                        "p-6 rounded-lg border-2 border-dashed transition-all",
                        "hover:border-primary hover:bg-primary/5",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        isSyncing && "animate-pulse"
                    )}
                >
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-3 rounded-full",
                            isHybridMode ? "bg-primary/10" : "bg-muted"
                        )}>
                            <RefreshCw className={cn(
                                "w-6 h-6",
                                isSyncing && "animate-spin",
                                isHybridMode ? "text-primary" : "text-muted-foreground"
                            )} />
                        </div>
                        <div className="text-left">
                            <p className="font-medium">Manuel Senkronizasyon</p>
                            <p className="text-sm text-muted-foreground">
                                Bekleyen değişiklikleri gönder ve sunucudan güncelle
                            </p>
                        </div>
                    </div>
                </button>

                {/* Initial Sync */}
                <button
                    onClick={handleInitialSync}
                    disabled={isInitialSyncing || !isOnline || !isHybridMode}
                    className={cn(
                        "p-6 rounded-lg border-2 border-dashed transition-all",
                        "hover:border-orange-500 hover:bg-orange-500/5",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        isInitialSyncing && "animate-pulse"
                    )}
                >
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-3 rounded-full",
                            isHybridMode ? "bg-orange-500/10" : "bg-muted"
                        )}>
                            <Upload className={cn(
                                "w-6 h-6",
                                isHybridMode ? "text-orange-500" : "text-muted-foreground"
                            )} />
                        </div>
                        <div className="text-left">
                            <p className="font-medium">İlk Kurulum Sync</p>
                            <p className="text-sm text-muted-foreground">
                                Tüm yerel veriyi sunucuya aktar (tek seferlik)
                            </p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Info */}
            <div className="text-xs text-muted-foreground">
                <p>• HYBRID modda otomatik sync her 2 dakikada bir çalışır</p>
                <p>• Çevrimdışıyken yapılan değişiklikler çevrimiçi olunca otomatik gönderilir</p>
                <p>• İlk Kurulum Sync sadece bir kez kullanılmalıdır</p>
            </div>
        </div>
    );
}
