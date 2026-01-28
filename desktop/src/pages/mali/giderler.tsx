import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Plus, TrendingDown, Eye, Pencil, Trash2,
  FileSpreadsheet, FileText, Wallet, Calendar,
  Package, Receipt, PieChart as PieChartIcon, ArrowDownRight
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { DEMIRBAS_KATEGORI_LISTESI, DEMIRBAS_DURUMLARI } from '@/lib/constants';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';

// Components
import { PageLayout, GlassCard, SectionCard } from '@/components/ui/page-layout';
import { StatCard, StatIcons } from '@/components/ui/dashboard-widgets';
import { SmartFilterPanel, FilterDefinition, FilterValue, DEFAULT_DATE_PRESETS } from '@/components/ui/smart-filter-panel';
import { SmartTable, SmartTableColumn, SmartTableAction, BulkAction } from '@/components/ui/smart-table';
import { useColumnConfig } from '@/hooks/useColumnConfig';
import { PAGE_KEYS } from '@/types/columnConfig';
import { exportToExcel, exportToPDF } from '@/utils/export';
import { EvrakEkleme, EvrakData } from '@/components/common/EvrakEkleme';
import { cn } from '@/lib/utils';

// ============ TYPES ============
interface Gider {
  id: string;
  kasa_id: string;
  kasa_adi?: string;
  tarih: string;
  tutar: number;
  gider_turu?: string;
  aciklama?: string;
  fatura_no?: string;
  created_at: string;
}

interface Kasa { id: string; kasa_adi: string; para_birimi: string; }
interface GiderTuru { id: string; ad: string; }

// ============ COLORS ============
const COLORS = {
  red: '#ef4444',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  blue: '#3b82f6',
  pink: '#ec4899',
  cyan: '#06b6d4',
  green: '#10b981',
};
const PIE_COLORS = [COLORS.red, COLORS.orange, COLORS.purple, COLORS.blue, COLORS.pink, COLORS.cyan];

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

// Filter definitions
const createFilterDefinitions = (kasalar: Kasa[], giderTurleri: GiderTuru[]): FilterDefinition[] => [
  { id: 'kasa_id', label: 'Kasa', type: 'select', options: kasalar.map(k => ({ value: k.id, label: k.kasa_adi })) },
  { id: 'gider_turu', label: 'Gider Türü', type: 'select', options: giderTurleri.map(t => ({ value: t.id, label: t.ad })) },
  { id: 'baslangic_tarih', label: 'Başlangıç', type: 'date' },
  { id: 'bitis_tarih', label: 'Bitiş', type: 'date' },
];

const GIDERLER_COLUMNS = [
  { id: 'tarih', label: 'Tarih' },
  { id: 'tutar', label: 'Tutar' },
  { id: 'gider_turu', label: 'Tür' },
  { id: 'aciklama', label: 'Açıklama' },
  { id: 'fatura_no', label: 'Fatura No' },
  { id: 'kasa', label: 'Kasa' },
];

