import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { useAuthStore } from '@/store/authStore';
import { Download, Users, TrendingUp, CheckCircle } from 'lucide-react';

interface UyeStats {
  total: number;
  aktif: number;
  pasif: number;
  beklemede: number;
}

export const RaporlarUyelerPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  const [stats, setStats] = React.useState<UyeStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    if (tenant) {
      loadStats();
    }
  }, [tenant]);

  const loadStats = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      
      const [aktif, pasif, beklemede] = await Promise.all([
        invoke<number>('count_uyeler', { tenantIdParam: tenant.id, durum: 'aktif' }),
        invoke<number>('count_uyeler', { tenantIdParam: tenant.id, durum: 'pasif' }),
        invoke<number>('count_uyeler', { tenantIdParam: tenant.id, durum: 'beklemede' }),
      ]);
      
      setStats({
        total: aktif + pasif + beklemede,
        aktif,
        pasif,
        beklemede,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);

      const filePath = await save({
        title: 'Üyeler Raporunu Kaydet',
        defaultPath: `uyeler_raporu_${new Date().toISOString().split('T')[0]}.csv`,
        filters: [{
          name: 'CSV',
          extensions: ['csv']
        }]
      });

      if (!filePath) {
        setExporting(false);
        return;
      }

      const result = await invoke('export_uyeler_csv', {
        tenantIdParam: tenant?.id,
        destination: filePath,
      });

      alert('✅ Üyeler raporu başarıyla dışa aktarıldı');
    } catch (error) {
      alert(`❌ Hata: ${error}`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Üyeler Raporu</h1>
          <p className="text-gray-600 mt-1">Üye istatistikleri ve dışa aktarım</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {exporting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              Dışa Aktarılıyor...
            </>
          ) : (
            <>
              <Download className="h-5 w-5 mr-2" />
              CSV İndir
            </>
          )}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Toplam Üye</div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Aktif</div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.aktif}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.total > 0 ? ((stats.aktif / stats.total) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Pasif</div>
              <TrendingUp className="h-8 w-8 text-gray-600" />
            </div>
            <div className="text-3xl font-bold text-gray-600">{stats.pasif}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.total > 0 ? ((stats.pasif / stats.total) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Beklemede</div>
              <Users className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="text-3xl font-bold text-yellow-600">{stats.beklemede}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.total > 0 ? ((stats.beklemede / stats.total) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rapor İçeriği</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            Üye No
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            Ad Soyad
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            Telefon
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            Email
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            Durum (Aktif/Pasif/Beklemede)
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            Üyelik Tipi (Asil/Onursal/Fahri)
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaporlarUyelerPage;
