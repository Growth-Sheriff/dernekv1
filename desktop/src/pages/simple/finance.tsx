import React, { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import {
    Wallet, TrendingUp, TrendingDown, Users, CreditCard, Plus,
    ArrowUpRight, ArrowDownRight, Clock, AlertCircle, CheckCircle,
    ChevronRight, Receipt, Calendar, Search, Sparkles
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useViewMode } from '@/store/viewModeStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============ TYPES ============
interface QuickStats {
    kasaBakiye: number;
    buAyGelir: number;
    buAyGider: number;
    bekleyenAidat: number;
    bekleyenUye: number;
    gecikmisBakiye: number;
}

interface RecentTransaction {
    id: string;
    type: 'gelir' | 'gider' | 'aidat';
    tarih: string;
    tutar: number;
    aciklama: string;
    uye_adi?: string;
}

interface PendingDues {
    uye_id: string;
    uye_adi: string;
    toplam: number;
    adet: number;
}

// ============ QUICK ACTION CARD ============
const QuickActionCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    color: string;
    onClick: () => void;
}> = ({ icon, label, color, onClick }) => (
    <button
        onClick={onClick}
        className={cn(
            "flex flex-col items-center justify-center gap-2 p-6 rounded-2xl",
            "bg-white border-2 border-dashed border-gray-200",
            "hover:border-transparent hover:shadow-lg",
            "transition-all duration-300 group"
        )}
        style={{ '--hover-color': color } as React.CSSProperties}
    >
        <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
            style={{ background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)` }}
        >
            <div style={{ color }}>{icon}</div>
        </div>
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
    </button>
);

// ============ STAT CARD ============
const SimpleStat: React.FC<{
    label: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    trend?: 'up' | 'down' | 'neutral';
    onClick?: () => void;
}> = ({ label, value, icon, color, trend, onClick }) => (
    <div
        onClick={onClick}
        className={cn(
            "relative overflow-hidden p-5 rounded-2xl bg-white border border-gray-100 shadow-sm",
            onClick && "cursor-pointer hover:shadow-md transition-shadow"
        )}
    >
        <div
            className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20"
            style={{ background: color }}
        />
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm text-gray-500 mb-1">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
            <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${color}15` }}
            >
                <div style={{ color }}>{icon}</div>
            </div>
        </div>
        {trend && trend !== 'neutral' && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trend === 'up' ? "text-green-600" : "text-red-600")}>
                {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>Geçen aya göre</span>
            </div>
        )}
    </div>
);

// ============ ALERT ITEM ============
const AlertItem: React.FC<{
    icon: React.ReactNode;
    message: string;
    action?: string;
    onClick?: () => void;
    color: string;
}> = ({ icon, message, action, onClick, color }) => (
    <div
        className={cn(
            "flex items-center gap-3 p-3 rounded-xl transition-colors",
            onClick && "cursor-pointer hover:bg-gray-50"
        )}
        onClick={onClick}
    >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
            <div style={{ color }}>{icon}</div>
        </div>
        <span className="flex-1 text-sm text-gray-700">{message}</span>
        {action && (
            <span className="text-xs font-medium" style={{ color }}>{action}</span>
        )}
    </div>
);

