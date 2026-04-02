import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Plus, Users, Download, Eye, Pencil, Trash2,
  UserPlus, Mail, Phone, FileSpreadsheet, FileText,
  UserCheck, UserX, AlertCircle, CreditCard
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

// New Smart Components
import { PageLayout, SectionCard } from '@/components/ui/page-layout';
import { StatCard, MiniStat, QuickActionsCard, StatIcons } from '@/components/ui/dashboard-widgets';
import { SmartFilterPanel, FilterDefinition, FilterValue, DEFAULT_DATE_PRESETS } from '@/components/ui/smart-filter-panel';
import { SmartTable, SmartTableColumn, SmartTableAction, BulkAction } from '@/components/ui/smart-table';

// Hooks
import { useUyeler } from '@/hooks/useUyeler';
import { useColumnConfig } from '@/hooks/useColumnConfig';
import { ColumnSettingsModal } from '@/components/common/ColumnSettingsModal';
import { UYELER_PAGE_CONFIG, PAGE_PRESETS, UYELER_COLUMNS } from '@/config/columnDefinitions';
import { PAGE_KEYS } from '@/types/columnConfig';
import { exportToExcel, exportToPDF, columnsToExportFormat } from '@/utils/export';

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
  {
    id: 'giris_tarihi_baslangic',
    label: 'Giriş Tarihi (Başlangıç)',
    type: 'date',
  },
  {
    id: 'giris_tarihi_bitis',
    label: 'Giriş Tarihi (Bitiş)',
    type: 'date',
  },
];

