import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Calendar, MapPin, FileText, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Toplanti {
  id: string;
  tenant_id: string;
  baslik: string;
  aciklama?: string;
  tarih: string;
  saat?: string;
  yer?: string;
  toplanti_tipi?: string;
  durum?: string;
  katilimci_sayisi?: number;
  gundem?: string;
  kararlar?: string;
  notlar?: string;
  created_at?: string;
  updated_at?: string;
}

export const ToplantilarDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [toplanti, setToplanti] = React.useState<Toplanti | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (tenant && id) loadToplanti();
  }, [tenant, id]);

  const loadToplanti = async () => {
    if (!tenant || !id) return;
    try {
      setLoading(true);
      const result = await invoke<Toplanti>('get_toplanti', {
        tenantIdParam: tenant.id,
        toplantiId: id,
      });
      setToplanti(result);
    } catch (error) {
      console.error('Failed to load toplanti:', error);
      alert('Toplantı yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

  if (!toplanti) {
    return <div className="p-6 text-center text-red-600">Toplantı bulunamadı</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/toplantilar')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">{toplanti.baslik}</h1>
          <p className="text-gray-600 mt-1">Toplantı Detayları</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-macos p-6">
            <h2 className="text-lg font-semibold mb-4">Genel Bilgiler</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Toplantı Tipi</div>
                <div className="font-medium">{toplanti.toplanti_tipi || '-'}</div>
              </div>
              
              {toplanti.durum && (
                <div>
                  <div className="text-sm text-gray-500">Durum</div>
                  <div className="font-medium">{toplanti.durum}</div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Tarih</div>
                  <div className="font-medium">
                    {new Date(toplanti.tarih).toLocaleDateString('tr-TR')}
                    {toplanti.saat && ` - ${toplanti.saat}`}
                  </div>
                </div>
              </div>
              
              {toplanti.yer && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Yer</div>
                    <div className="font-medium">{toplanti.yer}</div>
                  </div>
                </div>
              )}
              
              {toplanti.katilimci_sayisi && (
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Katılımcı Sayısı</div>
                    <div className="font-medium">{toplanti.katilimci_sayisi} kişi</div>
                  </div>
                </div>
              )}
            </div>
            
            {toplanti.aciklama && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium mb-2">Açıklama</h3>
                <p className="text-gray-600">{toplanti.aciklama}</p>
              </div>
            )}
            
            {toplanti.gundem && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <h3 className="font-medium">Gündem</h3>
                </div>
                <div className="text-gray-600 whitespace-pre-wrap">{toplanti.gundem}</div>
              </div>
            )}
            
            {toplanti.kararlar && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium mb-3">Kararlar</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{toplanti.kararlar}</p>
                </div>
              </div>
            )}
            
            {toplanti.notlar && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium mb-2">Notlar</h3>
                <p className="text-gray-600">{toplanti.notlar}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToplantilarDetailPage;
