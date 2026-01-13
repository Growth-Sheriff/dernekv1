import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Users, TrendingUp, TrendingDown, Wallet, Clock, Cloud, DollarSign, Euro } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  total_uyeler: number;
  aktif_uyeler: number;
  pasif_uyeler: number;
  bekleyen_uyeler: number;
}

interface AidatStats {
  toplam_tutar: number;
  toplam_odenen: number;
  toplam_kalan: number;
  odenen_adet: number;
  geciken_adet: number;
}

interface KasaStats {
  toplam_bakiye: number;
  toplam_gelir: number;
  toplam_gider: number;
  kasa_sayisi: number;
}

interface GuncelKur {
  para_birimi: string;
  hedef_para_birimi: string;
  kur_degeri: number;
  gecerlilik_baslangic: string;
}

export const DashboardIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  const { pendingChanges, lastSyncAt, loadSyncStatus } = useSyncStore();
  
  const [uyeStats, setUyeStats] = React.useState<DashboardStats>({
    total_uyeler: 0,
    aktif_uyeler: 0,
    pasif_uyeler: 0,
    bekleyen_uyeler: 0,
  });
  const [aidatStats, setAidatStats] = React.useState<AidatStats | null>(null);
  const [kasaStats, setKasaStats] = React.useState<KasaStats | null>(null);
  const [guncelKurlar, setGuncelKurlar] = React.useState<GuncelKur[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!tenant) {
      console.warn('Dashboard: Tenant bulunamadı');
      return;
    }
    loadStats();
    loadSyncStatus(tenant.id);
  }, [tenant]);

  const loadStats = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      
      // Yeni dashboard stats fonksiyonlarını kullan
      const uyeData = await invoke<DashboardStats>('get_dashboard_stats', {
        tenantIdParam: tenant.id,
      });
      setUyeStats(uyeData);

      const currentYear = new Date().getFullYear();
      const aidatData = await invoke<AidatStats>('get_aidat_stats', {
        tenantIdParam: tenant.id,
        yil: currentYear,
      });
      setAidatStats(aidatData);

      const kasaData = await invoke<KasaStats>('get_kasa_stats', {
        tenantIdParam: tenant.id,
      });
      setKasaStats(kasaData);
      
      // Güncel kurları yükle
      try {
        const kurData = await invoke<GuncelKur[]>('get_guncel_kurlar', {
          tenantIdParam: tenant.id,
        });
        setGuncelKurlar(kurData);
      } catch {
        // Kur henüz tanımlı değilse sessizce geç
      }
      
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

  if (!tenant) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Tenant Bulunamadı</h2>
          <p className="text-yellow-700 mb-4">Sistemde aktif bir dernek/organizasyon bulunamadı.</p>
          <p className="text-sm text-yellow-600">Lütfen oturumu kapatıp yeniden giriş yapın veya ilk kurulumu tamamlayın.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Genel bakış ve özet bilgiler</p>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <div 
          onClick={() => navigate('/uyeler')}
          className="card-macos cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-600">Toplam Üye</div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-semibold text-gray-900">{uyeStats.total_uyeler}</div>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="text-green-600 font-medium">Aktif: {uyeStats.aktif_uyeler}</span>
            <span className="text-gray-500">Pasif: {uyeStats.pasif_uyeler}</span>
          </div>
        </div>

        {kasaStats && (
          <div 
            onClick={() => navigate('/mali/kasalar')}
            className="card-macos cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-600">Toplam Bakiye</div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <Wallet className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-gray-900">
              {kasaStats.toplam_bakiye.toFixed(2)} ₺
            </div>
            <div className="mt-3 text-sm text-gray-500 font-medium">
              {kasaStats.kasa_sayisi} aktif kasa
            </div>
          </div>
        )}

        {kasaStats && (
          <div 
            onClick={() => navigate('/mali/gelirler')}
            className="card-macos cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-600">Toplam Gelir</div>
              <div className="p-3 bg-green-50 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-green-600">
              {kasaStats.toplam_gelir.toFixed(2)} ₺
            </div>
            <div className="mt-3 text-sm text-gray-500 font-medium">
              Tüm zamanlar
            </div>
          </div>
        )}

        {kasaStats && (
          <div 
            onClick={() => navigate('/mali/giderler')}
            className="card-macos cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-600">Toplam Gider</div>
              <div className="p-3 bg-red-50 rounded-xl">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-semibold text-red-600">
              {kasaStats.toplam_gider.toFixed(2)} ₺
            </div>
            <div className="mt-3 text-sm text-gray-500 font-medium">
              Tüm zamanlar
            </div>
          </div>
        )}
      </div>

      {/* Güncel Kurlar Kartı */}
      {guncelKurlar.length > 0 && (
        <div className="card-macos p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Güncel Kurlar</h2>
            <button 
              onClick={() => navigate('/mali/kurlar')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Kur Yönetimi →
            </button>
          </div>
          <div className="flex items-center gap-6">
            {guncelKurlar.map((kur) => (
              <div key={`${kur.para_birimi}-${kur.hedef_para_birimi}`} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                <div className={`p-2 rounded-lg ${kur.para_birimi === 'USD' ? 'bg-green-100' : 'bg-blue-100'}`}>
                  {kur.para_birimi === 'USD' 
                    ? <DollarSign className="h-5 w-5 text-green-600" />
                    : <Euro className="h-5 w-5 text-blue-600" />
                  }
                </div>
                <div>
                  <div className="text-sm text-gray-500">{kur.para_birimi}/{kur.hedef_para_birimi}</div>
                  <div className="text-lg font-bold text-gray-900">{kur.kur_degeri.toFixed(4)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {aidatStats && (
        <div className="card-macos p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Aidat Özeti ({new Date().getFullYear()})
            </h2>
            <button 
              onClick={() => navigate('/aidat')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Detaylar →
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-600">Toplam Tutar</div>
              <div className="text-2xl font-semibold text-gray-900 mt-2">
                {aidatStats.toplam_tutar.toFixed(2)} ₺
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Ödenen</div>
              <div className="text-2xl font-semibold text-green-600 mt-2">
                {aidatStats.toplam_odenen.toFixed(2)} ₺
              </div>
              <div className="text-xs text-gray-500 mt-1 font-medium">
                {aidatStats.odenen_adet} kayıt
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Kalan</div>
              <div className="text-2xl font-semibold text-red-600 mt-2">
                {aidatStats.toplam_kalan.toFixed(2)} ₺
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Geciken</div>
              <div className="text-2xl font-semibold text-orange-600 mt-2">
                {aidatStats.geciken_adet}
              </div>
              <div className="text-xs text-gray-500 mt-1 font-medium">kayıt</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-2.5 rounded-full transition-all duration-500"
                style={{ 
                  width: `${aidatStats.toplam_tutar > 0 
                    ? (aidatStats.toplam_odenen / aidatStats.toplam_tutar) * 100 
                    : 0}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span className="font-medium">Tahsilat Oranı</span>
              <span className="font-semibold">
                {aidatStats.toplam_tutar > 0 
                  ? ((aidatStats.toplam_odenen / aidatStats.toplam_tutar) * 100).toFixed(1) 
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="card-macos p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hızlı Eylemler</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/uyeler/create')}
              className="w-full text-left px-4 py-3 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:from-blue-100 hover:to-blue-100 rounded-xl transition-all duration-200 border border-blue-100"
            >
              <div className="font-semibold text-blue-900">Yeni Üye Ekle</div>
              <div className="text-sm text-blue-600 mt-0.5">Üye kayıt formu</div>
            </button>
            <button
              onClick={() => navigate('/aidat')}
              className="w-full text-left px-4 py-3 bg-gradient-to-br from-green-50 to-green-100/50 hover:from-green-100 hover:to-green-100 rounded-xl transition-all duration-200 border border-green-100"
            >
              <div className="font-semibold text-green-900">Aidat Kaydı</div>
              <div className="text-sm text-green-600 mt-0.5">Yeni aidat tanımla</div>
            </button>
            <button
              onClick={() => navigate('/mali/kasalar')}
              className="w-full text-left px-4 py-3 bg-gradient-to-br from-purple-50 to-purple-100/50 hover:from-purple-100 hover:to-purple-100 rounded-xl transition-all duration-200 border border-purple-100"
            >
              <div className="font-semibold text-purple-900">Mali İşlem</div>
              <div className="text-sm text-purple-600 mt-0.5">Gelir/Gider kaydı</div>
            </button>
          </div>
        </div>

        <div className="card-macos p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sistem Durumu</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Veritabanı</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                Bağlı
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Mod</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                LOCAL
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Bekleyen Senkronizasyon</span>
              <span className="flex items-center text-sm">
                <Cloud className="h-4 w-4 mr-1.5 text-gray-400" />
                <span className="text-gray-900 font-semibold">{pendingChanges}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Son Senkronizasyon</span>
              <span className="text-sm text-gray-500 flex items-center font-medium">
                <Clock className="h-4 w-4 mr-1.5" />
                {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString('tr-TR') : 'Henüz yok'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardIndexPage;
