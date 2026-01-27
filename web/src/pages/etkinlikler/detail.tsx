import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Calendar, MapPin, Users, DollarSign } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Etkinlik {
  id: string;
  tenant_id: string;
  baslik: string;
  aciklama?: string;
  baslangic_tarihi: string;
  bitis_tarihi?: string;
  yer?: string;
  etkinlik_tipi?: string;
  durum?: string;
  katilimci_sayisi?: number;
  tahmini_butce?: number;
  gerceklesen_butce?: number;
  sorumlu_uye_id?: string;
  notlar?: string;
  created_at?: string;
  updated_at?: string;
}

export const EtkinliklerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [etkinlik, setEtkinlik] = React.useState<Etkinlik | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (tenant && id) loadEtkinlik();
  }, [tenant, id]);

  const loadEtkinlik = async () => {
    if (!tenant || !id) return;
    try {
      setLoading(true);
      const result = await invoke<Etkinlik>('get_etkinlik', {
        tenantIdParam: tenant.id,
        etkinlikId: id,
      });
      setEtkinlik(result);
    } catch (error) {
      console.error('Failed to load etkinlik:', error);
      alert('Etkinlik yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

  if (!etkinlik) {
    return <div className="p-6 text-center text-red-600">Etkinlik bulunamadı</div>;
  }

  const getDurumColor = (durum: string) => {
    switch (durum) {
      case 'Planlandı': return 'bg-blue-100 text-blue-800';
      case 'Devam Ediyor': return 'bg-yellow-100 text-yellow-800';
      case 'Tamamlandı': return 'bg-green-100 text-green-800';
      case 'İptal': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/etkinlikler')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">{etkinlik.baslik}</h1>
          <p className="text-gray-600 mt-1">Etkinlik Detayları</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-macos p-6">
            <h2 className="text-lg font-semibold mb-4">Genel Bilgiler</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Başlangıç Tarihi</div>
                  <div className="font-medium">
                    {new Date(etkinlik.baslangic_tarihi).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              </div>
              
              {etkinlik.bitis_tarihi && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Bitiş Tarihi</div>
                    <div className="font-medium">
                      {new Date(etkinlik.bitis_tarihi).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                </div>
              )}
              
              {etkinlik.etkinlik_tipi && (
                <div>
                  <div className="text-sm text-gray-500">Etkinlik Tipi</div>
                  <div className="font-medium">{etkinlik.etkinlik_tipi}</div>
                </div>
              )}
              
              {etkinlik.yer && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Yer</div>
                    <div className="font-medium">{etkinlik.yer}</div>
                  </div>
                </div>
              )}
              
              {etkinlik.katilimci_sayisi && (
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Katılımcı Sayısı</div>
                    <div className="font-medium">{etkinlik.katilimci_sayisi}</div>
                  </div>
                </div>
              )}
            </div>
            
            {etkinlik.aciklama && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium mb-2">Açıklama</h3>
                <p className="text-gray-600">{etkinlik.aciklama}</p>
              </div>
            )}
            
            {etkinlik.notlar && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium mb-2">Notlar</h3>
                <p className="text-gray-600">{etkinlik.notlar}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-macos p-6">
            <h2 className="text-lg font-semibold mb-4">Durum</h2>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getDurumColor(etkinlik.durum || 'Planlandı')}`}>
              {etkinlik.durum || 'Planlandı'}
            </span>
          </div>

          <div className="card-macos p-6">
            <h2 className="text-lg font-semibold mb-4">Mali Bilgiler</h2>
            <div className="space-y-3">
              {etkinlik.tahmini_butce !== undefined && (
                <div>
                  <div className="text-sm text-gray-500">Tahmini Bütçe</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {etkinlik.tahmini_butce.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </div>
                </div>
              )}
              
              {etkinlik.gerceklesen_butce !== undefined && (
                <div className="pt-3 border-t">
                  <div className="text-sm text-gray-500">Gerçekleşen Bütçe</div>
                  <div className="text-lg font-semibold text-green-600">
                    {etkinlik.gerceklesen_butce.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EtkinliklerDetailPage;
