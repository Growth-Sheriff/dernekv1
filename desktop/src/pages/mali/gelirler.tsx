import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Plus, TrendingUp, Pencil, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { EvrakEkleme, EvrakData } from '@/components/common/EvrakEkleme';

interface Gelir {
  id: string;
  kasa_id: string;
  tarih: string;
  tutar: number;
  aciklama?: string;
  makbuz_no?: string;
  created_at: string;
}

interface Kasa {
  id: string;
  kasa_adi: string;
  para_birimi: string;
}

interface GelirTuru {
  id: string;
  ad: string;
}

export const GelirlerPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [gelirler, setGelirler] = React.useState<Gelir[]>([]);
  const [kasalar, setKasalar] = React.useState<Kasa[]>([]);
  const [gelirTurleri, setGelirTurleri] = React.useState<GelirTuru[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [baslangic, setBaslangic] = React.useState<string>('');
  const [bitis, setBitis] = React.useState<string>('');
  const [filterTuruId, setFilterTuruId] = React.useState<string>('');
  const [showForm, setShowForm] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingGelir, setEditingGelir] = React.useState<Gelir | null>(null);
  
  // Form state
  const [kasaId, setKasaId] = React.useState<string>('');
  const [gelirTuruId, setGelirTuruId] = React.useState<string>('');
  const [tarih, setTarih] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [gelirTuru, setGelirTuru] = React.useState<string>('');  // Kategori adı
  const [altKategori, setAltKategori] = React.useState<string>('');  
  const [tutar, setTutar] = React.useState<string>('');
  const [aciklama, setAciklama] = React.useState<string>('');
  const [tahsilEden, setTahsilEden] = React.useState<string>('');  
  const [dekontNo, setDekontNo] = React.useState<string>('');  
  const [aitOlduguYil, setAitOlduguYil] = React.useState<number>(new Date().getFullYear());  
  const [tahakkukDurumu, setTahakkukDurumu] = React.useState<string>('NORMAL');  
  const [notlar, setNotlar] = React.useState<string>('');
  const [evrakData, setEvrakData] = React.useState<EvrakData | null>(null);

  React.useEffect(() => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    loadKasalar();
    loadGelirTurleri();
    loadGelirler();
  }, [tenant, baslangic, bitis, filterTuruId]);

  const loadKasalar = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<Kasa[]>('get_kasalar', { tenantIdParam: tenant.id });
      setKasalar(result);
      if (result.length > 0 && !kasaId) setKasaId(result[0].id);
    } catch (error) {
      console.error('Kasalar yüklenemedi:', error);
    }
  };

  const loadGelirTurleri = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<GelirTuru[]>('get_gelir_turleri', { tenantIdParam: tenant.id });
      setGelirTurleri(result);
      if (result.length > 0 && !gelirTuruId) setGelirTuruId(result[0].id);
    } catch (error) {
      console.error('Gelir türleri yüklenemedi:', error);
    }
  };

  const loadGelirler = async () => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const result = await invoke<Gelir[]>('get_gelirler', {
        tenantIdParam: tenant.id,
        kasaId: null,
        baslangicTarih: baslangic || null,
        bitisTarih: bitis || null,
        skip: 0,
        limit: 100,
      });
      setGelirler(result);
    } catch (error) {
      console.error('Failed to load gelirler:', error);
      alert('Gelirler yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) {
      alert('❌ Tenant bilgisi bulunamadı!');
      return;
    }
    
    if (!kasaId || !tutar) {
      alert('❌ Kasa ve Tutar alanları zorunludur!');
      return;
    }
    
    const tutarNum = parseFloat(tutar);
    if (isNaN(tutarNum) || tutarNum <= 0) {
      alert('❌ Geçerli bir tutar girin!');
      return;
    }
    
    try {
      await invoke('create_gelir', {
        tenantIdParam: tenant.id,
        data: {
          kasa_id: kasaId,
          gelir_turu_id: gelirTuruId || null,
          tarih,
          tutar: tutarNum,
          aciklama: aciklama || null,
          makbuz_no: dekontNo || null,
          alt_kategori: altKategori || null,
          tahakkuk_durumu: tahakkukDurumu || null,
          belge_no: dekontNo || null,
          tahsil_eden: tahsilEden || null,
        },
      });
      
      alert('✅ Gelir başarıyla eklendi!');
      setShowForm(false);
      // Form sıfırla
      setTutar('');
      setAciklama('');
      setDekontNo('');
      loadGelirler();
    } catch (error) {
      console.error('Gelir eklenemedi:', error);
      alert('❌ Gelir eklenemedi: ' + error);
    }
  };

  const handleEdit = (gelir: Gelir) => {
    setEditingGelir(gelir);
    setKasaId(gelir.kasa_id);
    setTarih(gelir.tarih);
    setTutar(gelir.tutar.toString());
    setAciklama(gelir.aciklama || '');
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !editingGelir) return;
    
    if (!kasaId || !tutar) {
      alert('❌ Kasa ve Tutar alanları zorunludur!');
      return;
    }
    
    const tutarNum = parseFloat(tutar);
    if (isNaN(tutarNum) || tutarNum <= 0) {
      alert('❌ Geçerli bir tutar girin!');
      return;
    }
    
    try {
      await invoke('update_gelir', {
        tenantIdParam: tenant.id,
        gelirId: editingGelir.id,
        data: {
          kasa_id: kasaId,
          gelir_turu_id: gelirTuruId || null,
          tarih,
          tutar: tutarNum,
          aciklama: aciklama || null,
          makbuz_no: dekontNo || null,
          alt_kategori: altKategori || null,
          tahakkuk_durumu: tahakkukDurumu || null,
          belge_no: dekontNo || null,
          tahsil_eden: tahsilEden || null,
        },
      });
      
      alert('✅ Gelir başarıyla güncellendi!');
      setShowEditModal(false);
      setEditingGelir(null);
      // Form sıfırla
      setTutar('');
      setAciklama('');
      setDekontNo('');
      setDekontNo('');
      setNotlar('');
      loadGelirler();
    } catch (error) {
      console.error('Gelir güncellenemedi:', error);
      alert('Gelir güncellenemedi: ' + error);
    }
  };

  const handleDelete = async (id: string, aciklama: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm(`"${aciklama}" gelir kaydını silmek istediğinizden emin misiniz?`)) {
      return;
    }
    
    if (!tenant) return;
    
    try {
      await invoke('delete_gelir', {
        tenantIdParam: tenant.id,
        gelirId: id,
      });
      
      alert('Gelir başarıyla silindi');
      loadGelirler();
    } catch (error) {
      console.error('Gelir silinemedi:', error);
      alert('Gelir silinemedi: ' + error);
    }
  };

  const toplam = gelirler.reduce((sum, g) => sum + g.tutar, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Gelirler</h1>
          <p className="text-gray-500 mt-1.5">Gelir kayıtları ve takibi</p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="btn-macos flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Gelir</span>
        </button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Gelir Ekle</DialogTitle>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Gelir Türü *</label>
                <select
                  value={gelirTuruId}
                  onChange={(e) => setGelirTuruId(e.target.value)}
                  className="input-macos"
                  required
                >
                  <option value="">Seçiniz...</option>
                  {gelirTurleri.map(t => (
                    <option key={t.id} value={t.id}>{t.ad}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ait Olduğu Yıl</label>
                <input
                  type="number"
                  value={aitOlduguYil}
                  onChange={(e) => setAitOlduguYil(parseInt(e.target.value))}
                  className="input-macos"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gelir Kategorisi</label>
                <input
                  type="text"
                  value={gelirTuru}
                  onChange={(e) => setGelirTuru(e.target.value)}
                  className="input-macos"
                  placeholder="Ör: AİDAT, BAĞIŞ, DÜĞÜN"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alt Kategori</label>
                <input
                  type="text"
                  value={altKategori}
                  onChange={(e) => setAltKategori(e.target.value)}
                  className="input-macos"
                  placeholder="Opsiyonel"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tahsil Eden</label>
                <input
                  type="text"
                  value={tahsilEden}
                  onChange={(e) => setTahsilEden(e.target.value)}
                  className="input-macos"
                  placeholder="Tahsilatı yapan kişi"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dekont No</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Tahakkuk Durumu</label>
              <select
                value={tahakkukDurumu}
                onChange={(e) => setTahakkukDurumu(e.target.value)}
                className="input-macos"
              >
                <option value="NORMAL">Normal</option>
                <option value="GERİYE DÖNÜK">Geriye Dönük</option>
                <option value="PEŞİN">Peşin</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama *</label>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={2}
                className="input-macos resize-none"
                placeholder="Gelir detayı..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ek Notlar</label>
              <textarea
                value={notlar}
                onChange={(e) => setNotlar(e.target.value)}
                rows={2}
                className="input-macos resize-none"
                placeholder="Ek bilgiler..."
              />
            </div>

            {tenant && (
              <EvrakEkleme
                tenantId={tenant.id}
                onEvrakChange={setEvrakData}
                belgeTuru="gelir"
              />
            )}
            
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

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gelir Düzenle</DialogTitle>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Gelir Türü *</label>
                <select
                  value={gelirTuruId}
                  onChange={(e) => setGelirTuruId(e.target.value)}
                  className="input-macos"
                  required
                >
                  <option value="">Seçiniz...</option>
                  {gelirTurleri.map(t => (
                    <option key={t.id} value={t.id}>{t.ad}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ait Olduğu Yıl</label>
                <input
                  type="number"
                  value={aitOlduguYil}
                  onChange={(e) => setAitOlduguYil(parseInt(e.target.value))}
                  className="input-macos"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gelir Kategorisi</label>
                <input
                  type="text"
                  value={gelirTuru}
                  onChange={(e) => setGelirTuru(e.target.value)}
                  className="input-macos"
                  placeholder="Ör: AİDAT, BAĞIŞ, DÜĞÜN"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alt Kategori</label>
                <input
                  type="text"
                  value={altKategori}
                  onChange={(e) => setAltKategori(e.target.value)}
                  className="input-macos"
                  placeholder="Opsiyonel"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tahsil Eden</label>
                <input
                  type="text"
                  value={tahsilEden}
                  onChange={(e) => setTahsilEden(e.target.value)}
                  className="input-macos"
                  placeholder="Tahsilatı yapan kişi"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dekont No</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Tahakkuk Durumu</label>
              <select
                value={tahakkukDurumu}
                onChange={(e) => setTahakkukDurumu(e.target.value)}
                className="input-macos"
              >
                <option value="NORMAL">Normal</option>
                <option value="GERİYE DÖNÜK">Geriye Dönük</option>
                <option value="PEŞİN">Peşin</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama *</label>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={2}
                className="input-macos resize-none"
                placeholder="Gelir detayı..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ek Notlar</label>
              <textarea
                value={notlar}
                onChange={(e) => setNotlar(e.target.value)}
                rows={2}
                className="input-macos resize-none"
                placeholder="Ek bilgiler..."
              />
            </div>

            {tenant && (
              <EvrakEkleme
                tenantId={tenant.id}
                onEvrakChange={setEvrakData}
                belgeTuru="gelir"
              />
            )}
            
            <DialogFooter>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="btn-macos-secondary"
              >
                İptal
              </button>
              <button
                type="submit"
                className="btn-macos"
              >
                Güncelle
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Gelir Türü</label>
              <select
                value={filterTuruId}
                onChange={(e) => setFilterTuruId(e.target.value)}
                className="input-macos"
              >
                <option value="">Tüm Türler</option>
                {gelirTurleri.map(t => (
                  <option key={t.id} value={t.id}>{t.ad}</option>
                ))}
              </select>
            </div>

            <div className="pt-6">
              <div className="px-6 py-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <div className="text-xs font-medium text-green-600 mb-1">Toplam Gelir</div>
                <div className="text-2xl font-semibold text-green-700">{toplam.toFixed(2)} ₺</div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Tutar</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Açıklama</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Makbuz No</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">İşlemler</th>
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
              ) : gelirler.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm font-medium">Henüz gelir kaydı yok</p>
                      <p className="text-xs text-gray-400">Yeni gelir eklemek için yukarıdaki butonu kullanın</p>
                    </div>
                  </td>
                </tr>
              ) : (
                gelirler.map((gelir) => (
                  <tr
                    key={gelir.id}
                    className="hover:bg-gray-50/50 transition-all duration-150"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {new Date(gelir.tarih).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-green-600">
                        +{gelir.tutar.toFixed(2)} ₺
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {gelir.aciklama || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {gelir.makbuz_no || '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(gelir);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Düzenle"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(gelir.id, gelir.aciklama || 'Gelir', e)}
                        className="text-red-600 hover:text-red-900"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
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

export default GelirlerPage;
