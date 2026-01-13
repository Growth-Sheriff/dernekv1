import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, PieChart, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Butce {
  id: string;
  tenant_id: string;
  yil: number;
  kategori: string;
  alt_kategori?: string;
  donem?: string;
  planlanan_gelir?: number;
  planlanan_gider?: number;
  gerceklesen_gelir?: number;
  gerceklesen_gider?: number;
  notlar?: string;
  created_at?: string;
  updated_at?: string;
}

export const ButceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [butce, setButce] = React.useState<Butce | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (tenant && id) loadButce();
  }, [tenant, id]);

  const loadButce = async () => {
    if (!tenant || !id) return;
    try {
      setLoading(true);
      const result = await invoke<Butce>('get_butce', {
        tenantIdParam: tenant.id,
        butceId: id,
      });
      setButce(result);
    } catch (error) {
      console.error('Failed to load butce:', error);
      alert('Bütçe yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefreshGerceklesen = async () => {
    if (!tenant || !id || !butce) return;
    
    try {
      setRefreshing(true);
      
      // Backend'de gerçekleşen tutarları hesapla ve güncelle
      await invoke('update_butce_gerceklesen', {
        tenantIdParam: tenant.id,
        butceId: id,
        yil: butce.yil,
        donem: butce.donem,
      });
      
      // Bütçeyi yeniden yükle
      await loadButce();
      
      alert('Gerçekleşen değerler güncellendi!');
    } catch (error) {
      console.error('Failed to refresh:', error);
      alert('Güncelleme başarısız: ' + error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

  if (!butce) {
    return <div className="p-6 text-center text-red-600">Bütçe bulunamadı</div>;
  }

  const planlananGelir = butce.planlanan_gelir || 0;
  const planlananGider = butce.planlanan_gider || 0;
  const hedefFark = planlananGelir - planlananGider;
  const gerceklesenFark = (butce.gerceklesen_gelir || 0) - (butce.gerceklesen_gider || 0);
  const gelirGerceklesme = butce.gerceklesen_gelir && planlananGelir ? (butce.gerceklesen_gelir / planlananGelir * 100) : 0;
  const giderGerceklesme = butce.gerceklesen_gider && planlananGider ? (butce.gerceklesen_gider / planlananGider * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/butce')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              {butce.yil} - {butce.kategori}
            </h1>
            <p className="text-gray-600 mt-1">
              {butce.donem && `${butce.donem} • `}
              {butce.alt_kategori && `${butce.alt_kategori} • `}
              Bütçe Detayları
            </p>
          </div>
        </div>
        
        <button
          onClick={handleRefreshGerceklesen}
          disabled={refreshing}
          className="btn-macos flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Güncelleniyor...' : 'Gerçekleşen Değerleri Güncelle'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-macos p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Gelir</h2>
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Planlanan</div>
              <div className="text-2xl font-bold text-green-600">
                {planlananGelir.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </div>
            </div>
            
            {butce.gerceklesen_gelir !== undefined && (
              <>
                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-500 mb-1">Gerçekleşen</div>
                  <div className="text-2xl font-bold text-green-700">
                    {butce.gerceklesen_gelir.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500 mb-2">Gerçekleşme Oranı</div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full transition-all" 
                      style={{ width: `${Math.min(gelirGerceklesme, 100)}%` }}
                    />
                  </div>
                  <div className="text-sm font-medium mt-1 text-green-700">
                    %{gelirGerceklesme.toFixed(1)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card-macos p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Gider</h2>
            <TrendingDown className="h-6 w-6 text-red-600" />
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Planlanan</div>
              <div className="text-2xl font-bold text-red-600">
                {planlananGider.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </div>
            </div>
            
            {butce.gerceklesen_gider !== undefined && (
              <>
                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-500 mb-1">Gerçekleşen</div>
                  <div className="text-2xl font-bold text-red-700">
                    {butce.gerceklesen_gider.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500 mb-2">Gerçekleşme Oranı</div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-red-600 h-3 rounded-full transition-all" 
                      style={{ width: `${Math.min(giderGerceklesme, 100)}%` }}
                    />
                  </div>
                  <div className="text-sm font-medium mt-1 text-red-700">
                    %{giderGerceklesme.toFixed(1)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-macos p-6">
          <h2 className="text-lg font-semibold mb-4">Planlanan Bütçe</h2>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Fark (Gelir - Gider)</span>
            <span className={`text-2xl font-bold ${hedefFark >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {hedefFark.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </span>
          </div>
        </div>

        {(butce.gerceklesen_gelir !== undefined || butce.gerceklesen_gider !== undefined) && (
          <div className="card-macos p-6">
            <h2 className="text-lg font-semibold mb-4">Gerçekleşen</h2>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Fark (Gelir - Gider)</span>
              <span className={`text-2xl font-bold ${gerceklesenFark >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {gerceklesenFark.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </span>
            </div>
          </div>
        )}
      </div>

      {butce.notlar && (
        <div className="card-macos p-6">
          <h2 className="text-lg font-semibold mb-4">Notlar</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{butce.notlar}</p>
        </div>
      )}
    </div>
  );
};

export default ButceDetailPage;
