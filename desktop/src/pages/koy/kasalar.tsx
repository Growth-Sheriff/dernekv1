import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Wallet, Pencil, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface KoyKasa {
  id: string;
  kasa_adi: string;
  para_birimi: string;
  bakiye: number;
  aciklama?: string;
  is_active: boolean;
  created_at: string;
}

export const KoyKasalarPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  
  const [kasalar, setKasalar] = React.useState<KoyKasa[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<KoyKasa | null>(null);
  
  // Form state
  const [kasaAdi, setKasaAdi] = React.useState<string>('');
  const [paraBirimi, setParaBirimi] = React.useState<string>('TL');
  const [aciklama, setAciklama] = React.useState<string>('');

  React.useEffect(() => {
    if (!tenant) return;
    loadKasalar();
  }, [tenant]);

  const loadKasalar = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      const result = await invoke<KoyKasa[]>('get_koy_kasalar', {
        tenantIdParam: tenant.id,
      });
      setKasalar(result);
    } catch (error) {
      console.error('Failed to load koy kasalar:', error);
      alert('Köy kasaları yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    
    if (!kasaAdi) {
      alert('Lütfen kasa adı girin');
      return;
    }
    
    try {
      await invoke('create_koy_kasa', {
        tenantIdParam: tenant.id,
        data: {
          kasa_adi: kasaAdi,
          para_birimi: paraBirimi,
          aciklama: aciklama || null,
        },
      });
      
      alert('Köy kasası oluşturuldu!');
      setShowForm(false);
      
      // Form sıfırla
      setKasaAdi('');
      setParaBirimi('TL');
      setAciklama('');
      
      loadKasalar();
    } catch (error) {
      console.error('Kasa oluşturulamadı:', error);
      alert('Kasa oluşturulamadı: ' + error);
    }
  };

  const handleEdit = (kasa: KoyKasa) => {
    setEditingItem(kasa);
    setKasaAdi(kasa.kasa_adi);
    setParaBirimi(kasa.para_birimi);
    setAciklama(kasa.aciklama || '');
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !editingItem) return;
    
    if (!kasaAdi) {
      alert('Lütfen kasa adı girin');
      return;
    }
    
    try {
      await invoke('update_koy_kasa', {
        tenantIdParam: tenant.id,
        kasaId: editingItem.id,
        data: {
          kasa_adi: kasaAdi,
          para_birimi: paraBirimi,
          aciklama: aciklama || null,
        },
      });
      
      alert('Köy kasası güncellendi!');
      setShowEditModal(false);
      setEditingItem(null);
      
      // Form sıfırla
      setKasaAdi('');
      setParaBirimi('TL');
      setAciklama('');
      
      loadKasalar();
    } catch (error) {
      console.error('Kasa güncellenemedi:', error);
      alert('Kasa güncellenemedi: ' + error);
    }
  };

  const handleDelete = async (kasaId: string) => {
    if (!tenant) return;
    
    if (!confirm('Bu kasayı silmek istediğinizden emin misiniz?')) return;
    
    try {
      await invoke('delete_koy_kasa', {
        tenantIdParam: tenant.id,
        kasaId,
      });
      
      alert('Köy kasası silindi!');
      loadKasalar();
    } catch (error) {
      console.error('Kasa silinemedi:', error);
      alert('Kasa silinemedi: ' + error);
    }
  };

  const toplamBakiye = kasalar.reduce((sum, k) => sum + k.bakiye, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Köy Kasaları</h1>
          <p className="text-gray-500 mt-1.5">Köy kasaları ve bakiye yönetimi</p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="btn-macos flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Kasa</span>
        </button>
      </div>

      {/* Kasa Ekleme Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Köy Kasası</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kasa Adı *</label>
              <input
                type="text"
                value={kasaAdi}
                onChange={(e) => setKasaAdi(e.target.value)}
                className="input-macos"
                placeholder="Ör: Köy Ana Kasa, Tarımsal Kasa"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Para Birimi *</label>
              <select
                value={paraBirimi}
                onChange={(e) => setParaBirimi(e.target.value)}
                className="input-macos"
                required
              >
                <option value="TL">TL (Türk Lirası)</option>
                <option value="USD">USD (Dolar)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={3}
                className="input-macos resize-none"
                placeholder="Kasa hakkında notlar..."
              />
            </div>
            
            <DialogFooter>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-macos-secondary"
              >
                İptal
              </button>
              <button type="submit" className="btn-macos">
                Kaydet
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Kasa Düzenleme Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Köy Kasasını Düzenle</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdate} className="space-y-6 px-6 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kasa Adı *</label>
              <input
                type="text"
                value={kasaAdi}
                onChange={(e) => setKasaAdi(e.target.value)}
                className="input-macos"
                placeholder="Ör: Köy Ana Kasa, Tarımsal Kasa"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Para Birimi *</label>
              <select
                value={paraBirimi}
                onChange={(e) => setParaBirimi(e.target.value)}
                className="input-macos"
                required
              >
                <option value="TL">TL (Türk Lirası)</option>
                <option value="USD">USD (Dolar)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={3}
                className="input-macos resize-none"
                placeholder="Kasa hakkında notlar..."
              />
            </div>
            
            <DialogFooter>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
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

      {/* Özet Kart */}
      <div className="card-macos p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
        <div className="text-sm font-medium text-blue-600 mb-1">Toplam Bakiye (TL)</div>
        <div className="text-3xl font-semibold text-blue-900">{toplamBakiye.toFixed(2)} ₺</div>
      </div>

      {/* Kasalar Listesi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-16 text-gray-500">
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Yükleniyor...</span>
            </div>
          </div>
        ) : kasalar.length === 0 ? (
          <div className="col-span-3 text-center py-16">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">Henüz köy kasası yok</p>
            <p className="text-xs text-gray-400 mt-1">Yukarıdaki butonu kullanarak ekleyebilirsiniz</p>
          </div>
        ) : (
          kasalar.map((kasa) => (
            <div
              key={kasa.id}
              className="card-macos p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {kasa.kasa_adi}
                  </h3>
                  {kasa.aciklama && (
                    <p className="text-sm text-gray-500">{kasa.aciklama}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(kasa)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Düzenle"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(kasa.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-4">
                <div className="text-sm text-gray-500 mb-1">Bakiye</div>
                <div className="text-2xl font-bold text-gray-900">
                  {kasa.bakiye.toFixed(2)}
                  <span className="text-sm text-gray-600 ml-2">{kasa.para_birimi}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-400">
                  Oluşturulma: {new Date(kasa.created_at).toLocaleDateString('tr-TR')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default KoyKasalarPage;
