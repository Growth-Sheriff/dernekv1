import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Package, Pencil, Calendar, MapPin, User, FileText, Calculator } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Demirbas {
  id: string;
  demirbas_no?: string;
  ad: string;
  kategori?: string;
  aciklama?: string;
  marka_model?: string;
  seri_no?: string;
  alis_tarihi?: string;
  alis_bedeli?: number;
  guncel_deger?: number;
  garanti_bitis?: string;
  amortisman_suresi?: number;
  konum?: string;
  sorumlu_uye_id?: string;
  sorumlu_uye_adi?: string;
  durum?: string;
  notlar?: string;
  is_active?: number;
  created_at?: string;
}

interface AmortismanItem {
  yil: number;
  yillik_amortisman: number;
  birikmis_amortisman: number;
  net_deger: number;
}

export const DemirbasDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [demirbas, setDemirbas] = React.useState<Demirbas | null>(null);
  const [amortisman, setAmortisman] = React.useState<AmortismanItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (tenant && id) {
      loadData();
    }
  }, [tenant, id]);

  const loadData = async () => {
    if (!tenant || !id) return;
    
    try {
      setLoading(true);
      const result = await invoke<Demirbas>('get_demirbas', {
        tenantIdParam: tenant.id,
        demirbasId: id,
      });
      setDemirbas(result);
      
      // Amortisman hesapla
      if (result.alis_bedeli && result.amortisman_suresi) {
        const amortismanResult = await invoke<AmortismanItem[]>('hesapla_amortisman', {
          tenantIdParam: tenant.id,
          demirbasId: id,
        });
        setAmortisman(amortismanResult);
      }
    } catch (error) {
      console.error('Failed to load demirbas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('tr-TR');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!demirbas) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Demirbaş bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/demirbaslar')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">{demirbas.ad}</h1>
                <span className={`px-2 py-1 text-xs rounded-full ${getDurumBadge(demirbas.durum)}`}>
                  {demirbas.durum}
                </span>
                {demirbas.is_active === 0 && (
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-600">
                    Pasif
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm">
                {demirbas.demirbas_no} • {demirbas.kategori}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(`/demirbaslar/${id}/edit`)}
          className="btn-macos flex items-center gap-2"
        >
          <Pencil className="h-4 w-4" />
          Düzenle
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Sol Panel - Detaylar */}
        <div className="col-span-2 space-y-6">
          {/* Temel Bilgiler */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-medium mb-4">Temel Bilgiler</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Marka / Model</p>
                  <p className="font-medium">{demirbas.marka_model || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Seri No</p>
                  <p className="font-medium">{demirbas.seri_no || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Konum</p>
                  <p className="font-medium">{demirbas.konum || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Sorumlu Üye</p>
                  <p className="font-medium">{demirbas.sorumlu_uye_adi || '-'}</p>
                </div>
              </div>
            </div>
            {demirbas.aciklama && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500 mb-1">Açıklama</p>
                <p className="text-gray-700">{demirbas.aciklama}</p>
              </div>
            )}
          </div>

          {/* Mali Bilgiler */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-medium mb-4">Mali Bilgiler</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Alış Bedeli</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(demirbas.alis_bedeli)}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Güncel Değer</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(demirbas.guncel_deger)}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-600">Toplam Amortisman</p>
                <p className="text-2xl font-bold text-orange-700">
                  {formatCurrency((demirbas.alis_bedeli || 0) - (demirbas.guncel_deger || 0))}
                </p>
              </div>
            </div>
          </div>

          {/* Amortisman Tablosu */}
          {amortisman.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-medium">Amortisman Tablosu</h3>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Yıl</th>
                    <th className="text-right px-4 py-2 text-sm font-medium text-gray-600">Yıllık Amortisman</th>
                    <th className="text-right px-4 py-2 text-sm font-medium text-gray-600">Birikmiş Amortisman</th>
                    <th className="text-right px-4 py-2 text-sm font-medium text-gray-600">Net Değer</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {amortisman.map((a, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{a.yil}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(a.yillik_amortisman)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(a.birikmis_amortisman)}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatCurrency(a.net_deger)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sağ Panel */}
        <div className="space-y-6">
          {/* Tarih Bilgileri */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-medium mb-4">Tarihler</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Alış Tarihi</p>
                  <p className="font-medium">{formatDate(demirbas.alis_tarihi)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Garanti Bitiş</p>
                  <p className="font-medium">{formatDate(demirbas.garanti_bitis)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Kayıt Tarihi</p>
                  <p className="font-medium">{formatDate(demirbas.created_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Amortisman Bilgisi */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-medium mb-4">Amortisman</h3>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">{demirbas.amortisman_suresi || 5}</p>
              <p className="text-gray-500">Yıllık Amortisman Süresi</p>
            </div>
            {demirbas.alis_bedeli && demirbas.amortisman_suresi && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-500">Yıllık Amortisman Tutarı</p>
                <p className="font-bold text-lg">
                  {formatCurrency(demirbas.alis_bedeli / demirbas.amortisman_suresi)}
                </p>
              </div>
            )}
          </div>

          {/* Notlar */}
          {demirbas.notlar && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-medium mb-4">Notlar</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{demirbas.notlar}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemirbasDetailPage;
