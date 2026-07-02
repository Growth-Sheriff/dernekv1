import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { useLicenseStore } from '@/store/licenseStore';
import { Building2, RefreshCw, Key, Cloud, ShieldCheck, Wrench } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface AidatTutarlilikSorunu {
  aidat_id: string;
  uye_id: string;
  yil: number;
  tutar: number;
  kayitli_odenen: number;
  gelirlerden_hesaplanan: number;
  fark: number;
  durum: string;
  onarildi: boolean;
}

export const AyarlarGenelPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  const user = useAuthStore((state) => state.user);
  const license = useLicenseStore((state) => state.license);
  const mode = useLicenseStore((state) => state.mode);
  const { isSyncing, pendingChanges, lastSyncAt, triggerManualSync, loadSyncStatus } = useSyncStore();

  // Veri Tutarlılığı state
  const [tutarlilikSonuclar, setTutarlilikSonuclar] = React.useState<AidatTutarlilikSorunu[] | null>(null);
  const [tutarlilikLoading, setTutarlilikLoading] = React.useState(false);
  const [showOnarConfirm, setShowOnarConfirm] = React.useState(false);
  const [uyeAdlari, setUyeAdlari] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (tenant) {
      loadSyncStatus(tenant.id);
    }
  }, [tenant]);

  const handleManualSync = async () => {
    if (!tenant) return;
    
    const apiUrl = 'http://localhost:5283';
    const token = useAuthStore.getState().token || '';
    
    await triggerManualSync(tenant.id, apiUrl, token);
  };

  const runTutarlilikKontrolu = async (onar: boolean) => {
    if (!tenant) return;
    try {
      setTutarlilikLoading(true);

      // Üye adlarını haritala (uye_id → ad_soyad)
      if (Object.keys(uyeAdlari).length === 0) {
        try {
          const uyeler = await invoke<{ id: string; ad_soyad: string }[]>('get_uyeler', {
            tenantIdParam: tenant.id,
          });
          setUyeAdlari(Object.fromEntries(uyeler.map(u => [u.id, u.ad_soyad])));
        } catch (error) {
          console.error('Üyeler yüklenemedi:', error);
        }
      }

      const result = await invoke<AidatTutarlilikSorunu[]>('check_aidat_gelir_tutarliligi', {
        tenantIdParam: tenant.id,
        onar,
      });
      setTutarlilikSonuclar(result);
    } catch (error) {
      console.error('Tutarlılık denetimi başarısız:', error);
      alert('Tutarlılık denetimi başarısız: ' + error);
    } finally {
      setTutarlilikLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Genel Ayarlar</h1>
        <p className="text-gray-600 mt-1">Sistem ayarları ve yapılandırma</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Dernek Bilgileri</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dernek Adı</label>
              <input
                type="text"
                value={tenant?.name || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                value={tenant?.slug || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı</label>
              <input
                type="text"
                value={user?.full_name || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Key className="h-6 w-6 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Lisans Bilgileri</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mod</label>
              <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-blue-900 font-semibold">{mode}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-900 font-semibold">{license?.plan || 'LOCAL'}</span>
              </div>
            </div>

            {license?.expires_at && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Son Geçerlilik</label>
                <input
                  type="text"
                  value={new Date(license.expires_at).toLocaleDateString('tr-TR')}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Cloud className="h-6 w-6 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Senkronizasyon</h2>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing || mode === 'LOCAL'}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Senkronize Ediliyor...' : 'Manuel Senkronizasyon'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Bekleyen Değişiklik</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{pendingChanges}</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Son Senkronizasyon</div>
              <div className="text-sm text-gray-900 mt-1">
                {lastSyncAt ? new Date(lastSyncAt).toLocaleString('tr-TR') : 'Henüz yok'}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Durum</div>
              <div className="text-sm font-semibold text-green-600 mt-1">
                {mode === 'LOCAL' ? 'Offline' : 'Online'}
              </div>
            </div>
          </div>

          {mode === 'LOCAL' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Not:</strong> LOCAL modda senkronizasyon devre dışıdır.
                ONLINE veya HYBRID moda geçmek için lisans ayarlarınızı güncelleyin.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="h-6 w-6 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">Veri Tutarlılığı</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => runTutarlilikKontrolu(false)}
                disabled={tutarlilikLoading}
                className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ShieldCheck className={`h-4 w-4 mr-2 ${tutarlilikLoading ? 'animate-pulse' : ''}`} />
                {tutarlilikLoading ? 'Denetleniyor...' : 'Aidat-Gelir Tutarlılığını Denetle'}
              </button>
              {tutarlilikSonuclar !== null && tutarlilikSonuclar.length > 0 && (
                <button
                  onClick={() => setShowOnarConfirm(true)}
                  disabled={tutarlilikLoading}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Onar (gelir kayıtlarını esas al)
                </button>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Aidat kayıtlarındaki "ödenen" tutarlar ile gelir kayıtlarından hesaplanan tutarları karşılaştırır.
            Onarım, gelir kayıtlarını esas alarak aidat kayıtlarını günceller.
          </p>

          {tutarlilikSonuclar !== null && tutarlilikSonuclar.length === 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800">Tutarsızlık bulunamadı ✓</p>
            </div>
          )}

          {tutarlilikSonuclar !== null && tutarlilikSonuclar.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Üye</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Yıl</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Kayıtlı Ödenen</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Gelirlerden Hesaplanan</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Fark</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Durum</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Onarıldı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {tutarlilikSonuclar.map((s) => (
                    <tr key={s.aidat_id}>
                      <td className="px-4 py-2 text-gray-900">{uyeAdlari[s.uye_id] || s.uye_id}</td>
                      <td className="px-4 py-2 text-gray-700">{s.yil}</td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {s.kayitli_odenen.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {s.gelirlerden_hesaplanan.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-red-600">
                        {s.fark.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="px-4 py-2 text-gray-700">{s.durum}</td>
                      <td className="px-4 py-2">
                        {s.onarildi ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">Onarıldı</span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Hayır</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showOnarConfirm}
        onOpenChange={setShowOnarConfirm}
        title="Tutarsızlıkları Onar"
        description="Aidat kayıtlarındaki 'ödenen' tutarlar, gelir kayıtlarından hesaplanan değerlerle güncellenecek. Gelir kaydı bulunmayan manuel ödemelere dokunulmaz. Devam etmek istiyor musunuz?"
        confirmText="Onar"
        cancelText="İptal"
        variant="danger"
        onConfirm={() => runTutarlilikKontrolu(true)}
      />
    </div>
  );
};

export default AyarlarGenelPage;
