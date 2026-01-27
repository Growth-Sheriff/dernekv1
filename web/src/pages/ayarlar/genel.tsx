import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { useLicenseStore } from '@/store/licenseStore';
import { Building2, RefreshCw, Key, Cloud } from 'lucide-react';

export const AyarlarGenelPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  const user = useAuthStore((state) => state.user);
  const license = useLicenseStore((state) => state.license);
  const mode = useLicenseStore((state) => state.mode);
  const { isSyncing, pendingChanges, lastSyncAt, triggerManualSync, loadSyncStatus } = useSyncStore();

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
      </div>
    </div>
  );
};

export default AyarlarGenelPage;
