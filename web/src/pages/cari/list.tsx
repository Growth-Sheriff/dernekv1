import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Building2, Search, Eye, Pencil, Trash2, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';
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

interface Cari {
  id: string;
  cari_kodu?: string;
  tip: string;
  unvan: string;
  yetkili_kisi?: string;
  telefon?: string;
  email?: string;
  borc_bakiye?: number;
  alacak_bakiye?: number;
  is_active?: number;
}

interface CariOzet {
  toplam: number;
  aktif: number;
  toplam_borc: number;
  toplam_alacak: number;
  musteri_sayisi: number;
  tedarikci_sayisi: number;
}

export const CariListPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [cariler, setCariler] = React.useState<Cari[]>([]);
  const [ozet, setOzet] = React.useState<CariOzet | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [tipFilter, setTipFilter] = React.useState('');
  const [showPassive, setShowPassive] = React.useState(false);

  React.useEffect(() => {
    if (tenant) {
      loadData();
    }
  }, [tenant, showPassive]);

  const loadData = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      const [cariResult, ozetResult] = await Promise.all([
        invoke<Cari[]>('get_cariler', {
          tenantIdParam: tenant.id,
          includePassive: showPassive,
        }),
        invoke<CariOzet>('get_cari_ozet', {
          tenantIdParam: tenant.id,
        }),
      ]);
      setCariler(cariResult);
      setOzet(ozetResult);
    } catch (error) {
      console.error('Failed to load cariler:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenant) return;
    if (!confirm('Bu cariyi pasife almak istediğinize emin misiniz?')) return;
    
    try {
      await invoke('delete_cari', {
        tenantIdParam: tenant.id,
        cariId: id,
        neden: 'Kullanıcı tarafından pasife alındı',
      });
      loadData();
    } catch (error) {
      console.error('Failed to delete cari:', error);
      toast.error('Cari pasife alınamadı: ' + error);
    }
  };

  const handleActivate = async (id: string) => {
    if (!tenant) return;
    
    try {
      await invoke('activate_cari', {
        tenantIdParam: tenant.id,
        cariId: id,
      });
      loadData();
    } catch (error) {
      console.error('Failed to activate cari:', error);
      toast.error('Cari aktife alınamadı: ' + error);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '₺0';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  const getTipBadge = (tip?: string) => {
    switch (tip) {
      case 'Müşteri': return 'bg-blue-100 text-blue-800';
      case 'Tedarikçi': return 'bg-purple-100 text-purple-800';
      case 'Hem Müşteri Hem Tedarikçi': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBakiye = (cari: Cari) => {
    const borc = cari.borc_bakiye || 0;
    const alacak = cari.alacak_bakiye || 0;
    const net = borc - alacak;
    if (net > 0) {
      return { label: 'Borçlu', value: net, color: 'text-red-600' };
    } else if (net < 0) {
      return { label: 'Alacaklı', value: Math.abs(net), color: 'text-green-600' };
    }
    return { label: 'Denk', value: 0, color: 'text-gray-600' };
  };

  // DataTable columns tanımı
  const columns: ColumnDef<Cari>[] = React.useMemo(() => [
    {
      accessorKey: 'cari_kodu',
      header: 'Kod',
      cell: ({ row }) => <span className="font-mono">{row.original.cari_kodu || '-'}</span>,
    },
    {
      accessorKey: 'unvan',
      header: 'Ünvan',
      cell: ({ row }) => <p className="font-medium">{row.original.unvan}</p>,
    },
    {
      accessorKey: 'tip',
      header: 'Tip',
      cell: ({ row }) => (
        <span className={`px-2 py-1 text-xs rounded-full ${getTipBadge(row.original.tip)}`}>
          {row.original.tip}
        </span>
      ),
    },
    {
      accessorKey: 'yetkili_kisi',
      header: 'Yetkili',
      cell: ({ row }) => row.original.yetkili_kisi || '-',
    },
    {
      id: 'iletisim',
      header: 'İletişim',
      cell: ({ row }) => (
        <div>
          {row.original.telefon && <p>{row.original.telefon}</p>}
          {row.original.email && <p className="text-gray-500 text-sm">{row.original.email}</p>}
        </div>
      ),
    },
    {
      id: 'bakiye',
      header: 'Bakiye',
      cell: ({ row }) => {
        const bakiye = getBakiye(row.original);
        return (
          <div className={`text-right ${bakiye.color}`}>
            <p className="font-medium">{formatCurrency(bakiye.value)}</p>
            <p className="text-xs">{bakiye.label}</p>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'İşlemler',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/cari/${c.id}`); }}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
              title="Detay"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/cari/${c.id}/edit`); }}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
              title="Düzenle"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {c.is_active === 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleActivate(c.id); }}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                title="Aktife Al"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
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
  ], [navigate]);

  const tipler = ['Müşteri', 'Tedarikçi', 'Hem Müşteri Hem Tedarikçi'];

  const filtered = cariler.filter(c => {
    const matchSearch = c.unvan.toLowerCase().includes(search.toLowerCase()) ||
                       c.cari_kodu?.toLowerCase().includes(search.toLowerCase()) ||
                       c.yetkili_kisi?.toLowerCase().includes(search.toLowerCase());
    const matchTip = !tipFilter || c.tip === tipFilter;
    return matchSearch && matchTip;
  });

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
        title="Cari Hesaplar"
        description="Müşteri ve tedarikçi hesaplarını yönetin"
        icon={Building2}
        actions={
          <Button onClick={() => navigate('/cari/create')}>
            <Plus className="h-5 w-5 mr-2" />
            Yeni Cari
          </Button>
        }
      />

      {/* Özet Kartları */}
      {ozet && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Cari</p>
                <p className="text-xl font-bold">{ozet.toplam}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Borç</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(ozet.toplam_borc)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Alacak</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(ozet.toplam_alacak)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Müşteri / Tedarikçi</p>
                <p className="text-xl font-bold">{ozet.musteri_sayisi} / {ozet.tedarikci_sayisi}</p>
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
              placeholder="Cari ara (ünvan, kod, yetkili kişi)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={tipFilter}
            onChange={(e) => setTipFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">Tüm Tipler</option>
            {tipler.map(t => (
              <option key={t} value={t}>{t}</option>
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
          </label>
        </div>
      </div>

      {/* Tablo - DataTable ile */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            onRowClick={(row) => navigate(`/cari/${row.id}`)}
            emptyMessage="Cari hesap bulunamadı"
            showSearch={false}
            tableId="cari_list"
            showColumnToggle={true}
            defaultColumnVisibility={{}}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CariListPage;
