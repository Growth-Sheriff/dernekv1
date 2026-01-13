import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Calendar, Users, FileText, Pencil, Trash2, ClipboardList } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Toplanti {
  id: string;
  toplanti_tipi?: string;
  baslik: string;
  tarih: string;
  saat?: string;
  yer?: string;
  durum?: string;
  aciklama?: string;
  gundem?: string;
  katilimci_sayisi?: number;
  kararlar?: string;
  notlar?: string;
}

export const ToplantilarListPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [toplantilar, setToplantilar] = React.useState<Toplanti[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Toplanti | null>(null);
  const [formData, setFormData] = React.useState({
    toplanti_tipi: 'Yönetim Kurulu',
    baslik: '',
    aciklama: '',
    tarih: new Date().toISOString().split('T')[0],
    saat: '',
    yer: '',
    durum: 'planli',
    gundem: '',
    katilimci_sayisi: '',
    kararlar: '',
    notlar: '',
  });

  React.useEffect(() => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    loadToplantilar();
  }, [tenant]);

  const loadToplantilar = async () => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const result = await invoke<Toplanti[]>('get_toplantilar', {
        tenantIdParam: tenant.id,
        skip: 0,
        limit: 100,
      });
      setToplantilar(result);
    } catch (error) {
      console.error('Failed to load toplantilar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToplanti = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    try {
      await invoke('create_toplanti', {
        tenantIdParam: tenant.id,
        data: {
          toplanti_tipi: formData.toplanti_tipi || null,
          baslik: formData.baslik,
          aciklama: formData.aciklama || null,
          tarih: formData.tarih,
          saat: formData.saat || null,
          yer: formData.yer || null,
          durum: formData.durum || null,
          gundem: formData.gundem || null,
          katilimci_sayisi: formData.katilimci_sayisi ? parseInt(formData.katilimci_sayisi) : null,
          kararlar: formData.kararlar || null,
          notlar: formData.notlar || null,
        },
      });
      toast.success('Toplantı başarıyla oluşturuldu!');
      setShowCreateModal(false);
      setFormData({
        toplanti_tipi: 'Yönetim Kurulu',
        baslik: '',
        aciklama: '',
        tarih: new Date().toISOString().split('T')[0],
        saat: '',
        yer: '',
        durum: 'planli',
        gundem: '',
        katilimci_sayisi: '',
        kararlar: '',
        notlar: '',
      });
      loadToplantilar();
    } catch (error) {
      console.error('Failed to create toplanti:', error);
      toast.error('Toplantı oluşturulamadı: ' + error);
    }
  };

  const handleEdit = (toplanti: Toplanti) => {
    setEditingItem(toplanti);
    setFormData({
      toplanti_tipi: toplanti.toplanti_tipi || 'Yönetim Kurulu',
      baslik: toplanti.baslik,
      aciklama: toplanti.aciklama || '',
      tarih: toplanti.tarih,
      saat: toplanti.saat || '',
      yer: toplanti.yer || '',
      durum: toplanti.durum || 'planli',
      gundem: toplanti.gundem || '',
      katilimci_sayisi: toplanti.katilimci_sayisi?.toString() || '',
      kararlar: toplanti.kararlar || '',
      notlar: toplanti.notlar || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !editingItem) return;

    try {
      await invoke('update_toplanti', {
        tenantIdParam: tenant.id,
        toplantiId: editingItem.id,
        data: {
          toplanti_tipi: formData.toplanti_tipi || null,
          baslik: formData.baslik,
          aciklama: formData.aciklama || null,
          tarih: formData.tarih,
          saat: formData.saat || null,
          yer: formData.yer || null,
          durum: formData.durum || null,
          gundem: formData.gundem || null,
          katilimci_sayisi: formData.katilimci_sayisi ? parseInt(formData.katilimci_sayisi) : null,
          kararlar: formData.kararlar || null,
          notlar: formData.notlar || null,
        },
      });
      toast.success('Toplantı başarıyla güncellendi!');
      setShowEditModal(false);
      setEditingItem(null);
      loadToplantilar();
    } catch (error) {
      console.error('Failed to update toplanti:', error);
      toast.error('Toplantı güncellenemedi: ' + error);
    }
  };

  const handleDelete = async (toplantiId: string) => {
    if (!tenant) return;
    
    if (!confirm('Bu toplantıyı silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      await invoke('delete_toplanti', {
        tenantIdParam: tenant.id,
        toplantiId,
      });
      
      toast.success('Toplantı başarıyla silindi!');
      loadToplantilar();
    } catch (error) {
      console.error('Toplantı silinemedi:', error);
      toast.error('Toplantı silinemedi: ' + error);
    }
  };

  const filtered = toplantilar.filter(t => 
    t.baslik.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Toplantılar"
        description="Dernek toplantılarını yönetin"
        icon={ClipboardList}
        actions={
          <Button onClick={() => navigate('/toplantilar/create')}>
            <Plus className="h-5 w-5 mr-2" />
            Yeni Toplantı
          </Button>
        }
      />

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Toplantı Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateToplanti} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Toplantı Türü *</label>
                <select
                  value={formData.toplanti_tipi}
                  onChange={(e) => setFormData({ ...formData, toplanti_tipi: e.target.value })}
                  className="input-macos"
                  required
                >
                  <option value="Yönetim Kurulu">Yönetim Kurulu</option>
                  <option value="Genel Kurul">Genel Kurul</option>
                  <option value="Denetim Kurulu">Denetim Kurulu</option>
                  <option value="Olağan">Olağan</option>
                  <option value="Olağanüstü">Olağanüstü</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tarih *</label>
                <input
                  type="date"
                  value={formData.tarih}
                  onChange={(e) => setFormData({ ...formData, tarih: e.target.value })}
                  className="input-macos"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Başlık *</label>
              <input
                type="text"
                value={formData.baslik}
                onChange={(e) => setFormData({ ...formData, baslik: e.target.value })}
                className="input-macos"
                placeholder="Toplantı başlığı"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
              <textarea
                value={formData.aciklama}
                onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                className="input-macos"
                rows={2}
                placeholder="Toplantı açıklaması"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Saat</label>
                <input
                  type="time"
                  value={formData.saat}
                  onChange={(e) => setFormData({ ...formData, saat: e.target.value })}
                  className="input-macos"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Yer</label>
                <input
                  type="text"
                  value={formData.yer}
                  onChange={(e) => setFormData({ ...formData, yer: e.target.value })}
                  className="input-macos"
                  placeholder="Toplantı yeri"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                <select
                  value={formData.durum}
                  onChange={(e) => setFormData({ ...formData, durum: e.target.value })}
                  className="input-macos"
                >
                  <option value="planli">Planlı</option>
                  <option value="tamamlandi">Tamamlandı</option>
                  <option value="iptal">İptal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Katılımcı Sayısı</label>
                <input
                  type="number"
                  value={formData.katilimci_sayisi}
                  onChange={(e) => setFormData({ ...formData, katilimci_sayisi: e.target.value })}
                  className="input-macos"
                  placeholder="0"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gündem</label>
              <textarea
                value={formData.gundem}
                onChange={(e) => setFormData({ ...formData, gundem: e.target.value })}
                className="input-macos"
                rows={3}
                placeholder="Toplantı gündem maddeleri..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kararlar</label>
              <textarea
                value={formData.kararlar}
                onChange={(e) => setFormData({ ...formData, kararlar: e.target.value })}
                className="input-macos"
                rows={3}
                placeholder="Alınan kararlar..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
              <textarea
                value={formData.notlar}
                onChange={(e) => setFormData({ ...formData, notlar: e.target.value })}
                className="input-macos"
                rows={2}
                placeholder="Ek notlar..."
              />
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                İptal
              </Button>
              <Button type="submit">
                Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Toplantı Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Toplantı Türü *</label>
                <select
                  value={formData.toplanti_tipi}
                  onChange={(e) => setFormData({ ...formData, toplanti_tipi: e.target.value })}
                  className="input-macos"
                  required
                >
                  <option value="Yönetim Kurulu">Yönetim Kurulu</option>
                  <option value="Genel Kurul">Genel Kurul</option>
                  <option value="Denetim Kurulu">Denetim Kurulu</option>
                  <option value="Olağan">Olağan</option>
                  <option value="Olağanüstü">Olağanüstü</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tarih *</label>
                <input
                  type="date"
                  value={formData.tarih}
                  onChange={(e) => setFormData({ ...formData, tarih: e.target.value })}
                  className="input-macos"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Başlık *</label>
              <input
                type="text"
                value={formData.baslik}
                onChange={(e) => setFormData({ ...formData, baslik: e.target.value })}
                className="input-macos"
                placeholder="Toplantı başlığı"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Saat</label>
                <input
                  type="time"
                  value={formData.saat}
                  onChange={(e) => setFormData({ ...formData, saat: e.target.value })}
                  className="input-macos"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Yer</label>
                <input
                  type="text"
                  value={formData.yer}
                  onChange={(e) => setFormData({ ...formData, yer: e.target.value })}
                  className="input-macos"
                  placeholder="Toplantı yeri"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                <select
                  value={formData.durum}
                  onChange={(e) => setFormData({ ...formData, durum: e.target.value })}
                  className="input-macos"
                >
                  <option value="planli">Planlı</option>
                  <option value="tamamlandi">Tamamlandı</option>
                  <option value="iptal">İptal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Katılımcı Sayısı</label>
                <input
                  type="number"
                  value={formData.katilimci_sayisi}
                  onChange={(e) => setFormData({ ...formData, katilimci_sayisi: e.target.value })}
                  className="input-macos"
                  placeholder="0"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kararlar</label>
              <textarea
                value={formData.kararlar}
                onChange={(e) => setFormData({ ...formData, kararlar: e.target.value })}
                className="input-macos"
                rows={2}
                placeholder="Alınan kararlar..."
              />
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                İptal
              </Button>
              <Button type="submit">
                Güncelle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="p-6 space-y-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Toplantı ara..."
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />

        {loading ? (
          <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Toplantı bulunamadı</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((toplanti) => (
              <div
                key={toplanti.id}
                className="border rounded-lg p-4 hover:border-blue-500 hover:shadow-md"
              >
                <div className="flex justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`/toplantilar/${toplanti.id}`)}>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{toplanti.baslik}</h3>
                      <span className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                        {toplanti.toplanti_tipi}
                      </span>
                    </div>
                    
                    <div className="flex space-x-6 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(toplanti.tarih).toLocaleDateString('tr-TR')}</span>
                        {toplanti.saat && <span className="ml-1">- {toplanti.saat}</span>}
                      </div>
                      {toplanti.yer && (
                        <div className="flex items-center space-x-1">
                          <FileText className="h-4 w-4" />
                          <span>{toplanti.yer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(toplanti);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Düzenle"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(toplanti.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ToplantilarListPage;
