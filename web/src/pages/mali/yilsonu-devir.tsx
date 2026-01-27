import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Calendar, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface DevirOnizleme {
  kasa_id: string;
  kasa_adi: string;
  para_birimi: string;
  onceki_devir: number;
  toplam_gelir: number;
  toplam_gider: number;
  virman_net: number;
  fiziksel_bakiye: number;
  tahakkuk_tutari: number;
  serbest_bakiye: number;
  yeni_devir: number;
}

export const YilSonuDevirPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  
  const [yil, setYil] = React.useState<number>(new Date().getFullYear());
  const [onizleme, setOnizleme] = React.useState<DevirOnizleme[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [aciklama, setAciklama] = React.useState<string>('');

  const loadOnizleme = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      const result = await invoke<DevirOnizleme[]>('get_devir_onizleme', {
        tenantIdParam: tenant.id,
        yil,
      });
      setOnizleme(result);
    } catch (error) {
      console.error('Failed to load devir onizleme:', error);
      alert('Devir önizleme yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleUygula = async () => {
    if (!tenant) return;
    
    if (!aciklama.trim()) {
      alert('Lütfen açıklama giriniz');
      return;
    }
    
    const confirmMsg = `${yil} yılı devir işlemini onaylıyor musunuz?\n\n` +
      `Bu işlem:\n` +
      `- Tüm kasa bakiyelerini yeni yıla taşıyacak\n` +
      `- Gelir/gider/virman sayaçlarını sıfırlayacak\n` +
      `- Bu işlem GERİ ALINAMAZ!\n\n` +
      `Devam etmek istiyor musunuz?`;
    
    if (!window.confirm(confirmMsg)) {
      return;
    }
    
    try {
      setLoading(true);
      await invoke('uygula_yil_sonu_devir', {
        tenantIdParam: tenant.id,
        data: {
          yil,
          aciklama: aciklama.trim(),
        },
      });
      
      alert(`${yil} yılı devir işlemi başarıyla tamamlandı!`);
      
      // Reset
      setShowConfirm(false);
      setAciklama('');
      
      // Reload with next year
      setYil(yil + 1);
      setTimeout(() => loadOnizleme(), 500);
    } catch (error) {
      console.error('Failed to apply devir:', error);
      alert('Devir işlemi başarısız: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const toplamDevir = onizleme.reduce((sum, k) => sum + k.yeni_devir, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yıl Sonu Devir İşlemi</h1>
          <p className="text-gray-600 mt-1">Kasa bakiyelerini yeni yıla aktarın</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-800">Önemli Uyarı</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Yıl sonu devir işlemi, mevcut yılın tüm kasa bakiyelerini yeni yıla taşır. 
              Bu işlem sonrası gelir/gider/virman sayaçları sıfırlanır ve GERİ ALINAMAZ!
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Devir Yılı
            </label>
            <select
              value={yil}
              onChange={(e) => setYil(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
          
          <div className="pt-6">
            <button
              onClick={loadOnizleme}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Yükleniyor...' : 'Önizleme'}
            </button>
          </div>
        </div>

        {onizleme.length > 0 && (
          <>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600">Toplam Yeni Devir Tutarı</div>
              <div className="text-2xl font-bold text-blue-700">{toplamDevir.toFixed(2)} ₺</div>
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kasa</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Önceki Devir</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gelir</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gider</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Virman Net</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fiziksel Bakiye</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tahakkuk</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Yeni Devir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {onizleme.map((kasa) => (
                    <tr key={kasa.kasa_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {kasa.kasa_adi}
                        <span className="text-gray-500 ml-2 text-xs">({kasa.para_birimi})</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {kasa.onceki_devir.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">
                        +{kasa.toplam_gelir.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">
                        -{kasa.toplam_gider.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right ${kasa.virman_net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {kasa.virman_net >= 0 ? '+' : ''}{kasa.virman_net.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-700">
                        {kasa.fiziksel_bakiye.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-orange-600">
                        {kasa.tahakkuk_tutari.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-blue-900 bg-blue-50">
                        {kasa.yeni_devir.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!showConfirm ? (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowConfirm(true)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Devir İşlemini Uygula</span>
                </button>
              </div>
            ) : (
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">Devir İşlemi Onayı</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Açıklama (Zorunlu)
                  </label>
                  <textarea
                    value={aciklama}
                    onChange={(e) => setAciklama(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder={`${yil} yılı devir işlemi - ...`}
                  />
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-800">Son Uyarı</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Bu işlem sonrası:
                      </p>
                      <ul className="text-sm text-red-700 mt-2 list-disc list-inside space-y-1">
                        <li>Tüm kasaların devir_bakiye değeri güncellenir</li>
                        <li>Gelir/gider/virman sayaçları sıfırlanır</li>
                        <li>Fiziksel bakiye = Yeni devir tutarı olur</li>
                        <li>İşlem GERİ ALINAMAZ</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleUygula}
                    disabled={loading || !aciklama.trim()}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'İşleniyor...' : 'Onayla ve Uygula'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && onizleme.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Önizleme için yukarıdaki butona tıklayın
          </div>
        )}
      </div>
    </div>
  );
};

export default YilSonuDevirPage;
