import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface AidatTakip {
  id: string;
  uye_id: string;
  uye_ad_soyad: string;
  yil: number;
  tutar: number;
  odenen_tutar: number;
  kalan_tutar: number;
  son_odeme_tarihi?: string;
  durum: 'ÖDENDİ' | 'KISMİ' | 'ÖDENMEDİ' | 'GECİKMİŞ';
  created_at: string;
}

interface AidatOdeme {
  id: string;
  aidat_id: string;
  tarih: string;
  tutar: number;
  tahsilat_turu: string;
  banka_sube?: string;
  dekont_no?: string;
  aciklama?: string;
}

interface Uye {
  id: string;
  ad: string;
  soyad: string;
}

export const AidatTakipPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  
  const [aidatlar, setAidatlar] = React.useState<AidatTakip[]>([]);
  const [uyeler, setUyeler] = React.useState<Uye[]>([]);
  const [selectedAidat, setSelectedAidat] = React.useState<AidatTakip | null>(null);
  const [odemeler, setOdemeler] = React.useState<AidatOdeme[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAidatForm, setShowAidatForm] = React.useState(false);
  const [showOdemeForm, setShowOdemeForm] = React.useState(false);
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  
  // Aidat Form
  const [uyeId, setUyeId] = React.useState<string>('');
  const [yil, setYil] = React.useState<number>(new Date().getFullYear());
  const [ay, setAy] = React.useState<number>(new Date().getMonth() + 1);
  const [tutar, setTutar] = React.useState<string>('');
  const [sonOdemeTarihi, setSonOdemeTarihi] = React.useState<string>('');
  
  // Ödeme Form
  const [odemeTarihi, setOdemeTarihi] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [odemeTutari, setOdemeTutari] = React.useState<string>('');
  const [tahsilatTuru, setTahsilatTuru] = React.useState<string>('NAKİT');
  const [bankaSube, setBankaSube] = React.useState<string>('');
  const [dekontNo, setDekontNo] = React.useState<string>('');
  const [odemeAciklama, setOdemeAciklama] = React.useState<string>('');

  React.useEffect(() => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    loadUyeler();
    loadAidatlar();
  }, [tenant, selectedYear]);

  const loadUyeler = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<Uye[]>('get_uyeler', {
        tenantIdParam: tenant.id,
        skip: 0,
        limit: 1000,
      });
      setUyeler(result);
    } catch (error) {
      console.error('Üyeler yüklenemedi:', error);
    }
  };

  const loadAidatlar = async () => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const result = await invoke<AidatTakip[]>('get_aidat_takip', {
        tenantIdParam: tenant.id,
        filterYil: selectedYear,
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

  const loadOdemeler = async (aidatId: string) => {
    if (!tenant) return;
    try {
      const result = await invoke<AidatOdeme[]>('get_aidat_odemeleri', {
        tenantIdParam: tenant.id,
        aidatId,
      });
      setOdemeler(result);
    } catch (error) {
      console.error('Ödemeler yüklenemedi:', error);
    }
  };

  const handleCreateAidat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) {
      alert('❌ Tenant bilgisi bulunamadı!');
      return;
    }
    
    if (!uyeId || !yil || !ay || !tutar) {
      alert('❌ Üye, Yıl, Ay ve Tutar alanları zorunludur!');
      return;
    }
    
    const tutarNum = parseFloat(tutar);
    if (isNaN(tutarNum) || tutarNum <= 0) {
      alert('❌ Geçerli bir tutar girin!');
      return;
    }
    
    try {
      await invoke('create_aidat', {
        tenantIdParam: tenant.id,
        data: {
          uye_id: uyeId,
          yil: parseInt(yil.toString()),
          ay: parseInt(ay.toString()),
          tutar: tutarNum,
          notlar: null,
        },
      });
      
      alert('✅ Aidat kaydı oluşturuldu!');
      setShowAidatForm(false);
      
      // Form sıfırla
      setUyeId('');
      setYil(new Date().getFullYear());
      setAy(new Date().getMonth() + 1);
      setTutar('');
      setSonOdemeTarihi('');
      
      loadAidatlar();
    } catch (error) {
      console.error('Aidat oluşturulamadı:', error);
      alert('❌ Aidat oluşturulamadı: ' + error);
    }
  };

  const handleCreateOdeme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !selectedAidat) {
      alert('❌ Aidat seçilmedi!');
      return;
    }
    
    if (!odemeTutari) {
      alert('❌ Ödeme tutarı girin!');
      return;
    }
    
    const tutarNum = parseFloat(odemeTutari);
    if (isNaN(tutarNum) || tutarNum <= 0) {
      alert('❌ Geçerli bir tutar girin!');
      return;
    }
    
    try {
      await invoke('kaydet_odeme', {
        tenantIdParam: tenant.id,
        aidatId: selectedAidat.id,
        odeme: {
          tutar: tutarNum,
          odeme_tarihi: odemeTarihi,
          tahsilat_turu: tahsilatTuru || null,
          banka_sube: bankaSube || null,
          dekont_no: dekontNo || null,
          aciklama: odemeAciklama || null,
        },
      });
      
      alert('✅ Ödeme kaydedildi!');
      setShowOdemeForm(false);
      
      // Form sıfırla
      setOdemeTutari('');
      setOdemeTarihi(new Date().toISOString().split('T')[0]);
      
      loadAidatlar();
    } catch (error) {
      console.error('Ödeme kaydedilemedi:', error);
      alert('❌ Ödeme kaydedilemedi: ' + error);
    }
  };

  const handleShowOdemeler = (aidat: AidatTakip) => {
    setSelectedAidat(aidat);
    loadOdemeler(aidat.id);
    setShowOdemeForm(true);
  };

  const getDurumBadge = (durum: string) => {
    const colors: Record<string, string> = {
      'ÖDENDİ': 'bg-green-100 text-green-800',
      'KISMİ': 'bg-yellow-100 text-yellow-800',
      'ÖDENMEDİ': 'bg-gray-100 text-gray-800',
      'GECİKMİŞ': 'bg-red-100 text-red-800',
    };
    return colors[durum] || colors['ÖDENMEDİ'];
  };

  const getDurumIcon = (durum: string) => {
    switch (durum) {
      case 'ÖDENDİ': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'KISMİ': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'GECİKMİŞ': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const toplam = aidatlar.reduce((sum, a) => sum + a.tutar, 0);
  const toplamOdenen = aidatlar.reduce((sum, a) => sum + a.odenen_tutar, 0);
  const toplamKalan = aidatlar.reduce((sum, a) => sum + a.kalan_tutar, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Aidat Takip</h1>
          <p className="text-gray-500 mt-1.5">Üye aidatları ve ödeme takibi</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="input-macos"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          
          <button
            onClick={() => setShowAidatForm(true)}
            className="btn-macos flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Aidat Kaydı</span>
          </button>
        </div>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-macos p-5">
          <div className="text-sm font-medium text-gray-500 mb-1">Toplam Aidat</div>
          <div className="text-2xl font-semibold text-gray-900">{toplam.toFixed(2)} ₺</div>
        </div>
        <div className="card-macos p-5">
          <div className="text-sm font-medium text-gray-500 mb-1">Tahsil Edilen</div>
          <div className="text-2xl font-semibold text-green-600">{toplamOdenen.toFixed(2)} ₺</div>
        </div>
        <div className="card-macos p-5">
          <div className="text-sm font-medium text-gray-500 mb-1">Kalan Borç</div>
          <div className="text-2xl font-semibold text-red-600">{toplamKalan.toFixed(2)} ₺</div>
        </div>
      </div>

      {/* Aidat Oluşturma Modal */}
      <Dialog open={showAidatForm} onOpenChange={setShowAidatForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Aidat Kaydı</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreateAidat} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Üye *</label>
                <select
                  value={uyeId}
                  onChange={(e) => setUyeId(e.target.value)}
                  className="input-macos"
                  required
                >
                  <option value="">Seçiniz...</option>
                  {uyeler.map(u => (
                    <option key={u.id} value={u.id}>{u.ad} {u.soyad}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Yıl *</label>
                <input
                  type="number"
                  value={yil}
                  onChange={(e) => setYil(parseInt(e.target.value))}
                  className="input-macos"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aidat Tutarı *</label>
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Son Ödeme Tarihi</label>
                <input
                  type="date"
                  value={sonOdemeTarihi}
                  onChange={(e) => setSonOdemeTarihi(e.target.value)}
                  className="input-macos"
                />
              </div>
            </div>
            
            <DialogFooter>
              <button
                type="button"
                onClick={() => setShowAidatForm(false)}
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

      {/* Ödeme Ekleme Modal */}
      <Dialog open={showOdemeForm} onOpenChange={setShowOdemeForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAidat && `${selectedAidat.uye_ad_soyad} - ${selectedAidat.yil} Aidat Ödemesi`}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAidat && (
            <div className="px-6 py-2 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Toplam:</span>
                  <span className="ml-2 font-semibold">{selectedAidat.tutar.toFixed(2)} ₺</span>
                </div>
                <div>
                  <span className="text-gray-500">Ödenen:</span>
                  <span className="ml-2 font-semibold text-green-600">{selectedAidat.odenen_tutar.toFixed(2)} ₺</span>
                </div>
                <div>
                  <span className="text-gray-500">Kalan:</span>
                  <span className="ml-2 font-semibold text-red-600">{selectedAidat.kalan_tutar.toFixed(2)} ₺</span>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleCreateOdeme} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tarih *</label>
                <input
                  type="date"
                  value={odemeTarihi}
                  onChange={(e) => setOdemeTarihi(e.target.value)}
                  className="input-macos"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tutar *</label>
                <input
                  type="number"
                  step="0.01"
                  value={odemeTutari}
                  onChange={(e) => setOdemeTutari(e.target.value)}
                  className="input-macos"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tahsilat Türü *</label>
                <select
                  value={tahsilatTuru}
                  onChange={(e) => setTahsilatTuru(e.target.value)}
                  className="input-macos"
                  required
                >
                  <option value="NAKİT">Nakit</option>
                  <option value="HAVALE">Havale/EFT</option>
                  <option value="KREDİ KARTI">Kredi Kartı</option>
                  <option value="ÇEK">Çek</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Banka/Şube</label>
                <input
                  type="text"
                  value={bankaSube}
                  onChange={(e) => setBankaSube(e.target.value)}
                  className="input-macos"
                  placeholder="Ör: Ziraat Bankası / Ankara Şubesi"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dekont/Makbuz No</label>
                <input
                  type="text"
                  value={dekontNo}
                  onChange={(e) => setDekontNo(e.target.value)}
                  className="input-macos"
                  placeholder="Dekont numarası"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
              <textarea
                value={odemeAciklama}
                onChange={(e) => setOdemeAciklama(e.target.value)}
                rows={2}
                className="input-macos resize-none"
                placeholder="Ödeme ile ilgili notlar..."
              />
            </div>
            
            <DialogFooter>
              <button
                type="button"
                onClick={() => setShowOdemeForm(false)}
                className="btn-macos-secondary"
              >
                Kapat
              </button>
              <button type="submit" className="btn-macos">
                Ödeme Ekle
              </button>
            </DialogFooter>
          </form>
          
          {/* Önceki Ödemeler */}
          {odemeler.length > 0 && (
            <div className="px-6 pb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Önceki Ödemeler</h3>
              <div className="space-y-2">
                {odemeler.map((odeme) => (
                  <div key={odeme.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(odeme.tarih).toLocaleDateString('tr-TR')}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                          {odeme.tahsilat_turu}
                        </span>
                      </div>
                      {odeme.aciklama && (
                        <p className="text-xs text-gray-500 mt-1">{odeme.aciklama}</p>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-green-600">
                      +{odeme.tutar.toFixed(2)} ₺
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Aidat Listesi */}
      <div className="card-macos">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Üye</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Yıl</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Tutar</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Ödenen</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Kalan</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Durum</th>
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
              ) : aidatlar.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <CreditCard className="w-12 h-12 text-gray-300" />
                      <p className="text-sm font-medium">Henüz aidat kaydı yok</p>
                      <p className="text-xs text-gray-400">Yeni aidat kaydı eklemek için yukarıdaki butonu kullanın</p>
                    </div>
                  </td>
                </tr>
              ) : (
                aidatlar.map((aidat) => (
                  <tr
                    key={aidat.id}
                    className="hover:bg-gray-50/50 transition-all duration-150"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {aidat.uye_ad_soyad}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {aidat.yil}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {aidat.tutar.toFixed(2)} ₺
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      {aidat.odenen_tutar.toFixed(2)} ₺
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-red-600">
                      {aidat.kalan_tutar.toFixed(2)} ₺
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getDurumIcon(aidat.durum)}
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getDurumBadge(aidat.durum)}`}>
                          {aidat.durum}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleShowOdemeler(aidat)}
                        className="btn-macos-secondary text-sm py-1.5 px-3 flex items-center gap-1.5 mx-auto"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Ödeme Ekle</span>
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

export default AidatTakipPage;
