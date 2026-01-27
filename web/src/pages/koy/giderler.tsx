import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, TrendingDown, Pencil, Trash2, FileDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface KoyGider {
  id: string;
  kasa_id: string;
  kasa_adi?: string;
  tarih: string;
  gider_turu: string;
  tutar: number;
  aciklama?: string;
  created_at: string;
}

interface KoyKasa {
  id: string;
  kasa_adi: string;
  para_birimi: string;
}

export const KoyGiderlerPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  
  const [giderler, setGiderler] = React.useState<KoyGider[]>([]);
  const [kasalar, setKasalar] = React.useState<KoyKasa[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<KoyGider | null>(null);
  const [baslangic, setBaslangic] = React.useState<string>('');
  const [bitis, setBitis] = React.useState<string>('');
  
  // Form state
  const [kasaId, setKasaId] = React.useState<string>('');
  const [tarih, setTarih] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [giderTuru, setGiderTuru] = React.useState<string>('ELEKTRİK');
  const [tutar, setTutar] = React.useState<string>('');
  const [aciklama, setAciklama] = React.useState<string>('');

  React.useEffect(() => {
    if (!tenant) return;
    loadKasalar();
    loadGiderler();
  }, [tenant, baslangic, bitis]);

  const loadKasalar = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<KoyKasa[]>('get_koy_kasalar', { tenantIdParam: tenant.id });
      setKasalar(result);
      if (result.length > 0 && !kasaId) setKasaId(result[0].id);
    } catch (error) {
      console.error('Kasalar yüklenemedi:', error);
    }
  };

  const loadGiderler = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      const result = await invoke<KoyGider[]>('get_koy_giderler', {
        tenantIdParam: tenant.id,
        baslangicTarih: baslangic || null,
        bitisTarih: bitis || null,
        kasaId: null,
        skip: 0,
        limit: 100,
      });
      setGiderler(result);
    } catch (error) {
      console.error('Failed to load giderler:', error);
      alert('Köy giderleri yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    
    if (!kasaId || !tutar || !aciklama) {
      alert('Lütfen zorunlu alanları doldurun');
      return;
    }
    
    try {
      await invoke('create_koy_gider', {
        tenantIdParam: tenant.id,
        data: {
          kasa_id: kasaId,
          tarih,
          gider_turu: giderTuru,
          tutar: parseFloat(tutar),
          aciklama,
        },
      });
      
      alert('Köy gideri eklendi!');
      setShowForm(false);
      
      // Form sıfırla
      setTutar('');
      setAciklama('');
      
      loadGiderler();
    } catch (error) {
      console.error('Gider eklenemedi:', error);
      alert('Gider eklenemedi: ' + error);
    }
  };

  const handleEdit = (gider: KoyGider) => {
    setEditingItem(gider);
    setKasaId(gider.kasa_id);
    setTarih(gider.tarih);
    setGiderTuru(gider.gider_turu);
    setTutar(gider.tutar.toString());
    setAciklama(gider.aciklama || '');
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !editingItem) return;
    
    if (!kasaId || !tutar || !aciklama) {
      alert('Lütfen zorunlu alanları doldurun');
      return;
    }
    
    try {
      await invoke('update_koy_gider', {
        tenantIdParam: tenant.id,
        giderId: editingItem.id,
        data: {
          kasa_id: kasaId,
          tarih,
          gider_turu: giderTuru,
          tutar: parseFloat(tutar),
          aciklama,
        },
      });
      
      alert('Köy gideri güncellendi!');
      setShowEditModal(false);
      setEditingItem(null);
      
      // Form sıfırla
      setTutar('');
      setAciklama('');
      
      loadGiderler();
    } catch (error) {
      console.error('Gider güncellenemedi:', error);
      alert('Gider güncellenemedi: ' + error);
    }
  };

  const handleDelete = async (giderId: string) => {
    if (!tenant) return;
    
    if (!confirm('Bu gider kaydını silmek istediğinizden emin misiniz?')) return;
    
    try {
      await invoke('delete_koy_gider', {
        tenantIdParam: tenant.id,
        giderId,
      });
      
      alert('Köy gideri silindi!');
      loadGiderler();
    } catch (error) {
      console.error('Gider silinemedi:', error);
      alert('Gider silinemedi: ' + error);
    }
  };

  const handleExport = async () => {
    if (!tenant) return;
    
    try {
      const filePath = await invoke<string>('export_giderler_excel', {
        tenantIdParam: tenant.id,
        baslangicTarih: baslangic || null,
        bitisTarih: bitis || null,
      });
      alert(`Excel dosyası oluşturuldu: ${filePath}`);
    } catch (error) {
      console.error('Export başarısız:', error);
      alert('Export başarısız: ' + error);
    }
  };

  const toplam = giderler.reduce((sum, g) => sum + g.tutar, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Köy Giderleri</h1>
          <p className="text-gray-500 mt-1.5">Köy gider kayıtları ve takibi</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="btn-macos-secondary flex items-center space-x-2"
          >
            <FileDown className="w-5 h-5" />
            <span>Excel Export</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-macos flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Gider</span>
          </button>
        </div>
      </div>

      {/* Gider Ekleme Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Köy Gideri</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kasa *</label>
                <select
                  value={kasaId}
                  onChange={(e) => setKasaId(e.target.value)}
                  className="input-macos"
                  required
                >
                  <option value="">Seçiniz...</option>
                  {kasalar.map(k => (
                    <option key={k.id} value={k.id}>{k.kasa_adi} ({k.para_birimi})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gider Türü *</label>
                <select
                  value={giderTuru}
                  onChange={(e) => setGiderTuru(e.target.value)}
                  className="input-macos"
                  required
                >
                  <option value="ELEKTRİK">Elektrik</option>
                  <option value="SU">Su</option>
                  <option value="YOL BAKIM">Yol Bakım</option>
                  <option value="ALTYAPI">Altyapı</option>
                  <option value="TAMİRAT">Tamirat</option>
                  <option value="PERSONEL">Personel</option>
                  <option value="TARIM MALZEMESİ">Tarım Malzemesi</option>
                  <option value="DİĞER">Diğer</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tarih *</label>
                <input
                  type="date"
                  value={tarih}
                  onChange={(e) => setTarih(e.target.value)}
                  className="input-macos"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tutar *</label>
                <input
                  type="number"
                  step="0.01"
                  value={tutar}
                  onChange={(e) => setTutar(e.target.value)}
                  className="input-macos"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama *</label>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={3}
                className="input-macos resize-none"
                placeholder="Gider detayı..."
                required
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
              <button type="submit" className="btn-macos bg-red-600 hover:bg-red-700">
                Kaydet
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Gider Düzenleme Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Köy Giderini Düzenle</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdate} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kasa *</label>
                <select
                  value={kasaId}
                  onChange={(e) => setKasaId(e.target.value)}
                  className="input-macos"
                  required
                >
                  <option value="">Seçiniz...</option>
                  {kasalar.map(k => (
                    <option key={k.id} value={k.id}>{k.kasa_adi} ({k.para_birimi})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gider Türü *</label>
                <select
                  value={giderTuru}
                  onChange={(e) => setGiderTuru(e.target.value)}
                  className="input-macos"
                  required
                >
                  <option value="ELEKTRİK">Elektrik</option>
                  <option value="SU">Su</option>
                  <option value="YOL BAKIM">Yol Bakım</option>
                  <option value="ALTYAPI">Altyapı</option>
                  <option value="TAMİRAT">Tamirat</option>
                  <option value="PERSONEL">Personel</option>
                  <option value="TARIM MALZEMESİ">Tarım Malzemesi</option>
                  <option value="DİĞER">Diğer</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tarih *</label>
                <input
                  type="date"
                  value={tarih}
                  onChange={(e) => setTarih(e.target.value)}
                  className="input-macos"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tutar *</label>
                <input
                  type="number"
                  step="0.01"
                  value={tutar}
                  onChange={(e) => setTutar(e.target.value)}
                  className="input-macos"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama *</label>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={3}
                className="input-macos resize-none"
                placeholder="Gider detayı..."
                required
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
              <button type="submit" className="btn-macos bg-red-600 hover:bg-red-700">
                Güncelle
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filtreler ve Özet */}
      <div className="card-macos">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç</label>
              <input
                type="date"
                value={baslangic}
                onChange={(e) => setBaslangic(e.target.value)}
                className="input-macos"
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş</label>
              <input
                type="date"
                value={bitis}
                onChange={(e) => setBitis(e.target.value)}
                className="input-macos"
              />
            </div>

            <div className="pt-6">
              <div className="px-6 py-3 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-100">
                <div className="text-xs font-medium text-red-600 mb-1">Toplam Gider</div>
                <div className="text-2xl font-semibold text-red-700">{toplam.toFixed(2)} ₺</div>
              </div>
            </div>
          </div>
        </div>

        {/* Giderler Tablosu */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Tür</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Tutar</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Açıklama</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Yükleniyor...</span>
                    </div>
                  </td>
                </tr>
              ) : giderler.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <TrendingDown className="w-12 h-12 text-gray-300" />
                      <p className="text-sm font-medium">Henüz gider kaydı yok</p>
                      <p className="text-xs text-gray-400">Yeni gider eklemek için yukarıdaki butonu kullanın</p>
                    </div>
                  </td>
                </tr>
              ) : (
                giderler.map((gider) => (
                  <tr
                    key={gider.id}
                    className="hover:bg-gray-50/50 transition-all duration-150"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {new Date(gider.tarih).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        {gider.gider_turu}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-red-600">
                        -{gider.tutar.toFixed(2)} ₺
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {gider.aciklama || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(gider)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(gider.id)}
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
      </div>
    </div>
  );
};

export default KoyGiderlerPage;
