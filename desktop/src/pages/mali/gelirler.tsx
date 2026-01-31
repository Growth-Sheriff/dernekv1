import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Plus, TrendingUp, Eye, Pencil, Trash2,
  FileSpreadsheet, FileText, Wallet, Calendar,
  CheckCircle, Clock, CreditCard, ArrowUpRight, DollarSign, PieChart as PieChartIcon
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend, Treemap
} from 'recharts';

// Components
import { PageLayout, GlassCard, SectionCard } from '@/components/ui/page-layout';
import { StatCard, StatIcons } from '@/components/ui/dashboard-widgets';
import { SmartFilterPanel, FilterDefinition, FilterValue, DEFAULT_DATE_PRESETS } from '@/components/ui/smart-filter-panel';
import { SmartTable, SmartTableColumn, SmartTableAction, BulkAction } from '@/components/ui/smart-table';

// Hooks
import { useGelirler } from '@/hooks/useGelirler';
import { useColumnConfig } from '@/hooks/useColumnConfig';
import { ColumnSettingsModal } from '@/components/common/ColumnSettingsModal';
import { GELIRLER_PAGE_CONFIG, PAGE_PRESETS, GELIRLER_COLUMNS } from '@/config/columnDefinitions';
import { PAGE_KEYS } from '@/types/columnConfig';
import { exportToExcel, exportToPDF, columnsToExportFormat } from '@/utils/export';
import { EvrakEkleme, EvrakData } from '@/components/common/EvrakEkleme';
import { cn } from '@/lib/utils';

// ============ TYPES ============
interface Gelir {
  id: string;
  kasa_id: string;
  kasa_adi?: string;
  tarih: string;
  tutar: number;
  gelir_turu?: string;
  aciklama?: string;
  makbuz_no?: string;
  uye_id?: string;
  uye_ad_soyad?: string;
  aidat_id?: string;
  created_at: string;
}

interface Kasa { id: string; kasa_adi: string; para_birimi: string; }
interface GelirTuru { id: string; ad: string; }
interface Uye { id: string; uye_no: string; ad_soyad: string; }

