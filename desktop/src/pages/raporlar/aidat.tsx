import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { useAuthStore } from '@/store/authStore';
import { Download, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface AidatOzet {
  toplam_tutar: number;
  toplam_odenen: number;
  toplam_kalan: number;
  odenen_adet: number;
  geciken_adet: number;
}

export const RaporlarAidatPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [stats, setStats] = React.useState<AidatOzet | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  React.useEffect(() => {
    if (tenant) {
      loadStats();
    }
  }, [tenant, selectedYear]);

  const loadStats = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      const data = await invoke<AidatOzet>('get_aidat_ozet', {
        tenantIdParam: tenant.id,
        yil: selectedYear,
      });
      setStats(data);
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
        title: 'Aidat Raporunu Kaydet',
        defaultPath: `aidat_raporu_${selectedYear}.csv`,
        filters: [{
          name: 'CSV',
          extensions: ['csv']
        }]
      });

      if (!filePath) {
        setExporting(false);
        return;
      }

      await invoke('export_aidat_raporu_csv', {
        tenantIdParam: tenant?.id,
        yil: selectedYear,
        destination: filePath,
      });

      alert('✅ Aidat raporu başarıyla dışa aktarıldı');
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
          <h1 className="text-2xl font-bold text-gray-900">Aidat Raporu</h1>
          <p className="text-gray-600 mt-1">Yıllık aidat tahsilat özeti</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
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
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Toplam Tutar</div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.toplam_tutar.toFixed(2)} ₺
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Tahsil Edilen</div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-600">
                {stats.toplam_odenen.toFixed(2)} ₺
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.odenen_adet} kayıt
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Kalan Borç</div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-600">
                {stats.toplam_kalan.toFixed(2)} ₺
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <Clock className="h-6 w-6 text-orange-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Geciken Ödeme</h2>
              </div>
              <div className="text-4xl font-bold text-orange-600">
                {stats.geciken_adet}
              </div>
              <div className="text-sm text-gray-500 mt-1">kayıt</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <TrendingUp className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Tahsilat Oranı</h2>
              </div>
              <div className="text-4xl font-bold text-blue-600">
                {stats.toplam_tutar > 0 
                  ? ((stats.toplam_odenen / stats.toplam_tutar) * 100).toFixed(1)
                  : 0}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ 
                    width: `${stats.toplam_tutar > 0 
                      ? (stats.toplam_odenen / stats.toplam_tutar) * 100 
                      : 0}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rapor İçeriği</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            Üye No ve Ad Soyad
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            Yıl
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            Aidat Tutarı
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            Ödenen Tutar
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            Kalan Borç
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            Durum (Ödendi/Kısmi/Gecikti)
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaporlarAidatPage;
