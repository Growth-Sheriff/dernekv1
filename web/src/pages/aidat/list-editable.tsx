import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Plus, FileDown, Calendar, Wallet, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { EditableDataTable, EditableColumnDef } from '@/components/common';
import { CellChange } from '@/hooks/useEditableTable';
import { PageHeader } from '@/components/common/page-header';
import { StatCard, StatCardGrid } from '@/components/common/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FormField } from '@/components/ui/form';
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
  // Üye bilgileri (JOIN ile gelecek)
  uye_no?: string;
  uye_ad_soyad?: string;
  uye_telefon?: string;
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

const durumlar = [
  { value: 'beklemede', label: 'Beklemede' },
  { value: 'odendi', label: 'Ödendi' },
  { value: 'kismi_odendi', label: 'Kısmi Ödendi' },
  { value: 'gecikti', label: 'Gecikti' },
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
      // Üye bilgisiyle birlikte getir
      const result = await invoke<AidatTakip[]>('get_aidat_takip_with_uye', {
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
      // Fallback: üye bilgisi olmadan dene
      try {
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
      } catch (fallbackError) {
        toast.error('Aidatlar yüklenemedi: ' + fallbackError);
      }
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

  // Handle inline cell change - auto-save
  const handleCellChange = async (change: CellChange<AidatTakip>) => {
    if (!tenant) return;

    try {
      // Get the full updated row data
      const updatedRow = change.row;
      
      await invoke('update_aidat_odeme', {
        tenantIdParam: tenant.id,
        odemeId: change.rowId,
        tutar: updatedRow.tutar,
        odenen: updatedRow.odenen,
        odemeTarihi: updatedRow.odeme_tarihi || null,
      });

      // Optimistic update
      setAidatlar(prev => prev.map(item => 
        item.id === change.rowId ? { ...item, [change.field]: change.newValue } : item
      ));

      // Reload özet after change
      loadOzet();
      
      toast.success('Güncellendi');
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      toast.error('Güncelleme hatası: ' + error);
      throw error; // Re-throw to show error in cell
    }
  };

  // EditableDataTable column definitions with inline editing support
  const columns: EditableColumnDef<AidatTakip>[] = [
    {
      id: 'uye_bilgi',
      header: 'Üye',
      editable: false,
      width: 200,
      accessorFn: (row: AidatTakip) => row.uye_ad_soyad ? `${row.uye_no || ''} - ${row.uye_ad_soyad}` : row.uye_id.substring(0, 8),
      canSort: true,
    },
    {
      id: 'donem',
      header: 'Dönem',
      editable: false, // Read-only
      accessorFn: (row: AidatTakip) => `${aylar[row.ay - 1]?.label} ${row.yil}`,
      canSort: true,
    },
    {
      id: 'tutar',
      header: 'Tutar (₺)',
      type: 'currency',
      editable: true,
      width: 120,
      validate: (value: any) => {
        if (value === null || value === undefined) return 'Tutar gerekli';
        if (typeof value === 'number' && value < 0) return 'Tutar negatif olamaz';
        return null;
      },
    },
    {
      id: 'odenen',
      header: 'Ödenen (₺)',
      type: 'currency',
      editable: true,
      width: 120,
      validate: (value: any, row: AidatTakip) => {
        if (value === null || value === undefined) return null; // Allow empty
        if (typeof value === 'number' && value < 0) return 'Ödenen negatif olamaz';
        if (typeof value === 'number' && value > row.tutar) return 'Ödenen tutarı aşamaz';
        return null;
      },
    },
    {
      id: 'kalan',
      header: 'Kalan (₺)',
      type: 'currency',
      editable: false,
      width: 120,
      accessorFn: (row: AidatTakip) => row.tutar - row.odenen,
      formatValue: (value: any) => {
        if (value === 0) return '-';
        return `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`;
      },
    },
    {
      id: 'odeme_tarihi',
      header: 'Ödeme Tarihi',
      type: 'date',
      editable: true,
      width: 140,
    },
    {
      id: 'gecikme_gun',
      header: 'Gecikme (Gün)',
      type: 'number',
      editable: false,
      width: 100,
      formatValue: (value: any) => value > 0 ? `${value} gün` : '-',
    },
    {
      id: 'gecikme_faiz',
      header: 'Gecikme Faizi',
      type: 'currency',
      editable: false,
      width: 120,
      formatValue: (value: any) => value > 0 ? `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺` : '-',
    },
    {
      id: 'durum',
      header: 'Durum',
      type: 'select',
      editable: false, // Durum otomatik hesaplanıyor
      options: durumlar,
      width: 120,
      cell: (row: AidatTakip) => {
        const status = row.durum;
        const variant = status === 'odendi' ? 'success' :
                       status === 'kismi_odendi' ? 'info' :
                       status === 'gecikti' ? 'error' : 'warning';
        const label = status === 'odendi' ? 'Ödendi' :
                     status === 'kismi_odendi' ? 'Kısmi' :
                     status === 'gecikti' ? 'Gecikti' : 'Beklemede';
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aidat Takip"
        description="Aidat ödemeleri ve takibi - Hücrelere çift tıklayarak düzenleyebilirsiniz"
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
          <EditableDataTable
            columns={columns}
            data={aidatlar}
            getRowId={(row: AidatTakip) => row.id}
            loading={loading}
            onCellChange={handleCellChange}
            autoSave={true}
            emptyMessage="Henüz aidat kaydı yok"
            hideSearch={true}
            tableId="aidat_list_editable"
            showColumnToggle={true}
            enableColumnResize={true}
            onRowClick={(row: AidatTakip) => navigate(`/aidat/${row.id}`)}
            pagination={{ pageSize: 20 }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AidatListPage;
