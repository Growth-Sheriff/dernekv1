import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DollarSign, Plus, Save, Trash2, Pencil, X, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const UYE_TURLERI = ['Asil', 'Onursal', 'Fahri', 'Kurumsal'] as const;

interface AidatTanimi {
  id: string;
  yil: number;
  uye_turu?: string;
  tutar: number;
  gecikme_faiz_orani?: number;
  aciklama?: string;
}

export const AidatTanimPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  
  const [tanimlar, setTanimlar] = React.useState<AidatTanimi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    yil: new Date().getFullYear().toString(),
    uye_turu: 'Asil',
    tutar: '',
    gecikme_faiz_orani: '',
    aciklama: '',
  });

  React.useEffect(() => {
    if (tenant) {
      loadData();
    }
  }, [tenant]);

  const loadData = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      const result = await invoke<AidatTanimi[]>('get_aidat_tanimlari', {
        tenantIdParam: tenant.id,
      });
      setTanimlar(result);
    } catch (error) {
      console.error('Failed to load aidat tanimlari:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant || !form.yil || !form.tutar) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }
    
    try {
      await invoke('set_aidat_tanimi', {
        tenantIdParam: tenant.id,
        yil: parseInt(form.yil),
        tutar: parseFloat(form.tutar),
        gecikmeFaizOrani: form.gecikme_faiz_orani ? parseFloat(form.gecikme_faiz_orani) : null,
        aciklama: form.aciklama || null,
        uyeTuru: form.uye_turu,
      });
      toast.success('Aidat tanımı kaydedildi');
      setShowModal(false);
      setEditingId(null);
      setForm({
        yil: new Date().getFullYear().toString(),
        uye_turu: 'Asil',
        tutar: '',
        gecikme_faiz_orani: '',
        aciklama: '',
      });
      loadData();
    } catch (error) {
      console.error('Failed to save aidat tanimi:', error);
      toast.error('Aidat tanımı kaydedilemedi: ' + error);
    }
  };

  const handleEdit = (tanim: AidatTanimi) => {
    setEditingId(tanim.id);
    setForm({
      yil: tanim.yil.toString(),
      uye_turu: tanim.uye_turu || 'Asil',
      tutar: tanim.tutar.toString(),
      gecikme_faiz_orani: tanim.gecikme_faiz_orani?.toString() || '',
      aciklama: tanim.aciklama || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, yil: number) => {
    if (!tenant) return;
    if (!confirm(`${yil} yılı aidat tanımını silmek istediğinize emin misiniz?`)) return;
    
    try {
      await invoke('delete_aidat_tanimi', {
        tenantIdParam: tenant.id,
        aidatTanimiId: id,
      });
      toast.success('Aidat tanımı silindi');
      loadData();
    } catch (error) {
      console.error('Failed to delete aidat tanimi:', error);
      toast.error('Aidat tanımı silinemedi: ' + error);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '₺0';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Aidat Tanımları</h1>
          <p className="text-gray-600 mt-1">Yıllık aidat tutarlarını ve gecikme faizlerini belirleyin</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({
              yil: new Date().getFullYear().toString(),
              uye_turu: 'Asil',
              tutar: '',
              gecikme_faiz_orani: '',
              aciklama: '',
            });
            setShowModal(true);
          }}
          className="btn-macos flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Yeni Aidat Tanımı
        </button>
      </div>

      {/* Bilgi Kartı */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800">
              <strong>Üye Türü Bazlı Fiyatlandırma:</strong> Her yıl için farklı üye türlerine (Asil, Onursal, Fahri, Kurumsal) 
              ayrı ayrı aidat tutarı tanımlayabilirsiniz. Toplu aidat işlemlerinde üyenin türüne göre ilgili tutar kullanılır.
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Gecikme faiz oranı, ödeme tarihini geçen aidatlara uygulanır.
            </p>
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Yıl</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Üye Türü</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Aidat Tutarı</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Gecikme Faizi (%)</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Açıklama</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tanimlar.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Henüz aidat tanımı oluşturulmamış
                </td>
              </tr>
            ) : (
              tanimlar.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-bold text-lg">{t.yil}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      t.uye_turu === 'Asil' ? 'bg-blue-100 text-blue-700' :
                      t.uye_turu === 'Onursal' ? 'bg-purple-100 text-purple-700' :
                      t.uye_turu === 'Fahri' ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {t.uye_turu || 'Asil'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    {formatCurrency(t.tutar)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.gecikme_faiz_orani ? `%${t.gecikme_faiz_orani}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {t.aciklama || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(t)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Düzenle"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.yil)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                {editingId ? 'Aidat Tanımı Düzenle' : 'Yeni Aidat Tanımı'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yıl <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.yil}
                    onChange={(e) => setForm({ ...form, yil: e.target.value })}
                    min="2000"
                    max="2100"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Üye Türü <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.uye_turu}
                    onChange={(e) => setForm({ ...form, uye_turu: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {UYE_TURLERI.map((tur) => (
                      <option key={tur} value={tur}>{tur}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aidat Tutarı (₺) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={form.tutar}
                  onChange={(e) => setForm({ ...form, tutar: e.target.value })}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gecikme Faiz Oranı (%)
                </label>
                <input
                  type="number"
                  value={form.gecikme_faiz_orani}
                  onChange={(e) => setForm({ ...form, gecikme_faiz_orani: e.target.value })}
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={form.aciklama}
                  onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                  rows={2}
                  placeholder="Opsiyonel açıklama"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                className="btn-macos flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AidatTanimPage;
