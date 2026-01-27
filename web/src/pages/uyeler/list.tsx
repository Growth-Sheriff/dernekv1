import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Plus, Users, Download, Eye, Pencil, Trash2,
  UserPlus, Mail, Phone, FileSpreadsheet, FileText,
  UserCheck, UserX, AlertCircle, CreditCard, TrendingUp, Calendar, Award
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';

// Components
import { PageLayout, GlassCard, SectionCard } from '@/components/ui/page-layout';
import { StatCard, StatIcons } from '@/components/ui/dashboard-widgets';
import { SmartFilterPanel, FilterDefinition, FilterValue, DEFAULT_DATE_PRESETS } from '@/components/ui/smart-filter-panel';
import { SmartTable, SmartTableColumn, SmartTableAction, BulkAction } from '@/components/ui/smart-table';

// Hooks
import { useUyeler } from '@/hooks/useUyeler';
import { useColumnConfig } from '@/hooks/useColumnConfig';
import { ColumnSettingsModal } from '@/components/common/ColumnSettingsModal';
import { UYELER_PAGE_CONFIG, PAGE_PRESETS, UYELER_COLUMNS } from '@/config/columnDefinitions';
import { PAGE_KEYS } from '@/types/columnConfig';
import { exportToExcel, exportToPDF, columnsToExportFormat } from '@/utils/export';
import { cn } from '@/lib/utils';

// ============ TYPES ============
interface Uye {
  id: string;
  uye_no: string;
  tc_no: string;
  ad_soyad: string;
  telefon?: string;
  email?: string;
  giris_tarihi: string;
  durum: string;
  uyelik_tipi?: string;
  is_active?: boolean;
}

interface UyeBorcDurumu {
  uye_id: string;
  toplam_borc: number;
  odenen: number;
  kalan_borc: number;
}

// ============ CHART COLORS ============
const COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
  purple: '#8b5cf6',
  orange: '#f59e0b',
  red: '#ef4444',
  pink: '#ec4899',
  cyan: '#06b6d4',
  gray: '#6b7280',
};

const PIE_COLORS = [COLORS.green, COLORS.gray, COLORS.orange, COLORS.red];

// ============ CUSTOM TOOLTIP ============
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-xl text-sm"
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <p className="text-gray-500 text-xs mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="font-semibold" style={{ color: p.color || p.fill }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ============ FILTER DEFINITIONS ============
const FILTER_DEFINITIONS: FilterDefinition[] = [
  {
    id: 'durum',
    label: 'Durum',
    type: 'select',
    options: [
      { value: 'Aktif', label: 'Aktif' },
      { value: 'Pasif', label: 'Pasif' },
      { value: 'Askıda', label: 'Askıda' },
      { value: 'İhraç', label: 'İhraç' },
    ],
  },
  {
    id: 'uyelik_tipi',
    label: 'Üyelik Tipi',
    type: 'select',
    options: [
      { value: 'Asil', label: 'Asil' },
      { value: 'Onursal', label: 'Onursal' },
      { value: 'Fahri', label: 'Fahri' },
      { value: 'Kurumsal', label: 'Kurumsal' },
    ],
  },
];

