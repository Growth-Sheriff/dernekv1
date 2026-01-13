import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Pencil, Trash2, FileDown, Calendar, Wallet, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { StatCard, StatCardGrid } from '@/components/common/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface AidatTakip {
  id: string;
  uye_id: string;
  yil: number;
  ay: number;
  tutar: number;
  odenen: number;
  odeme_tarihi?: string;
  gecikme_gun: number;
  gecikme_faiz: number;
  durum: string;
  created_at: string;
}

interface AidatOzet {
  toplam_tutar: number;
  toplam_odenen: number;
  toplam_kalan: number;
  odenen_adet: number;
  geciken_adet: number;
}

const aylar = [
  { value: 1, label: 'Ocak' },
  { value: 2, label: 'Şubat' },
  { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' },
  { value: 5, label: 'Mayıs' },
  { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' },
  { value: 8, label: 'Ağustos' },
  { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' },
  { value: 11, label: 'Kasım' },
  { value: 12, label: 'Aralık' },
];

export const AidatListPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [aidatlar, setAidatlar] = React.useState<AidatTakip[]>([]);
  const [ozet, setOzet] = React.useState<AidatOzet | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [yil, setYil] = React.useState<number>(new Date().getFullYear());
  const [ay, setAy] = React.useState<number | ''>('');
  const [durum, setDurum] = React.useState<string>('');
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<AidatTakip | null>(null);

  React.useEffect(() => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    loadAidatlar();
    loadOzet();
  }, [tenant, yil, ay, durum]);

  const loadAidatlar = async () => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const result = await invoke<AidatTakip[]>('get_aidat_takip', {
        tenantIdParam: tenant.id,
        filterUyeId: null,
        filterYil: yil,
        filterAy: ay === '' ? null : ay,
        filterDurum: durum || null,
        skip: 0,
        limit: 100,
      });
      setAidatlar(result);
    } catch (error) {
      console.error('Failed to load aidatlar:', error);
      toast.error('Aidatlar yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const loadOzet = async () => {
    if (!tenant) return;
    
    try {
      const result = await invoke<AidatOzet>('get_aidat_ozet', {
        tenantIdParam: tenant.id,
        yil,
      });
      setOzet(result);
    } catch (error) {
      console.error('Failed to load ozet:', error);
    }
  };

  const handleEdit = (aidat: AidatTakip, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(aidat);
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!tenant || !editingItem) return;

    try {
      await invoke('update_aidat_odeme', {
        tenantIdParam: tenant.id,
        odemeId: editingItem.id,
        tutar: editingItem.tutar,
        odenen: editingItem.odenen,
        odemeTarihi: editingItem.odeme_tarihi || null,
      });
      setShowEditModal(false);
      setEditingItem(null);
      loadAidatlar();
      loadOzet();
      toast.success('Aidat güncellendi');
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      toast.error('Güncelleme hatası: ' + error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tenant) return;
    if (!confirm('Bu aidat kaydını silmek istediğinizden emin misiniz?')) return;

    try {
      await invoke('delete_aidat_odeme', {
        tenantIdParam: tenant.id,
        odemeId: id,
      });
      loadAidatlar();
      loadOzet();
      toast.success('Aidat kaydı silindi');
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Silme hatası: ' + error);
    }
  };

  // DataTable columns
  const columns: ColumnDef<AidatTakip>[] = [
    {
      accessorKey: 'donem',
      header: 'Dönem',
      cell: ({ row }) => (
        <span className="font-medium">
          {aylar[row.original.ay - 1]?.label} {row.original.yil}
        </span>
      ),
    },
    {
      accessorKey: 'tutar',
      header: 'Tutar',
      cell: ({ row }) => (
        <span className="text-foreground">{row.original.tutar.toFixed(2)} ₺</span>
      ),
    },
    {
      accessorKey: 'odenen',
      header: 'Ödenen',
      cell: ({ row }) => (
        <span className="text-success">{row.original.odenen.toFixed(2)} ₺</span>
      ),
    },
    {
      accessorKey: 'kalan',
      header: 'Kalan',
      cell: ({ row }) => {
        const kalan = row.original.tutar - row.original.odenen;
        return <span className="text-destructive">{kalan.toFixed(2)} ₺</span>;
      },
    },
    {
      accessorKey: 'gecikme',
      header: 'Gecikme',
      cell: ({ row }) => (
        row.original.gecikme_gun > 0 ? (
          <span className="text-warning">
            {row.original.gecikme_gun} gün / {row.original.gecikme_faiz.toFixed(2)} ₺
          </span>
        ) : null
      ),
    },
    {
      accessorKey: 'durum',
      header: 'Durum',
      cell: ({ row }) => {
        const status = row.original.durum;
        const variant = status === 'odendi' ? 'success' :
                       status === 'kismi_odendi' ? 'info' :
                       status === 'gecikti' ? 'error' : 'warning';
        const label = status === 'odendi' ? 'Ödendi' :
                     status === 'kismi_odendi' ? 'Kısmi' :
                     status === 'gecikti' ? 'Gecikti' : 'Beklemede';
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'İşlemler',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleEdit(row.original, e)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleDelete(row.original.id, e)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aidat Takip"
        description="Aidat ödemeleri ve takibi"
        actions={
          <Button onClick={() => navigate('/aidat/toplu-islemler')}>
            <Plus className="h-4 w-4 mr-2" />
            Toplu Aidat İşlemleri
          </Button>
        }
      />

      {/* Özet Kartları */}
      {ozet && (
        <StatCardGrid columns={4}>
          <StatCard
            title="Toplam Tutar"
            value={`${ozet.toplam_tutar.toFixed(2)} ₺`}
            icon={Wallet}
          />
          <StatCard
            title="Toplam Ödenen"
            value={`${ozet.toplam_odenen.toFixed(2)} ₺`}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Kalan"
            value={`${ozet.toplam_kalan.toFixed(2)} ₺`}
            icon={Calendar}
            variant="error"
          />
          <StatCard
            title="Geciken"
            value={ozet.geciken_adet.toString()}
            icon={AlertTriangle}
            variant="warning"
          />
        </StatCardGrid>
      )}

      {/* Filtreler ve Tablo */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <FormField label="Yıl" htmlFor="yil">
              <Input
                id="yil"
                type="number"
                value={yil}
                onChange={(e) => setYil(parseInt(e.target.value))}
                className="w-24"
              />
            </FormField>

            <FormField label="Ay" htmlFor="ay">
              <select
                id="ay"
                value={ay}
                onChange={(e) => setAy(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Tüm Aylar</option>
                {aylar.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Durum" htmlFor="durum">
              <select
                id="durum"
                value={durum}
                onChange={(e) => setDurum(e.target.value)}
                className="h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Tümü</option>
                <option value="beklemede">Beklemede</option>
                <option value="odendi">Ödendi</option>
                <option value="kismi_odendi">Kısmi Ödendi</option>
                <option value="gecikti">Gecikti</option>
              </select>
            </FormField>

            <div className="flex-1" />

            <Button variant="outline" size="sm" className="mt-6">
              <FileDown className="h-4 w-4 mr-2" />
              Dışa Aktar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={aidatlar}
            loading={loading}
            onRowClick={(row) => navigate(`/aidat/${row.id}`)}
            emptyMessage="Henüz aidat kaydı yok"
            showSearch={false}
            tableId="aidat_list"
            showColumnToggle={true}
            defaultColumnVisibility={{}}
          />
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aidat Düzenle</DialogTitle>
          </DialogHeader>
          
          {editingItem && (
            <div className="space-y-4 py-4">
              <FormField label="Dönem" htmlFor="edit-donem">
                <Input
                  id="edit-donem"
                  value={`${aylar[editingItem.ay - 1]?.label} ${editingItem.yil}`}
                  disabled
                />
              </FormField>

              <FormField label="Tutar (₺)" htmlFor="edit-tutar">
                <Input
                  id="edit-tutar"
                  type="number"
                  step="0.01"
                  value={editingItem.tutar}
                  onChange={(e) => setEditingItem({ ...editingItem, tutar: parseFloat(e.target.value) })}
                />
              </FormField>

              <FormField label="Ödenen (₺)" htmlFor="edit-odenen">
                <Input
                  id="edit-odenen"
                  type="number"
                  step="0.01"
                  value={editingItem.odenen}
                  onChange={(e) => setEditingItem({ ...editingItem, odenen: parseFloat(e.target.value) })}
                />
              </FormField>

              <FormField label="Ödeme Tarihi" htmlFor="edit-odeme-tarihi">
                <Input
                  id="edit-odeme-tarihi"
                  type="date"
                  value={editingItem.odeme_tarihi || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, odeme_tarihi: e.target.value })}
                />
              </FormField>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              İptal
            </Button>
            <Button onClick={handleUpdate}>
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AidatListPage;
