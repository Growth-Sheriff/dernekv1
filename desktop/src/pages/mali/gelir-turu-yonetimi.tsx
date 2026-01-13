import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Trash2, Tag, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';

interface GelirTuru {
  id: string;
  ad: string;
  kod?: string;
  aciklama?: string;
  varsayilan_makbuz_prefix?: string;
}

export const GelirTuruYonetimiPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  const [turler, setTurler] = useState<GelirTuru[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTur, setEditingTur] = useState<GelirTuru | null>(null);
  const [formData, setFormData] = useState({
    ad: '',
    kod: '',
    aciklama: '',
    varsayilan_makbuz_prefix: '',
  });

  useEffect(() => {
    if (tenant) {
      loadTurler();
    }
  }, [tenant]);

  const loadTurler = async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      const result = await invoke<GelirTuru[]>('get_gelir_turleri', {
        tenantIdParam: tenant.id,
      });
      setTurler(result);
    } catch (error) {
      console.error('Failed to load gelir türleri:', error);
      alert('Gelir türleri yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingTur(null);
    setFormData({ ad: '', kod: '', aciklama: '', varsayilan_makbuz_prefix: '' });
    setShowForm(true);
  };

  const openEditForm = (tur: GelirTuru) => {
    setEditingTur(tur);
    setFormData({
      ad: tur.ad,
      kod: tur.kod || '',
      aciklama: tur.aciklama || '',
      varsayilan_makbuz_prefix: tur.varsayilan_makbuz_prefix || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.ad.trim()) {
      alert('Lütfen tür adını giriniz!');
      return;
    }

    try {
      if (editingTur) {
        // Update existing
        await invoke('update_gelir_turu', {
          tenantIdParam: tenant!.id,
          gelirTuruId: editingTur.id,
          data: {
            ad: formData.ad,
            kod: formData.kod || null,
            aciklama: formData.aciklama || null,
            varsayilan_makbuz_prefix: formData.varsayilan_makbuz_prefix || null,
          },
        });
        alert('Gelir türü başarıyla güncellendi!');
      } else {
        // Create new
        await invoke('create_gelir_turu', {
          tenantIdParam: tenant!.id,
          data: {
            ad: formData.ad,
            kod: formData.kod || null,
            aciklama: formData.aciklama || null,
            varsayilan_makbuz_prefix: formData.varsayilan_makbuz_prefix || null,
          },
        });
        alert('Gelir türü başarıyla oluşturuldu!');
      }
      
      setFormData({ ad: '', kod: '', aciklama: '', varsayilan_makbuz_prefix: '' });
      setShowForm(false);
      setEditingTur(null);
      loadTurler();
    } catch (error) {
      console.error('Failed to save gelir turu:', error);
      alert('Gelir türü kaydedilemedi: ' + error);
    }
  };

  const handleDelete = async (id: string, ad: string) => {
    if (!confirm(`"${ad}" türünü silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await invoke('delete_gelir_turu', {
        tenantIdParam: tenant!.id,
        gelirTuruId: id,
      });
      loadTurler();
      alert('Gelir türü silindi!');
    } catch (error) {
      console.error('Failed to delete gelir turu:', error);
      alert('Gelir türü silinemedi: ' + error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Gelir Türleri Yönetimi</h1>
          <p className="text-gray-600 mt-1">Gelir kategorilerini tanımlayın</p>
        </div>
        <button
          onClick={openCreateForm}
          className="btn-macos flex items-center gap-2"
        >
          <Plus size={20} />
          <span>Yeni Tür Ekle</span>
        </button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTur ? 'Gelir Türünü Düzenle' : 'Yeni Gelir Türü'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tür Adı *</label>
                <input
                  type="text"
                  value={formData.ad}
                  onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                  className="input-macos"
                  placeholder="Örn: Bağış, Aidat, Faiz Geliri"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kod</label>
                <input
                  type="text"
                  value={formData.kod}
                  onChange={(e) => setFormData({ ...formData, kod: e.target.value.toUpperCase() })}
                  className="input-macos"
                  placeholder="Örn: BAGIS, AIDAT"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
              <textarea
                value={formData.aciklama}
                onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                className="input-macos"
                rows={2}
                placeholder="Gelir türü açıklaması"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Varsayılan Makbuz Prefix</label>
              <input
                type="text"
                value={formData.varsayilan_makbuz_prefix}
                onChange={(e) => setFormData({ ...formData, varsayilan_makbuz_prefix: e.target.value.toUpperCase() })}
                className="input-macos"
                placeholder="Örn: BGS, AID, FIZ"
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
              <button
                type="submit"
                className="btn-macos"
              >
                Kaydet
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="card-macos">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tür Adı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kod</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Makbuz Prefix</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : turler.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Henüz gelir türü yok
                  </td>
                </tr>
              ) : (
                turler.map((tur) => (
                  <tr key={tur.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center space-x-2">
                      <Tag size={16} className="text-green-600" />
                      <span>{tur.ad}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                        {tur.kod || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-mono">
                        {tur.varsayilan_makbuz_prefix || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {tur.aciklama || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditForm(tur)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Düzenle"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(tur.id, tur.ad)}
                          className="text-red-600 hover:text-red-800"
                          title="Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GelirTuruYonetimiPage;