// ============ COLORS ============
const COLORS = {
  green: '#10b981',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  orange: '#f59e0b',
  pink: '#ec4899',
  cyan: '#06b6d4',
  red: '#ef4444',
};
const PIE_COLORS = [COLORS.green, COLORS.blue, COLORS.purple, COLORS.orange, COLORS.pink, COLORS.cyan];

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-3 py-2 rounded-xl text-sm" style={{
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}>
        <p className="text-gray-500 text-xs mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="font-semibold" style={{ color: p.color || p.fill }}>
            {p.name}: ₺{typeof p.value === 'number' ? p.value.toLocaleString('tr-TR') : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ============ FILTER DEFINITIONS ============
const createFilterDefinitions = (kasalar: Kasa[], gelirTurleri: GelirTuru[]): FilterDefinition[] => [
  { id: 'kasa_id', label: 'Kasa', type: 'select', options: kasalar.map(k => ({ value: k.id, label: k.kasa_adi })) },
  { id: 'gelir_turu', label: 'Gelir Türü', type: 'select', options: gelirTurleri.map(t => ({ value: t.id, label: t.ad })) },
  { id: 'baslangic_tarih', label: 'Başlangıç Tarihi', type: 'date' },
  { id: 'bitis_tarih', label: 'Bitiş Tarihi', type: 'date' },
];

// ============ COMPONENT ============
export const GelirlerPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);

  // State
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValue[]>([]);
  const [selectedGelirler, setSelectedGelirler] = useState<Gelir[]>([]);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingGelir, setDeletingGelir] = useState<Gelir | null>(null);

  // Form state
  const [kasalar, setKasalar] = useState<Kasa[]>([]);
  const [gelirTurleri, setGelirTurleri] = useState<GelirTuru[]>([]);
  const [uyeler, setUyeler] = useState<Uye[]>([]);
  const [kasaId, setKasaId] = useState('');
  const [gelirTuruId, setGelirTuruId] = useState('');
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]);
  const [tutar, setTutar] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [dekontNo, setDekontNo] = useState('');
  const [selectedUyeId, setSelectedUyeId] = useState('');
  const [evrakData, setEvrakData] = useState<EvrakData | null>(null);
  // Eksik alanlar - Faz 1
  const [tahsilEden, setTahsilEden] = useState('');
  const [belgeNo, setBelgeNo] = useState('');
  const [altKategori, setAltKategori] = useState('');
  const [aitOlduguYil, setAitOlduguYil] = useState<number>(new Date().getFullYear());
  const [notlar, setNotlar] = useState('');
  // Eksik alanlar - Faz 2 (Son eklenenler)
  const [tahakkukDurumu, setTahakkukDurumu] = useState('TAHSIL_EDILDI');
  const [aidatId, setAidatId] = useState('');
  const [aidatlar, setAidatlar] = useState<{ id: string; donem: string; tutar: number }[]>([]);

  // Extract filters
  const baslangicTarih = filterValues.find(f => f.id === 'baslangic_tarih')?.value || '';
  const bitisTarih = filterValues.find(f => f.id === 'bitis_tarih')?.value || '';

  // React Query hook
  const { gelirler, isLoading, refetch } = useGelirler({
    baslangicTarih: baslangicTarih || null,
    bitisTarih: bitisTarih || null,
    limit: 1000,
  });

  // Column configuration
  const { config: columnConfig, saveConfig: saveColumnConfig, resetConfig: resetColumnConfig, toggleSort } = useColumnConfig({
    pageKey: PAGE_KEYS.GELIRLER_LIST,
    defaultVisible: GELIRLER_PAGE_CONFIG.defaultVisible,
    defaultOrder: GELIRLER_PAGE_CONFIG.defaultColumns.map(c => c.id),
  });

  // Load related data
  React.useEffect(() => {
    if (!tenant) return;
    loadKasalar();
    loadGelirTurleri();
    loadUyeler();
  }, [tenant]);

  const loadKasalar = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<Kasa[]>('get_kasalar', { tenantIdParam: tenant.id });
      setKasalar(result);
      if (result.length > 0 && !kasaId) setKasaId(result[0].id);
    } catch (error) { console.error('Kasalar yüklenemedi:', error); }
  };

  const loadGelirTurleri = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<GelirTuru[]>('get_gelir_turleri', { tenantIdParam: tenant.id });
      setGelirTurleri(result);
    } catch (error) { console.error('Gelir türleri yüklenemedi:', error); }
  };

  const loadUyeler = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<Uye[]>('get_uyeler', { tenantIdParam: tenant.id });
      setUyeler(result);
    } catch (error) { console.error('Üyeler yüklenemedi:', error); }
  };

  // ============ COMPUTED STATS & CHARTS ============
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);
    const todayTotal = gelirler.filter(g => g.tarih.startsWith(today)).reduce((sum, g) => sum + g.tutar, 0);
    const monthTotal = gelirler.filter(g => g.tarih.startsWith(thisMonth)).reduce((sum, g) => sum + g.tutar, 0);
    const aidatTotal = gelirler.filter(g => g.aidat_id).reduce((sum, g) => sum + g.tutar, 0);
    const toplamTutar = gelirler.reduce((sum, g) => sum + g.tutar, 0);
    return { toplam: gelirler.length, toplamTutar, todayTotal, monthTotal, aidatTotal };
  }, [gelirler]);

  // Gelir Türü Dağılımı (Pie)
  const gelirTuruData = useMemo(() => {
    const grouped: Record<string, number> = {};
    gelirler.forEach(g => {
      const tur = g.aidat_id ? 'Aidat' : (g.gelir_turu || 'Diğer');
      grouped[tur] = (grouped[tur] || 0) + g.tutar;
    });
    return Object.entries(grouped).map(([name, value], i) => ({ name, value, fill: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [gelirler]);

  // Aylık Gelir Trendi (Son 6 ay)
  const aylikTrendData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
    }
    gelirler.forEach(g => { const key = g.tarih.slice(0, 7); if (months[key] !== undefined) months[key] += g.tutar; });
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return Object.entries(months).map(([key, value]) => {
      const [, month] = key.split('-');
      return { name: monthNames[parseInt(month) - 1], gelir: value };
    });
  }, [gelirler]);

  // Kasa Dağılımı (Horizontal Bar)
  const kasaDagilimData = useMemo(() => {
    const grouped: Record<string, number> = {};
    gelirler.forEach(g => { grouped[g.kasa_adi || 'Bilinmeyen'] = (grouped[g.kasa_adi || 'Bilinmeyen'] || 0) + g.tutar; });
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [gelirler]);

  // Haftalık Dağılım (Son 7 gün)
  const haftalikData = useMemo(() => {
    const days: Record<string, number> = {};
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days[d.toISOString().split('T')[0]] = 0;
    }
    gelirler.forEach(g => { if (days[g.tarih] !== undefined) days[g.tarih] += g.tutar; });
    return Object.entries(days).map(([date, value]) => {
      const d = new Date(date);
      return { name: dayNames[d.getDay()], gelir: value };
    });
  }, [gelirler]);

  // Ortalama Gelir
  const ortalamaGelir = stats.toplam > 0 ? stats.toplamTutar / stats.toplam : 0;

  // ============ TABLE COLUMNS ============
  const tableColumns: SmartTableColumn<Gelir>[] = useMemo(() => [
    {
      id: 'tarih', header: 'Tarih', accessor: 'tarih', width: 120, sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-green-600" />
          </div>
          <span className="font-medium text-gray-900">{value ? new Date(value).toLocaleDateString('tr-TR') : '-'}</span>
        </div>
      ),
    },
    {
      id: 'tutar', header: 'Tutar', accessor: 'tutar', width: 140, align: 'right', sortable: true,
      render: (value) => <span className="text-lg font-bold text-green-600">+₺{value?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>,
    },
    {
      id: 'gelir_turu', header: 'Tür', accessor: 'gelir_turu', width: 120,
      render: (value, row) => {
        const isAidat = !!row.aidat_id;
        return (
          <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full", isAidat ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700')}>
            {isAidat ? 'Aidat' : (value || 'Diğer')}
          </span>
        );
      },
    },
    { id: 'aciklama', header: 'Açıklama', accessor: 'aciklama', width: 200, render: (value) => <p className="text-sm text-gray-600 truncate">{value || '-'}</p> },
    { id: 'kasa', header: 'Kasa', accessor: 'kasa_adi', width: 130, render: (value) => <span className="text-sm text-gray-600">{value || '-'}</span> },
  ], []);

  // ============ TABLE ACTIONS ============
  const tableActions: SmartTableAction<Gelir>[] = [
    { id: 'delete', label: 'Sil', icon: <Trash2 className="w-4 h-4" />, variant: 'destructive', onClick: (row) => { setDeletingGelir(row); setShowDeleteConfirm(true); } },
  ];

  // ============ HANDLERS ============
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !kasaId || !tutar) { toast.error('Kasa ve Tutar zorunludur!'); return; }
    const tutarNum = parseFloat(tutar);
    if (isNaN(tutarNum) || tutarNum <= 0) { toast.error('Geçerli tutar girin!'); return; }
    try {
      // Gelir verileri - TÜM ALANLAR (Backend'deki CreateGelirRequest ile uyumlu)
      const gelirData = {
        kasa_id: kasaId,
        gelir_turu_id: gelirTuruId || null,
        tarih,
        tutar: tutarNum,
        aciklama: aciklama || null,
        makbuz_no: dekontNo || null,
        uye_id: selectedUyeId || null,
        // Faz 1 alanları
        tahsil_eden: tahsilEden || null,
        belge_no: belgeNo || null,
        alt_kategori: altKategori || null,
        ait_oldugu_yil: aitOlduguYil || null,
        // Faz 2 alanları (Son eklenenler)
        tahakkuk_durumu: tahakkukDurumu || null,
        aidat_id: aidatId || null,
        belge_id: evrakData?.belge_id || null,
      };

      // 1. Local DB'ye kaydet
      const result = await invoke<{ id: string }>('create_gelir', {
        tenantIdParam: tenant.id,
        data: gelirData,
      });

      // 2. Sync kuyruğuna ekle (HYBRID modda sunucuya da gönderilir)
      const { syncService } = await import('@/services/syncService');
      await syncService.queueChange(tenant.id, 'gelirler', 'create', {
        id: result.id,
        tenant_id: tenant.id,
        ...gelirData,
      });

      toast.success('Gelir eklendi!');
      setShowForm(false);
      // Formu temizle
      setTutar(''); setAciklama(''); setDekontNo(''); setSelectedUyeId('');
      setTahsilEden(''); setBelgeNo(''); setAltKategori(''); setNotlar('');
      setTahakkukDurumu('TAHSIL_EDILDI'); setAidatId(''); setEvrakData(null);
      refetch();
    } catch (error) { toast.error('Gelir eklenemedi: ' + error); }
  };


  const handleDelete = async () => {
    if (!tenant || !deletingGelir) return;
    try {
      // 1. Local DB'den sil
      await invoke('delete_gelir', { tenantIdParam: tenant.id, recordId: deletingGelir.id });

      // 2. Sync kuyruğuna ekle
      const { syncService } = await import('@/services/syncService');
      await syncService.queueChange(tenant.id, 'gelirler', 'delete', {
        id: deletingGelir.id,
        tenant_id: tenant.id
      });

      toast.success('Gelir silindi');
      refetch();
    } catch (error) { toast.error('Silinemedi: ' + error); }
    finally { setShowDeleteConfirm(false); setDeletingGelir(null); }
  };

  // ============ RENDER ============
  return (
    <PageLayout
      title="Gelirler"
      subtitle={`${stats.toplam} kayıt • Toplam: ₺${stats.toplamTutar.toLocaleString('tr-TR')}`}
      icon={<TrendingUp className="w-6 h-6" />}
      actions={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Yeni Gelir</Button>}
      stats={
        <>
          <StatCard title="Toplam Gelir" value={`₺${stats.toplamTutar.toLocaleString('tr-TR')}`} subtitle={`${stats.toplam} işlem`} icon={StatIcons.wallet} color="green" size="sm" trend={{ value: 15, isPositive: true }} />
          <StatCard title="Bugün" value={`₺${stats.todayTotal.toLocaleString('tr-TR')}`} subtitle="Günlük tahsilat" icon={StatIcons.calendar} color="blue" size="sm" />
          <StatCard title="Bu Ay" value={`₺${stats.monthTotal.toLocaleString('tr-TR')}`} subtitle="Aylık tahsilat" icon={StatIcons.chart} color="purple" size="sm" />
          <StatCard title="Ortalama" value={`₺${ortalamaGelir.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`} subtitle="İşlem başına" icon={StatIcons.activity} color="yellow" size="sm" />
        </>
      }
    >
      {/* Charts Section */}
      <div className="grid grid-cols-12 gap-5 mb-6">
        {/* Gelir Türü Dağılımı - Pie */}
        <GlassCard className="col-span-3 p-5" hover={false} glow={COLORS.green}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-green-600" />
            Gelir Türü Dağılımı
          </h3>
          {gelirTuruData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={gelirTuruData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                    {gelirTuruData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {gelirTuruData.slice(0, 4).map((d, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="h-[140px] flex items-center justify-center text-gray-400 text-sm">Veri yok</div>}
        </GlassCard>

        {/* Aylık Gelir Trendi - Area */}
        <GlassCard className="col-span-5 p-5" hover={false} glow={COLORS.blue}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Aylık Gelir Trendi
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={aylikTrendData}>
              <defs>
                <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="gelir" name="Gelir" stroke={COLORS.green} strokeWidth={2} fillOpacity={1} fill="url(#colorGelir)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Haftalık Dağılım - Bar */}
        <GlassCard className="col-span-4 p-5" hover={false} glow={COLORS.purple}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            Son 7 Gün
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={haftalikData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="gelir" name="Gelir" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Kasa Dağılımı Row */}
      {kasaDagilimData.length > 0 && (
        <GlassCard className="mb-6 p-5" hover={false}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-orange-600" />
            Kasa Bazlı Gelir Dağılımı
          </h3>
          <div className="space-y-3">
            {kasaDagilimData.map((item, i) => {
              const maxVal = kasaDagilimData[0]?.value || 1;
              const pct = (item.value / maxVal) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-gray-700 truncate">{item.name}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg flex items-center justify-end px-2"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${PIE_COLORS[i % PIE_COLORS.length]} 0%, ${PIE_COLORS[i % PIE_COLORS.length]}cc 100%)` }}
                    >
                      <span className="text-xs text-white font-medium">₺{item.value.toLocaleString('tr-TR')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Filter */}
      <SectionCard className="mb-6">
        <SmartFilterPanel
          filters={createFilterDefinitions(kasalar, gelirTurleri)}
          values={filterValues}
          onChange={setFilterValues}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Gelir ara..."
          datePresets={DEFAULT_DATE_PRESETS}
        />
      </SectionCard>

      {/* Table */}
      <SectionCard padding="none">
        <SmartTable
          data={gelirler}
          columns={tableColumns}
          actions={tableActions}
          selectable={true}
          sortable={true}
          columnConfig={columnConfig}
          onSort={toggleSort}
          selectedRows={selectedGelirler}
          onSelectionChange={setSelectedGelirler}
          getRowId={(row) => row.id}
          loading={isLoading}
          maxHeight={400}
          emptyMessage="Gelir kaydı bulunamadı"
        />
      </SectionCard>

      {/* Add Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white"><TrendingUp className="w-5 h-5" /></div>
              <span>Yeni Gelir Ekle</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 py-4">
            {/* ROW 1: Kasa ve Gelir Türü */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kasa *</label>
                <select value={kasaId} onChange={(e) => setKasaId(e.target.value)} className="w-full h-10 rounded-lg border px-3" required>
                  {kasalar.map(k => <option key={k.id} value={k.id}>{k.kasa_adi}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gelir Türü</label>
                <select value={gelirTuruId} onChange={(e) => setGelirTuruId(e.target.value)} className="w-full h-10 rounded-lg border px-3">
                  <option value="">Seçiniz</option>
                  {gelirTurleri.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
                </select>
              </div>
            </div>

            {/* ROW 2: Tarih, Tutar, Yıl */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
                <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className="w-full h-10 rounded-lg border px-3" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tutar *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₺</span>
                  <input type="number" step="0.01" value={tutar} onChange={(e) => setTutar(e.target.value)} className="w-full h-10 rounded-lg border pl-7 pr-3" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ait Olduğu Yıl</label>
                <select value={aitOlduguYil} onChange={(e) => setAitOlduguYil(parseInt(e.target.value))} className="w-full h-10 rounded-lg border px-3">
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>
            </div>

            {/* ROW 3: Makbuz No, Belge No, Alt Kategori */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Makbuz No</label>
                <input type="text" value={dekontNo} onChange={(e) => setDekontNo(e.target.value)} className="w-full h-10 rounded-lg border px-3" placeholder="MKB-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Belge No</label>
                <input type="text" value={belgeNo} onChange={(e) => setBelgeNo(e.target.value)} className="w-full h-10 rounded-lg border px-3" placeholder="BLG-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alt Kategori</label>
                <select value={altKategori} onChange={(e) => setAltKategori(e.target.value)} className="w-full h-10 rounded-lg border px-3">
                  <option value="">Seçiniz</option>
                  <option value="AIDAT">Aidat</option>
                  <option value="BAGIS">Bağış</option>
                  <option value="ETKINLIK">Etkinlik</option>
                  <option value="KIRA">Kira</option>
                  <option value="DIGER">Diğer</option>
                </select>
              </div>
            </div>

            {/* ROW 4: İlgili Üye ve Tahsil Eden */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İlgili Üye</label>
                <select
                  value={selectedUyeId}
                  onChange={(e) => setSelectedUyeId(e.target.value)}
                  className="w-full h-10 rounded-lg border px-3"
                >
                  <option value="">Üye Seçin (Opsiyonel)</option>
                  {uyeler.map(u => (
                    <option key={u.id} value={u.id}>{u.uye_no} - {u.ad_soyad}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tahsil Eden</label>
                <input type="text" value={tahsilEden} onChange={(e) => setTahsilEden(e.target.value)} className="w-full h-10 rounded-lg border px-3" placeholder="Tahsil eden kişi" />
              </div>
            </div>

            {/* ROW 5: Açıklama */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea value={aciklama} onChange={(e) => setAciklama(e.target.value)} rows={2} className="w-full rounded-lg border px-3 py-2 resize-none" placeholder="Gelir hakkında açıklama..." />
            </div>

            {/* ROW 6: Tahakkuk Durumu */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tahakkuk Durumu</label>
                <select value={tahakkukDurumu} onChange={(e) => setTahakkukDurumu(e.target.value)} className="w-full h-10 rounded-lg border px-3">
                  <option value="TAHSIL_EDILDI">Tahsil Edildi</option>
                  <option value="BEKLIYOR">Bekliyor</option>
                  <option value="KISMI_TAHSILAT">Kısmi Tahsilat</option>
                  <option value="IPTAL">İptal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aidat Bağlantısı</label>
                <select value={aidatId} onChange={(e) => setAidatId(e.target.value)} className="w-full h-10 rounded-lg border px-3">
                  <option value="">Aidat Seçin (Opsiyonel)</option>
                  {aidatlar.map(a => (
                    <option key={a.id} value={a.id}>{a.donem} - ₺{a.tutar}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ROW 7: Notlar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <textarea value={notlar} onChange={(e) => setNotlar(e.target.value)} rows={2} className="w-full rounded-lg border px-3 py-2 resize-none" placeholder="Ek notlar (dahili kullanım)..." />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} title="Geliri Sil" description={`₺${deletingGelir?.tutar?.toLocaleString('tr-TR')} tutarındaki geliri silmek?`} confirmText="Sil" cancelText="İptal" variant="danger" onConfirm={handleDelete} />
    </PageLayout>
  );
};

export default GelirlerPage;
