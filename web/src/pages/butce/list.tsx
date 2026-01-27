import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Plus, TrendingUp, TrendingDown, DollarSign, Pencil, Trash2, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Butce {
  id: string;
  yil: number;
  kategori: string;
  alt_kategori?: string;
  donem?: string;
  planlanan_gelir?: number;
  planlanan_gider?: number;
  gerceklesen_gelir?: number;
  gerceklesen_gider?: number;
  notlar?: string;
}

export const ButceListPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [butceler, setButceler] = React.useState<Butce[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Butce | null>(null);
  const [formData, setFormData] = React.useState({
    yil: new Date().getFullYear(),
    kategori: 'GENEL',
    alt_kategori: '',
    donem: 'Yıllık',
    planlanan_gelir: '',
    planlanan_gider: '',
    notlar: '',
  });

  React.useEffect(() => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    loadButceler();
  }, [tenant]);

  const loadButceler = async () => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const result = await invoke<Butce[]>('get_butceler', {
        tenantIdParam: tenant.id,
        skip: 0,
        limit: 100,
      });
      setButceler(result);
    } catch (error) {
      console.error('Failed to load butceler:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateButce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    try {
      await invoke('create_butce', {
        tenantIdParam: tenant.id,
        data: {
          yil: formData.yil,
          kategori: formData.kategori,
          alt_kategori: formData.alt_kategori || null,
          donem: formData.donem || null,
          planlanan_gelir: parseFloat(formData.planlanan_gelir) || 0,
          planlanan_gider: parseFloat(formData.planlanan_gider) || 0,
          notlar: formData.notlar || null,
        },
      });
      toast.success('Bütçe başarıyla oluşturuldu!');
      setShowCreateModal(false);
      setFormData({
        yil: new Date().getFullYear(),
        kategori: 'GENEL',
        alt_kategori: '',
        donem: 'Yıllık',
        planlanan_gelir: '',
        planlanan_gider: '',
        notlar: '',
      });
      loadButceler();
    } catch (error) {
      console.error('Failed to create butce:', error);
      toast.error('Bütçe oluşturulamadı: ' + error);
    }
  };

  const handleEdit = (butce: Butce) => {
    setEditingItem(butce);
    setFormData({
      yil: butce.yil,
      kategori: butce.kategori,
      alt_kategori: butce.alt_kategori || '',
      donem: butce.donem || 'Yıllık',
      planlanan_gelir: butce.planlanan_gelir?.toString() || '',
      planlanan_gider: butce.planlanan_gider?.toString() || '',
      notlar: butce.notlar || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !editingItem) return;

    try {
      await invoke('update_butce', {
        tenantIdParam: tenant.id,
        butceId: editingItem.id,
        data: {
          yil: formData.yil,
          kategori: formData.kategori,
          alt_kategori: formData.alt_kategori || null,
          donem: formData.donem || null,
          planlanan_gelir: parseFloat(formData.planlanan_gelir) || 0,
          planlanan_gider: parseFloat(formData.planlanan_gider) || 0,
          notlar: formData.notlar || null,
        },
      });
      toast.success('Bütçe başarıyla güncellendi!');
      setShowEditModal(false);
      setEditingItem(null);
      loadButceler();
    } catch (error) {
      console.error('Failed to update butce:', error);
      toast.error('Bütçe güncellenemedi: ' + error);
    }
  };

  const handleDelete = async (butceId: string) => {
    if (!tenant) return;
    
    if (!confirm('Bu bütçeyi silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      await invoke('delete_butce', {
        tenantIdParam: tenant.id,
        butceId,
      });
      
      toast.success('Bütçe başarıyla silindi!');
      loadButceler();
    } catch (error) {
      console.error('Bütçe silinemedi:', error);
      toast.error('Bütçe silinemedi: ' + error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bütçe Yönetimi"
        description="Dernek bütçelerini planlayın ve takip edin"
        icon={Wallet}
        actions={
          <Button onClick={() => navigate('/butce/create')}>
            <Plus className="h-5 w-5 mr-2" />
            Yeni Bütçe
          </Button>
        }
      />

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Bütçe Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateButce} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Yıl *</label>
                <input
                  type="number"
                  value={formData.yil}
                  onChange={(e) => setFormData({ ...formData, yil: parseInt(e.target.value) })}
                  className="input-macos"
                  min="2000"
                  max="2100"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori *</label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                  className="input-macos"
                  required
                >
                  <option value="GENEL">Genel</option>
                  <option value="AIDAT">Aidat</option>
                  <option value="ETKINLIK">Etkinlik</option>
                  <option value="IDARI">İdari</option>
                  <option value="YATIRIM">Yatırım</option>
                  <option value="DIGER">Diğer</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dönem</label>
                <select
                  value={formData.donem}
                  onChange={(e) => setFormData({ ...formData, donem: e.target.value })}
                  className="input-macos"
                >
                  <option value="Yıllık">Yıllık</option>
                  <option value="1. Yarıyıl">1. Yarıyıl</option>
                  <option value="2. Yarıyıl">2. Yarıyıl</option>
                  <option value="1. Çeyrek">1. Çeyrek</option>
                  <option value="2. Çeyrek">2. Çeyrek</option>
                  <option value="3. Çeyrek">3. Çeyrek</option>
                  <option value="4. Çeyrek">4. Çeyrek</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alt Kategori</label>
                <input
                  type="text"
                  value={formData.alt_kategori}
                  onChange={(e) => setFormData({ ...formData, alt_kategori: e.target.value })}
                  className="input-macos"
                  placeholder="Alt kategori"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Planlanan Gelir (TL) *</label>
                <input
                  type="number"
                  value={formData.planlanan_gelir}
                  onChange={(e) => setFormData({ ...formData, planlanan_gelir: e.target.value })}
                  className="input-macos"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Planlanan Gider (TL) *</label>
                <input
                  type="number"
                  value={formData.planlanan_gider}
                  onChange={(e) => setFormData({ ...formData, planlanan_gider: e.target.value })}
                  className="input-macos"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
              <textarea
                value={formData.notlar}
                onChange={(e) => setFormData({ ...formData, notlar: e.target.value })}
                className="input-macos"
                rows={3}
                placeholder="Bütçe açıklaması ve notlar..."
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bütçe Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Yıl *</label>
                <input
                  type="number"
                  value={formData.yil}
                  onChange={(e) => setFormData({ ...formData, yil: parseInt(e.target.value) })}
                  className="input-macos"
                  min="2000"
                  max="2100"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori *</label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                  className="input-macos"
                  required
                >
                  <option value="GENEL">Genel</option>
                  <option value="AIDAT">Aidat</option>
                  <option value="ETKINLIK">Etkinlik</option>
                  <option value="IDARI">İdari</option>
                  <option value="YATIRIM">Yatırım</option>
                  <option value="DIGER">Diğer</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dönem</label>
                <select
                  value={formData.donem}
                  onChange={(e) => setFormData({ ...formData, donem: e.target.value })}
                  className="input-macos"
                >
                  <option value="Yıllık">Yıllık</option>
                  <option value="1. Yarıyıl">1. Yarıyıl</option>
                  <option value="2. Yarıyıl">2. Yarıyıl</option>
                  <option value="1. Çeyrek">1. Çeyrek</option>
                  <option value="2. Çeyrek">2. Çeyrek</option>
                  <option value="3. Çeyrek">3. Çeyrek</option>
                  <option value="4. Çeyrek">4. Çeyrek</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alt Kategori</label>
                <input
                  type="text"
                  value={formData.alt_kategori}
                  onChange={(e) => setFormData({ ...formData, alt_kategori: e.target.value })}
                  className="input-macos"
                  placeholder="Alt kategori"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Planlanan Gelir (TL) *</label>
                <input
                  type="number"
                  value={formData.planlanan_gelir}
                  onChange={(e) => setFormData({ ...formData, planlanan_gelir: e.target.value })}
                  className="input-macos"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Planlanan Gider (TL) *</label>
                <input
                  type="number"
                  value={formData.planlanan_gider}
                  onChange={(e) => setFormData({ ...formData, planlanan_gider: e.target.value })}
                  className="input-macos"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
              <textarea
                value={formData.notlar}
                onChange={(e) => setFormData({ ...formData, notlar: e.target.value })}
                className="input-macos"
                rows={3}
                placeholder="Bütçe açıklaması ve notlar..."
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

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-600">Yükleniyor...</div>
        ) : butceler.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            Henüz bütçe kaydı yok. Yeni bütçe ekleyerek başlayın.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yıl</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Planlanan Gelir</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Planlanan Gider</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fark</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {butceler.map((butce) => {
                  const fark = (butce.planlanan_gelir || 0) - (butce.planlanan_gider || 0);
                  return (
                    <tr
                      key={butce.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{butce.yil}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{butce.kategori}</td>
                      <td className="px-6 py-4 text-sm text-right text-green-600 font-medium">
                        {(butce.planlanan_gelir || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-red-600 font-medium">
                        {(butce.planlanan_gider || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className={`px-6 py-4 text-sm text-right font-bold ${fark >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fark.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(butce);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Düzenle"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(butce.id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ButceListPage;
