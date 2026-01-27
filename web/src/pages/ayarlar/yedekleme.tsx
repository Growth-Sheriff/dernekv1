import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { Download, Upload, Database, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface BackupInfo {
  total_tables: number;
  total_records: number;
  size_mb: number;
  last_backup: string | null;
}

export const AyarlarYedeklemePage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  const [backupInfo, setBackupInfo] = React.useState<BackupInfo | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{type: 'success' | 'error', text: string} | null>(null);

  React.useEffect(() => {
    loadBackupInfo();
  }, []);

  const loadBackupInfo = async () => {
    // Simulated backup info
    setBackupInfo({
      total_tables: 12,
      total_records: 15423,
      size_mb: 45.3,
      last_backup: localStorage.getItem('last_backup_date'),
    });
  };

  const handleBackup = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // Select save location
      const filePath = await save({
        title: 'Yedek Dosyasını Kaydet',
        defaultPath: `bader_backup_${new Date().toISOString().split('T')[0]}.db`,
        filters: [{
          name: 'Database',
          extensions: ['db']
        }]
      });

      if (!filePath) {
        setLoading(false);
        return;
      }

      // Create backup (simulated - in real app would use Tauri command)
      await invoke('create_backup', { 
        tenantIdParam: tenant?.id,
        backupDir: filePath,
      });

      localStorage.setItem('last_backup_date', new Date().toISOString());
      await loadBackupInfo();

      setMessage({
        type: 'success',
        text: 'Yedekleme başarıyla tamamlandı'
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Yedekleme hatası: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm('⚠️ Dikkat! Mevcut veriler silinecek ve yedekten geri yüklenecek. Devam etmek istiyor musunuz?')) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      // Select backup file
      const selected = await open({
        title: 'Yedek Dosyasını Seç',
        multiple: false,
        filters: [{
          name: 'Database',
          extensions: ['db']
        }]
      });

      if (!selected || typeof selected !== 'string') {
        setLoading(false);
        return;
      }

      // Restore backup (simulated - in real app would use Tauri command)
      await invoke('restore_backup', { 
        tenantIdParam: tenant?.id,
        source: selected,
      });

      setMessage({
        type: 'success',
        text: 'Geri yükleme başarıyla tamamlandı. Lütfen uygulamayı yeniden başlatın.'
      });

      // Reload after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Geri yükleme hatası: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Yedekleme ve Geri Yükleme</h1>
        <p className="text-gray-600 mt-1">Veritabanı yedekleme işlemleri</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-start space-x-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {backupInfo && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Database className="h-6 w-6 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Veritabanı Bilgileri</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Toplam Tablo</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {backupInfo.total_tables}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Toplam Kayıt</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {backupInfo.total_records.toLocaleString('tr-TR')}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Veritabanı Boyutu</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {backupInfo.size_mb.toFixed(1)} MB
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Son Yedekleme</div>
              <div className="text-lg font-semibold text-gray-900 mt-1">
                {backupInfo.last_backup 
                  ? new Date(backupInfo.last_backup).toLocaleDateString('tr-TR')
                  : 'Henüz yok'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Download className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Yedek Al</h2>
          </div>

          <p className="text-gray-600 mb-6">
            Tüm veritabanını yedekleyin. Yedek dosyasını güvenli bir konumda saklayın.
          </p>

          <button
            onClick={handleBackup}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Yedekleniyor...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Yedek Al
              </>
            )}
          </button>

          <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
            <strong>Not:</strong> Yedekleme sırasında uygulama kullanılabilir durumda kalır.
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Upload className="h-6 w-6 text-orange-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Geri Yükle</h2>
          </div>

          <p className="text-gray-600 mb-6">
            Daha önce alınmış bir yedek dosyasından veritabanını geri yükleyin.
          </p>

          <button
            onClick={handleRestore}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Geri Yükleniyor...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Geri Yükle
              </>
            )}
          </button>

          <div className="mt-4 p-3 bg-red-50 rounded text-sm text-red-800">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
              <div>
                <strong>⚠️ Dikkat!</strong> Geri yükleme işlemi mevcut tüm verileri silecektir. 
                İşlem geri alınamaz.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">Yedekleme Önerileri</h3>
        <ul className="space-y-1 text-sm text-yellow-800">
          <li>• Düzenli olarak (haftalık/aylık) yedek alın</li>
          <li>• Yedek dosyalarını farklı konumlarda saklayın (harici disk, cloud)</li>
          <li>• Önemli işlemlerden önce mutlaka yedek alın</li>
          <li>• Geri yükleme yapmadan önce mevcut veritabanını yedekleyin</li>
          <li>• Yedek dosyalarının bütünlüğünü düzenli olarak test edin</li>
        </ul>
      </div>
    </div>
  );
};

export default AyarlarYedeklemePage;
