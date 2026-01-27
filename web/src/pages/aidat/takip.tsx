import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, DollarSign, CheckCircle, XCircle, Clock, Pencil, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface AidatTakip {
  id: string;
  uye_id: string;
  uye_ad_soyad: string;
  yil: number;
  yillik_aidat_tutari: number;
  odenen_tutar: number;
  kalan_tutar: number;
  durum: string;
  son_odeme_tarihi?: string;
}

export const AidatTakipPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  
  const [aidatlar, setAidatlar] = React.useState<AidatTakip[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [yil, setYil] = React.useState<number>(new Date().getFullYear());
  const [durum, setDurum] = React.useState<string>('all');
  const [search, setSearch] = React.useState<string>('');
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<AidatTakip | null>(null);

  React.useEffect(() => {
    if (!tenant) return;
    loadAidatlar();
  }, [tenant, yil, durum]);

  const loadAidatlar = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      const result = await invoke<AidatTakip[]>('get_aidat_takip', {
        tenantIdParam: tenant.id,
        filterYil: yil,
        filterDurum: durum === 'all' ? null : durum,
        skip: 0,
        limit: 1000,
      });
      setAidatlar(result);
    } catch (error) {
      console.error('Aidat takip yüklenemedi:', error);
      alert('Aidat takip yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAidatlar = aidatlar.filter(a => 
    a.uye_ad_soyad.toLowerCase().includes(search.toLowerCase())
  );

  const toplamTutar = filteredAidatlar.reduce((sum, a) => sum + a.yillik_aidat_tutari, 0);
  const toplamOdenen = filteredAidatlar.reduce((sum, a) => sum + a.odenen_tutar, 0);
  const toplamKalan = filteredAidatlar.reduce((sum, a) => sum + a.kalan_tutar, 0);

  const getDurumBadge = (durum: string) => {
    const badges = {
      'Tamamlandı': 'bg-green-100 text-green-800',
      'Kısmen Ödendi': 'bg-yellow-100 text-yellow-800',
      'Beklemede': 'bg-red-100 text-red-800',
    };
    return badges[durum as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const handleEdit = (aidat: AidatTakip) => {
    setEditingItem(aidat);
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!tenant || !editingItem) return;

    try {
      await invoke('update_aidat_tanimlama', {
        tenantIdParam: tenant.id,
        aidatId: editingItem.id,
        yil: editingItem.yil,
        tutarYillik: editingItem.yillik_aidat_tutari,
      });
      setShowEditModal(false);
      setEditingItem(null);
      loadAidatlar();
      alert('Aidat güncellendi');
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      alert('Güncelleme hatası: ' + error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenant) return;
    if (!confirm('Bu aidatı silmek istediğinizden emin misiniz?')) return;

    try {
      await invoke('delete_aidat_tanimlama', {
        tenantIdParam: tenant.id,
        aidatId: id,
      });
      loadAidatlar();
      alert('Aidat silindi');
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Silme hatası: ' + error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aidat Takip</h1>
          <p className="text-gray-600 mt-1">Üye aidat ödemeleri takibi</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Toplam Aidat</div>
          <div className="text-2xl font-bold text-gray-900">{toplamTutar.toFixed(2)} ₺</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Toplam Ödenen</div>
          <div className="text-2xl font-bold text-green-600">{toplamOdenen.toFixed(2)} ₺</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Toplam Kalan</div>
          <div className="text-2xl font-bold text-red-600">{toplamKalan.toFixed(2)} ₺</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Ödeme Oranı</div>
          <div className="text-2xl font-bold text-blue-600">
            {toplamTutar > 0 ? ((toplamOdenen / toplamTutar) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Üye ara..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <select
                value={yil}
                onChange={(e) => setYil(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
            
            <div>
              <select
                value={durum}
                onChange={(e) => setDurum(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="Tamamlandı">Tamamlandı</option>
                <option value="Kısmen Ödendi">Kısmen Ödendi</option>
                <option value="Beklemede">Beklemede</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Üye</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yıl</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Toplam Tutar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödenen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kalan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Son Ödeme</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filteredAidatlar.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Aidat kaydı bulunamadı
                  </td>
                </tr>
              ) : (
                filteredAidatlar.map((aidat) => (
                  <tr key={aidat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {aidat.uye_ad_soyad}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {aidat.yil}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {aidat.yillik_aidat_tutari.toFixed(2)} ₺
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 font-semibold">
                      {aidat.odenen_tutar.toFixed(2)} ₺
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600 font-semibold">
                      {aidat.kalan_tutar.toFixed(2)} ₺
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDurumBadge(aidat.durum)}`}>
                        {aidat.durum}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {aidat.son_odeme_tarihi 
                        ? new Date(aidat.son_odeme_tarihi).toLocaleDateString('tr-TR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(aidat);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(aidat.id);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
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
      </div>

      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Aidat Düzenle</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Üye
                </label>
                <input
                  type="text"
                  value={editingItem.uye_ad_soyad}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yıl
                </label>
                <input
                  type="number"
                  value={editingItem.yil}
                  onChange={(e) => setEditingItem({ ...editingItem, yil: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yıllık Aidat Tutarı (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingItem.yillik_aidat_tutari}
                  onChange={(e) => setEditingItem({ ...editingItem, yillik_aidat_tutari: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Güncelle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AidatTakipPage;
