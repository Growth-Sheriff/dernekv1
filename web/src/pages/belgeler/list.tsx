import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Plus, FileText, Download, Trash2, Upload, Edit } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Belge {
  id: string;
  baslik: string;
  belge_turu: 'DEKONT' | 'FATURA' | 'MAKBUZ' | 'SÖZLEŞME' | 'TUTANAK' | 'DİĞER';
  aciklama?: string;
  dosya_adi: string;
  dosya_boyutu: number;
  dosya_yolu: string;
  created_at: string;
  updated_at: string;
  mime_type?: string;
  bagli_kayit_turu?: string;
  bagli_kayit_id?: string;
  etiketler?: string;
  resmi_durum?: string;
}

interface DownloadBelgeResponse {
  dosya_adi: string;
  mime_type: string;
  dosya_boyutu: number;
  base64_data: string;
}

export const BelgelerListPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);

  const [belgeler, setBelgeler] = React.useState<Belge[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [showEditForm, setShowEditForm] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [editingBelge, setEditingBelge] = React.useState<Belge | null>(null);

  // Form state
  const [baslik, setBaslik] = React.useState<string>('');
  const [belgeTuru, setBelgeTuru] = React.useState<string>('DEKONT');
  const [aciklama, setAciklama] = React.useState<string>('');
  const [selectedFile, setSelectedFile] = React.useState<string>('');

  React.useEffect(() => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    loadBelgeler();
  }, [tenant]);

  const loadBelgeler = async () => {
    if (!tenant) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await invoke<Belge[]>('get_belgeler', {
        tenantIdParam: tenant.id,
        skip: 0,
        limit: 100,
      });
      setBelgeler(result);
    } catch (error) {
      console.error('Failed to load belgeler:', error);
      toast.error('Belgeler yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: 'Belge Seçin',
        filters: [{
          name: 'Belgeler',
          extensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx']
        }]
      });

      if (selected && typeof selected === 'string') {
        setSelectedFile(selected);
      }
    } catch (error) {
      console.error('File selection error:', error);
      toast.error('Dosya seçilemedi: ' + error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    if (!baslik || !selectedFile) {
      toast.error('Lütfen başlık ve dosya seçin');
      return;
    }

    try {
      setUploading(true);
      // dosya_adi'ni dosya yolundan çıkar
      const dosyaAdi = selectedFile.split('/').pop() || selectedFile.split('\\').pop() || 'belge';
      await invoke('create_belge', {
        tenantIdParam: tenant.id,
        request: {
          baslik,
          belge_turu: belgeTuru,
          dosya_adi: dosyaAdi,
          aciklama: aciklama || null,
          dosya_yolu: selectedFile,
        },
      });

      toast.success('Belge başarıyla yüklendi!');
      setShowForm(false);

      // Form sıfırla
      setBaslik('');
      setBelgeTuru('DEKONT');
      setAciklama('');
      setSelectedFile('');

      loadBelgeler();
    } catch (error) {
      console.error('Belge yüklenemedi:', error);
      toast.error('Belge yüklenemedi: ' + error);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (belge: Belge) => {
    setEditingBelge(belge);
    setBaslik(belge.baslik);
    setBelgeTuru(belge.belge_turu);
    setAciklama(belge.aciklama || '');
    setShowEditForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !editingBelge) return;

    if (!baslik) {
      toast.error('Lütfen başlık girin');
      return;
    }

    try {
      await invoke('update_belge', {
        tenantIdParam: tenant.id,
        belgeId: editingBelge.id,
        request: {
          baslik,
          belge_turu: belgeTuru,
          aciklama: aciklama || null,
          dosya_adi: editingBelge.dosya_adi,
          dosya_yolu: editingBelge.dosya_yolu,
          dosya_boyutu: editingBelge.dosya_boyutu,
          mime_type: editingBelge.mime_type
        },
      });

      toast.success('Belge güncellendi!');
      setShowEditForm(false);
      setEditingBelge(null);

      // Form sıfırla
      setBaslik('');
      setBelgeTuru('DEKONT');
      setAciklama('');

      loadBelgeler();
    } catch (error) {
      console.error('Belge güncellenemedi:', error);
      toast.error('Belge güncellenemedi: ' + error);
    }
  };

  const handleDownload = async (belge: Belge) => {
    if (!tenant) return;

    try {
      const response = await invoke<DownloadBelgeResponse>('download_belge', {
        tenantIdParam: tenant.id,
        belgeId: belge.id,
      });

      // Base64'ü blob'a çevir
      const byteCharacters = atob(response.base64_data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: response.mime_type });

      // Download linki oluştur
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.dosya_adi;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Belge indirildi: ${response.dosya_adi} (${(response.dosya_boyutu / 1024).toFixed(2)} KB)`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Belge indirilemedi: ' + error);
    }
  };

  const handleDelete = async (belgeId: string) => {
    if (!tenant || !window.confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await invoke('delete_belge', {
        tenantIdParam: tenant.id,
        belgeId,
      });
      toast.success('Belge silindi');
      setBelgeler(belgeler.filter(b => b.id !== belgeId));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Belge silinemedi: ' + error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getBelgeTuruBadge = (tur: string) => {
    const colors: Record<string, string> = {
      'DEKONT': 'bg-blue-100 text-blue-800',
      'FATURA': 'bg-green-100 text-green-800',
      'MAKBUZ': 'bg-yellow-100 text-yellow-800',
      'SÖZLEŞME': 'bg-purple-100 text-purple-800',
      'TUTANAK': 'bg-orange-100 text-orange-800',
      'DİĞER': 'bg-gray-100 text-gray-800',
    };
    return colors[tur] || colors['DİĞER'];
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Belge Yönetimi"
        description="Belge yükleme, indirme ve arşivleme"
        icon={FileText}
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Belge Yükle
          </Button>
        }
      />

      {/* Belge Yükleme Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Belge Yükle</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Başlık *</label>
              <input
                type="text"
                value={baslik}
                onChange={(e) => setBaslik(e.target.value)}
                className="input-macos"
                placeholder="Belge başlığı"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Belge Türü *</label>
              <select
                value={belgeTuru}
                onChange={(e) => setBelgeTuru(e.target.value)}
                className="input-macos"
                required
              >
                <option value="DEKONT">Dekont</option>
                <option value="FATURA">Fatura</option>
                <option value="MAKBUZ">Makbuz</option>
                <option value="SÖZLEŞME">Sözleşme</option>
                <option value="TUTANAK">Tutanak</option>
                <option value="DİĞER">Diğer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dosya *</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={selectedFile}
                  readOnly
                  className="input-macos flex-1"
                  placeholder="Dosya seçilmedi"
                />
                <button
                  type="button"
                  onClick={handleSelectFile}
                  className="btn-macos-secondary flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Dosya Seç</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={3}
                className="input-macos resize-none"
                placeholder="Belge hakkında notlar..."
              />
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-macos-secondary"
                disabled={uploading}
              >
                İptal
              </button>
              <button
                type="submit"
                className="btn-macos"
                disabled={uploading}
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Yükleniyor...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Yükle
                  </span>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Belge Düzenleme Modal */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Belge Düzenle</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-6 px-6 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Başlık *</label>
              <input
                type="text"
                value={baslik}
                onChange={(e) => setBaslik(e.target.value)}
                className="input-macos"
                placeholder="Belge başlığı"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Belge Türü *</label>
              <select
                value={belgeTuru}
                onChange={(e) => setBelgeTuru(e.target.value)}
                className="input-macos"
                required
              >
                <option value="DEKONT">Dekont</option>
                <option value="FATURA">Fatura</option>
                <option value="MAKBUZ">Makbuz</option>
                <option value="SÖZLEŞME">Sözleşme</option>
                <option value="TUTANAK">Tutanak</option>
                <option value="DİĞER">Diğer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={3}
                className="input-macos resize-none"
                placeholder="Belge hakkında notlar..."
              />
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false);
                  setEditingBelge(null);
                  setBaslik('');
                  setBelgeTuru('DEKONT');
                  setAciklama('');
                }}
                className="btn-macos-secondary"
              >
                İptal
              </button>
              <button type="submit" className="btn-macos">
                Güncelle
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Belgeler Listesi */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Başlık</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Tür</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Dosya Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Boyut</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Tarih</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Yükleniyor...</span>
                      </div>
                    </td>
                  </tr>
                ) : belgeler.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-12 h-12 text-gray-300" />
                        <p className="text-sm font-medium">Henüz belge yok</p>
                        <p className="text-xs text-gray-400">Yeni belge yüklemek için yukarıdaki butonu kullanın</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  belgeler.map((belge) => (
                    <tr
                      key={belge.id}
                      className="hover:bg-gray-50/50 transition-all duration-150"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{belge.baslik}</p>
                          {belge.aciklama && (
                            <p className="text-xs text-gray-500 mt-1">{belge.aciklama}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getBelgeTuruBadge(belge.belge_turu)}`}>
                          {belge.belge_turu}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {belge.dosya_adi}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatFileSize(belge.dosya_boyutu)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(belge.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(belge)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(belge)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="İndir"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(belge.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BelgelerListPage;
