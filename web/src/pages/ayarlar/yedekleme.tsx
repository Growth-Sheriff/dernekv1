import React from 'react';
import { Download, Upload, Database, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

// Mock veya API'den gelen veriler
interface BackupInfo {
  total_tables: number;
  total_records: number;
  size_mb: number;
  last_backup: string | null;
}

export const AyarlarYedeklemePage: React.FC = () => {
  const { tenant, token } = useAuthStore();
  const [backupInfo, setBackupInfo] = React.useState<BackupInfo | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);

  React.useEffect(() => {
    // API'den istatistik çekme simülasyonu
    setBackupInfo({
      total_tables: 8,
      total_records: 120, // Örnek
      size_mb: 0.5,
      last_backup: localStorage.getItem('last_backup_date'),
    });
  }, []);

  const handleBackup = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // Backend Export URL
      // Doğrudan indirme başlatır. Token'ı query param veya header ile (fetch ile blob) göndermek lazım.
      // fetch ile yapıp blob olarak indirelim.

      const response = await fetch('http://localhost:8000/api/v1/backup/export', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Yedek alma başarısız oldu');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bader_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      localStorage.setItem('last_backup_date', new Date().toISOString());

      setMessage({
        type: 'success',
        text: 'Yedekleme dosyası indirildi (JSON Formatında).'
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Yedekleme ve Geri Yükleme</h1>
        <p className="text-muted-foreground mt-1">Verilerinizi güvene alın veya geri yükleyin.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-start space-x-3 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Backup Stats */}
      {backupInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Veritabanı Durumu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Toplam Tablo</div>
                <div className="text-2xl font-bold mt-1">
                  {backupInfo.total_tables}
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Toplam Kayıt</div>
                <div className="text-2xl font-bold mt-1">
                  {backupInfo.total_records.toLocaleString('tr-TR')}
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Veritabanı Boyutu</div>
                <div className="text-2xl font-bold mt-1">
                  ~{backupInfo.size_mb.toFixed(1)} MB
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Son Yedekleme</div>
                <div className="text-lg font-semibold mt-1">
                  {backupInfo.last_backup
                    ? new Date(backupInfo.last_backup).toLocaleDateString('tr-TR')
                    : 'Henüz yok'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export / Backup */}
        <Card className="border-blue-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Download className="h-5 w-5" />
              Yedek Al (Export)
            </CardTitle>
            <CardDescription>
              Tüm verilerinizi JSON formatında dışa aktarın ve bilgisayarınıza indirin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleBackup}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "İndiriliyor..." : "Yedeği İndir"}
            </Button>
            <div className="mt-4 text-xs text-blue-800 bg-blue-50 p-3 rounded">
              <strong>Bilgi:</strong> İndirilen dosya <code>.json</code> formatındadır ve başka bir sisteme aktarılabilir.
            </div>
          </CardContent>
        </Card>

        {/* Restore (Disabled for Web) */}
        <Card className="opacity-75 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-500">
              <Upload className="h-5 w-5" />
              Geri Yükle (Import)
            </CardTitle>
            <CardDescription>
              Yedekten geri yükleme işlemi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled variant="outline" className="w-full cursor-not-allowed">
              Sadece Desktop Uygulamasında
            </Button>
            <div className="mt-4 text-xs text-yellow-800 bg-yellow-50 p-3 rounded">
              <strong>Uyarı:</strong> Güvenlik nedeniyle Web arayüzünden veritabanı geri yükleme işlemi yapılamaz. Lütfen Desktop uygulamasını kullanın.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">Yedekleme Önerileri</h3>
        <ul className="space-y-1 text-sm text-yellow-800">
          <li>• Düzenli olarak (haftalık/aylık) yedek alın</li>
          <li>• Yedek dosyalarını farklı konumlarda saklayın (harici disk, cloud)</li>
          <li>• Yedek dosyalarının bütünlüğünü düzenli olarak test edin</li>
        </ul>
      </div>
    </div>
  );
};

export default AyarlarYedeklemePage;
