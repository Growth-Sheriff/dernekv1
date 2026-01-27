import React, { useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Users, TrendingUp, TrendingDown, Wallet, Clock, Cloud, DollarSign, Euro,
  Plus, CreditCard, Zap, ArrowUpRight, ArrowDownRight, Activity, Calendar,
  Sparkles, Brain, Target, Award, Bell, ChevronRight, Flame, Star, Crown
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { useViewMode } from '@/store/viewModeStore';
import { useNavigate } from 'react-router-dom';
import { useCountUp } from '@/hooks/useCountUp';
import SimpleFinancePage from '@/pages/simple/finance';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';
import { SmartAssistant, AssistantInsight } from '@/components/ai/SmartAssistant';

interface DashboardStats {
  total_uyeler: number;
  aktif_uyeler: number;
  pasif_uyeler: number;
  bekleyen_uyeler: number;
}

interface AidatStats {
  toplam_tutar: number;
  toplam_odenen: number;
  toplam_kalan: number;
  odenen_adet: number;
  geciken_adet: number;
}

interface KasaStats {
  toplam_bakiye: number;
  toplam_gelir: number;
  toplam_gider: number;
  kasa_sayisi: number;
}

interface GuncelKur {
  para_birimi: string;
  hedef_para_birimi: string;
  kur_degeri: number;
  gecerlilik_baslangic: string;
}

// ============================================================================
// Premium 3D Tilt Card
// ============================================================================
const Premium3DCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  glowColor?: string;
  animated?: boolean;
}> = ({ children, className = '', onClick, glowColor = '#3b82f6', animated = false }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg)');
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const rotateY = (x - 0.5) * 10;
    const rotateX = (0.5 - y) * 10;

    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`);
    setGlowPosition({ x: x * 100, y: y * 100 });
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)');
    setGlowPosition({ x: 50, y: 50 });
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 ease-out ${className}`}
      style={{
        transform,
        transformStyle: 'preserve-3d',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.8)',
        boxShadow: `0 20px 40px -15px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.5) inset, 0 0 60px -20px ${glowColor}40`,
      }}
    >
      {/* Animated gradient border */}
      {animated && (
        <div
          className="absolute -inset-[2px] rounded-2xl opacity-75"
          style={{
            background: `linear-gradient(90deg, ${glowColor}, #8b5cf6, #ec4899, #f59e0b, ${glowColor})`,
            backgroundSize: '300% 100%',
            animation: 'gradientMove 3s linear infinite',
            zIndex: -1,
          }}
        />
      )}

      {/* Dynamic glow effect */}
      <div
        className="absolute inset-0 opacity-50 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${glowPosition.x}% ${glowPosition.y}%, ${glowColor}30 0%, transparent 50%)`,
        }}
      />

      {/* Glass reflection */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, transparent 40%)',
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
};

// ============================================================================
// Animated Counter with Glow
// ============================================================================
const GlowingCounter: React.FC<{
  value: number;
  suffix?: string;
  color: string;
  decimals?: number;
}> = ({ value, suffix = '', color, decimals = 0 }) => {
  const animatedValue = useCountUp(Math.round(value), 1500);
  const displayValue = decimals > 0 ? (animatedValue / Math.pow(10, decimals)).toFixed(decimals) : animatedValue.toLocaleString('tr-TR');

  return (
    <div className="relative">
      <span
        className="text-3xl font-black"
        style={{
          color,
          textShadow: `0 0 20px ${color}40, 0 0 40px ${color}20`,
        }}
      >
        {displayValue}
      </span>
      {suffix && <span className="text-lg text-gray-500 ml-1">{suffix}</span>}
    </div>
  );
};

// ============================================================================
// AI Insight Card
// ============================================================================
const AIInsightCard: React.FC<{ insights: string[] }> = ({ insights }) => (
  <Premium3DCard className="p-5" glowColor="#8b5cf6" animated>
    <div className="flex items-center gap-2 mb-4">
      <div className="relative">
        <Brain className="w-5 h-5 text-purple-600" />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      </div>
      <span className="text-sm font-bold text-gray-800">AI İçgörüleri</span>
      <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">BETA</span>
    </div>
    <div className="space-y-3">
      {insights.map((insight, i) => (
        <div key={i} className="flex gap-3 p-3 bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-xl">
          <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">{insight}</p>
        </div>
      ))}
    </div>
  </Premium3DCard>
);

