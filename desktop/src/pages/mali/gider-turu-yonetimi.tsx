import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Trash2, Tag, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';

interface GiderTuru {
  id: string;
  ad: string;
  kod?: string;
  aciklama?: string;
  varsayilan_fatura_prefix?: string;
}

export const GiderTuruYonetimiPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  const [turler, setTurler] = useState<GiderTuru[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTur, setEditingTur] = useState<GiderTuru | null>(null);
  const [formData, setFormData] = useState({
    ad: '',
    kod: '',
    aciklama: '',
    varsayilan_fatura_prefix: '',
  });

  useEffect(() => {
    if (tenant) loadTurler();
  }, [tenant]);

  const loadTurler = async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      const result = await invoke<GiderTuru[]>('get_gider_turleri', {
        tenantIdParam: tenant.id,
      });
      setTurler(result);
    } catch (error) {
      console.error('Failed to load gider türleri:', error);
      alert('Gider türleri yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingTur(null);
    setFormData({ ad: '', kod: '', aciklama: '', varsayilan_fatura_prefix: '' });
    setShowForm(true);
  };

  const openEditForm = (tur: GiderTuru) => {
    setEditingTur(tur);
    setFormData({
      ad: tur.ad,
      kod: tur.kod || '',
      aciklama: tur.aciklama || '',
      varsayilan_fatura_prefix: tur.varsayilan_fatura_prefix || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!tenant) return;
    if (!formData.ad.trim()) {
      alert('Lütfen tür adını giriniz!');
      return;
    }

    try {
      if (editingTur) {
        // Update existing
        await invoke('update_gider_turu', {
          tenantIdParam: tenant.id,
          giderTuruId: editingTur.id,
          data: {
            ad: formData.ad,
            kod: formData.kod || null,
            aciklama: formData.aciklama || null,
            varsayilan_fatura_prefix: formData.varsayilan_fatura_prefix || null,
          },
        });
        alert('Gider türü başarıyla güncellendi!');
      } else {
        // Create new
        await invoke('create_gider_turu', {
          tenantIdParam: tenant.id,
          data: {
            ad: formData.ad,
            kod: formData.kod || null,
            aciklama: formData.aciklama || null,
            varsayilan_fatura_prefix: formData.varsayilan_fatura_prefix || null,
          },
        });
        alert('Gider türü başarıyla oluşturuldu!');
      }
      
      setFormData({ ad: '', kod: '', aciklama: '', varsayilan_fatura_prefix: '' });
      setShowForm(false);
      setEditingTur(null);
      loadTurler();
    } catch (error) {
      console.error('Failed to save gider turu:', error);
      alert('Gider türü kaydedilemedi: ' + error);
    }
  };

  const handleDelete = async (id: string, ad: string) => {
    if (!tenant) return;
    if (!confirm(`"${ad}" türünü silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await invoke('delete_gider_turu', {
        tenantIdParam: tenant.id,
        giderTuruId: id,
      });
      loadTurler();
      alert('Gider türü silindi!');
    } catch (error) {
      console.error('Failed to delete gider turu:', error);
      alert('Gider türü silinemedi: ' + error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Gider Türleri Yönetimi</h1>
          <p className="text-gray-600 mt-1">Gider kategorilerini tanımlayın</p>
        </div>
        <button
          onClick={openCreateForm}
          className="btn-macos bg-red-600 hover:bg-red-700 flex items-center gap-2"
        >
          <Plus size={20} />
          <span>Yeni Tür Ekle</span>
        </button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTur ? 'Gider Türünü Düzenle' : 'Yeni Gider Türü'}</DialogTitle>
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
                  placeholder="Örn: Kira, Elektrik, Maaş"
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
                  placeholder="Örn: KIRA, ELEKTRIK"
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
                placeholder="Gider türü açıklaması"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Varsayılan Fatura Prefix</label>
              <input
                type="text"
                value={formData.varsayilan_fatura_prefix}
                onChange={(e) => setFormData({ ...formData, varsayilan_fatura_prefix: e.target.value.toUpperCase() })}
                className="input-macos"
                placeholder="Örn: KRA, ELE, MAS"
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
                className="btn-macos bg-red-600 hover:bg-red-700"
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fatura Prefix</th>
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
                    Henüz gider türü yok
                  </td>
                </tr>
              ) : (
                turler.map((tur) => (
                  <tr key={tur.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center space-x-2">
                      <Tag size={16} className="text-red-600" />
                      <span>{tur.ad}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                        {tur.kod || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-mono">
                        {tur.varsayilan_fatura_prefix || '-'}
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

export default GiderTuruYonetimiPage;
