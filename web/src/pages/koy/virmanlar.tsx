import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, ArrowLeftRight, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface KoyVirman {
  id: string;
  kaynak_kasa_id: string;
  hedef_kasa_id: string;
  kaynak_kasa_adi?: string;
  hedef_kasa_adi?: string;
  tarih: string;
  tutar: number;
  aciklama?: string;
  created_at: string;
}

interface KoyKasa {
  id: string;
  kasa_adi: string;
  para_birimi: string;
}

export const KoyVirmanlarPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  
  const [virmanlar, setVirmanlar] = React.useState<KoyVirman[]>([]);
  const [kasalar, setKasalar] = React.useState<KoyKasa[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [baslangic, setBaslangic] = React.useState<string>('');
  const [bitis, setBitis] = React.useState<string>('');
  
  // Form state
  const [gonderenKasaId, setGonderenKasaId] = React.useState<string>('');
  const [alanKasaId, setAlanKasaId] = React.useState<string>('');
  const [tarih, setTarih] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [tutar, setTutar] = React.useState<string>('');
  const [aciklama, setAciklama] = React.useState<string>('');

  React.useEffect(() => {
    if (!tenant) return;
    loadKasalar();
    loadVirmanlar();
  }, [tenant, baslangic, bitis]);

  const loadKasalar = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<KoyKasa[]>('get_koy_kasalar', { tenantIdParam: tenant.id });
      setKasalar(result);
    } catch (error) {
      console.error('Kasalar yüklenemedi:', error);
    }
  };

  const loadVirmanlar = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      const result = await invoke<KoyVirman[]>('get_koy_virmanlar', {
        tenantIdParam: tenant.id,
        baslangicTarih: baslangic || null,
        bitisTarih: bitis || null,
        skip: 0,
        limit: 100,
      });
      setVirmanlar(result);
    } catch (error) {
      console.error('Failed to load virmanlar:', error);
      alert('Köy virmanları yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    
    if (!gonderenKasaId || !alanKasaId || !tutar) {
      alert('Lütfen zorunlu alanları doldurun');
      return;
    }
    
    if (gonderenKasaId === alanKasaId) {
      alert('Gönderen ve alan kasa aynı olamaz!');
      return;
    }
    
    try {
      await invoke('create_koy_virman', {
        tenantIdParam: tenant.id,
        request: {
          kaynak_kasa_id: gonderenKasaId,
          hedef_kasa_id: alanKasaId,
          tarih,
          tutar: parseFloat(tutar),
          aciklama: aciklama || null,
        },
      });
      
      alert('Köy virmanı gerçekleştirildi!');
      setShowForm(false);
      
      // Form sıfırla
      setGonderenKasaId('');
      setAlanKasaId('');
      setTutar('');
      setAciklama('');
      
      loadVirmanlar();
    } catch (error) {
      console.error('Virman eklenemedi:', error);
      alert('Virman eklenemedi: ' + error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenant) return;
    
    if (!confirm('Bu virman kaydını silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      await invoke('delete_koy_virman', {
        tenantIdParam: tenant.id,
        virmanId: id,
      });
      
      alert('Virman kaydı silindi!');
      loadVirmanlar();
    } catch (error) {
      console.error('Failed to delete virman:', error);
      alert('Virman silinemedi: ' + error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Köy Virmanları</h1>
          <p className="text-gray-500 mt-1.5">Köy kasaları arası para transferleri</p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="btn-macos flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Virman</span>
        </button>
      </div>

      {/* Virman Ekleme Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Köy Virmanı</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gönderen Kasa *</label>
                <select
                  value={gonderenKasaId}
                  onChange={(e) => setGonderenKasaId(e.target.value)}
                  className="input-macos"
                  required
                >
                  <option value="">Seçiniz...</option>
                  {kasalar.map(k => (
                    <option key={k.id} value={k.id}>{k.kasa_adi}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alan Kasa *</label>
                <select
                  value={alanKasaId}
                  onChange={(e) => setAlanKasaId(e.target.value)}
                  className="input-macos"
                  required
                >
                  <option value="">Seçiniz...</option>
                  {kasalar.filter(k => k.id !== gonderenKasaId).map(k => (
                    <option key={k.id} value={k.id}>{k.kasa_adi}</option>
                  ))}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={3}
                className="input-macos resize-none"
                placeholder="Virman sebebi..."
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
              <button type="submit" className="btn-macos bg-purple-600 hover:bg-purple-700">
                Virman Yap
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filtreler */}
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
          </div>
        </div>

        {/* Virmanlar Tablosu */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Gönderen</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">→</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Alan</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Tutar</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Açıklama</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Yükleniyor...</span>
                    </div>
                  </td>
                </tr>
              ) : virmanlar.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <ArrowLeftRight className="w-12 h-12 text-gray-300" />
                      <p className="text-sm font-medium">Henüz virman kaydı yok</p>
                      <p className="text-xs text-gray-400">Yeni virman eklemek için yukarıdaki butonu kullanın</p>
                    </div>
                  </td>
                </tr>
              ) : (
                virmanlar.map((virman) => (
                  <tr
                    key={virman.id}
                    className="hover:bg-gray-50/50 transition-all duration-150"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {new Date(virman.tarih).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {virman.kaynak_kasa_adi || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ArrowLeftRight className="w-4 h-4 text-purple-600 mx-auto" />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {virman.hedef_kasa_adi || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-purple-600">
                        {virman.tutar.toFixed(2)} ₺
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {virman.aciklama || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(virman.id)}
                        className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

export default KoyVirmanlarPage;
