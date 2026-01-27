import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Package, Search, Filter, Eye, Pencil, Trash2, RotateCcw, Layers, FileDown } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { useAuthStore } from '@/store/authStore';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Demirbas {
  id: string;
  demirbas_no?: string;
  ad: string;
  kategori?: string;
  marka_model?: string;
  alis_tarihi?: string;
  alis_bedeli?: number;
  guncel_deger?: number;
  konum?: string;
  sorumlu_uye_adi?: string;
  durum?: string;
  is_active?: number;
}

interface DemirbasOzet {
  toplam: number;
  toplam_deger: number;
  toplam_alis: number;
  aktif: number;
  bakimda: number;
  toplam_amortisman: number;
}

export const DemirbaslarListPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);

  const [demirbaslar, setDemirbaslar] = React.useState<Demirbas[]>([]);
  const [ozet, setOzet] = React.useState<DemirbasOzet | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [kategoriFilter, setKategoriFilter] = React.useState('');
  const [durumFilter, setDurumFilter] = React.useState('');
  const [showPassive, setShowPassive] = React.useState(false);
  const [groupByType, setGroupByType] = React.useState(true); // YENİ: Gruplama toggle

  React.useEffect(() => {
    if (tenant) {
      loadData();
    }
  }, [tenant, showPassive]);

  const loadData = async () => {
    if (!tenant) return;

    try {
      setLoading(true);
      const [demirbasResult, ozetResult] = await Promise.all([
        invoke<Demirbas[]>('get_demirbaslar', {
          tenantIdParam: tenant.id,
          includePassive: showPassive,
        }),
        invoke<DemirbasOzet>('get_demirbas_ozet', {
          tenantIdParam: tenant.id,
        }),
      ]);
      setDemirbaslar(demirbasResult);
      setOzet(ozetResult);
    } catch (error) {
      console.error('Failed to load demirbaslar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenant) return;
    if (!confirm('Bu demirbaşı pasife almak istediğinize emin misiniz?')) return;

    try {
      await invoke('delete_demirbas', {
        tenantIdParam: tenant.id,
        demirbasId: id,
        neden: 'Kullanıcı tarafından pasife alındı',
      });
      loadData();
    } catch (error) {
      console.error('Failed to delete demirbas:', error);
      toast.error('Demirbaş pasife alınamadı: ' + error);
    }
  };

  const handleActivate = async (id: string) => {
    if (!tenant) return;

    try {
      await invoke('activate_demirbas', {
        tenantIdParam: tenant.id,
        demirbasId: id,
      });
      loadData();
    } catch (error) {
      console.error('Failed to activate demirbas:', error);
      toast.error('Demirbaş aktife alınamadı: ' + error);
    }
  };

  const handleExport = async () => {
    if (!tenant) return;

    const toastId = toast.loading('Excel dosyası oluşturuluyor...');

    try {
      const filePath = await invoke<string>('export_demirbaslar_excel', {
        tenantIdParam: tenant.id,
      });
      toast.dismiss(toastId);
      toast.success(`Excel dosyası oluşturuldu: ${filePath}`);
    } catch (error) {
      console.error('Failed to export:', error);
      toast.dismiss(toastId);
      toast.error('Export başarısız: ' + error);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '₺0';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  const getDurumBadge = (durum?: string) => {
    switch (durum) {
      case 'Aktif': return 'bg-green-100 text-green-800';
      case 'Bakımda': return 'bg-yellow-100 text-yellow-800';
      case 'Hurda': return 'bg-red-100 text-red-800';
      case 'Satıldı': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // DataTable columns tanımı
  const columns: ColumnDef<Demirbas & { adet?: number }>[] = React.useMemo(() => [
    {
      accessorKey: 'demirbas_no',
      header: 'No',
      cell: ({ row }) => <span className="font-mono">{row.original.demirbas_no}</span>,
    },
    {
      accessorKey: 'ad',
      header: 'Demirbaş',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">
            {row.original.ad}
            {groupByType && row.original.adet && row.original.adet > 1 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-semibold">
                x{row.original.adet}
              </span>
            )}
          </p>
          {row.original.marka_model && <p className="text-sm text-gray-500">{row.original.marka_model}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'kategori',
      header: 'Kategori',
    },
    {
      accessorKey: 'konum',
      header: 'Konum',
      cell: ({ row }) => row.original.konum || '-',
    },
    {
      accessorKey: 'alis_bedeli',
      header: 'Alış Bedeli',
      cell: ({ row }) => <span className="text-right block">{formatCurrency(row.original.alis_bedeli)}</span>,
    },
    {
      accessorKey: 'guncel_deger',
      header: 'Güncel Değer',
      cell: ({ row }) => <span className="text-right block">{formatCurrency(row.original.guncel_deger)}</span>,
    },
    {
      accessorKey: 'durum',
      header: 'Durum',
      cell: ({ row }) => (
        <span className={`px-2 py-1 text-xs rounded-full ${getDurumBadge(row.original.durum)}`}>
          {row.original.durum}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'İşlemler',
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/demirbaslar/${d.id}`); }}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
              title="Detay"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/demirbaslar/${d.id}/edit`); }}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
              title="Düzenle"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {d.is_active === 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleActivate(d.id); }}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                title="Aktife Al"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                title="Pasife Al"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ], [navigate, groupByType]);

  const kategoriler = ['Mobilya', 'Elektronik', 'Araç', 'Makine', 'Ofis Malzemesi', 'Diğer'];
  const durumlar = ['Aktif', 'Bakımda', 'Hurda', 'Satıldı'];

  const filtered = demirbaslar.filter(d => {
    const matchSearch = d.ad.toLowerCase().includes(search.toLowerCase()) ||
      d.demirbas_no?.toLowerCase().includes(search.toLowerCase()) ||
      d.marka_model?.toLowerCase().includes(search.toLowerCase());
    const matchKategori = !kategoriFilter || d.kategori === kategoriFilter;
    const matchDurum = !durumFilter || d.durum === durumFilter;
    return matchSearch && matchKategori && matchDurum;
  });

  // Gruplama: Aynı tür demirbaşları birleştir
  const grouped = React.useMemo(() => {
    if (!groupByType) return filtered.map(d => ({ ...d, adet: 1 }));

    const groups = filtered.reduce((acc, d) => {
      const key = `${d.kategori}-${d.ad}-${d.marka_model || ''}`;
      if (!acc[key]) {
        acc[key] = { ...d, adet: 0, kayit_ids: [] };
      }
      acc[key].adet += 1;
      acc[key].kayit_ids.push(d.id);
      return acc;
    }, {} as Record<string, Demirbas & { adet: number; kayit_ids: string[] }>);

    return Object.values(groups);
  }, [filtered, groupByType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Demirbaş Yönetimi"
        description="Dernek demirbaşlarını takip edin"
        icon={Package}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <FileDown className="h-5 w-5 mr-2" />
              Excel Export
            </Button>
            <Button variant="outline" onClick={() => navigate('/demirbaslar/toplu')}>
              <Layers className="h-5 w-5 mr-2" />
              Toplu Giriş
            </Button>
            <Button onClick={() => navigate('/demirbaslar/create')}>
              <Plus className="h-5 w-5 mr-2" />
              Yeni Demirbaş
            </Button>
          </div>
        }
      />

      {/* Özet Kartları */}
      {ozet && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Demirbaş</p>
                <p className="text-xl font-bold">{ozet.toplam}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Alış Değeri</p>
                <p className="text-xl font-bold">{formatCurrency(ozet.toplam_alis)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Güncel Değer</p>
                <p className="text-xl font-bold">{formatCurrency(ozet.toplam_deger)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Package className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Amortisman</p>
                <p className="text-xl font-bold">{formatCurrency(ozet.toplam_amortisman)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Demirbaş ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={kategoriFilter}
            onChange={(e) => setKategoriFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">Tüm Kategoriler</option>
            {kategoriler.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <select
            value={durumFilter}
            onChange={(e) => setDurumFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">Tüm Durumlar</option>
            {durumlar.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showPassive}
              onChange={(e) => setShowPassive(e.target.checked)}
              className="rounded"
            />
            Pasifleri göster
          </label>          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={groupByType}
              onChange={(e) => setGroupByType(e.target.checked)}
              className="rounded"
            />
            Tür Bazlı Grupla
          </label>        </div>
      </div>

      {/* Tablo - DataTable ile */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={grouped}
            loading={loading}
            onRowClick={(row) => {
              // Gruplu görünümde tek kayıt varsa direkt detaya git
              if (groupByType && row.adet === 1) {
                navigate(`/demirbaslar/${row.id}`);
              } else if (!groupByType) {
                navigate(`/demirbaslar/${row.id}`);
              }
            }}
            emptyMessage="Demirbaş bulunamadı"
            showSearch={false}
            tableId="demirbaslar_list"
            showColumnToggle={true}
            defaultColumnVisibility={{}}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DemirbaslarListPage;
