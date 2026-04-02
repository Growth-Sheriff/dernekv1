import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Plus, TrendingUp, Eye, Pencil, Trash2,
  FileSpreadsheet, FileText, Wallet, Calendar,
  CheckCircle, Clock, CreditCard
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

// New Smart Components
import { PageLayout } from '@/components/ui/page-layout';
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

interface Kasa {
  id: string;
  kasa_adi: string;
  para_birimi: string;
}

interface GelirTuru {
  id: string;
  ad: string;
}

interface Uye {
  id: string;
  uye_no: string;
  ad_soyad: string;
  telefon?: string;
}

// ============ FILTER DEFINITIONS ============
const createFilterDefinitions = (kasalar: Kasa[], gelirTurleri: GelirTuru[]): FilterDefinition[] => [
  {
    id: 'kasa_id',
    label: 'Kasa',
    type: 'select',
    options: kasalar.map(k => ({ value: k.id, label: k.kasa_adi })),
  },
  {
    id: 'gelir_turu',
    label: 'Gelir Türü',
    type: 'select',
    options: gelirTurleri.map(t => ({ value: t.id, label: t.ad })),
  },
  {
    id: 'baslangic_tarih',
    label: 'Başlangıç Tarihi',
    type: 'date',
  },
  {
    id: 'bitis_tarih',
    label: 'Bitiş Tarihi',
    type: 'date',
  },
];

