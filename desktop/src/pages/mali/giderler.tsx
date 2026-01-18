import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Plus, TrendingDown, Pencil, Trash2, Package } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { DEMIRBAS_KATEGORI_LISTESI, DEMIRBAS_DURUMLARI } from '@/lib/constants';
import { EvrakEkleme, EvrakData } from '@/components/common/EvrakEkleme';

interface Gider {
  id: string;
  kasa_id: string;
  tarih: string;
  tutar: number;
  aciklama?: string;
  fatura_no?: string;
  uye_id?: string;
  created_at: string;
}

interface Kasa {
  id: string;
  kasa_adi: string;
  para_birimi: string;
}

interface GiderTuru {
  id: string;
  ad: string;
}

interface Uye {
  id: string;
  ad: string;
  soyad: string;
  uye_no?: string;
}

export const GiderlerPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [giderler, setGiderler] = React.useState<Gider[]>([]);
  const [kasalar, setKasalar] = React.useState<Kasa[]>([]);
  const [giderTurleri, setGiderTurleri] = React.useState<GiderTuru[]>([]);
  const [uyeler, setUyeler] = React.useState<Uye[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [baslangic, setBaslangic] = React.useState<string>('');
  const [bitis, setBitis] = React.useState<string>('');
  const [filterTuruId, setFilterTuruId] = React.useState<string>('');
  const [showForm, setShowForm] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Gider | null>(null);
  
  // Form state
  const [kasaId, setKasaId] = React.useState<string>('');
  const [giderTuruId, setGiderTuruId] = React.useState<string>('');
  const [tarih, setTarih] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [giderTuru, setGiderTuru] = React.useState<string>('');  // Kategori adı
  const [altKategori, setAltKategori] = React.useState<string>('');  
  const [tutar, setTutar] = React.useState<string>('');
  const [aciklama, setAciklama] = React.useState<string>('');
  const [odeyen, setOdeyen] = React.useState<string>('');  
  const [faturaNo, setFaturaNo] = React.useState<string>('');  
  const [aitOlduguYil, setAitOlduguYil] = React.useState<number>(new Date().getFullYear());  
  const [tahakkukDurumu, setTahakkukDurumu] = React.useState<string>('NORMAL');  
  const [notlar, setNotlar] = React.useState<string>('');
  const [evrakData, setEvrakData] = React.useState<EvrakData | null>(null);
  const [selectedUyeId, setSelectedUyeId] = React.useState<string>('');
  
  // Demirbaş ekleme state'leri
  const [demirbasEkle, setDemirbasEkle] = React.useState<boolean>(false);
  const [demirbasAdi, setDemirbasAdi] = React.useState<string>('');
  const [demirbasKategori, setDemirbasKategori] = React.useState<string>('');
  const [demirbasMarkaModel, setDemirbasMarkaModel] = React.useState<string>('');
  const [demirbasSeriNo, setDemirbasSeriNo] = React.useState<string>('');
  const [demirbasAdet, setDemirbasAdet] = React.useState<number>(1);
  const [demirbasKonum, setDemirbasKonum] = React.useState<string>('');
  const [demirbasNotlar, setDemirbasNotlar] = React.useState<string>('');
  
  // Silme onay state'leri
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deletingGiderId, setDeletingGiderId] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Server-side pagination state'leri
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);
  const [totalCount, setTotalCount] = React.useState(0);

  React.useEffect(() => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    loadKasalar();
    loadGiderTurleri();
    loadUyeler();
    loadGiderler();
  }, [tenant, baslangic, bitis, filterTuruId, pageIndex, pageSize]);

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

  const loadGiderTurleri = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<GiderTuru[]>('get_gider_turleri', { tenantIdParam: tenant.id });
      setGiderTurleri(result);
      if (result.length > 0 && !giderTuruId) setGiderTuruId(result[0].id);
    } catch (error) {
      console.error('Gider türleri yüklenemedi:', error);
    }
  };

  const loadUyeler = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<Uye[]>('get_uyeler', { tenantIdParam: tenant.id });
      setUyeler(result);
    } catch (error) {
      console.error('Üyeler yüklenemedi:', error);
    }
  };

  const loadGiderler = async () => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const result = await invoke<{
        data: Gider[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>('get_giderler_paginated', {
        tenantIdParam: tenant.id,
        kasaIdFilter: null,
        baslangicTarih: baslangic || null,
        bitisTarih: bitis || null,
        page: pageIndex,
        pageSize: pageSize,
      });
      setGiderler(result.data);
      setTotalCount(result.total);
    } catch (error) {
      console.error('Failed to load giderler:', error);
      toast.error('Giderler yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPageIndex: number, newPageSize: number) => {
    setPageIndex(newPageIndex);
    setPageSize(newPageSize);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) {
      toast.error('Tenant bilgisi bulunamadı!');
      return;
    }
    
    if (!kasaId || !tutar) {
      toast.error('Kasa ve Tutar alanları zorunludur!');
      return;
    }
    
    const tutarNum = parseFloat(tutar);
    if (isNaN(tutarNum) || tutarNum <= 0) {
      toast.error('Geçerli bir tutar girin!');
      return;
    }
    
    // Demirbaş kontrolü
    if (demirbasEkle && !demirbasAdi) {
      toast.error('Demirbaş adı zorunludur!');
      return;
    }
    
    try {
      // Önce gideri oluştur
      const giderId = await invoke<string>('create_gider', {
        tenantIdParam: tenant.id,
        data: {
          kasa_id: kasaId,
          gider_turu_id: giderTuruId || null,
          tarih,
          tutar: tutarNum,
          aciklama: demirbasEkle ? `Demirbaş Alımı: ${demirbasAdi}` : (aciklama || null),
          fatura_no: faturaNo || null,
          alt_kategori: demirbasEkle ? 'DEMIRBAS' : (altKategori || null),
          islem_no: faturaNo || null,
          odeyen: odeyen || null,
          notlar: notlar || null,
          uye_id: selectedUyeId || null,
        },
      });
      
      // Demirbaş ekle işaretliyse demirbaş kaydı oluştur
      if (demirbasEkle && demirbasAdi) {
        try {
          await invoke('create_demirbas', {
            tenantIdParam: tenant.id,
            data: {
              ad: demirbasAdi,
              kategori: demirbasKategori || null,
              marka_model: demirbasMarkaModel || null,
              seri_no: demirbasSeriNo || null,
              alis_tarihi: tarih,
              alis_bedeli: tutarNum,
              konum: demirbasKonum || null,
              durum: DEMIRBAS_DURUMLARI.AKTIF,
              notlar: demirbasNotlar || null,
              gider_id: giderId, // Giderle ilişkilendir
              fatura_no: faturaNo || null,
            },
          });
          toast.success('Gider ve Demirbaş başarıyla eklendi!');
        } catch (demirbasError) {
          console.error('Demirbaş eklenemedi:', demirbasError);
          toast.warning('Gider eklendi ancak demirbaş kaydı oluşturulamadı: ' + demirbasError);
        }
      } else {
        toast.success('Gider başarıyla eklendi!');
      }
      
      setShowForm(false);
      // Form sıfırla
      resetForm();
      loadGiderler();
    } catch (error) {
      console.error('Gider eklenemedi:', error);
      toast.error('Gider eklenemedi: ' + error);
    }
  };
  
  const resetForm = () => {
    setTutar('');
    setAciklama('');
    setFaturaNo('');
    setDemirbasEkle(false);
    setDemirbasAdi('');
    setDemirbasKategori('');
    setDemirbasMarkaModel('');
    setDemirbasSeriNo('');
    setDemirbasAdet(1);
    setDemirbasKonum('');
    setDemirbasNotlar('');
  };

  const handleEdit = (gider: Gider) => {
    setEditingItem(gider);
    setKasaId(gider.kasa_id);
    setTarih(gider.tarih);
    setTutar(gider.tutar.toString());
    setAciklama(gider.aciklama || '');
    setFaturaNo(gider.fatura_no || '');
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !editingItem) return;
    
    if (!kasaId || !tutar) {
      toast.error('Kasa ve Tutar alanları zorunludur!');
      return;
    }
    
    const tutarNum = parseFloat(tutar);
    if (isNaN(tutarNum) || tutarNum <= 0) {
      toast.error('Geçerli bir tutar girin!');
      return;
    }
    
    try {
      await invoke('update_gider', {
        tenantIdParam: tenant.id,
        giderId: editingItem.id,
        data: {
          kasa_id: kasaId,
          gider_turu_id: giderTuruId || null,
          tarih,
          tutar: tutarNum,
          aciklama: aciklama || null,
          fatura_no: faturaNo || null,
          alt_kategori: altKategori || null,
          islem_no: faturaNo || null,
          odeyen: odeyen || null,
          notlar: notlar || null,
        },
      });
      
      toast.success('Gider başarıyla güncellendi!');
      setShowEditModal(false);
      setEditingItem(null);
      loadGiderler();
    } catch (error) {
      console.error('Gider güncellenemedi:', error);
      toast.error('Gider güncellenemedi: ' + error);
    }
  };

  const handleDelete = (giderId: string) => {
    setDeletingGiderId(giderId);
    setShowDeleteConfirm(true);
  };
  
  const confirmDelete = async () => {
    if (!tenant || !deletingGiderId) return;
    
    setDeleteLoading(true);
    try {
      await invoke('delete_gider', {
        tenantIdParam: tenant.id,
        giderId: deletingGiderId,
      });
      
      toast.success('Gider başarıyla silindi!');
      loadGiderler();
    } catch (error) {
      console.error('Gider silinemedi:', error);
      toast.error('Gider silinemedi: ' + error);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
      setDeletingGiderId(null);
    }
  };

  const toplam = giderler.reduce((sum, g) => sum + g.tutar, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Giderler</h1>
          <p className="text-gray-600 mt-1">Gider kayıtları ve takibi</p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="btn-macos flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Gider</span>
        </button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Gider Ekle</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kasa *</label>
                <select
                  value={kasaId}
                  onChange={(e) => setKasaId(e.target.value)}
                  className="input-macos"
                  required
                >
                  {kasalar.map(k => (
                    <option key={k.id} value={k.id}>{k.kasa_adi} ({k.para_birimi})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gider Türü *</label>
                <select
                  value={giderTuruId}
                  onChange={(e) => setGiderTuruId(e.target.value)}
                  className="input-macos"
                  required
                >
                  {giderTurleri.map(t => (
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
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gider Kategorisi</label>
                <input
                  type="text"
                  value={giderTuru}
                  onChange={(e) => setGiderTuru(e.target.value)}
                  className="input-macos"
                  placeholder="Ör: ELEKTRİK, SU, KİRA"
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
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">İlgili Üye (Opsiyonel)</label>
                <select
                  value={selectedUyeId}
                  onChange={(e) => setSelectedUyeId(e.target.value)}
                  className="input-macos"
                >
                  <option value="">Üye Seçilmedi</option>
                  {uyeler.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.uye_no ? `${u.uye_no} - ` : ''}{u.ad} {u.soyad}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ödeyen</label>
                <input
                  type="text"
                  value={odeyen}
                  onChange={(e) => setOdeyen(e.target.value)}
                  className="input-macos"
                  placeholder="Ödemeyi yapan kişi"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fatura No</label>
                <input
                  type="text"
                  value={faturaNo}
                  onChange={(e) => setFaturaNo(e.target.value)}
                  className="input-macos"
                  placeholder="Fatura numarası"
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
                placeholder="Gider detayı..."
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
                belgeTuru="gider"
              />
            )}
            
            {/* Demirbaş Entegrasyonu */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="demirbas-ekle"
                  checked={demirbasEkle}
                  onChange={(e) => setDemirbasEkle(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="demirbas-ekle" className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <Package className="w-4 h-4" />
                  Bu gider ile birlikte demirbaş kaydı oluştur
                </label>
              </div>
              
              {demirbasEkle && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Demirbaş Bilgileri
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Demirbaş Adı *</label>
                      <input
                        type="text"
                        value={demirbasAdi}
                        onChange={(e) => setDemirbasAdi(e.target.value)}
                        className="input-macos"
                        placeholder="Ör: Bilgisayar, Masa, Projeksiyon"
                        required={demirbasEkle}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                      <select
                        value={demirbasKategori}
                        onChange={(e) => setDemirbasKategori(e.target.value)}
                        className="input-macos"
                      >
                        <option value="">Kategori Seçin</option>
                        {DEMIRBAS_KATEGORI_LISTESI.map(k => (
                          <option key={k.value} value={k.value}>{k.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marka / Model</label>
                      <input
                        type="text"
                        value={demirbasMarkaModel}
                        onChange={(e) => setDemirbasMarkaModel(e.target.value)}
                        className="input-macos"
                        placeholder="Ör: HP ProBook 450"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Seri No</label>
                      <input
                        type="text"
                        value={demirbasSeriNo}
                        onChange={(e) => setDemirbasSeriNo(e.target.value)}
                        className="input-macos"
                        placeholder="Seri numarası"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adet</label>
                      <input
                        type="number"
                        min="1"
                        value={demirbasAdet}
                        onChange={(e) => setDemirbasAdet(parseInt(e.target.value) || 1)}
                        className="input-macos"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Konum</label>
                      <input
                        type="text"
                        value={demirbasKonum}
                        onChange={(e) => setDemirbasKonum(e.target.value)}
                        className="input-macos"
                        placeholder="Ör: Dernek Merkezi, Depo"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Demirbaş Notu</label>
                      <input
                        type="text"
                        value={demirbasNotlar}
                        onChange={(e) => setDemirbasNotlar(e.target.value)}
                        className="input-macos"
                        placeholder="Ek bilgi"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Birim fiyat otomatik hesaplanır (Tutar ÷ Adet). Demirbaş "Aktif" durumunda oluşturulur.
                  </p>
                </div>
              )}
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

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gider Düzenle</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdate} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kasa *</label>
                <select
                  value={kasaId}
                  onChange={(e) => setKasaId(e.target.value)}
                  className="input-macos"
                  required
                >
                  {kasalar.map(k => (
                    <option key={k.id} value={k.id}>{k.kasa_adi} ({k.para_birimi})</option>
                  ))}
                </select>
              </div>
              
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
            </div>
            
            <div className="grid grid-cols-2 gap-6">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Fatura No</label>
                <input
                  type="text"
                  value={faturaNo}
                  onChange={(e) => setFaturaNo(e.target.value)}
                  className="input-macos"
                  placeholder="Fatura numarası"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama *</label>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={2}
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
              <button
                type="submit"
                className="btn-macos bg-blue-600 hover:bg-blue-700"
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
                onChange={(e) => { setBaslangic(e.target.value); setPageIndex(0); }}
                className="input-macos"
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş</label>
              <input
                type="date"
                value={bitis}
                onChange={(e) => { setBitis(e.target.value); setPageIndex(0); }}
                className="input-macos"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Gider Türü</label>
              <select
                value={filterTuruId}
                onChange={(e) => { setFilterTuruId(e.target.value); setPageIndex(0); }}
                className="input-macos"
              >
                <option value="">Tüm Türler</option>
                {giderTurleri.map(t => (
                  <option key={t.id} value={t.id}>{t.ad}</option>
                ))}
              </select>
            </div>

            <div className="pt-6">
              <div className="px-6 py-3 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-100">
                <div className="text-xs font-medium text-red-600 mb-1">Toplam Gider</div>
                <div className="text-2xl font-semibold text-red-700">{toplam.toFixed(2)} ₺</div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Üye</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Tutar</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Açıklama</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Fatura No</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Yükleniyor...</span>
                    </div>
                  </td>
                </tr>
              ) : giderler.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
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
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {gider.uye_id ? (
                        <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          {uyeler.find(u => u.id === gider.uye_id)?.ad} {uyeler.find(u => u.id === gider.uye_id)?.soyad || 'Üye'}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-red-600">
                        -{gider.tutar.toFixed(2)} ₺
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {gider.aciklama || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {gider.fatura_no || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(gider);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(gider.id);
                          }}
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

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sayfa başına:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPageIndex(0);
              }}
              className="input-macos py-1 px-2 text-sm w-20"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              Toplam {totalCount} kayıt
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPageIndex(0)}
              disabled={pageIndex === 0}
              className="btn-macos-secondary py-1 px-3 text-sm disabled:opacity-50"
            >
              İlk
            </button>
            <button
              onClick={() => setPageIndex(pageIndex - 1)}
              disabled={pageIndex === 0}
              className="btn-macos-secondary py-1 px-3 text-sm disabled:opacity-50"
            >
              Önceki
            </button>
            <span className="text-sm text-gray-600 px-2">
              {pageIndex + 1} / {Math.ceil(totalCount / pageSize) || 1}
            </span>
            <button
              onClick={() => setPageIndex(pageIndex + 1)}
              disabled={pageIndex >= Math.ceil(totalCount / pageSize) - 1}
              className="btn-macos-secondary py-1 px-3 text-sm disabled:opacity-50"
            >
              Sonraki
            </button>
            <button
              onClick={() => setPageIndex(Math.ceil(totalCount / pageSize) - 1)}
              disabled={pageIndex >= Math.ceil(totalCount / pageSize) - 1}
              className="btn-macos-secondary py-1 px-3 text-sm disabled:opacity-50"
            >
              Son
            </button>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Gideri Sil"
        description="Bu gideri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        cancelText="İptal"
        variant="danger"
        loading={deleteLoading}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default GiderlerPage;