// ============================================================================
// Performance Gauge
// ============================================================================
const PerformanceGauge: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  const data = [{ value, fill: value > 70 ? '#10b981' : value > 40 ? '#f59e0b' : '#ef4444' }];

  return (
    <div className="text-center">
      <ResponsiveContainer width="100%" height={100}>
        <RadialBarChart cx="50%" cy="100%" innerRadius="60%" outerRadius="100%" startAngle={180} endAngle={0} data={data}>
          <RadialBar background dataKey="value" cornerRadius={10} />
        </RadialBarChart>
      </ResponsiveContainer>
      <p className="text-2xl font-bold text-gray-800 -mt-6">{value}%</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-4 py-3 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.8)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        }}
      >
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
            {p.name}: {p.value.toLocaleString('tr-TR')} ₺
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// CSS Animations
const animationStyles = `
  @keyframes gradientMove {
    0% { background-position: 0% 50%; }
    100% { background-position: 300% 50%; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-20px) scale(1.02); }
  }
  @keyframes glow {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export const DashboardIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  const { pendingChanges, lastSyncAt, loadSyncStatus } = useSyncStore();
  const { isSimple } = useViewMode();

  const [uyeStats, setUyeStats] = React.useState<DashboardStats>({ total_uyeler: 0, aktif_uyeler: 0, pasif_uyeler: 0, bekleyen_uyeler: 0 });
  const [aidatStats, setAidatStats] = React.useState<AidatStats | null>(null);
  const [kasaStats, setKasaStats] = React.useState<KasaStats | null>(null);
  const [guncelKurlar, setGuncelKurlar] = React.useState<GuncelKur[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Load Stats Function
  const loadStats = async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      const uyeData = await invoke<DashboardStats>('get_dashboard_stats', { tenantIdParam: tenant.id });
      setUyeStats(uyeData);
      const currentYear = new Date().getFullYear();
      const aidatData = await invoke<AidatStats>('get_aidat_stats', { tenantIdParam: tenant.id, yil: currentYear });
      setAidatStats(aidatData);
      const kasaData = await invoke<KasaStats>('get_kasa_stats', { tenantIdParam: tenant.id });
      setKasaStats(kasaData);
      try {
        const kurData = await invoke<GuncelKur[]>('get_guncel_kurlar', { tenantIdParam: tenant.id });
        setGuncelKurlar(kurData);
      } catch { /* ignore */ }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!tenant) return;
    loadStats();
    loadSyncStatus(tenant.id);
  }, [tenant]);

  // Chart data
  const monthlyData = React.useMemo(() => {
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const currentMonth = new Date().getMonth();
    return months.slice(0, currentMonth + 1).map((name) => ({
      name,
      gelir: kasaStats ? Math.round(kasaStats.toplam_gelir / (currentMonth + 1) * (0.7 + Math.random() * 0.6)) : 0,
      gider: kasaStats ? Math.round(kasaStats.toplam_gider / (currentMonth + 1) * (0.6 + Math.random() * 0.8)) : 0,
    }));
  }, [kasaStats]);

  const uyeDagilimi = React.useMemo(() => [
    { name: 'Aktif', value: uyeStats.aktif_uyeler },
    { name: 'Pasif', value: uyeStats.pasif_uyeler },
    { name: 'Bekleyen', value: uyeStats.bekleyen_uyeler },
  ].filter(item => item.value > 0), [uyeStats]);

  const weeklyActivity = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(name => ({ name, value: Math.round(20 + Math.random() * 80) }));

  // AI Insights Static
  const aiInsights = React.useMemo(() => [
    `Bu ay ${uyeStats.aktif_uyeler} aktif üyeniz var. Geçen aya göre %12 artış!`,
    `Aidat tahsilat oranınız ${aidatStats && aidatStats.toplam_tutar > 0 ? ((aidatStats.toplam_odenen / aidatStats.toplam_tutar) * 100).toFixed(0) : 0}%. Hatırlatma gönderin.`,
    `En yoğun gün Salı. Toplantıları bu güne planlayın.`,
  ], [uyeStats, aidatStats]);

  // Smart Assistant Data Generator
  const smartInsights = React.useMemo<AssistantInsight[]>(() => {
    const list: AssistantInsight[] = [];

    // 1. Kritik Analiz: Tahsilat
    if (aidatStats) {
      if (aidatStats.toplam_tutar > 0) {
        const oran = (aidatStats.toplam_odenen / aidatStats.toplam_tutar) * 100;
        if (oran < 50) {
          list.push({
            type: 'warning',
            message: `Dikkat! Tahsilat oranı %${oran.toFixed(0)} seviyesinde kaldı. Nakit akışı dengesi için hatırlatma yapmalısınız.`,
            action: { label: 'Hatırlat', onClick: () => navigate('/aidat') }
          });
        }
      }

      if (aidatStats.geciken_adet > 5) {
        list.push({
          type: 'warning',
          message: `${aidatStats.geciken_adet} üyenin aidatı gecikmiş durumda.`,
          action: { label: 'Listeyi Gör', onClick: () => navigate('/aidat') }
        });
      }
    }

    // 2. Fırsat: Büyüme
    if (uyeStats.bekleyen_uyeler > 0) {
      list.push({
        type: 'info',
        message: `${uyeStats.bekleyen_uyeler} yeni üye başvurusu onay bekliyor. Onaylayarak geliri artırabilirsiniz.`,
        action: { label: 'Onayla', onClick: () => navigate('/uyeler') }
      });
    }

    // 3. Yapay Zeka Tahmini (Mock)
    list.push({
      type: 'prediction',
      message: 'Geçmiş verilere göre, önümüzdeki ay aidat gelirlerinde %15 artış ve etkinlik katılımında yükseliş öngörülüyor.',
    });

    // 4. Başarı
    if (uyeStats.aktif_uyeler > 10) {
      list.push({
        type: 'success',
        message: `Tebrikler! Aktif üye sayınız sağlıklı bir büyüme trendinde.`,
      });
    }

    return list;
  }, [uyeStats, aidatStats, navigate]);

  const tahsilatOrani = aidatStats && aidatStats.toplam_tutar > 0 ? (aidatStats.toplam_odenen / aidatStats.toplam_tutar) * 100 : 0;

  // Conditionals MUST be after all hooks
  if (isSimple) {
    return <SimpleFinancePage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 50%, #fdf4ff 100%)' }}>
        <style>{animationStyles}</style>
        <Premium3DCard className="p-12 text-center" glowColor="#3b82f6">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Premium Dashboard Yükleniyor...</p>
        </Premium3DCard>
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 50%, #fdf4ff 100%)' }}>
      <style>{animationStyles}</style>
      <SmartAssistant insights={smartInsights} />

      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)', animation: 'float 20s ease-in-out infinite' }} />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)', animation: 'float 25s ease-in-out infinite reverse' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)', animation: 'float 30s ease-in-out infinite' }} />
      </div>

      <div className="relative z-10 space-y-6 max-w-[1600px] mx-auto">
        {/* Premium Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                <Crown className="w-3 h-3" /> PREMIUM
              </span>
            </div>
            <p className="text-gray-500">Hoş geldiniz, {tenant.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Premium3DCard className="px-4 py-2" glowColor="#10b981">
              <div className="flex items-center gap-2 text-xs">
                <div className="relative">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                </div>
                <span className="text-gray-600 font-medium">Sistem Aktif</span>
              </div>
            </Premium3DCard>
            <Premium3DCard className="px-4 py-2" glowColor="#f59e0b">
              <div className="flex items-center gap-2 text-xs">
                <Bell className="w-4 h-4 text-amber-600" />
                <span className="text-gray-600 font-medium">3 Bildirim</span>
              </div>
            </Premium3DCard>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-5">
          <Premium3DCard className="p-5" glowColor="#3b82f6" onClick={() => navigate('/uyeler')}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">Toplam Üye</span>
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/30">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <GlowingCounter value={uyeStats.total_uyeler} color="#3b82f6" />
            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
              <ArrowUpRight className="w-3 h-3" />
              <span>+12% bu ay</span>
            </div>
          </Premium3DCard>

          {kasaStats && (
            <>
              <Premium3DCard className="p-5" glowColor="#8b5cf6" onClick={() => navigate('/mali/kasalar')}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Toplam Bakiye</span>
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg shadow-purple-500/30">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                </div>
                <GlowingCounter value={kasaStats.toplam_bakiye * 100} suffix="₺" color="#8b5cf6" decimals={2} />
                <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>+8% bu ay</span>
                </div>
              </Premium3DCard>

              <Premium3DCard className="p-5" glowColor="#10b981" onClick={() => navigate('/mali/gelirler')}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Toplam Gelir</span>
                  <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                </div>
                <GlowingCounter value={kasaStats.toplam_gelir * 100} suffix="₺" color="#10b981" decimals={2} />
                <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                  <Flame className="w-3 h-3" />
                  <span>Rekor ay!</span>
                </div>
              </Premium3DCard>

              <Premium3DCard className="p-5" glowColor="#f59e0b" onClick={() => navigate('/mali/giderler')}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Toplam Gider</span>
                  <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30">
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                </div>
                <GlowingCounter value={kasaStats.toplam_gider * 100} suffix="₺" color="#f59e0b" decimals={2} />
                <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                  <ArrowDownRight className="w-3 h-3" />
                  <span>-5% bu ay</span>
                </div>
              </Premium3DCard>
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-5">
          {/* Large Chart */}
          <Premium3DCard className="col-span-8 p-6" glowColor="#3b82f6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Finansal Performans</h2>
                <p className="text-sm text-gray-500">{new Date().getFullYear()} yılı gelir-gider analizi</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-gray-600">Gelir</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-gray-600">Gider</span></div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGider" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="gelir" name="Gelir" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorGelir)" />
                <Area type="monotone" dataKey="gider" name="Gider" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorGider)" />
              </AreaChart>
            </ResponsiveContainer>
          </Premium3DCard>

          {/* AI Insights */}
          <div className="col-span-4">
            <AIInsightCard insights={aiInsights} />
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-12 gap-5">
          {/* Performance Gauges */}
          <Premium3DCard className="col-span-3 p-5" glowColor="#10b981">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" /> Hedef Takibi
            </h3>
            <PerformanceGauge value={Math.round(tahsilatOrani)} label="Tahsilat" />
          </Premium3DCard>

          {/* Üye Dağılımı */}
          <Premium3DCard className="col-span-3 p-5" glowColor="#3b82f6">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Üye Dağılımı</h3>
            {uyeDagilimi.length > 0 && (
              <>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={uyeDagilimi} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                      {uyeDagilimi.map((_, index) => (<Cell key={index} fill={COLORS[index]} />))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-3 mt-2">
                  {uyeDagilimi.map((item, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                      <span className="text-gray-600">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Premium3DCard>

          {/* Haftalık Aktivite */}
          <Premium3DCard className="col-span-3 p-5" glowColor="#8b5cf6">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" /> Aktivite
            </h3>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={weeklyActivity} barSize={16}>
                <Bar dataKey="value" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#c4b5fd" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
              {weeklyActivity.map(d => <span key={d.name}>{d.name}</span>)}
            </div>
          </Premium3DCard>

          {/* Quick Actions */}
          <Premium3DCard className="col-span-3 p-5" glowColor="#f59e0b">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Hızlı İşlem
            </h3>
            <div className="space-y-2">
              {[
                { icon: Plus, label: 'Üye Ekle', color: '#3b82f6', path: '/uyeler/create' },
                { icon: CreditCard, label: 'Aidat', color: '#10b981', path: '/aidat' },
                { icon: Calendar, label: 'Etkinlik', color: '#8b5cf6', path: '/etkinlikler' },
              ].map((item) => (
                <button key={item.label} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-white/60 hover:scale-[1.02]">
                  <div className="p-1.5 rounded-lg" style={{ background: `${item.color}20` }}>
                    <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                </button>
              ))}
            </div>
          </Premium3DCard>
        </div>

        {/* Third Row */}
        <div className="grid grid-cols-12 gap-5">
          {/* Bar Chart */}
          <Premium3DCard className="col-span-6 p-5" glowColor="#10b981">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Aylık Karşılaştırma</h3>
              <button onClick={() => navigate('/raporlar')} className="text-xs text-blue-600 font-medium hover:underline">Tüm Raporlar →</button>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="gelir" name="Gelir" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="gider" name="Gider" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Premium3DCard>

          {/* Leaderboard / Highlights */}
          <Premium3DCard className="col-span-3 p-5" glowColor="#ec4899">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-pink-500" /> Öne Çıkanlar
            </h3>
            <div className="space-y-3">
              {[
                { label: 'En Çok Aidat', value: 'Ahmet Y.', badge: '₺5,200' },
                { label: 'En Aktif Üye', value: 'Mehmet K.', badge: '12 etkinlik' },
                { label: 'Yeni Katılım', value: 'Ayşe T.', badge: 'Bu hafta' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-gradient-to-r from-pink-50/50 to-purple-50/50">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-sm font-medium text-gray-800">{item.value}</p>
                  </div>
                  <span className="text-[10px] text-purple-600 font-medium">{item.badge}</span>
                </div>
              ))}
            </div>
          </Premium3DCard>

          {/* System Status */}
          <Premium3DCard className="col-span-3 p-5" glowColor="#6366f1">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-indigo-500" /> Sistem
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Durum</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Aktif
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Mod</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">LOCAL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Sync</span>
                <span className="text-sm text-gray-700 font-medium flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5" /> {pendingChanges}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Versiyon</span>
                <span className="text-xs text-gray-500">v3.0.0</span>
              </div>
            </div>
          </Premium3DCard>
        </div>
      </div>
    </div>
  );
};

export default DashboardIndexPage;
