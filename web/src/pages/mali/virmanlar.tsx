import React, { useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  ArrowRightLeft, Plus, Trash2, AlertCircle, RefreshCw,
  Calendar, Wallet, ArrowRight, FileSpreadsheet, FileText, ArrowUpDown, TrendingUp
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, Sankey, Tooltip as RechartsTooltip,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';

// Components
import { PageLayout, GlassCard, SectionCard } from '@/components/ui/page-layout';
import { StatCard, StatIcons, AlertCard } from '@/components/ui/dashboard-widgets';
import { SmartFilterPanel, FilterDefinition, FilterValue, DEFAULT_DATE_PRESETS } from '@/components/ui/smart-filter-panel';
import { SmartTable, SmartTableColumn, SmartTableAction, BulkAction } from '@/components/ui/smart-table';
import { exportToExcel, exportToPDF } from '@/utils/export';
import { cn } from '@/lib/utils';

// ============ TYPES ============
interface Kasa {
  id: string;
  kasa_adi: string;
  para_birimi: string;
  fiziksel_bakiye: number;
  serbest_bakiye: number;
}

interface Virman {
  id: string;
  kaynak_kasa_id: string;
  hedef_kasa_id: string;
  kaynak_kasa_adi?: string;
  hedef_kasa_adi?: string;
  tarih: string;
  tutar: number;
  aciklama?: string;
  uygulanan_kur?: number;
  created_at: string;
}

interface KurBilgisi { kur_degeri: number; kaynak_para_birimi: string; hedef_para_birimi: string; }

// ============ COLORS ============
const COLORS = {
  indigo: '#6366f1',
  purple: '#8b5cf6',
  blue: '#3b82f6',
  green: '#10b981',
  orange: '#f59e0b',
  red: '#ef4444',
  pink: '#ec4899',
  cyan: '#06b6d4',
};
const PIE_COLORS = [COLORS.indigo, COLORS.blue, COLORS.purple, COLORS.green, COLORS.orange, COLORS.pink];

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

// ============ FILTER ============
const createFilterDefinitions = (kasalar: Kasa[]): FilterDefinition[] => [
  { id: 'kaynak_kasa', label: 'Kaynak', type: 'select', options: kasalar.map(k => ({ value: k.id, label: k.kasa_adi })) },
  { id: 'hedef_kasa', label: 'Hedef', type: 'select', options: kasalar.map(k => ({ value: k.id, label: k.kasa_adi })) },
  { id: 'baslangic_tarih', label: 'Başlangıç', type: 'date' },
  { id: 'bitis_tarih', label: 'Bitiş', type: 'date' },
];

const VIRMAN_COLUMNS = [
  { id: 'tarih', label: 'Tarih' },
  { id: 'kaynak', label: 'Kaynak' },
  { id: 'hedef', label: 'Hedef' },
  { id: 'tutar', label: 'Tutar' },
  { id: 'aciklama', label: 'Açıklama' },
];

// ============ COMPONENT ============
export const MaliVirmanlarPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);

  const [kasalar, setKasalar] = useState<Kasa[]>([]);
  const [virmanlar, setVirmanlar] = useState<Virman[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValue[]>([]);
  const [selectedVirmanlar, setSelectedVirmanlar] = useState<Virman[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingVirman, setDeletingVirman] = useState<Virman | null>(null);

  // Form
  const [kaynakKasaId, setKaynakKasaId] = useState('');
  const [hedefKasaId, setHedefKasaId] = useState('');
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]);
  const [tutar, setTutar] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [kurBilgisi, setKurBilgisi] = useState<KurBilgisi | null>(null);
  const [manuelKur, setManuelKur] = useState('');
  const [manuelKurAktif, setManuelKurAktif] = useState(false);
  const [kurLoading, setKurLoading] = useState(false);

  const farkliParaBirimi = useMemo(() => {
    const kaynak = kasalar.find(k => k.id === kaynakKasaId);
    const hedef = kasalar.find(k => k.id === hedefKasaId);
    return kaynak && hedef && kaynak.para_birimi !== hedef.para_birimi;
  }, [kaynakKasaId, hedefKasaId, kasalar]);

  const kaynakKasa = useMemo(() => kasalar.find(k => k.id === kaynakKasaId), [kaynakKasaId, kasalar]);
  const hedefKasa = useMemo(() => kasalar.find(k => k.id === hedefKasaId), [hedefKasaId, kasalar]);

  const baslangicTarih = filterValues.find(f => f.id === 'baslangic_tarih')?.value || '';
  const bitisTarih = filterValues.find(f => f.id === 'bitis_tarih')?.value || '';

  React.useEffect(() => {
    if (!tenant) { setLoading(false); return; }
    loadKasalar();
    loadVirmanlar();
  }, [tenant, baslangicTarih, bitisTarih]);

  React.useEffect(() => {
    if (farkliParaBirimi && kaynakKasa && hedefKasa) {
      fetchKur(kaynakKasa.para_birimi, hedefKasa.para_birimi, tarih);
    } else {
      setKurBilgisi(null);
    }
  }, [farkliParaBirimi, kaynakKasaId, hedefKasaId, tarih]);

  const fetchKur = async (kaynak: string, hedef: string, tarihStr: string) => {
    if (!tenant) return;
    setKurLoading(true);
    try {
      const result = await invoke<{ kur_degeri: number }>('hesapla_kur', {
        tenantIdParam: tenant.id, kaynakParaBirimi: kaynak, hedefParaBirimi: hedef, tarih: tarihStr,
      });
      setKurBilgisi({ kur_degeri: result.kur_degeri, kaynak_para_birimi: kaynak, hedef_para_birimi: hedef });
      setManuelKur(result.kur_degeri.toFixed(4));
    } catch (error) { setKurBilgisi(null); }
    finally { setKurLoading(false); }
  };

  const loadKasalar = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<Kasa[]>('get_kasalar', { tenantIdParam: tenant.id });
      setKasalar(result);
      if (result.length >= 2) {
        if (!kaynakKasaId) setKaynakKasaId(result[0].id);
        if (!hedefKasaId) setHedefKasaId(result[1].id);
      }
    } catch (error) { console.error(error); }
  };

  const loadVirmanlar = async () => {
    if (!tenant) { setLoading(false); return; }
    try {
      setLoading(true);
      const result = await invoke<Virman[]>('get_virmanlar', {
        tenantIdParam: tenant.id, baslangicTarih: baslangicTarih || null, bitisTarih: bitisTarih || null, skip: 0, limit: 1000,
      });
      setVirmanlar(result);
    } catch (error) { console.error(error); toast.error('Virmanlar yüklenemedi'); }
    finally { setLoading(false); }
  };

  // ============ STATS & CHARTS ============
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);
    const todayTotal = virmanlar.filter(v => v.tarih.startsWith(today)).reduce((s, v) => s + v.tutar, 0);
    const monthTotal = virmanlar.filter(v => v.tarih.startsWith(thisMonth)).reduce((s, v) => s + v.tutar, 0);
    const toplamTutar = virmanlar.reduce((s, v) => s + v.tutar, 0);
    return { toplam: virmanlar.length, toplamTutar, todayTotal, monthTotal };
  }, [virmanlar]);

  // Kasa Bazlı Akış - Kaynak (çıkış)
  const kaynakDagilim = useMemo(() => {
    const grouped: Record<string, number> = {};
    virmanlar.forEach(v => {
      const kasa = v.kaynak_kasa_adi || kasalar.find(k => k.id === v.kaynak_kasa_id)?.kasa_adi || 'Bilinmeyen';
      grouped[kasa] = (grouped[kasa] || 0) + v.tutar;
    });
    return Object.entries(grouped).map(([name, value], i) => ({ name, value, fill: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [virmanlar, kasalar]);

  // Kasa Bazlı Akış - Hedef (giriş)
  const hedefDagilim = useMemo(() => {
    const grouped: Record<string, number> = {};
    virmanlar.forEach(v => {
      const kasa = v.hedef_kasa_adi || kasalar.find(k => k.id === v.hedef_kasa_id)?.kasa_adi || 'Bilinmeyen';
      grouped[kasa] = (grouped[kasa] || 0) + v.tutar;
    });
    return Object.entries(grouped).map(([name, value], i) => ({ name, value, fill: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [virmanlar, kasalar]);

  // Aylık Trend
  const aylikTrendData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
    }
    virmanlar.forEach(v => { const key = v.tarih.slice(0, 7); if (months[key] !== undefined) months[key] += v.tutar; });
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return Object.entries(months).map(([key, value]) => ({ name: monthNames[parseInt(key.split('-')[1]) - 1], tutar: value }));
  }, [virmanlar]);

  // En Aktif Transferler (Top 5 kasa çifti)
  const topTransfers = useMemo(() => {
    const pairs: Record<string, number> = {};
    virmanlar.forEach(v => {
      const kaynak = v.kaynak_kasa_adi || kasalar.find(k => k.id === v.kaynak_kasa_id)?.kasa_adi || '?';
      const hedef = v.hedef_kasa_adi || kasalar.find(k => k.id === v.hedef_kasa_id)?.kasa_adi || '?';
      const key = `${kaynak} → ${hedef}`;
      pairs[key] = (pairs[key] || 0) + v.tutar;
    });
    return Object.entries(pairs).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [virmanlar, kasalar]);

  const getKasaName = (id: string) => kasalar.find(k => k.id === id)?.kasa_adi || '-';

  // ============ TABLE ============
  const tableColumns: SmartTableColumn<Virman>[] = useMemo(() => [
    {
      id: 'tarih', header: 'Tarih', accessor: 'tarih', width: 120, sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="font-medium text-gray-900">{value ? new Date(value).toLocaleDateString('tr-TR') : '-'}</span>
        </div>
      ),
    },
    {
      id: 'transfer', header: 'Transfer', accessor: 'kaynak_kasa_id', width: 280,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 rounded-lg border border-red-100">
            <Wallet className="w-3.5 h-3.5 text-red-500" />
            <span className="text-sm font-medium text-red-700">{row.kaynak_kasa_adi || getKasaName(row.kaynak_kasa_id)}</span>
          </div>
          <div className="flex items-center"><div className="w-6 h-0.5 bg-gray-300" /><ArrowRight className="w-4 h-4 text-gray-400" /><div className="w-6 h-0.5 bg-gray-300" /></div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 rounded-lg border border-green-100">
            <Wallet className="w-3.5 h-3.5 text-green-500" />
            <span className="text-sm font-medium text-green-700">{row.hedef_kasa_adi || getKasaName(row.hedef_kasa_id)}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'tutar', header: 'Tutar', accessor: 'tutar', width: 150, align: 'right', sortable: true,
      render: (value, row) => (
        <div className="text-right">
          <span className="text-lg font-bold text-indigo-600">₺{value?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
          {row.uygulanan_kur && row.uygulanan_kur !== 1 && <p className="text-xs text-gray-500 mt-0.5">Kur: {row.uygulanan_kur.toFixed(4)}</p>}
        </div>
      ),
    },
    { id: 'aciklama', header: 'Açıklama', accessor: 'aciklama', width: 180, render: (value) => <p className="text-sm text-gray-600 truncate">{value || '-'}</p> },
  ], [kasalar]);

  const tableActions: SmartTableAction<Virman>[] = [
    { id: 'delete', label: 'İptal', icon: <Trash2 className="w-4 h-4" />, variant: 'destructive', onClick: (row) => { setDeletingVirman(row); setShowDeleteConfirm(true); } },
  ];

  // ============ HANDLERS ============
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !kaynakKasaId || !hedefKasaId || !tutar) { toast.error('Tüm alanları doldurun!'); return; }
    if (kaynakKasaId === hedefKasaId) { toast.error('Aynı kasa olamaz!'); return; }
    const tutarNum = parseFloat(tutar);
    if (isNaN(tutarNum) || tutarNum <= 0) { toast.error('Geçerli tutar girin!'); return; }
    if (kaynakKasa && tutarNum > kaynakKasa.serbest_bakiye) { toast.error(`Yetersiz bakiye! Serbest: ₺${kaynakKasa.serbest_bakiye.toLocaleString('tr-TR')}`); return; }

    try {
      const data: any = { kaynak_kasa_id: kaynakKasaId, hedef_kasa_id: hedefKasaId, tarih, tutar: tutarNum, aciklama: aciklama || null };
      if (farkliParaBirimi && manuelKurAktif && manuelKur) data.uygulanan_kur = parseFloat(manuelKur);
      else if (farkliParaBirimi && kurBilgisi) data.uygulanan_kur = kurBilgisi.kur_degeri;
      await invoke('create_virman', { tenantIdParam: tenant.id, data });
      toast.success('Virman oluşturuldu!');
      setShowForm(false); setTutar(''); setAciklama('');
      loadVirmanlar(); loadKasalar();
    } catch (error) { toast.error('Virman oluşturulamadı: ' + error); }
  };

  const handleDelete = async () => {
    if (!tenant || !deletingVirman) return;
    try { await invoke('delete_virman', { tenantIdParam: tenant.id, recordId: deletingVirman.id }); toast.success('Virman iptal edildi'); loadVirmanlar(); loadKasalar(); }
    catch (error) { toast.error('İptal edilemedi: ' + error); }
    finally { setShowDeleteConfirm(false); setDeletingVirman(null); }
  };

  const hesaplananHedefTutar = useMemo(() => {
    if (!tutar || !farkliParaBirimi) return null;
    const tutarNum = parseFloat(tutar);
    const kurDegeri = manuelKurAktif ? parseFloat(manuelKur) : kurBilgisi?.kur_degeri;
    if (!kurDegeri || isNaN(tutarNum)) return null;
    return tutarNum * kurDegeri;
  }, [tutar, farkliParaBirimi, manuelKur, manuelKurAktif, kurBilgisi]);

  // ============ RENDER ============
  return (
    <PageLayout
      title="Virmanlar"
      subtitle={`${stats.toplam} transfer • Toplam: ₺${stats.toplamTutar.toLocaleString('tr-TR')}`}
      icon={<ArrowRightLeft className="w-6 h-6" />}
      actions={<Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Yeni Virman</Button>}
      stats={
        <>
          <StatCard title="Toplam Transfer" value={`₺${stats.toplamTutar.toLocaleString('tr-TR')}`} subtitle={`${stats.toplam} işlem`} icon={StatIcons.activity} color="purple" size="sm" />
          <StatCard title="Bugün" value={`₺${stats.todayTotal.toLocaleString('tr-TR')}`} subtitle="Günlük" icon={StatIcons.calendar} color="blue" size="sm" />
          <StatCard title="Bu Ay" value={`₺${stats.monthTotal.toLocaleString('tr-TR')}`} subtitle="Aylık" icon={StatIcons.chart} color="green" size="sm" />
          <StatCard title="Kasa Sayısı" value={kasalar.length} subtitle="Aktif kasalar" icon={StatIcons.wallet} color="gray" size="sm" />
        </>
      }
    >
      {/* Charts */}
      <div className="grid grid-cols-12 gap-5 mb-6">
        {/* Kaynak Kasa Dağılımı */}
        <GlassCard className="col-span-3 p-5" hover={false} glow={COLORS.red}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-red-600" />
            Çıkış (Kaynak)
          </h3>
          {kaynakDagilim.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={kaynakDagilim} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                  {kaynakDagilim.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[140px] flex items-center justify-center text-gray-400 text-sm">Veri yok</div>}
        </GlassCard>

        {/* Hedef Kasa Dağılımı */}
        <GlassCard className="col-span-3 p-5" hover={false} glow={COLORS.green}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-green-600" />
            Giriş (Hedef)
          </h3>
          {hedefDagilim.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={hedefDagilim} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                  {hedefDagilim.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[140px] flex items-center justify-center text-gray-400 text-sm">Veri yok</div>}
        </GlassCard>

        {/* Aylık Trend */}
        <GlassCard className="col-span-6 p-5" hover={false} glow={COLORS.indigo}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Aylık Transfer Trendi
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={aylikTrendData}>
              <defs>
                <linearGradient id="colorVirman" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.indigo} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.indigo} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="tutar" name="Virman" stroke={COLORS.indigo} strokeWidth={2} fillOpacity={1} fill="url(#colorVirman)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* En Aktif Transfer Rotaları */}
      {topTransfers.length > 0 && (
        <GlassCard className="mb-6 p-5" hover={false}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-purple-600" />
            En Aktif Transfer Rotaları
          </h3>
          <div className="space-y-3">
            {topTransfers.map((item, i) => {
              const maxVal = topTransfers[0]?.value || 1;
              const pct = (item.value / maxVal) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-40 text-sm text-gray-700 truncate font-medium">{item.name}</span>
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
        <SmartFilterPanel filters={createFilterDefinitions(kasalar)} values={filterValues} onChange={setFilterValues} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Virman ara..." datePresets={DEFAULT_DATE_PRESETS} />
      </SectionCard>

      {/* Table */}
      <SectionCard padding="none">
        <SmartTable data={virmanlar} columns={tableColumns} actions={tableActions} selectable={true} sortable={true} selectedRows={selectedVirmanlar} onSelectionChange={setSelectedVirmanlar} getRowId={(row) => row.id} loading={loading} maxHeight={400} emptyMessage="Virman bulunamadı" />
      </SectionCard>

      {/* Add Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white"><ArrowRightLeft className="w-5 h-5" /></div>
              <span>Yeni Virman</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kaynak Kasa *</label>
                <select value={kaynakKasaId} onChange={(e) => setKaynakKasaId(e.target.value)} className="w-full h-10 rounded-lg border px-3" required>
                  {kasalar.map(k => <option key={k.id} value={k.id}>{k.kasa_adi} ({k.para_birimi}) - ₺{k.serbest_bakiye.toLocaleString('tr-TR')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Kasa *</label>
                <select value={hedefKasaId} onChange={(e) => setHedefKasaId(e.target.value)} className="w-full h-10 rounded-lg border px-3" required>
                  {kasalar.filter(k => k.id !== kaynakKasaId).map(k => <option key={k.id} value={k.id}>{k.kasa_adi} ({k.para_birimi})</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
                <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className="w-full h-10 rounded-lg border px-3" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tutar *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{kaynakKasa?.para_birimi || '₺'}</span>
                  <input type="number" step="0.01" value={tutar} onChange={(e) => setTutar(e.target.value)} className="w-full h-10 rounded-lg border pl-8 pr-3" required />
                </div>
              </div>
            </div>
            {farkliParaBirimi && <AlertCard type="info" title="Farklı Para Birimi" message={`${kaynakKasa?.para_birimi} → ${hedefKasa?.para_birimi} dönüşümü yapılacak.`} />}
            {farkliParaBirimi && (
              <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-indigo-800">Döviz Kuru</span>
                  {kurLoading && <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="manuel-kur" checked={manuelKurAktif} onChange={(e) => setManuelKurAktif(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                  <label htmlFor="manuel-kur" className="text-sm text-indigo-700">Manuel kur gir</label>
                </div>
                <input type="number" step="0.0001" value={manuelKur} onChange={(e) => setManuelKur(e.target.value)} disabled={!manuelKurAktif} className="w-full h-10 rounded-lg border px-3 disabled:bg-gray-100" />
                {hesaplananHedefTutar && <p className="text-sm text-indigo-700">Hedef: <strong>{hedefKasa?.para_birimi} {hesaplananHedefTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea value={aciklama} onChange={(e) => setAciklama(e.target.value)} rows={2} className="w-full rounded-lg border px-3 py-2 resize-none" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Virman Yap</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} title="Virmanı İptal Et" description={`₺${deletingVirman?.tutar?.toLocaleString('tr-TR')} virmanı iptal edilsin mi?`} confirmText="İptal Et" cancelText="Vazgeç" variant="danger" onConfirm={handleDelete} />
    </PageLayout>
  );
};

export default MaliVirmanlarPage;
