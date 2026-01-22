import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AidatTakipVirtualTable } from '@/components/aidat-takip/AidatTakipVirtualTable';
import { useAidatTakip } from '@/hooks/useAidatTakip';
import { ColumnSettingsModal } from '@/components/common/ColumnSettingsModal';
import { useColumnConfig } from '@/hooks/useColumnConfig';
import { AIDAT_TAKIP_PAGE_CONFIG, PAGE_PRESETS } from '@/config/columnDefinitions';
import { PAGE_KEYS } from '@/types/columnConfig';

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

interface Kasa {
  id: string;
  ad: string;
  bakiye: number;
}

export const AidatTakipPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);

  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());

  // React Query hook ile veri çekme (cache + auto-refetch)
  const { aidatlar, isLoading: loading, refetch } = useAidatTakip({
    filterYil: selectedYear,
    limit: 1000,
  });

  // Column customization
  const [showColumnSettings, setShowColumnSettings] = React.useState(false);
  const {
    config: columnConfig,
    saveConfig: saveColumnConfig,
    resetConfig: resetColumnConfig,
    toggleSort,
  } = useColumnConfig({
    pageKey: PAGE_KEYS.AIDAT_TAKIP_LIST,
    defaultVisible: AIDAT_TAKIP_PAGE_CONFIG.defaultVisible,
    defaultOrder: AIDAT_TAKIP_PAGE_CONFIG.defaultColumns.map(c => c.id),
  });

  const [uyeler, setUyeler] = React.useState<Uye[]>([]);
  const [kasalar, setKasalar] = React.useState<Kasa[]>([]);
  const [selectedAidat, setSelectedAidat] = React.useState<AidatTakip | null>(null);
  const [odemeler, setOdemeler] = React.useState<AidatOdeme[]>([]);
  const [showAidatForm, setShowAidatForm] = React.useState(false);
  const [showOdemeForm, setShowOdemeForm] = React.useState(false);
  
  // Aidat Form
  const [uyeId, setUyeId] = React.useState<string>('');
  const [yil, setYil] = React.useState<number>(new Date().getFullYear());
  const [ay, setAy] = React.useState<number>(new Date().getMonth() + 1);
  const [tutar, setTutar] = React.useState<string>('');
  const [sonOdemeTarihi, setSonOdemeTarihi] = React.useState<string>('');
  
  // Ödeme Form
  const [odemeTarihi, setOdemeTarihi] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [odemeTutari, setOdemeTutari] = React.useState<string>('');
  const [kasaId, setKasaId] = React.useState<string>('');
  const [tahsilatTuru, setTahsilatTuru] = React.useState<string>('NAKİT');
  const [bankaSube, setBankaSube] = React.useState<string>('');
  const [dekontNo, setDekontNo] = React.useState<string>('');
  const [odemeAciklama, setOdemeAciklama] = React.useState<string>('');

  // React Query hook otomatik olarak tenant ve selectedYear değiştiğinde refetch yapar
  React.useEffect(() => {
    if (!tenant) return;
    loadUyeler();
    loadKasalar();
  }, [tenant]);

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

  const loadKasalar = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<Kasa[]>('get_kasalar', {
        tenantIdParam: tenant.id,
      });
      setKasalar(result);
      // Varsayılan kasa seç
      if (result.length > 0 && !kasaId) {
        setKasaId(result[0].id);
      }
    } catch (error) {
      console.error('Kasalar yüklenemedi:', error);
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

      refetch();
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

    if (!kasaId) {
      alert('❌ Kasa seçin!');
      return;
    }
    
    const tutarNum = parseFloat(odemeTutari);
    if (isNaN(tutarNum) || tutarNum <= 0) {
      alert('❌ Geçerli bir tutar girin!');
      return;
    }
    
    try {
      // Aidat ödemesini gelir kaydıyla birlikte kaydet
      await invoke('kaydet_aidat_odeme_with_gelir', {
        tenantIdParam: tenant.id,
        data: {
          aidat_id: selectedAidat.id,
          kasa_id: kasaId,
          tutar: tutarNum,
          odeme_tarihi: odemeTarihi,
        },
      });
      
      alert('✅ Ödeme kaydedildi ve gelir olarak işlendi!');
      setShowOdemeForm(false);

      // Form sıfırla
      setOdemeTutari('');
      setOdemeTarihi(new Date().toISOString().split('T')[0]);

      refetch();
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kasa *</label>
                <select
                  value={kasaId}
                  onChange={(e) => setKasaId(e.target.value)}
                  className="input-macos"
                  required
                >
                  <option value="">Kasa Seçin</option>
                  {kasalar.map((kasa) => (
                    <option key={kasa.id} value={kasa.id}>
                      {kasa.ad} (Bakiye: {kasa.bakiye.toFixed(2)} ₺)
                    </option>
                  ))}
                </select>
              </div>
              
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
            </div>

            <div className="grid grid-cols-3 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Tahsilat Türü</label>
                <select
                  value={tahsilatTuru}
                  onChange={(e) => setTahsilatTuru(e.target.value)}
                  className="input-macos"
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
      {loading ? (
        <div className="card-macos p-8 text-center text-gray-600">
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Yükleniyor...</span>
          </div>
        </div>
      ) : (
        <AidatTakipVirtualTable
          aidatlar={aidatlar}
          onOdemeEkle={handleShowOdemeler}
          columnConfig={columnConfig}
          onColumnSettings={() => setShowColumnSettings(true)}
          onSort={toggleSort}
        />
      )}

      {/* Column Settings Modal */}
      <ColumnSettingsModal
        open={showColumnSettings}
        onOpenChange={setShowColumnSettings}
        columns={AIDAT_TAKIP_PAGE_CONFIG.defaultColumns}
        currentConfig={columnConfig || {
          visible: AIDAT_TAKIP_PAGE_CONFIG.defaultVisible,
          order: AIDAT_TAKIP_PAGE_CONFIG.defaultColumns.map(c => c.id),
        }}
        onSave={saveColumnConfig}
        onReset={resetColumnConfig}
        presets={PAGE_PRESETS[PAGE_KEYS.AIDAT_TAKIP_LIST]}
      />
    </div>
  );
};

export default AidatTakipPage;