// ============ COMPONENT ============
export const UyelerListPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);

  // State
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValue[]>([]);
  const [selectedUyeler, setSelectedUyeler] = useState<Uye[]>([]);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUye, setDeletingUye] = useState<{ id: string; name: string } | null>(null);
  const [showCharts, setShowCharts] = useState(true);

  // Extract durum from filters
  const durumFilter = filterValues.find(f => f.id === 'durum')?.value || '';

  // React Query hook
  const { uyeler, borcDurumlari, isLoading, refetch } = useUyeler({
    search: search || null,
    durum: durumFilter || null,
    limit: 1000,
  });

  // Column configuration
  const {
    config: columnConfig,
    saveConfig: saveColumnConfig,
    resetConfig: resetColumnConfig,
    toggleSort,
  } = useColumnConfig({
    pageKey: PAGE_KEYS.UYELER_LIST,
    defaultVisible: UYELER_PAGE_CONFIG.defaultVisible,
    defaultOrder: UYELER_PAGE_CONFIG.defaultColumns.map(c => c.id),
  });

  // ============ COMPUTED STATS & CHARTS ============
  const stats = useMemo(() => {
    const aktifCount = uyeler.filter(u => u.durum === 'Aktif').length;
    const pasifCount = uyeler.filter(u => u.durum === 'Pasif').length;
    const askidaCount = uyeler.filter(u => u.durum === 'Askıda').length;
    const ihracCount = uyeler.filter(u => u.durum === 'İhraç').length;
    const borcluCount = Object.values(borcDurumlari).filter(b => b.kalan_borc > 0).length;
    const toplamBorc = Object.values(borcDurumlari).reduce((sum, b) => sum + b.kalan_borc, 0);

    return {
      toplam: uyeler.length,
      aktif: aktifCount,
      pasif: pasifCount,
      askida: askidaCount,
      ihrac: ihracCount,
      borclu: borcluCount,
      toplamBorc,
    };
  }, [uyeler, borcDurumlari]);

  // Üyelik Durumu Pie Chart Data
  const durumPieData = useMemo(() => [
    { name: 'Aktif', value: stats.aktif, color: COLORS.green },
    { name: 'Pasif', value: stats.pasif, color: COLORS.gray },
    { name: 'Askıda', value: stats.askida, color: COLORS.orange },
    { name: 'İhraç', value: stats.ihrac, color: COLORS.red },
  ].filter(d => d.value > 0), [stats]);

  // Üyelik Tipi Bar Chart
  const uyelikTipiData = useMemo(() => {
    const grouped: Record<string, number> = {};
    uyeler.forEach(u => {
      const tip = u.uyelik_tipi || 'Asil';
      grouped[tip] = (grouped[tip] || 0) + 1;
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [uyeler]);

  // Aylık Kayıt Trendi (Son 12 ay)
  const aylikKayitData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = 0;
    }

    uyeler.forEach(u => {
      if (u.giris_tarihi) {
        const key = u.giris_tarihi.slice(0, 7);
        if (months[key] !== undefined) {
          months[key]++;
        }
      }
    });

    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return Object.entries(months).map(([key, value]) => {
      const [, month] = key.split('-');
      return { name: monthNames[parseInt(month) - 1], yeni: value };
    });
  }, [uyeler]);

  // Borç Durumu Radial
  const borcDurumuData = useMemo(() => {
    const borclular = Object.values(borcDurumlari).filter(b => b.kalan_borc > 0).length;
    const temizler = stats.toplam - borclular;
    return [
      { name: 'Borçsuz', value: temizler, fill: COLORS.green },
      { name: 'Borçlu', value: borclular, fill: COLORS.red },
    ];
  }, [borcDurumlari, stats.toplam]);

  // Aktiflik Oranı Gauge
  const aktiflikOrani = stats.toplam > 0 ? (stats.aktif / stats.toplam) * 100 : 0;

  // ============ TABLE COLUMNS ============
  const tableColumns: SmartTableColumn<Uye>[] = useMemo(() => [
    {
      id: 'uye_no',
      header: 'Üye No',
      accessor: 'uye_no',
      width: 100,
      render: (value) => (
        <span className="font-mono text-sm font-semibold text-gray-900">{value}</span>
      ),
    },
    {
      id: 'ad_soyad',
      header: 'Ad Soyad',
      accessor: 'ad_soyad',
      width: 200,
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
            {value?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{row.uyelik_tipi || 'Asil'}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'telefon',
      header: 'İletişim',
      accessor: 'telefon',
      width: 180,
      render: (value, row) => (
        <div className="space-y-1">
          {value && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Phone className="w-3.5 h-3.5" />
              <span>{value}</span>
            </div>
          )}
          {row.email && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate max-w-[140px]">{row.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'giris_tarihi',
      header: 'Giriş Tarihi',
      accessor: 'giris_tarihi',
      width: 120,
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value ? new Date(value).toLocaleDateString('tr-TR') : '-'}
        </span>
      ),
    },
    {
      id: 'kalan_borc',
      header: 'Kalan Borç',
      accessor: (row) => borcDurumlari[row.id]?.kalan_borc || 0,
      width: 130,
      align: 'right',
      render: (value, row) => {
        const borc = borcDurumlari[row.id];
        if (!borc) return <span className="text-gray-400">-</span>;
        const percentage = borc.toplam_borc > 0 ? Math.round((borc.odenen / borc.toplam_borc) * 100) : 0;
        return (
          <div className="text-right">
            <span className={`text-sm font-bold ${borc.kalan_borc > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₺{borc.kalan_borc.toLocaleString('tr-TR')}
            </span>
            {borc.toplam_borc > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${percentage}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-8">{percentage}%</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'durum',
      header: 'Durum',
      accessor: 'durum',
      width: 100,
      render: (value) => {
        const colorMap: Record<string, string> = {
          'Aktif': 'bg-green-100 text-green-700 border-green-200',
          'Pasif': 'bg-gray-100 text-gray-700 border-gray-200',
          'Askıda': 'bg-amber-100 text-amber-700 border-amber-200',
          'İhraç': 'bg-red-100 text-red-700 border-red-200',
        };
        return (
          <span className={cn("px-2 py-1 text-xs font-medium rounded-full border", colorMap[value] || colorMap['Pasif'])}>
            {value}
          </span>
        );
      },
    },
  ], [borcDurumlari]);

  // ============ TABLE ACTIONS ============
  const tableActions: SmartTableAction<Uye>[] = [
    { id: 'view', label: 'Detay', icon: <Eye className="w-4 h-4" />, onClick: (row) => navigate(`/uyeler/${row.id}`) },
    { id: 'edit', label: 'Düzenle', icon: <Pencil className="w-4 h-4" />, onClick: (row) => navigate(`/uyeler/${row.id}/edit`) },
    { id: 'aidat', label: 'Aidat', icon: <CreditCard className="w-4 h-4" />, onClick: (row) => navigate(`/aidat?uye=${row.id}`) },
    {
      id: 'delete', label: 'Sil', icon: <Trash2 className="w-4 h-4" />, variant: 'destructive',
      onClick: (row) => { setDeletingUye({ id: row.id, name: row.ad_soyad }); setShowDeleteConfirm(true); },
    },
  ];

  // ============ BULK ACTIONS ============
  const bulkActions: BulkAction<Uye>[] = [
    {
      id: 'export_excel', label: 'Excel', icon: <FileSpreadsheet className="w-4 h-4" />,
      onClick: (selected) => {
        const cols = columnsToExportFormat(UYELER_COLUMNS, columnConfig?.visible || UYELER_COLUMNS.map(c => c.id));
        exportToExcel(selected, cols, { filename: `uyeler-${new Date().toISOString().split('T')[0]}`, sheetName: 'Üyeler' });
        toast.success(`${selected.length} üye Excel'e aktarıldı`);
      },
    },
  ];

  // ============ HANDLERS ============
  async function handleExport() {
    if (!tenant) return;
    const toastId = toast.loading('Excel dosyası oluşturuluyor...');
    try {
      const filePath = await invoke<string>('export_uyeler_excel', { tenantIdParam: tenant.id });
      toast.dismiss(toastId);
      toast.success(`Excel dosyası oluşturuldu: ${filePath}`);
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('Export başarısız: ' + error);
    }
  }

  async function handleDeleteUye() {
    if (!tenant || !deletingUye) return;
    try {
      await invoke('delete_uye', { tenantIdParam: tenant.id, uyeId: deletingUye.id });
      toast.success('Üye silindi');
      refetch();
    } catch (error) {
      toast.error('Üye silinemedi: ' + error);
    } finally {
      setShowDeleteConfirm(false);
      setDeletingUye(null);
    }
  }

  // ============ RENDER ============
  return (
    <PageLayout
      title="Üyeler"
      subtitle={`${stats.toplam} kayıtlı üye`}
      icon={<Users className="w-6 h-6" />}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => navigate('/uyeler/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Üye
          </Button>
        </div>
      }
      stats={
        <>
          <StatCard title="Toplam Üye" value={stats.toplam} icon={StatIcons.users} color="blue" size="sm" />
          <StatCard title="Aktif Üye" value={stats.aktif} subtitle={`${aktiflikOrani.toFixed(0)}% aktif`} icon={StatIcons.check} color="green" size="sm" trend={{ value: 12, isPositive: true }} />
          <StatCard title="Borçlu Üye" value={stats.borclu} subtitle="Ödeme bekliyor" icon={StatIcons.alert} color="red" size="sm" />
          <StatCard title="Toplam Alacak" value={`₺${stats.toplamBorc.toLocaleString('tr-TR')}`} icon={StatIcons.wallet} color="yellow" size="sm" />
        </>
      }
    >
      {/* Charts Section */}
      <div className="grid grid-cols-12 gap-5 mb-6">
        {/* Üyelik Durumu Pie */}
        <GlassCard className="col-span-3 p-5" hover={false} glow={COLORS.blue}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600" />
            Üyelik Durumu
          </h3>
          {durumPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={durumPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                    {durumPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {durumPieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-gray-600">{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-gray-400 text-sm">Veri yok</div>
          )}
        </GlassCard>

        {/* Üyelik Tipi Bar */}
        <GlassCard className="col-span-3 p-5" hover={false} glow={COLORS.purple}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600" />
            Üyelik Tipi
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={uyelikTipiData} layout="vertical" barSize={16}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill={COLORS.purple} radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Aylık Kayıt Trendi */}
        <GlassCard className="col-span-4 p-5" hover={false} glow={COLORS.green}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            Aylık Yeni Kayıt
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={aylikKayitData}>
              <defs>
                <linearGradient id="colorYeni" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="yeni" name="Yeni Üye" stroke={COLORS.green} strokeWidth={2} fillOpacity={1} fill="url(#colorYeni)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Aktiflik Oranı Gauge */}
        <GlassCard className="col-span-2 p-5" hover={false} glow={COLORS.blue}>
          <h3 className="text-sm font-bold text-gray-800 mb-1 text-center">Aktiflik</h3>
          <ResponsiveContainer width="100%" height={100}>
            <RadialBarChart cx="50%" cy="100%" innerRadius="80%" outerRadius="100%" startAngle={180} endAngle={0} data={[{ value: aktiflikOrani, fill: COLORS.green }]}>
              <RadialBar background dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="text-2xl font-bold text-gray-800 text-center -mt-4">{aktiflikOrani.toFixed(0)}%</p>
          <p className="text-xs text-gray-500 text-center">Aktif Üye Oranı</p>
        </GlassCard>
      </div>

      {/* Filters */}
      <SectionCard className="mb-6">
        <SmartFilterPanel
          filters={FILTER_DEFINITIONS}
          values={filterValues}
          onChange={setFilterValues}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Üye ara (isim, TC, telefon)..."
        />
      </SectionCard>

      {/* Data Table */}
      <SectionCard padding="none">
        <SmartTable
          data={uyeler}
          columns={tableColumns}
          actions={tableActions}
          bulkActions={bulkActions}
          selectable={true}
          sortable={true}
          columnConfig={columnConfig}
          onColumnSettings={() => setShowColumnSettings(true)}
          onSort={toggleSort}
          selectedRows={selectedUyeler}
          onSelectionChange={setSelectedUyeler}
          getRowId={(row) => row.id}
          loading={isLoading}
          maxHeight={500}
          emptyMessage="Üye bulunamadı"
          onRowClick={(row) => navigate(`/uyeler/${row.id}`)}
        />
      </SectionCard>

      {/* Modals */}
      <ColumnSettingsModal
        open={showColumnSettings}
        onOpenChange={setShowColumnSettings}
        columns={UYELER_COLUMNS}
        currentConfig={columnConfig || { visible: UYELER_PAGE_CONFIG.defaultVisible, order: UYELER_PAGE_CONFIG.defaultColumns.map(c => c.id) }}
        onSave={saveColumnConfig}
        onReset={resetColumnConfig}
        presets={PAGE_PRESETS[PAGE_KEYS.UYELER_LIST]}
      />
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Üyeyi Sil"
        description={`"${deletingUye?.name}" isimli üyeyi silmek istediğinize emin misiniz?`}
        confirmText="Sil"
        cancelText="İptal"
        variant="danger"
        onConfirm={handleDeleteUye}
      />
    </PageLayout>
  );
};

export default UyelerListPage;