// ============ QUICK FILTERS ============
const QUICK_FILTERS = [
  {
    id: 'aktif',
    label: 'Aktif Üyeler',
    filters: [{ id: 'durum', value: 'Aktif' }],
    color: 'green',
    icon: <UserCheck className="w-4 h-4" />,
  },
  {
    id: 'borclu',
    label: 'Borçlu Üyeler',
    filters: [{ id: 'has_borc', value: true }],
    color: 'red',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  {
    id: 'pasif',
    label: 'Pasif Üyeler',
    filters: [{ id: 'durum', value: 'Pasif' }],
    color: 'gray',
    icon: <UserX className="w-4 h-4" />,
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

  // ============ COMPUTED STATS ============
  const stats = useMemo(() => {
    const aktifCount = uyeler.filter(u => u.durum === 'Aktif').length;
    const pasifCount = uyeler.filter(u => u.durum === 'Pasif').length;
    const borcluCount = Object.values(borcDurumlari).filter(b => b.kalan_borc > 0).length;
    const toplamBorc = Object.values(borcDurumlari).reduce((sum, b) => sum + b.kalan_borc, 0);

    return {
      toplam: uyeler.length,
      aktif: aktifCount,
      pasif: pasifCount,
      borclu: borcluCount,
      toplamBorc,
    };
  }, [uyeler, borcDurumlari]);

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
      id: 'tc_no',
      header: 'TC No',
      accessor: 'tc_no',
      width: 130,
      render: (value) => (
        <span className="text-sm text-gray-600 font-mono">{value}</span>
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
          {!value && !row.email && <span className="text-gray-400">-</span>}
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
      sortable: true,
      render: (value, row) => {
        const borc = borcDurumlari[row.id];
        if (!borc) return <span className="text-gray-400">-</span>;

        const percentage = borc.toplam_borc > 0
          ? Math.round((borc.odenen / borc.toplam_borc) * 100)
          : 0;

        return (
          <div className="text-right">
            <span className={`text-sm font-bold ${borc.kalan_borc > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₺{borc.kalan_borc.toLocaleString('tr-TR')}
            </span>
            {borc.toplam_borc > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
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
        const durumMap: Record<string, { color: 'green' | 'gray' | 'yellow' | 'red'; label: string }> = {
          'Aktif': { color: 'green', label: 'Aktif' },
          'Pasif': { color: 'gray', label: 'Pasif' },
          'Askıda': { color: 'yellow', label: 'Askıda' },
          'İhraç': { color: 'red', label: 'İhraç' },
        };
        const config = durumMap[value] || { color: 'gray', label: value };

        const colorClasses = {
          green: 'bg-green-100 text-green-700 border-green-200',
          gray: 'bg-gray-100 text-gray-700 border-gray-200',
          yellow: 'bg-amber-100 text-amber-700 border-amber-200',
          red: 'bg-red-100 text-red-700 border-red-200',
        };

        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colorClasses[config.color]}`}>
            {config.label}
          </span>
        );
      },
    },
  ], [borcDurumlari]);

  // ============ TABLE ACTIONS ============
  const tableActions: SmartTableAction<Uye>[] = [
    {
      id: 'view',
      label: 'Detay Görüntüle',
      icon: <Eye className="w-4 h-4" />,
      onClick: (row) => navigate(`/uyeler/${row.id}`),
    },
    {
      id: 'edit',
      label: 'Düzenle',
      icon: <Pencil className="w-4 h-4" />,
      onClick: (row) => navigate(`/uyeler/${row.id}/edit`),
    },
    {
      id: 'aidat',
      label: 'Aidat Öde',
      icon: <CreditCard className="w-4 h-4" />,
      onClick: (row) => navigate(`/aidat-takip?uye=${row.id}`),
    },
    {
      id: 'delete',
      label: 'Sil',
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'destructive',
      onClick: (row) => {
        setDeletingUye({ id: row.id, name: row.ad_soyad });
        setShowDeleteConfirm(true);
      },
    },
  ];

  // ============ BULK ACTIONS ============
  const bulkActions: BulkAction<Uye>[] = [
    {
      id: 'export_excel',
      label: 'Excel\'e Aktar',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      onClick: (selected) => {
        const exportColumns = columnsToExportFormat(UYELER_COLUMNS, columnConfig?.visible || UYELER_COLUMNS.map(c => c.id));
        exportToExcel(selected, exportColumns, {
          filename: `uyeler-secili-${new Date().toISOString().split('T')[0]}`,
          sheetName: 'Seçili Üyeler',
        });
        toast.success(`${selected.length} üye Excel'e aktarıldı`);
      },
    },
    {
      id: 'export_pdf',
      label: 'PDF\'e Aktar',
      icon: <FileText className="w-4 h-4" />,
      onClick: (selected) => {
        const exportColumns = columnsToExportFormat(UYELER_COLUMNS, columnConfig?.visible || UYELER_COLUMNS.map(c => c.id));
        exportToPDF(selected, exportColumns, {
          filename: `uyeler-secili-${new Date().toISOString().split('T')[0]}`,
          title: 'Seçili Üyeler Listesi',
          orientation: 'landscape',
        });
        toast.success(`${selected.length} üye PDF'e aktarıldı`);
      },
    },
    {
      id: 'delete_bulk',
      label: 'Toplu Sil',
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'destructive',
      confirmMessage: 'Seçili üyeleri silmek istediğinize emin misiniz?',
      onClick: async (selected) => {
        // Toplu silme işlemi
        toast.info('Toplu silme özelliği yakında aktif olacak');
      },
    },
  ];

  // ============ QUICK ACTIONS ============
  const quickActions = [
    {
      id: 'new',
      label: 'Yeni Üye',
      icon: <UserPlus className="w-5 h-5" />,
      onClick: () => navigate('/uyeler/create'),
      color: 'blue' as const,
    },
    {
      id: 'export',
      label: 'Excel Export',
      icon: <Download className="w-5 h-5" />,
      onClick: handleExport,
      color: 'green' as const,
    },
    {
      id: 'aidat',
      label: 'Toplu Aidat',
      icon: <CreditCard className="w-5 h-5" />,
      onClick: () => navigate('/aidat-takip'),
      color: 'purple' as const,
    },
  ];

  // ============ HANDLERS ============
  async function handleExport() {
    if (!tenant) return;
    const toastId = toast.loading('Excel dosyası oluşturuluyor...');

    try {
      const filePath = await invoke<string>('export_uyeler_excel', {
        tenantIdParam: tenant.id,
      });
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
      await invoke('delete_uye', {
        tenantIdParam: tenant.id,
        uyeId: deletingUye.id,
      });

      // Sync kuyruğuna ekle
      try {
        const { syncService } = await import('@/services/syncService');
        await syncService.queueChange(tenant.id, 'uyeler', 'delete', { id: deletingUye.id, tenant_id: tenant.id });
      } catch (e) { console.warn('Sync queue hatası:', e); }

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
            Excel Export
          </Button>
          <Button onClick={() => navigate('/uyeler/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Üye
          </Button>
        </div>
      }
      stats={
        <>
          <StatCard
            title="Toplam Üye"
            value={stats.toplam}
            subtitle="Tüm kayıtlar"
            icon={StatIcons.users}
            color="blue"
            size="sm"
          />
          <StatCard
            title="Aktif Üye"
            value={stats.aktif}
            subtitle={`${Math.round((stats.aktif / stats.toplam) * 100) || 0}% oranında`}
            icon={StatIcons.check}
            color="green"
            size="sm"
          />
          <StatCard
            title="Borçlu Üye"
            value={stats.borclu}
            subtitle="Ödeme bekliyor"
            icon={StatIcons.alert}
            color="red"
            size="sm"
          />
          <StatCard
            title="Toplam Alacak"
            value={`₺${stats.toplamBorc.toLocaleString('tr-TR')}`}
            subtitle="Tahsil edilmemiş"
            icon={StatIcons.wallet}
            color="yellow"
            size="sm"
          />
        </>
      }
      filters={
        <SmartFilterPanel
          filters={FILTER_DEFINITIONS}
          values={filterValues}
          onChange={setFilterValues}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Üye ara (isim, TC, telefon)..."
          quickFilters={QUICK_FILTERS as any}
          datePresets={DEFAULT_DATE_PRESETS}
        />
      }
    >
      {/* Data Table */}
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
        maxHeight={600}
        emptyMessage="Üye bulunamadı"
        onRowClick={(row) => navigate(`/uyeler/${row.id}`)}
        onExportExcel={() => {
          const exportColumns = columnsToExportFormat(UYELER_COLUMNS, columnConfig?.visible || UYELER_COLUMNS.map(c => c.id));
          exportToExcel(uyeler, exportColumns, {
            filename: `uyeler-${new Date().toISOString().split('T')[0]}`,
            sheetName: 'Üyeler',
          });
        }}
        onExportPDF={() => {
          const exportColumns = columnsToExportFormat(UYELER_COLUMNS, columnConfig?.visible || UYELER_COLUMNS.map(c => c.id));
          exportToPDF(uyeler, exportColumns, {
            filename: `uyeler-${new Date().toISOString().split('T')[0]}`,
            title: 'Üyeler Listesi',
            orientation: 'landscape',
          });
        }}
      />

      {/* Column Settings Modal */}
      <ColumnSettingsModal
        open={showColumnSettings}
        onOpenChange={setShowColumnSettings}
        columns={UYELER_COLUMNS}
        currentConfig={columnConfig || { visible: UYELER_PAGE_CONFIG.defaultVisible, order: UYELER_PAGE_CONFIG.defaultColumns.map(c => c.id) }}
        onSave={saveColumnConfig}
        onReset={resetColumnConfig}
        presets={PAGE_PRESETS[PAGE_KEYS.UYELER_LIST]}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Üyeyi Sil"
        description={`"${deletingUye?.name}" isimli üyeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        confirmText="Sil"
        cancelText="İptal"
        variant="danger"
        onConfirm={handleDeleteUye}
      />
    </PageLayout>
  );
};

export default UyelerListPage;
