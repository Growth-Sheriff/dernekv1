import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Wallet, TrendingUp, TrendingDown, Pencil, Trash2, Eye, Landmark, Banknote, X, Save } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Kasa {
  id: string;
  kasa_adi: string;
  bakiye: number;
  para_birimi: string;
  kasa_tipi?: string;
  banka_adi?: string;
  iban?: string;
  sube?: string;
  hesap_no?: string;
  is_active: boolean;
  created_at: string;
}

interface KasaOzet {
  toplam_bakiye: number;
  toplam_gelir: number;
  toplam_gider: number;
  kasa_sayisi: number;
}

const kasaTipleri = ['Nakit', 'Banka', 'Kredi Kartı', 'Diğer'];

export const KasalarPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [kasalar, setKasalar] = React.useState<Kasa[]>([]);
  const [ozet, setOzet] = React.useState<KasaOzet | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [editingKasa, setEditingKasa] = React.useState<Kasa | null>(null);
  const [formData, setFormData] = React.useState({
    kasa_adi: '',
    para_birimi: 'TRY',
    kasa_tipi: 'Nakit',
    banka_adi: '',
    iban: '',
    sube: '',
    hesap_no: '',
  });

  React.useEffect(() => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    loadKasalar();
    loadOzet();
  }, [tenant]);

  const loadKasalar = async () => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const result = await invoke<Kasa[]>('get_kasalar', {
        tenantIdParam: tenant.id,
      });
      setKasalar(result);
    } catch (error) {
      console.error('Failed to load kasalar:', error);
      alert('Kasalar yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const loadOzet = async () => {
    if (!tenant) return;
    
    try {
      const result = await invoke<KasaOzet>('get_kasa_ozet', {
        tenantIdParam: tenant.id,
      });
      setOzet(result);
    } catch (error) {
      console.error('Failed to load ozet:', error);
    }
  };

  const handleOpenCreate = () => {
    setEditingKasa(null);
    setFormData({
      kasa_adi: '',
      para_birimi: 'TRY',
      kasa_tipi: 'Nakit',
      banka_adi: '',
      iban: '',
      sube: '',
      hesap_no: '',
    });
    setShowModal(true);
  };

  const handleEdit = (kasa: Kasa) => {
    setEditingKasa(kasa);
    setFormData({
      kasa_adi: kasa.kasa_adi,
      para_birimi: kasa.para_birimi,
      kasa_tipi: kasa.kasa_tipi || 'Nakit',
      banka_adi: kasa.banka_adi || '',
      iban: kasa.iban || '',
      sube: kasa.sube || '',
      hesap_no: kasa.hesap_no || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    try {
      if (editingKasa) {
        await invoke('update_kasa', {
          tenantIdParam: tenant.id,
          id: editingKasa.id,
          request: {
            kasa_adi: formData.kasa_adi,
            para_birimi: formData.para_birimi,
          },
        });
      } else {
        await invoke('create_kasa', {
          tenantIdParam: tenant.id,
          data: {
            kasa_adi: formData.kasa_adi,
            para_birimi: formData.para_birimi,
          },
        });
      }
      
      setShowModal(false);
      setEditingKasa(null);
      setFormData({ kasa_adi: '', para_birimi: 'TRY', kasa_tipi: 'Nakit', banka_adi: '', iban: '', sube: '', hesap_no: '' });
      await loadKasalar();
      await loadOzet();
    } catch (error) {
      console.error('Failed to save kasa:', error);
      alert('Kasa kaydedilemedi: ' + error);
    }
  };

  const handleDelete = async (kasaId: string) => {
    if (!tenant) return;
    
    if (!confirm('Bu kasayı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await invoke('delete_kasa', {
        tenantIdParam: tenant.id,
        id: kasaId,
      });
      
      await loadKasalar();
      await loadOzet();
    } catch (error) {
      console.error('Failed to delete kasa:', error);
      alert('Kasa silinemedi: ' + error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  const getKasaTipiIcon = (tip?: string) => {
    switch (tip) {
      case 'Banka': return <Landmark className="h-8 w-8 text-blue-600" />;
      case 'Kredi Kartı': return <Wallet className="h-8 w-8 text-purple-600" />;
      default: return <Banknote className="h-8 w-8 text-green-600" />;
    }
  };

  const getKasaTipiBg = (tip?: string) => {
    switch (tip) {
      case 'Banka': return 'bg-blue-100';
      case 'Kredi Kartı': return 'bg-purple-100';
      default: return 'bg-green-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kasalar</h1>
          <p className="text-gray-600 mt-1">Kasa yönetimi ve bakiye takibi</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn-macos flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Yeni Kasa
        </button>
      </div>

      {ozet && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Toplam Bakiye</div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {formatCurrency(ozet.toplam_bakiye)}
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Toplam Gelir</div>
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-green-600 mt-2">
              {formatCurrency(ozet.toplam_gelir)}
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Toplam Gider</div>
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-red-600 mt-2">
              {formatCurrency(ozet.toplam_gider)}
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Aktif Kasa</div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Wallet className="h-5 w-5 text-gray-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {ozet.kasa_sayisi}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : kasalar.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz kasa yok</h3>
          <p className="text-gray-600 mb-4">İlk kasanızı oluşturarak başlayın</p>
          <button onClick={handleOpenCreate} className="btn-macos">
            <Plus className="h-5 w-5 inline mr-2" />
            Yeni Kasa Oluştur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {kasalar.map((kasa) => (
            <div
              key={kasa.id}
              className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{kasa.kasa_adi}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                      {kasa.kasa_tipi || 'Nakit'}
                    </span>
                    {kasa.banka_adi && (
                      <span className="text-xs text-gray-500">{kasa.banka_adi}</span>
                    )}
                  </div>
                </div>
                <div className={`p-2 rounded-lg ${getKasaTipiBg(kasa.kasa_tipi)}`}>
                  {getKasaTipiIcon(kasa.kasa_tipi)}
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-600 mb-1">Bakiye</div>
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(kasa.bakiye)}
                </div>
              </div>

              {kasa.iban && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 break-all">
                  {kasa.iban}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                <button
                  onClick={() => navigate(`/mali/kasa-detay/${kasa.id}`)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Detay"
                >
                  <Eye className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleEdit(kasa)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Düzenle"
                >
                  <Pencil className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(kasa.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Sil"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingKasa ? 'Kasa Düzenle' : 'Yeni Kasa'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kasa Adı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.kasa_adi}
                    onChange={(e) => setFormData({ ...formData, kasa_adi: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Örn: Ana Kasa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kasa Tipi
                  </label>
                  <select
                    value={formData.kasa_tipi}
                    onChange={(e) => setFormData({ ...formData, kasa_tipi: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {kasaTipleri.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Para Birimi
                </label>
                <select
                  value={formData.para_birimi}
                  onChange={(e) => setFormData({ ...formData, para_birimi: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TRY">TRY - Türk Lirası</option>
                  <option value="USD">USD - Amerikan Doları</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>

              {formData.kasa_tipi === 'Banka' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Banka Adı
                      </label>
                      <input
                        type="text"
                        value={formData.banka_adi}
                        onChange={(e) => setFormData({ ...formData, banka_adi: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Örn: Ziraat Bankası"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Şube
                      </label>
                      <input
                        type="text"
                        value={formData.sube}
                        onChange={(e) => setFormData({ ...formData, sube: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Şube adı veya kodu"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IBAN
                    </label>
                    <input
                      type="text"
                      value={formData.iban}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="TR00 0000 0000 0000 0000 0000 00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hesap No
                    </label>
                    <input
                      type="text"
                      value={formData.hesap_no}
                      onChange={(e) => setFormData({ ...formData, hesap_no: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Hesap numarası"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn-macos flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingKasa ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KasalarPage;