// ============ COMPONENT ============
export const GiderlerPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);

  // State
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValue[]>([]);
  const [selectedGiderler, setSelectedGiderler] = useState<Gider[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingGider, setDeletingGider] = useState<Gider | null>(null);
  const [loading, setLoading] = useState(true);
  const [giderler, setGiderler] = useState<Gider[]>([]);

  // Form state
  const [kasalar, setKasalar] = useState<Kasa[]>([]);
  const [giderTurleri, setGiderTurleri] = useState<GiderTuru[]>([]);
  const [kasaId, setKasaId] = useState('');
  const [giderTuruId, setGiderTuruId] = useState('');
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]);
  const [tutar, setTutar] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [faturaNo, setFaturaNo] = useState('');
  const [demirbasEkle, setDemirbasEkle] = useState(false);
  const [demirbasAdi, setDemirbasAdi] = useState('');
  const [demirbasKategori, setDemirbasKategori] = useState('');
  const [evrakData, setEvrakData] = useState<EvrakData | null>(null);

  const baslangicTarih = filterValues.find(f => f.id === 'baslangic_tarih')?.value || '';
  const bitisTarih = filterValues.find(f => f.id === 'bitis_tarih')?.value || '';

  const { config: columnConfig, toggleSort } = useColumnConfig({
    pageKey: PAGE_KEYS.UYELER_LIST,
    defaultVisible: GIDERLER_COLUMNS.map(c => c.id),
    defaultOrder: GIDERLER_COLUMNS.map(c => c.id),
  });

  React.useEffect(() => {
    if (!tenant) { setLoading(false); return; }
    loadKasalar();
    loadGiderTurleri();
    loadGiderler();
  }, [tenant, baslangicTarih, bitisTarih]);

  const loadKasalar = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<Kasa[]>('get_kasalar', { tenantIdParam: tenant.id });
      setKasalar(result);
      if (result.length > 0 && !kasaId) setKasaId(result[0].id);
    } catch (error) { console.error('Kasalar yüklenemedi:', error); }
  };

  const loadGiderTurleri = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<GiderTuru[]>('get_gider_turleri', { tenantIdParam: tenant.id });
      setGiderTurleri(result);
    } catch (error) { console.error('Gider türleri yüklenemedi:', error); }
  };

  const loadGiderler = async () => {
    if (!tenant) { setLoading(false); return; }
    try {
      setLoading(true);
      const result = await invoke<{ data: Gider[]; total: number }>('get_giderler_paginated', {
        tenantIdParam: tenant.id, kasaIdFilter: null, baslangicTarih: baslangicTarih || null, bitisTarih: bitisTarih || null, page: 0, pageSize: 1000,
      });
      setGiderler(result.data);
    } catch (error) { console.error('Giderler yüklenemedi:', error); toast.error('Giderler yüklenemedi'); }
    finally { setLoading(false); }
  };

  // ============ STATS & CHARTS ============
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);
    const todayTotal = giderler.filter(g => g.tarih.startsWith(today)).reduce((sum, g) => sum + g.tutar, 0);
    const monthTotal = giderler.filter(g => g.tarih.startsWith(thisMonth)).reduce((sum, g) => sum + g.tutar, 0);
    const toplamTutar = giderler.reduce((sum, g) => sum + g.tutar, 0);
    return { toplam: giderler.length, toplamTutar, todayTotal, monthTotal };
  }, [giderler]);

  // Gider Türü Pie
  const giderTuruData = useMemo(() => {
    const grouped: Record<string, number> = {};
    giderler.forEach(g => {
      const tur = g.gider_turu || 'Diğer';
      grouped[tur] = (grouped[tur] || 0) + g.tutar;
    });
    return Object.entries(grouped).map(([name, value], i) => ({ name, value, fill: PIE_COLORS[i % PIE_COLORS.length] })).slice(0, 6);
  }, [giderler]);

  // Aylık Trend (Son 6 ay)
  const aylikTrendData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
    }
    giderler.forEach(g => { const key = g.tarih.slice(0, 7); if (months[key] !== undefined) months[key] += g.tutar; });
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return Object.entries(months).map(([key, value]) => {
      const [, month] = key.split('-');
      return { name: monthNames[parseInt(month) - 1], gider: value };
    });
  }, [giderler]);

  // Haftalık (Son 7 gün)
  const haftalikData = useMemo(() => {
    const days: Record<string, number> = {};
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days[d.toISOString().split('T')[0]] = 0;
    }
    giderler.forEach(g => { if (days[g.tarih] !== undefined) days[g.tarih] += g.tutar; });
    return Object.entries(days).map(([date, value]) => {
      const d = new Date(date);
      return { name: dayNames[d.getDay()], gider: value };
    });
  }, [giderler]);

  // Kasa Dağılımı
  const kasaDagilimData = useMemo(() => {
    const grouped: Record<string, number> = {};
    giderler.forEach(g => { grouped[g.kasa_adi || 'Bilinmeyen'] = (grouped[g.kasa_adi || 'Bilinmeyen'] || 0) + g.tutar; });
    return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [giderler]);

  // ============ TABLE ============
  const tableColumns: SmartTableColumn<Gider>[] = useMemo(() => [
    {
      id: 'tarih', header: 'Tarih', accessor: 'tarih', width: 120, sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-red-600" />
          </div>
          <span className="font-medium text-gray-900">{value ? new Date(value).toLocaleDateString('tr-TR') : '-'}</span>
        </div>
      ),
    },
    {
      id: 'tutar', header: 'Tutar', accessor: 'tutar', width: 140, align: 'right', sortable: true,
      render: (value) => <span className="text-lg font-bold text-red-600">-₺{value?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>,
    },
    {
      id: 'gider_turu', header: 'Tür', accessor: 'gider_turu', width: 130,
      render: (value) => <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{value || 'Diğer'}</span>,
    },
    { id: 'aciklama', header: 'Açıklama', accessor: 'aciklama', width: 200, render: (value) => <p className="text-sm text-gray-600 truncate">{value || '-'}</p> },
    {
      id: 'fatura_no', header: 'Fatura No', accessor: 'fatura_no', width: 130,
      render: (value) => value ? <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{value}</span> : <span className="text-gray-400">-</span>,
    },
    { id: 'kasa', header: 'Kasa', accessor: 'kasa_adi', width: 130, render: (value) => <span className="text-sm text-gray-600">{value || '-'}</span> },
  ], []);

  const tableActions: SmartTableAction<Gider>[] = [
    { id: 'delete', label: 'Sil', icon: <Trash2 className="w-4 h-4" />, variant: 'destructive', onClick: (row) => { setDeletingGider(row); setShowDeleteConfirm(true); } },
  ];

  // ============ HANDLERS ============
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !kasaId || !tutar) { toast.error('Kasa ve Tutar zorunludur!'); return; }
    const tutarNum = parseFloat(tutar);
    if (isNaN(tutarNum) || tutarNum <= 0) { toast.error('Geçerli tutar girin!'); return; }
    try {
      // 1. Local DB'ye kaydet
      const giderId = await invoke<string>('create_gider', {
        tenantIdParam: tenant.id,
        data: {
          kasa_id: kasaId, gider_turu_id: giderTuruId || null, tarih, tutar: tutarNum,
          aciklama: demirbasEkle ? `Demirbaş: ${demirbasAdi}` : (aciklama || null),
          fatura_no: faturaNo || null, alt_kategori: demirbasEkle ? 'DEMIRBAS' : null,
        },
      });

      // 2. Sync kuyruğuna ekle
      const { syncService } = await import('@/services/syncService');
      await syncService.queueChange(tenant.id, 'giderler', 'create', {
        id: giderId,
        tenant_id: tenant.id,
        kasa_id: kasaId,
        gider_turu_id: giderTuruId || null,
        tarih,
        tutar: tutarNum,
        aciklama: demirbasEkle ? `Demirbaş: ${demirbasAdi}` : (aciklama || null),
        fatura_no: faturaNo || null
      });

      if (demirbasEkle && demirbasAdi) {
        await invoke('create_demirbas', {
          tenantIdParam: tenant.id,
          data: { ad: demirbasAdi, kategori: demirbasKategori || null, alis_tarihi: tarih, alis_bedeli: tutarNum, durum: DEMIRBAS_DURUMLARI.AKTIF, gider_id: giderId, fatura_no: faturaNo || null },
        });
      }
      toast.success('Gider eklendi!');
      setShowForm(false);
      setTutar(''); setAciklama(''); setFaturaNo(''); setDemirbasEkle(false); setDemirbasAdi(''); setDemirbasKategori('');
      loadGiderler();
    } catch (error) { toast.error('Gider eklenemedi: ' + error); }
  };

  const handleDelete = async () => {
    if (!tenant || !deletingGider) return;
    try {
      // 1. Local DB'den sil
      await invoke('delete_gider', { tenantIdParam: tenant.id, recordId: deletingGider.id });

      // 2. Sync kuyruğuna ekle
      const { syncService } = await import('@/services/syncService');
      await syncService.queueChange(tenant.id, 'giderler', 'delete', {
        id: deletingGider.id,
        tenant_id: tenant.id
      });

      toast.success('Gider silindi');
      loadGiderler();
    } catch (error) { toast.error('Silinemedi: ' + error); }
    finally { setShowDeleteConfirm(false); setDeletingGider(null); }
  };

  const ortalamaGider = stats.toplam > 0 ? stats.toplamTutar / stats.toplam : 0;

  // ============ RENDER ============
  return (
    <PageLayout
      title="Giderler"
      subtitle={`${stats.toplam} kayıt • Toplam: ₺${stats.toplamTutar.toLocaleString('tr-TR')}`}
      icon={<TrendingDown className="w-6 h-6" />}
      actions={<Button onClick={() => setShowForm(true)} className="bg-red-600 hover:bg-red-700"><Plus className="w-4 h-4 mr-2" />Yeni Gider</Button>}
      stats={
        <>
          <StatCard title="Toplam Gider" value={`₺${stats.toplamTutar.toLocaleString('tr-TR')}`} subtitle={`${stats.toplam} işlem`} icon={StatIcons.wallet} color="red" size="sm" trend={{ value: -8, isPositive: false }} />
          <StatCard title="Bugün" value={`₺${stats.todayTotal.toLocaleString('tr-TR')}`} subtitle="Günlük harcama" icon={StatIcons.calendar} color="yellow" size="sm" />
          <StatCard title="Bu Ay" value={`₺${stats.monthTotal.toLocaleString('tr-TR')}`} subtitle="Aylık harcama" icon={StatIcons.chart} color="purple" size="sm" />
          <StatCard title="Ortalama" value={`₺${ortalamaGider.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`} subtitle="Gider başına" icon={StatIcons.activity} color="gray" size="sm" />
        </>
      }
    >
      {/* Charts */}
      <div className="grid grid-cols-12 gap-5 mb-6">
        {/* Gider Türü Pie */}
        <GlassCard className="col-span-3 p-5" hover={false} glow={COLORS.red}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-red-600" />
            Gider Türü Dağılımı
          </h3>
          {giderTuruData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={giderTuruData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                    {giderTuruData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {giderTuruData.slice(0, 4).map((d, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="h-[140px] flex items-center justify-center text-gray-400 text-sm">Veri yok</div>}
        </GlassCard>

        {/* Aylık Trend */}
        <GlassCard className="col-span-5 p-5" hover={false} glow={COLORS.purple}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-purple-600" />
            Aylık Gider Trendi
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={aylikTrendData}>
              <defs>
                <linearGradient id="colorGider" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.red} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.red} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="gider" name="Gider" stroke={COLORS.red} strokeWidth={2} fillOpacity={1} fill="url(#colorGider)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Haftalık */}
        <GlassCard className="col-span-4 p-5" hover={false} glow={COLORS.orange}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-600" />
            Son 7 Gün
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={haftalikData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis axisLine={false} tickLine={false} hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="gider" name="Gider" fill={COLORS.orange} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Kasa Dağılımı */}
      {kasaDagilimData.length > 0 && (
        <GlassCard className="mb-6 p-5" hover={false}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-600" />
            Kasa Bazlı Gider Dağılımı
          </h3>
          <div className="space-y-3">
            {kasaDagilimData.map((item, i) => {
              const maxVal = kasaDagilimData[0]?.value || 1;
              const pct = (item.value / maxVal) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-gray-700 truncate">{item.name}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg flex items-center justify-end px-2" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${PIE_COLORS[i % PIE_COLORS.length]} 0%, ${PIE_COLORS[i % PIE_COLORS.length]}cc 100%)` }}>
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
        <SmartFilterPanel filters={createFilterDefinitions(kasalar, giderTurleri)} values={filterValues} onChange={setFilterValues} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Gider ara..." datePresets={DEFAULT_DATE_PRESETS} />
      </SectionCard>

      {/* Table */}
      <SectionCard padding="none">
        <SmartTable data={giderler} columns={tableColumns} actions={tableActions} selectable={true} sortable={true} columnConfig={columnConfig} onSort={toggleSort} selectedRows={selectedGiderler} onSelectionChange={setSelectedGiderler} getRowId={(row) => row.id} loading={loading} maxHeight={400} emptyMessage="Gider bulunamadı" />
      </SectionCard>

      {/* Add Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white"><TrendingDown className="w-5 h-5" /></div>
              <span>Yeni Gider Ekle</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kasa *</label>
                <select value={kasaId} onChange={(e) => setKasaId(e.target.value)} className="w-full h-10 rounded-lg border px-3" required>
                  {kasalar.map(k => <option key={k.id} value={k.id}>{k.kasa_adi}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gider Türü</label>
                <select value={giderTuruId} onChange={(e) => setGiderTuruId(e.target.value)} className="w-full h-10 rounded-lg border px-3">
                  <option value="">Seçiniz</option>
                  {giderTurleri.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
                </select>
              </div>
            </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Fatura No</label>
                <input type="text" value={faturaNo} onChange={(e) => setFaturaNo(e.target.value)} className="w-full h-10 rounded-lg border px-3" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea value={aciklama} onChange={(e) => setAciklama(e.target.value)} rows={2} className="w-full rounded-lg border px-3 py-2 resize-none" />
            </div>
            {/* Demirbaş */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-3 mb-4">
                <input type="checkbox" id="dmb-ekle" checked={demirbasEkle} onChange={(e) => setDemirbasEkle(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="dmb-ekle" className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer"><Package className="w-4 h-4" />Demirbaş kaydı oluştur</label>
              </div>
              {demirbasEkle && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Demirbaş Adı *</label>
                      <input type="text" value={demirbasAdi} onChange={(e) => setDemirbasAdi(e.target.value)} className="w-full h-10 rounded-lg border px-3" required={demirbasEkle} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                      <select value={demirbasKategori} onChange={(e) => setDemirbasKategori(e.target.value)} className="w-full h-10 rounded-lg border px-3">
                        <option value="">Seçin</option>
                        {DEMIRBAS_KATEGORI_LISTESI.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} title="Gideri Sil" description={`₺${deletingGider?.tutar?.toLocaleString('tr-TR')} tutarındaki gideri silmek?`} confirmText="Sil" cancelText="İptal" variant="danger" onConfirm={handleDelete} />
    </PageLayout>
  );
};

export default GiderlerPage;