// ============ TRANSACTION ITEM ============
const TransactionItem: React.FC<{ tx: RecentTransaction }> = ({ tx }) => {
    const isGelir = tx.type === 'gelir' || tx.type === 'aidat';
    return (
        <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
            <div
                className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isGelir ? "bg-green-50" : "bg-red-50"
                )}
            >
                {isGelir ? (
                    <ArrowUpRight className={cn("w-5 h-5", "text-green-600")} />
                ) : (
                    <ArrowDownRight className={cn("w-5 h-5", "text-red-600")} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                    {tx.type === 'aidat' ? `${tx.uye_adi || 'Üye'} - Aidat` : tx.aciklama}
                </p>
                <p className="text-xs text-gray-500">
                    {new Date(tx.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </p>
            </div>
            <span className={cn("text-sm font-bold", isGelir ? "text-green-600" : "text-red-600")}>
                {isGelir ? '+' : '-'}₺{tx.tutar.toLocaleString('tr-TR')}
            </span>
        </div>
    );
};

// ============ QUICK AIDAT MODAL ============
const QuickAidatModal: React.FC<{
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tenantId: string;
}> = ({ open, onClose, onSuccess, tenantId }) => {
    const [search, setSearch] = useState('');
    const [uyeler, setUyeler] = useState<any[]>([]);
    const [selectedUye, setSelectedUye] = useState<any>(null);
    const [bekleyenler, setBekleyenler] = useState<any[]>([]);
    const [selectedAylar, setSelectedAylar] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadUyeler();
        }
    }, [open]);

    const loadUyeler = async () => {
        try {
            const result = await invoke<any[]>('get_uyeler', { tenantIdParam: tenantId });
            setUyeler(result);
        } catch (error) {
            console.error('Üyeler yüklenemedi:', error);
        }
    };

    const loadBekleyenler = async (uyeId: string) => {
        try {
            const result = await invoke<any[]>('get_aidat_takip', {
                tenantIdParam: tenantId,
                filterUyeId: uyeId,
                filterYil: new Date().getFullYear(),
                filterAy: null,
                filterDurum: 'beklemede',
                skip: 0,
                limit: 12,
            });
            setBekleyenler(result);
        } catch (error) {
            console.error('Aidatlar yüklenemedi:', error);
        }
    };

    const handleSelectUye = (uye: any) => {
        setSelectedUye(uye);
        setSelectedAylar([]);
        loadBekleyenler(uye.id);
    };

    const toggleAy = (id: string) => {
        setSelectedAylar(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const toplam = useMemo(() => {
        return bekleyenler
            .filter(b => selectedAylar.includes(b.id))
            .reduce((sum, b) => sum + b.tutar, 0);
    }, [bekleyenler, selectedAylar]);

    const handleTahsil = async () => {
        if (!selectedUye || selectedAylar.length === 0) return;
        setLoading(true);
        try {
            for (const aidatId of selectedAylar) {
                const aidat = bekleyenler.find(b => b.id === aidatId);
                if (aidat) {
                    await invoke('update_aidat_odeme', {
                        tenantIdParam: tenantId,
                        odemeId: aidatId,
                        tutar: aidat.tutar,
                        odenen: aidat.tutar,
                        odemeTarihi: new Date().toISOString().split('T')[0],
                    });
                }
            }
            toast.success(`${selectedAylar.length} aidat tahsil edildi!`);
            onSuccess();
            onClose();
        } catch (error) {
            toast.error('Tahsilat başarısız: ' + error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUyeler = uyeler.filter(u =>
        u.ad_soyad?.toLowerCase().includes(search.toLowerCase()) ||
        u.uye_no?.includes(search)
    );

    const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <span>Hızlı Aidat Tahsilat</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Search */}
                    {!selectedUye && (
                        <>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Üye ara..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-1">
                                {filteredUyeler.slice(0, 10).map(uye => (
                                    <button
                                        key={uye.id}
                                        onClick={() => handleSelectUye(uye)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                                            {uye.ad_soyad?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{uye.ad_soyad}</p>
                                            <p className="text-xs text-gray-500">Üye No: {uye.uye_no}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Selected Uye - Dönem Seçimi */}
                    {selectedUye && (
                        <>
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                                    {selectedUye.ad_soyad?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{selectedUye.ad_soyad}</p>
                                    <p className="text-xs text-gray-500">Üye No: {selectedUye.uye_no}</p>
                                </div>
                                <button onClick={() => { setSelectedUye(null); setBekleyenler([]); }} className="text-blue-600 text-sm font-medium">Değiştir</button>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Bekleyen Aidatlar:</p>
                                {bekleyenler.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {bekleyenler.map(b => (
                                            <button
                                                key={b.id}
                                                onClick={() => toggleAy(b.id)}
                                                className={cn(
                                                    "p-3 rounded-xl border-2 transition-all text-center",
                                                    selectedAylar.includes(b.id)
                                                        ? "border-green-500 bg-green-50"
                                                        : "border-gray-200 hover:border-gray-300"
                                                )}
                                            >
                                                <p className="text-sm font-bold text-gray-900">{aylar[b.ay - 1]}</p>
                                                <p className="text-xs text-gray-500">₺{b.tutar}</p>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 text-center py-4">Bekleyen aidat yok</p>
                                )}
                            </div>

                            {selectedAylar.length > 0 && (
                                <div className="p-4 bg-green-50 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">{selectedAylar.length} dönem seçildi</span>
                                        <span className="text-xl font-bold text-green-600">₺{toplam.toLocaleString('tr-TR')}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>İptal</Button>
                    <Button
                        onClick={handleTahsil}
                        disabled={selectedAylar.length === 0 || loading}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {loading ? 'İşleniyor...' : `Tahsil Et (₺${toplam.toLocaleString('tr-TR')})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ============ QUICK GELIR/GIDER MODAL ============
const QuickTransactionModal: React.FC<{
    open: boolean;
    type: 'gelir' | 'gider';
    onClose: () => void;
    onSuccess: () => void;
    tenantId: string;
}> = ({ open, type, onClose, onSuccess, tenantId }) => {
    const [aciklama, setAciklama] = useState('');
    const [tutar, setTutar] = useState('');
    const [loading, setLoading] = useState(false);
    const [kasalar, setKasalar] = useState<any[]>([]);
    const [kasaId, setKasaId] = useState('');

    useEffect(() => {
        if (open) {
            loadKasalar();
        }
    }, [open]);

    const loadKasalar = async () => {
        try {
            const result = await invoke<any[]>('get_kasalar', { tenantIdParam: tenantId });
            setKasalar(result);
            if (result.length > 0) setKasaId(result[0].id);
        } catch (error) {
            console.error('Kasalar yüklenemedi:', error);
        }
    };

    const handleSubmit = async () => {
        if (!aciklama || !tutar || !kasaId) {
            toast.error('Tüm alanları doldurun!');
            return;
        }

        const tutarNum = parseFloat(tutar);
        if (isNaN(tutarNum) || tutarNum <= 0) {
            toast.error('Geçerli bir tutar girin!');
            return;
        }

        setLoading(true);
        try {
            if (type === 'gelir') {
                await invoke('create_gelir', {
                    tenantIdParam: tenantId,
                    data: {
                        kasa_id: kasaId,
                        tarih: new Date().toISOString().split('T')[0],
                        tutar: tutarNum,
                        aciklama,
                    },
                });
                toast.success('Gelir eklendi!');
            } else {
                await invoke('create_gider', {
                    tenantIdParam: tenantId,
                    data: {
                        kasa_id: kasaId,
                        tarih: new Date().toISOString().split('T')[0],
                        tutar: tutarNum,
                        aciklama,
                    },
                });
                toast.success('Gider eklendi!');
            }
            onSuccess();
            onClose();
            setAciklama('');
            setTutar('');
        } catch (error) {
            toast.error('İşlem başarısız: ' + error);
        } finally {
            setLoading(false);
        }
    };

    const isGelir = type === 'gelir';

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-white",
                            isGelir ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-red-500 to-rose-600"
                        )}>
                            {isGelir ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <span>{isGelir ? 'Gelir Ekle' : 'Gider Ekle'}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ne için?</label>
                        <Input
                            placeholder={isGelir ? "Örn: Bağış, Sponsor geliri..." : "Örn: Elektrik faturası..."}
                            value={aciklama}
                            onChange={(e) => setAciklama(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tutar</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₺</span>
                            <Input
                                type="number"
                                placeholder="0"
                                value={tutar}
                                onChange={(e) => setTutar(e.target.value)}
                                className="pl-7 text-xl font-bold"
                            />
                        </div>
                    </div>

                    {kasalar.length > 1 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kasa</label>
                            <select
                                value={kasaId}
                                onChange={(e) => setKasaId(e.target.value)}
                                className="w-full h-10 rounded-lg border px-3"
                            >
                                {kasalar.map(k => <option key={k.id} value={k.id}>{k.kasa_adi}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>İptal</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !aciklama || !tutar}
                        className={isGelir ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                    >
                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ============ MAIN COMPONENT ============
export const SimpleFinancePage: React.FC = () => {
    const navigate = useNavigate();
    const tenant = useAuthStore((state) => state.tenant);
    const { isSimple } = useViewMode();

    const [stats, setStats] = useState<QuickStats>({
        kasaBakiye: 0,
        buAyGelir: 0,
        buAyGider: 0,
        bekleyenAidat: 0,
        bekleyenUye: 0,
        gecikmisBakiye: 0,
    });
    const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showAidatModal, setShowAidatModal] = useState(false);
    const [showGelirModal, setShowGelirModal] = useState(false);
    const [showGiderModal, setShowGiderModal] = useState(false);

    useEffect(() => {
        if (tenant) {
            loadData();
        }
    }, [tenant]);

    const loadData = async () => {
        if (!tenant) return;
        setLoading(true);
        try {
            // Load kasalar for total balance
            const kasalar = await invoke<any[]>('get_kasalar', { tenantIdParam: tenant.id });
            const kasaBakiye = kasalar.reduce((sum, k) => sum + (k.serbest_bakiye || 0), 0);

            // Load this month data - simplified
            const thisMonth = new Date().toISOString().slice(0, 7);

            // Get aidat summary
            const aidatOzet = await invoke<any>('get_aidat_ozet', {
                tenantIdParam: tenant.id,
                yil: new Date().getFullYear(),
            });

            setStats({
                kasaBakiye,
                buAyGelir: 0, // Will be calculated from transactions
                buAyGider: 0,
                bekleyenAidat: aidatOzet?.toplam_kalan || 0,
                bekleyenUye: aidatOzet?.geciken_adet || 0,
                gecikmisBakiye: aidatOzet?.toplam_kalan || 0,
            });

            // Mock recent transactions for now
            setRecentTransactions([]);

        } catch (error) {
            console.error('Veri yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isSimple) {
        return null; // Expert mode uses different pages
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Basit Mod</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Mali Durumunuz</h1>
                <p className="text-gray-500 mt-1">Derneğinizin finansal özeti</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <SimpleStat
                    label="Kasa Bakiyesi"
                    value={`₺${stats.kasaBakiye.toLocaleString('tr-TR')}`}
                    icon={<Wallet className="w-6 h-6" />}
                    color="#3b82f6"
                />
                <SimpleStat
                    label="Bu Ay Gelir"
                    value={`₺${stats.buAyGelir.toLocaleString('tr-TR')}`}
                    icon={<TrendingUp className="w-6 h-6" />}
                    color="#10b981"
                    trend="up"
                />
                <SimpleStat
                    label="Bu Ay Gider"
                    value={`₺${stats.buAyGider.toLocaleString('tr-TR')}`}
                    icon={<TrendingDown className="w-6 h-6" />}
                    color="#ef4444"
                />
                <SimpleStat
                    label="Bekleyen Aidat"
                    value={`₺${stats.bekleyenAidat.toLocaleString('tr-TR')}`}
                    icon={<Clock className="w-6 h-6" />}
                    color="#f59e0b"
                    onClick={() => navigate('/aidat')}
                />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-3 gap-6">
                {/* Left: Quick Actions */}
                <div className="col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-gray-400" />
                            Hızlı İşlemler
                        </h2>
                        <div className="grid grid-cols-1 gap-3">
                            <QuickActionCard
                                icon={<CreditCard className="w-6 h-6" />}
                                label="Aidat Al"
                                color="#10b981"
                                onClick={() => setShowAidatModal(true)}
                            />
                            <QuickActionCard
                                icon={<TrendingUp className="w-6 h-6" />}
                                label="Gelir Ekle"
                                color="#3b82f6"
                                onClick={() => setShowGelirModal(true)}
                            />
                            <QuickActionCard
                                icon={<TrendingDown className="w-6 h-6" />}
                                label="Gider Ekle"
                                color="#ef4444"
                                onClick={() => setShowGiderModal(true)}
                            />
                        </div>
                    </div>

                    {/* Alerts */}
                    {stats.bekleyenUye > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                Dikkat
                            </h2>
                            <div className="space-y-1">
                                <AlertItem
                                    icon={<Clock className="w-4 h-4" />}
                                    message={`${stats.bekleyenUye} üyenin aidatı gecikmiş`}
                                    action="Görüntüle →"
                                    onClick={() => navigate('/aidat')}
                                    color="#f59e0b"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Recent Transactions */}
                <div className="col-span-2">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-gray-400" />
                                Son İşlemler
                            </h2>
                            <button
                                onClick={() => navigate('/mali/gelirler')}
                                className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                            >
                                Tümünü Gör <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {recentTransactions.length > 0 ? (
                            <div className="space-y-1">
                                {recentTransactions.map(tx => (
                                    <TransactionItem key={tx.id} tx={tx} />
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                <p className="text-gray-500">Henüz işlem yok</p>
                                <p className="text-sm text-gray-400 mt-1">Hızlı işlemlerden başlayabilirsiniz</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {tenant && (
                <>
                    <QuickAidatModal
                        open={showAidatModal}
                        onClose={() => setShowAidatModal(false)}
                        onSuccess={loadData}
                        tenantId={tenant.id}
                    />
                    <QuickTransactionModal
                        open={showGelirModal}
                        type="gelir"
                        onClose={() => setShowGelirModal(false)}
                        onSuccess={loadData}
                        tenantId={tenant.id}
                    />
                    <QuickTransactionModal
                        open={showGiderModal}
                        type="gider"
                        onClose={() => setShowGiderModal(false)}
                        onSuccess={loadData}
                        tenantId={tenant.id}
                    />
                </>
            )}
        </div>
    );
};

export default SimpleFinancePage;