// ============ QUICK FILTERS ============
const QUICK_FILTERS = [
  {
    id: 'today',
    label: 'Bugün',
    filters: [{ id: 'today', value: true }],
    color: 'blue',
    icon: <Calendar className="w-4 h-4" />,
  },
  {
    id: 'aidat',
    label: 'Aidat Gelirleri',
    filters: [{ id: 'is_aidat', value: true }],
    color: 'green',
    icon: <CreditCard className="w-4 h-4" />,
  },
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

  // Extract filters
  const baslangicTarih = filterValues.find(f => f.id === 'baslangic_tarih')?.value || '';
  const bitisTarih = filterValues.find(f => f.id === 'bitis_tarih')?.value || '';
  const gelirTuruFilter = filterValues.find(f => f.id === 'gelir_turu')?.value || '';

  // React Query hook
  const { gelirler, isLoading, refetch } = useGelirler({
    baslangicTarih: baslangicTarih || null,
    bitisTarih: bitisTarih || null,
    gelirTuruId: gelirTuruFilter || null,
    limit: 1000,
  });

  // Column configuration
  const {
    config: columnConfig,
    saveConfig: saveColumnConfig,
    resetConfig: resetColumnConfig,
    toggleSort,
  } = useColumnConfig({
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
    } catch (error) {
      console.error('Kasalar yüklenemedi:', error);
    }
  };

  const loadGelirTurleri = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<GelirTuru[]>('get_gelir_turleri', { tenantIdParam: tenant.id });
      setGelirTurleri(result);
      if (result.length > 0 && !gelirTuruId) setGelirTuruId(result[0].id);
    } catch (error) {
      console.error('Gelir türleri yüklenemedi:', error);
    }
  };

  const loadUyeler = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<Uye[]>('get_uyeler', { tenantIdParam: tenant.id });
      setUyeler(result);
    } catch (error) {
      console.error('Üyeler yüklenemedi:', error);
    }
  };

  // ============ COMPUTED STATS ============
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    const todayTotal = gelirler
      .filter(g => g.tarih.startsWith(today))
      .reduce((sum, g) => sum + g.tutar, 0);

    const monthTotal = gelirler
      .filter(g => g.tarih.startsWith(thisMonth))
      .reduce((sum, g) => sum + g.tutar, 0);

    const aidatTotal = gelirler
      .filter(g => g.aidat_id)
      .reduce((sum, g) => sum + g.tutar, 0);

    const toplamTutar = gelirler.reduce((sum, g) => sum + g.tutar, 0);

    return {
      toplam: gelirler.length,
      toplamTutar,
      todayTotal,
      monthTotal,
      aidatTotal,
    };
  }, [gelirler]);

  // ============ TABLE COLUMNS ============
  const tableColumns: SmartTableColumn<Gelir>[] = useMemo(() => [
    {
      id: 'tarih',
      header: 'Tarih',
      accessor: 'tarih',
      width: 120,
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-green-600" />
          </div>
          <span className="font-medium text-gray-900">
            {value ? new Date(value).toLocaleDateString('tr-TR') : '-'}
          </span>
        </div>
      ),
    },
    {
      id: 'tutar',
      header: 'Tutar',
      accessor: 'tutar',
      width: 140,
      align: 'right',
      sortable: true,
      render: (value) => (
        <div className="text-right">
          <span className="text-lg font-bold text-green-600">
            +₺{value?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      ),
    },
    {
      id: 'gelir_turu',
      header: 'Tür',
      accessor: 'gelir_turu',
      width: 120,
      render: (value, row) => {
        const isAidat = !!row.aidat_id;
        return (
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${isAidat
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
            {isAidat ? 'Aidat' : (value || 'Diğer')}
          </span>
        );
      },
    },
    {
      id: 'aciklama',
      header: 'Açıklama',
      accessor: 'aciklama',
      width: 250,
      render: (value) => (
        <p className="text-sm text-gray-600 truncate max-w-[230px]" title={value}>
          {value || '-'}
        </p>
      ),
    },
    {
      id: 'makbuz_no',
      header: 'Makbuz No',
      accessor: 'makbuz_no',
      width: 130,
      render: (value) => (
        value ? (
          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
            {value}
          </span>
        ) : <span className="text-gray-400">-</span>
      ),
    },
    {
      id: 'uye',
      header: 'Üye',
      accessor: 'uye_ad_soyad',
      width: 150,
      render: (value) => (
        value ? (
          <span className="text-sm text-gray-700">{value}</span>
        ) : <span className="text-gray-400">-</span>
      ),
    },
    {
      id: 'kasa',
      header: 'Kasa',
      accessor: 'kasa_adi',
      width: 130,
      render: (value) => (
        <div className="flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm text-gray-600">{value || '-'}</span>
        </div>
      ),
    },
  ], []);

  // ============ TABLE ACTIONS ============
  const tableActions: SmartTableAction<Gelir>[] = [
    {
      id: 'view',
      label: 'Detay Görüntüle',
      icon: <Eye className="w-4 h-4" />,
      onClick: (row) => toast.info('Detay sayfası yakında...'),
    },
    {
      id: 'edit',
      label: 'Düzenle',
      icon: <Pencil className="w-4 h-4" />,
      onClick: (row) => toast.info('Düzenleme yakında...'),
    },
    {
      id: 'delete',
      label: 'Sil',
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'destructive',
      onClick: (row) => {
        setDeletingGelir(row);
        setShowDeleteConfirm(true);
      },
    },
  ];

  // ============ BULK ACTIONS ============
  const bulkActions: BulkAction<Gelir>[] = [
    {
      id: 'export_excel',
      label: 'Excel\'e Aktar',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      onClick: (selected) => {
        const exportColumns = columnsToExportFormat(GELIRLER_COLUMNS, columnConfig?.visible || GELIRLER_COLUMNS.map(c => c.id));
        exportToExcel(selected, exportColumns, {
          filename: `gelirler-secili-${new Date().toISOString().split('T')[0]}`,
          sheetName: 'Seçili Gelirler',
        });
        toast.success(`${selected.length} gelir Excel'e aktarıldı`);
      },
    },
    {
      id: 'export_pdf',
      label: 'PDF\'e Aktar',
      icon: <FileText className="w-4 h-4" />,
      onClick: (selected) => {
        const exportColumns = columnsToExportFormat(GELIRLER_COLUMNS, columnConfig?.visible || GELIRLER_COLUMNS.map(c => c.id));
        exportToPDF(selected, exportColumns, {
          filename: `gelirler-secili-${new Date().toISOString().split('T')[0]}`,
          title: 'Seçili Gelirler Listesi',
        });
        toast.success(`${selected.length} gelir PDF'e aktarıldı`);
      },
    },
  ];

  // ============ HANDLERS ============
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) {
      toast.error('Tenant bilgisi bulunamadı!');
      return;
    }

    if (!kasaId || !tutar) {
      toast.error('Kasa ve Tutar alanları zorunludur!');
      return;
    }

    const tutarNum = parseFloat(tutar);
    if (isNaN(tutarNum) || tutarNum <= 0) {
      toast.error('Geçerli bir tutar girin!');
      return;
    }

    try {
      await invoke('create_gelir', {
        tenantIdParam: tenant.id,
        data: {
          kasa_id: kasaId,
          gelir_turu_id: gelirTuruId || null,
          tarih,
          tutar: tutarNum,
          aciklama: aciklama || null,
          makbuz_no: dekontNo || null,
          uye_id: selectedUyeId || null,
        },
      });

      // Sync kuyruğuna ekle
      try {
        const { syncService } = await import('@/services/syncService');
        const latestGelirler = await invoke<any[]>('get_gelirler', { tenantIdParam: tenant.id, yil: 0 });
        const created = latestGelirler?.sort((a: any, b: any) => b.created_at?.localeCompare(a.created_at || ''))?.[0];
        if (created) await syncService.queueChange(tenant.id, 'gelirler', 'create', created);
      } catch (e) { console.warn('Sync queue hatası:', e); }

      toast.success('Gelir başarıyla eklendi!');
      setShowForm(false);
      resetForm();
      refetch();
    } catch (error) {
      toast.error('Gelir eklenemedi: ' + error);
    }
  };

  const resetForm = () => {
    setTutar('');
    setAciklama('');
    setDekontNo('');
    setSelectedUyeId('');
    setEvrakData(null);
  };

  const handleDelete = async () => {
    if (!tenant || !deletingGelir) return;

    try {
      await invoke('delete_gelir', {
        tenantIdParam: tenant.id,
        recordId: deletingGelir.id,
      });

      // Sync kuyruğuna ekle
      try {
        const { syncService } = await import('@/services/syncService');
        await syncService.queueChange(tenant.id, 'gelirler', 'delete', { id: deletingGelir.id, tenant_id: tenant.id });
      } catch (e) { console.warn('Sync queue hatası:', e); }

      toast.success('Gelir silindi');
      refetch();
    } catch (error) {
      toast.error('Gelir silinemedi: ' + error);
    } finally {
      setShowDeleteConfirm(false);
      setDeletingGelir(null);
    }
  };

  // ============ RENDER ============
  return (
    <PageLayout
      title="Gelirler"
      subtitle={`${stats.toplam} kayıt • Toplam: ₺${stats.toplamTutar.toLocaleString('tr-TR')}`}
      icon={<TrendingUp className="w-6 h-6" />}
      actions={
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Gelir
        </Button>
      }
      stats={
        <>
          <StatCard
            title="Toplam Gelir"
            value={`₺${stats.toplamTutar.toLocaleString('tr-TR')}`}
            subtitle={`${stats.toplam} işlem`}
            icon={StatIcons.wallet}
            color="green"
            size="sm"
          />
          <StatCard
            title="Bugün"
            value={`₺${stats.todayTotal.toLocaleString('tr-TR')}`}
            subtitle="Günlük tahsilat"
            icon={StatIcons.calendar}
            color="blue"
            size="sm"
          />
          <StatCard
            title="Bu Ay"
            value={`₺${stats.monthTotal.toLocaleString('tr-TR')}`}
            subtitle="Aylık tahsilat"
            icon={StatIcons.chart}
            color="purple"
            size="sm"
          />
          <StatCard
            title="Aidat Gelirleri"
            value={`₺${stats.aidatTotal.toLocaleString('tr-TR')}`}
            subtitle="Üye aidatları"
            icon={StatIcons.credit}
            color="yellow"
            size="sm"
          />
        </>
      }
      filters={
        <SmartFilterPanel
          filters={createFilterDefinitions(kasalar, gelirTurleri)}
          values={filterValues}
          onChange={setFilterValues}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Gelir ara (açıklama, makbuz no)..."
          quickFilters={QUICK_FILTERS as any}
          datePresets={DEFAULT_DATE_PRESETS}
        />
      }
    >
      {/* Data Table */}
      <SmartTable
        data={gelirler}
        columns={tableColumns}
        actions={tableActions}
        bulkActions={bulkActions}
        selectable={true}
        sortable={true}
        columnConfig={columnConfig}
        onColumnSettings={() => setShowColumnSettings(true)}
        onSort={toggleSort}
        selectedRows={selectedGelirler}
        onSelectionChange={setSelectedGelirler}
        getRowId={(row) => row.id}
        loading={isLoading}
        maxHeight={600}
        emptyMessage="Gelir kaydı bulunamadı"
        onExportExcel={() => {
          const exportColumns = columnsToExportFormat(GELIRLER_COLUMNS, columnConfig?.visible || GELIRLER_COLUMNS.map(c => c.id));
          exportToExcel(gelirler, exportColumns, {
            filename: `gelirler-${new Date().toISOString().split('T')[0]}`,
            sheetName: 'Gelirler',
          });
        }}
        onExportPDF={() => {
          const exportColumns = columnsToExportFormat(GELIRLER_COLUMNS, columnConfig?.visible || GELIRLER_COLUMNS.map(c => c.id));
          exportToPDF(gelirler, exportColumns, {
            filename: `gelirler-${new Date().toISOString().split('T')[0]}`,
            title: 'Gelirler Listesi',
          });
        }}
      />

      {/* Add Income Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span>Yeni Gelir Ekle</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kasa *</label>
                <select
                  value={kasaId}
                  onChange={(e) => setKasaId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  {kasalar.map(k => (
                    <option key={k.id} value={k.id}>{k.kasa_adi} ({k.para_birimi})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gelir Türü</label>
                <select
                  value={gelirTuruId}
                  onChange={(e) => setGelirTuruId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Seçiniz</option>
                  {gelirTurleri.map(t => (
                    <option key={t.id} value={t.id}>{t.ad}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
                <input
                  type="date"
                  value={tarih}
                  onChange={(e) => setTarih(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tutar *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₺</span>
                  <input
                    type="number"
                    step="0.01"
                    value={tutar}
                    onChange={(e) => setTutar(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-200 pl-7 pr-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Makbuz No</label>
                <input
                  type="text"
                  value={dekontNo}
                  onChange={(e) => setDekontNo(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="MKB-001"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İlgili Üye (Opsiyonel)</label>
              <select
                value={selectedUyeId}
                onChange={(e) => setSelectedUyeId(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Üye Seçilmedi</option>
                {uyeler.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.uye_no ? `${u.uye_no} - ` : ''}{u.ad_soyad}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                placeholder="Gelir detayı..."
              />
            </div>

            {tenant && (
              <EvrakEkleme
                tenantId={tenant.id}
                onEvrakChange={setEvrakData}
                belgeTuru="gelir"
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                İptal
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Column Settings Modal */}
      <ColumnSettingsModal
        open={showColumnSettings}
        onOpenChange={setShowColumnSettings}
        columns={GELIRLER_COLUMNS}
        currentConfig={columnConfig || { visible: GELIRLER_PAGE_CONFIG.defaultVisible, order: GELIRLER_PAGE_CONFIG.defaultColumns.map(c => c.id) }}
        onSave={saveColumnConfig}
        onReset={resetColumnConfig}
        presets={PAGE_PRESETS[PAGE_KEYS.GELIRLER_LIST]}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Geliri Sil"
        description={`₺${deletingGelir?.tutar?.toLocaleString('tr-TR')} tutarındaki geliri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        confirmText="Sil"
        cancelText="İptal"
        variant="danger"
        onConfirm={handleDelete}
      />
    </PageLayout>
  );
};

export default GelirlerPage;
