import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ArrowRightLeft, Plus, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Kasa {
  id: string;
  kasa_adi: string;
  para_birimi: string;
  fiziksel_bakiye: number;
  serbest_bakiye: number;
}

interface Virman {
  id: string;
  kaynak_kasa_id: string;
  hedef_kasa_id: string;
  tarih: string;
  tutar: number;
  aciklama?: string;
  kaynak_para_birimi?: string;
  hedef_para_birimi?: string;
  kaynak_tutar?: number;
  hedef_tutar?: number;
  uygulanan_kur?: number;
  created_at: string;
}

interface KurBilgisi {
  kur_degeri: number;
  kaynak_para_birimi: string;
  hedef_para_birimi: string;
}

export const MaliVirmanlarPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  
  const [kasalar, setKasalar] = React.useState<Kasa[]>([]);
  const [virmanlar, setVirmanlar] = React.useState<Virman[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  
  // Form state
  const [kaynakKasaId, setKaynakKasaId] = React.useState<string>('');
  const [hedefKasaId, setHedefKasaId] = React.useState<string>('');
  const [tarih, setTarih] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [tutar, setTutar] = React.useState<string>('');
  const [aciklama, setAciklama] = React.useState<string>('');
  const [notlar, setNotlar] = React.useState<string>('');
  
  // Kur state
  const [kurBilgisi, setKurBilgisi] = React.useState<KurBilgisi | null>(null);
  const [manuelKur, setManuelKur] = React.useState<string>('');
  const [manuelKurAktif, setManuelKurAktif] = React.useState<boolean>(false);
  const [kurLoading, setKurLoading] = React.useState<boolean>(false);
  
  // Filters
  const [baslangic, setBaslangic] = React.useState<string>('');
  const [bitis, setBitis] = React.useState<string>('');

  const farkliParaBirimi = React.useMemo(() => {
    if (!kaynakKasaId || !hedefKasaId) return false;
    const kaynakKasa = kasalar.find(k => k.id === kaynakKasaId);
    const hedefKasa = kasalar.find(k => k.id === hedefKasaId);
    return kaynakKasa && hedefKasa && kaynakKasa.para_birimi !== hedefKasa.para_birimi;
  }, [kaynakKasaId, hedefKasaId, kasalar]);

  const kaynakKasa = React.useMemo(() => kasalar.find(k => k.id === kaynakKasaId), [kaynakKasaId, kasalar]);
  const hedefKasa = React.useMemo(() => kasalar.find(k => k.id === hedefKasaId), [hedefKasaId, kasalar]);

  React.useEffect(() => {
    if (farkliParaBirimi && kaynakKasa && hedefKasa) {
      fetchKur(kaynakKasa.para_birimi, hedefKasa.para_birimi, tarih);
    } else {
      setKurBilgisi(null);
    }
  }, [farkliParaBirimi, kaynakKasaId, hedefKasaId, tarih]);

  const fetchKur = async (kaynak: string, hedef: string, tarihStr: string) => {
    if (!tenant) return;
    
    setKurLoading(true);
    try {
      const result = await invoke<{ kur_degeri: number }>('hesapla_kur', {
        tenantIdParam: tenant.id,
        kaynakParaBirimi: kaynak,
        hedefParaBirimi: hedef,
        tarih: tarihStr,
      });
      setKurBilgisi({
        kur_degeri: result.kur_degeri,
        kaynak_para_birimi: kaynak,
        hedef_para_birimi: hedef,
      });
      setManuelKur(result.kur_degeri.toFixed(4));
    } catch (error) {
      console.log('Kur bulunamadı:', error);
      setKurBilgisi(null);
    } finally {
      setKurLoading(false);
    }
  };

  const hedefTutar = React.useMemo(() => {
    if (!tutar) return 0;
    const tutarNum = parseFloat(tutar);
    if (!farkliParaBirimi) return tutarNum;
    
    const uygulanacakKur = manuelKurAktif ? parseFloat(manuelKur) : (kurBilgisi?.kur_degeri || 0);
    return tutarNum * uygulanacakKur;
  }, [tutar, farkliParaBirimi, manuelKurAktif, manuelKur, kurBilgisi]);

  React.useEffect(() => {
    if (!tenant) return;
    loadKasalar();
    loadVirmanlar();
  }, [tenant, baslangic, bitis]);

  const loadKasalar = async () => {
    if (!tenant) return;
    
    try {
      const result = await invoke<Kasa[]>('get_kasalar', {
        tenantIdParam: tenant.id,
      });
      setKasalar(result.filter(k => k.fiziksel_bakiye !== undefined));
    } catch (error) {
      console.error('Failed to load kasalar:', error);
    }
  };

  const loadVirmanlar = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      const result = await invoke<Virman[]>('get_virmanlar', {
        tenantIdParam: tenant.id,
        baslangicTarih: baslangic || null,
        bitisTarih: bitis || null,
        skip: 0,
        limit: 100,
      });
      setVirmanlar(result);
    } catch (error) {
      console.error('Failed to load virmanlar:', error);
      alert('Virmanlar yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenant) return;
    
    if (!kaynakKasaId || !hedefKasaId || !tutar) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }
    
    if (kaynakKasaId === hedefKasaId) {
      alert('Kaynak ve hedef kasa aynı olamaz!');
      return;
    }
    
    const tutarNum = parseFloat(tutar);
    if (tutarNum <= 0) {
      alert('Tutar 0\'dan büyük olmalıdır!');
      return;
    }
    
    // Farklı para biriminde kur kontrolü
    if (farkliParaBirimi && !kurBilgisi && !manuelKurAktif) {
      alert('Farklı para birimleri için kur tanımlanmamış. Lütfen önce kur tanımlayın veya manuel kur girin.');
      return;
    }
    
    const uygulanacakKur = farkliParaBirimi
      ? (manuelKurAktif ? parseFloat(manuelKur) : null)
      : null;
    
    try {
      await invoke('virman_yap', {
        tenantIdParam: tenant.id,
        virman: {
          kaynak_kasa_id: kaynakKasaId,
          hedef_kasa_id: hedefKasaId,
          tutar: tutarNum,
          aciklama: aciklama || null,
          uygulanan_kur: uygulanacakKur,
        },
      });
      
      const hedefTutarStr = farkliParaBirimi && hedefKasa
        ? ` (Hedef: ${hedefTutar.toFixed(2)} ${hedefKasa.para_birimi})`
        : '';
      
      alert(`Virman işlemi başarıyla tamamlandı!${hedefTutarStr}`);
      
      // Reset form
      setKaynakKasaId('');
      setHedefKasaId('');
      setTutar('');
      setAciklama('');
      setNotlar('');
      setManuelKur('');
      setManuelKurAktif(false);
      setKurBilgisi(null);
      setShowForm(false);
      
      // Reload
      loadKasalar();
      loadVirmanlar();
    } catch (error) {
      console.error('Failed to create virman:', error);
      alert('Virman işlemi başarısız: ' + error);
    }
  };

  const getKasaAdi = (kasaId: string) => {
    const kasa = kasalar.find(k => k.id === kasaId);
    return kasa ? `${kasa.kasa_adi} (${kasa.para_birimi})` : kasaId;
  };

  const handleDelete = async (id: string) => {
    if (!tenant) return;
    
    if (!confirm('Bu virman kaydını silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      await invoke('delete_virman', {
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
          <h1 className="text-3xl font-semibold text-gray-900">Virman İşlemleri</h1>
          <p className="text-gray-600 mt-1">Kasalar arası para transferi</p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="btn-macos flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Virman</span>
        </button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Virman İşlemi</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kaynak Kasa *
                </label>
                <select
                  value={kaynakKasaId}
                  onChange={(e) => setKaynakKasaId(e.target.value)}
                  className="input-macos"
                  required
                >
                  <option value="">Seçiniz...</option>
                  {kasalar.map(kasa => (
                    <option key={kasa.id} value={kasa.id}>
                      {kasa.kasa_adi} - {kasa.serbest_bakiye.toFixed(2)} {kasa.para_birimi}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hedef Kasa *
                </label>
                <select
                  value={hedefKasaId}
                  onChange={(e) => setHedefKasaId(e.target.value)}
                  className="input-macos"
                  required
                >
                  <option value="">Seçiniz...</option>
                  {kasalar.map(kasa => (
                    <option key={kasa.id} value={kasa.id} disabled={kasa.id === kaynakKasaId}>
                      {kasa.kasa_adi} ({kasa.para_birimi})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tarih *
                </label>
                <input
                  type="date"
                  value={tarih}
                  onChange={(e) => setTarih(e.target.value)}
                  className="input-macos"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tutar * {kaynakKasa && <span className="text-gray-500">({kaynakKasa.para_birimi})</span>}
                </label>
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
            
            {/* Kur Bilgisi - Farklı Para Birimlerinde Görünür */}
            {farkliParaBirimi && kaynakKasa && hedefKasa && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Farklı Para Birimi Tespit Edildi</span>
                </div>
                
                <div className="text-sm text-amber-700">
                  {kaynakKasa.para_birimi} → {hedefKasa.para_birimi} dönüşümü için kur uygulanacak.
                </div>
                
                {kurLoading ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Kur yükleniyor...
                  </div>
                ) : kurBilgisi ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Sistem Kuru:</span>
                      <span className="font-mono font-semibold">
                        1 {kaynakKasa.para_birimi} = {kurBilgisi.kur_degeri.toFixed(4)} {hedefKasa.para_birimi}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={manuelKurAktif}
                          onChange={(e) => setManuelKurAktif(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Manuel kur kullan</span>
                      </label>
                    </div>
                    
                    {manuelKurAktif && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Manuel Kur Değeri
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={manuelKur}
                          onChange={(e) => setManuelKur(e.target.value)}
                          className="input-macos w-48"
                          placeholder="0.0000"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-red-600">
                      ⚠️ Bu para birimi çifti için kur tanımlanmamış.
                      <a href="/mali/kurlar" className="ml-1 underline">Kur Yönetimi</a>'nden tanımlayabilirsiniz.
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={manuelKurAktif}
                          onChange={(e) => setManuelKurAktif(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Manuel kur gir</span>
                      </label>
                    </div>
                    
                    {manuelKurAktif && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kur Değeri (1 {kaynakKasa.para_birimi} = ? {hedefKasa.para_birimi})
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={manuelKur}
                          onChange={(e) => setManuelKur(e.target.value)}
                          className="input-macos w-48"
                          placeholder="0.0000"
                          required={manuelKurAktif}
                        />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Hedef Tutar Önizleme */}
                {tutar && (kurBilgisi || (manuelKurAktif && parseFloat(manuelKur) > 0)) && (
                  <div className="bg-white rounded-lg p-3 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Hedef Kasaya Eklenecek:</span>
                      <span className="text-lg font-bold text-green-700">
                        {hedefTutar.toFixed(2)} {hedefKasa.para_birimi}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama
              </label>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={2}
                className="input-macos resize-none"
                placeholder="Virman sebebi..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ek Notlar
              </label>
              <textarea
                value={notlar}
                onChange={(e) => setNotlar(e.target.value)}
                rows={2}
                className="input-macos resize-none"
                placeholder="Ekstra bilgiler..."
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
                Virman Yap
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="card-macos">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
              <input
                type="date"
                value={baslangic}
                onChange={(e) => setBaslangic(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
              <input
                type="date"
                value={bitis}
                onChange={(e) => setBitis(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kaynak Kasa</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">→</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hedef Kasa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : virmanlar.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Henüz virman kaydı yok
                  </td>
                </tr>
              ) : (
                virmanlar.map((virman) => {
                  const farkliPB = virman.kaynak_para_birimi && virman.hedef_para_birimi && 
                    virman.kaynak_para_birimi !== virman.hedef_para_birimi;
                  
                  return (
                  <tr
                    key={virman.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(virman.tarih).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {getKasaAdi(virman.kaynak_kasa_id)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ArrowRightLeft className="w-4 h-4 text-blue-500 inline" />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {getKasaAdi(virman.hedef_kasa_id)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-semibold text-blue-600">
                        {virman.kaynak_tutar?.toFixed(2) || virman.tutar.toFixed(2)} {virman.kaynak_para_birimi || '₺'}
                      </div>
                      {farkliPB && virman.hedef_tutar && (
                        <div className="text-xs text-gray-500 mt-1">
                          → {virman.hedef_tutar.toFixed(2)} {virman.hedef_para_birimi}
                          {virman.uygulanan_kur && (
                            <span className="ml-1 text-gray-400">
                              (Kur: {virman.uygulanan_kur.toFixed(4)})
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
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
                );})
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MaliVirmanlarPage;
