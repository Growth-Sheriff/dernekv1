import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { useAuthStore } from '@/store/authStore';
import { Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface KasaOzet {
  toplam_bakiye: number;
  toplam_gelir: number;
  toplam_gider: number;
  kasa_sayisi: number;
}

export const RaporlarMaliPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  const [baslangic, setBaslangic] = React.useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [bitis, setBitis] = React.useState(
    new Date().toISOString().split('T')[0]
  );
  const [stats, setStats] = React.useState<KasaOzet | null>(null);
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
      const data = await invoke<KasaOzet>('get_kasa_ozet', {
        tenantIdParam: tenant.id,
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
        title: 'Mali Raporu Kaydet',
        defaultPath: `mali_raporu_${baslangic}_${bitis}.csv`,
        filters: [{
          name: 'CSV',
          extensions: ['csv']
        }]
      });

      if (!filePath) {
        setExporting(false);
        return;
      }

      await invoke('export_mali_raporu_csv', {
        tenantIdParam: tenant?.id,
        baslangic,
        bitis,
        destination: filePath,
      });

      alert('✅ Mali rapor başarıyla dışa aktarıldı');
    } catch (error) {
      alert(`❌ Hata: ${error}`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

  const netSonuc = stats ? stats.toplam_gelir - stats.toplam_gider : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mali Rapor</h1>
          <p className="text-gray-600 mt-1">Gelir-gider özeti ve detaylı rapor</p>
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

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tarih Aralığı</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={baslangic}
              onChange={(e) => setBaslangic(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={bitis}
              onChange={(e) => setBitis(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Toplam Gelir</div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-600">
                {stats.toplam_gelir.toFixed(2)} ₺
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Toplam Gider</div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-600">
                {stats.toplam_gider.toFixed(2)} ₺
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Net Sonuç</div>
                <DollarSign className={`h-8 w-8 ${netSonuc >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
              <div className={`text-3xl font-bold ${netSonuc >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {netSonuc.toFixed(2)} ₺
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Toplam Bakiye</div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-600">
                {stats.toplam_bakiye.toFixed(2)} ₺
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.kasa_sayisi} kasa
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gelir/Gider Dağılımı</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Gelir Oranı</span>
                  <span className="font-semibold text-green-600">
                    {stats.toplam_gelir > 0 && (stats.toplam_gelir + stats.toplam_gider) > 0
                      ? ((stats.toplam_gelir / (stats.toplam_gelir + stats.toplam_gider)) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-600 h-3 rounded-full transition-all"
                    style={{ 
                      width: `${(stats.toplam_gelir + stats.toplam_gider) > 0
                        ? (stats.toplam_gelir / (stats.toplam_gelir + stats.toplam_gider)) * 100
                        : 0}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Gider Oranı</span>
                  <span className="font-semibold text-red-600">
                    {stats.toplam_gider > 0 && (stats.toplam_gelir + stats.toplam_gider) > 0
                      ? ((stats.toplam_gider / (stats.toplam_gelir + stats.toplam_gider)) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-red-600 h-3 rounded-full transition-all"
                    style={{ 
                      width: `${(stats.toplam_gelir + stats.toplam_gider) > 0
                        ? (stats.toplam_gider / (stats.toplam_gelir + stats.toplam_gider)) * 100
                        : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rapor İçeriği</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div>📅 Tarih</div>
          <div>📊 İşlem Türü (Gelir/Gider)</div>
          <div>🏷️ Kategori</div>
          <div>📝 Açıklama</div>
          <div>💰 Tutar</div>
          <div>🏦 Kasa Adı</div>
        </div>
      </div>
    </div>
  );
};

export default RaporlarMaliPage;
