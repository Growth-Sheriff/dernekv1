import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Edit, Trash2, Users, Plus, X, Pencil, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

interface Uye {
  id: string;
  tc_no: string;
  ad: string;
  soyad: string;
  telefon?: string;
  email?: string;
  adres?: string;
  giris_tarihi: string;
  cikis_tarihi?: string;
  durum: string;
  notlar?: string;
  created_at: string;
  updated_at: string;
}

interface AileUyesi {
  id: string;
  uye_id: string;
  yakinlik: string;
  ad_soyad: string;
  dogum_tarihi?: string;
  telefon?: string;
  tc_no?: string;
  cinsiyet?: string;
  meslek?: string;
  is_yeri?: string;
  egitim_durumu?: string;
  email?: string;
  kan_grubu?: string;
  ozel_durum?: string;
  notlar?: string;
  is_active?: boolean;
  created_at: string;
}

interface AidatTakip {
  id: string;
  uye_id: string;
  yil: number;
  ay: number;
  tutar: number;
  odenen: number;
  odeme_tarihi?: string;
  gecikme_gun: number;
  gecikme_faiz: number;
  durum: string;
  created_at: string;
}

interface UyeGelir {
  id: string;
  tarih: string;
  tutar: number;
  aciklama?: string;
  makbuz_no?: string;
  aidat_id?: string;
  aidat_yil?: number;
  aidat_ay?: number;
}

interface UyeGider {
  id: string;
  tarih: string;
  tutar: number;
  aciklama?: string;
  fatura_no?: string;
}

const aylar = [
  { value: 1, label: 'Ocak' },
  { value: 2, label: 'Şubat' },
  { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' },
  { value: 5, label: 'Mayıs' },
  { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' },
  { value: 8, label: 'Ağustos' },
  { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' },
  { value: 11, label: 'Kasım' },
  { value: 12, label: 'Aralık' },
];

export const UyelerDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [uye, setUye] = React.useState<Uye | null>(null);
  const [aileUyeleri, setAileUyeleri] = React.useState<AileUyesi[]>([]);
  const [aidatlar, setAidatlar] = React.useState<AidatTakip[]>([]);
  const [gelirler, setGelirler] = React.useState<UyeGelir[]>([]);
  const [giderler, setGiderler] = React.useState<UyeGider[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAileForm, setShowAileForm] = React.useState(false);
  
  // Delete confirmation states
  const [showDeleteUyeConfirm, setShowDeleteUyeConfirm] = React.useState(false);
  const [showDeleteAileConfirm, setShowDeleteAileConfirm] = React.useState(false);
  const [deletingAileUyeId, setDeletingAileUyeId] = React.useState<string | null>(null);
  
  // Aile üyesi form state
  const [yakinlik, setYakinlik] = React.useState<string>('');
  const [adSoyad, setAdSoyad] = React.useState<string>('');
  const [dogumTarihi, setDogumTarihi] = React.useState<string>('');
  const [aileTelefon, setAileTelefon] = React.useState<string>('');
  const [aileTcNo, setAileTcNo] = React.useState<string>('');
  const [aileCinsiyet, setAileCinsiyet] = React.useState<string>('');
  const [aileMeslek, setAileMeslek] = React.useState<string>('');
  const [aileIsYeri, setAileIsYeri] = React.useState<string>('');
  const [aileEgitimDurumu, setAileEgitimDurumu] = React.useState<string>('');
  const [aileEmail, setAileEmail] = React.useState<string>('');
  const [aileKanGrubu, setAileKanGrubu] = React.useState<string>('');
  const [aileOzelDurum, setAileOzelDurum] = React.useState<string>('');
  const [aileNotlar, setAileNotlar] = React.useState<string>('');
  const [editingAileUyesi, setEditingAileUyesi] = React.useState<AileUyesi | null>(null);

  React.useEffect(() => {
    if (!tenant || !id) return;
    
    const loadUye = async () => {
      try {
        setLoading(true);
        const result = await invoke<Uye>('get_uye_by_id', {
          tenantIdParam: tenant.id,
          uyeId: id,
        });
        setUye(result);
      } catch (error) {
        console.error('Failed to load uye:', error);
        toast.error('Üye yüklenemedi: ' + error);
      } finally {
        setLoading(false);
      }
    };
    
    const loadAileUyeleri = async () => {
      try {
        const result = await invoke<AileUyesi[]>('get_aile_uyeleri', {
          tenantIdParam: tenant.id,
          uyeId: id,
        });
        setAileUyeleri(result);
      } catch (error) {
        console.error('Aile üyeleri yüklenemedi:', error);
      }
    };

    const loadAidatlar = async () => {
      try {
        const result = await invoke<AidatTakip[]>('get_aidat_takip', {
          tenantIdParam: tenant.id,
          filterUyeId: id,
          filterYil: null,
          filterAy: null,
          filterDurum: null,
          skip: 0,
          limit: 100,
        });
        setAidatlar(result);
      } catch (error) {
        console.error('Aidatlar yüklenemedi:', error);
      }
    };

    const loadGelirler = async () => {
      try {
        // Güvenli backend filtreleme - sadece bu üyeye ait gelirler
        const uyeGelirler = await invoke<any[]>('get_uyeye_ait_gelirler', {
          tenantIdParam: tenant.id,
          uyeId: id,
        });
        setGelirler(uyeGelirler);
      } catch (error) {
        console.error('Gelirler yüklenemedi:', error);
        setGelirler([]);
      }
    };

    const loadGiderler = async () => {
      try {
        // NOT: Giderler tablosunda uye_id yok, tüm giderleri client-side filtrele
        const allGiderler = await invoke<any[]>('get_giderler', {
          tenantIdParam: tenant.id,
          baslangicTarih: null,
          bitisTarih: null,
          giderTuruId: null,
          skip: 0,
          limit: 1000,
        });
        setGiderler(allGiderler.filter(g => g.uye_id === id));
      } catch (error) {
        console.error('Giderler yüklenemedi:', error);
        setGiderler([]);
      }
    };

    loadUye();
    loadAileUyeleri();
    loadAidatlar();
    loadGelirler();
    loadGiderler();
  }, [tenant, id]);

  const handleDelete = async () => {
    if (!tenant || !id) return;

    try {
      await invoke('delete_uye', {
        tenantIdParam: tenant.id,
        uyeId: id,
      });
      toast.success('Üye başarıyla silindi');
      navigate('/uyeler');
    } catch (error) {
      console.error('Failed to delete uye:', error);
      toast.error('Üye silinemedi: ' + error);
    }
    setShowDeleteUyeConfirm(false);
  };
  
  const handleAddAileUyesi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !id) return;
    
    try {
      const data = {
        uye_id: id,
        yakinlik,
        ad_soyad: adSoyad,
        dogum_tarihi: dogumTarihi || null,
        telefon: aileTelefon || null,
        tc_no: aileTcNo || null,
        cinsiyet: aileCinsiyet || null,
        meslek: aileMeslek || null,
        is_yeri: aileIsYeri || null,
        egitim_durumu: aileEgitimDurumu || null,
        email: aileEmail || null,
        kan_grubu: aileKanGrubu || null,
        ozel_durum: aileOzelDurum || null,
        notlar: aileNotlar || null,
      };
      
      if (editingAileUyesi) {
        await invoke('update_aile_uyesi', {
          tenantIdParam: tenant.id,
          aileUyeId: editingAileUyesi.id,
          request: data,
        });
        toast.success('Aile üyesi güncellendi!');
      } else {
        await invoke('create_aile_uyesi', {
          tenantIdParam: tenant.id,
          request: data,
        });
        toast.success('Aile üyesi eklendi!');
      }
      
      setShowAileForm(false);
      resetAileForm();
      
      // Listeyi yenile
      const result = await invoke<AileUyesi[]>('get_aile_uyeleri', {
        tenantIdParam: tenant.id,
        uyeId: id,
      });
      setAileUyeleri(result);
    } catch (error) {
      console.error('Aile üyesi işlemi başarısız:', error);
      toast.error('İşlem başarısız: ' + error);
    }
  };
  
  const resetAileForm = () => {
    setYakinlik('');
    setAdSoyad('');
    setDogumTarihi('');
    setAileTelefon('');
    setAileTcNo('');
    setAileCinsiyet('');
    setAileMeslek('');
    setAileIsYeri('');
    setAileEgitimDurumu('');
    setAileEmail('');
    setAileKanGrubu('');
    setAileOzelDurum('');
    setAileNotlar('');
    setEditingAileUyesi(null);
  };
  
  const handleEditAileUyesi = (aile: AileUyesi) => {
    setEditingAileUyesi(aile);
    setYakinlik(aile.yakinlik || '');
    setAdSoyad(aile.ad_soyad || '');
    setDogumTarihi(aile.dogum_tarihi || '');
    setAileTelefon(aile.telefon || '');
    setAileTcNo(aile.tc_no || '');
    setAileCinsiyet(aile.cinsiyet || '');
    setAileMeslek(aile.meslek || '');
    setAileIsYeri(aile.is_yeri || '');
    setAileEgitimDurumu(aile.egitim_durumu || '');
    setAileEmail(aile.email || '');
    setAileKanGrubu(aile.kan_grubu || '');
    setAileOzelDurum(aile.ozel_durum || '');
    setAileNotlar(aile.notlar || '');
    setShowAileForm(true);
  };
  
  const confirmDeleteAileUyesi = (aileUyeId: string) => {
    setDeletingAileUyeId(aileUyeId);
    setShowDeleteAileConfirm(true);
  };
  
  const handleDeleteAileUyesi = async () => {
    if (!tenant || !deletingAileUyeId) return;
    
    try {
      await invoke('delete_aile_uyesi', {
        tenantIdParam: tenant.id,
        aileUyeId: deletingAileUyeId,
      });
      
      toast.success('Aile üyesi silindi');
      setAileUyeleri(aileUyeleri.filter(au => au.id !== deletingAileUyeId));
    } catch (error) {
      console.error('Aile üyesi silinemedi:', error);
      toast.error('Aile üyesi silinemedi: ' + error);
    }
    setShowDeleteAileConfirm(false);
    setDeletingAileUyeId(null);
  };

  if (loading) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

  if (!uye) {
    return <div className="p-6 text-center text-red-600">Üye bulunamadı</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/uyeler')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {uye.ad} {uye.soyad}
            </h1>
            <p className="text-gray-600 mt-1">Üye Detayları</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button className="flex items-center px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
            <Edit className="h-4 w-4 mr-2" />
            Düzenle
          </button>
          <button
            onClick={() => setShowDeleteUyeConfirm(true)}
            className="flex items-center px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Sil
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500">TC Kimlik No</label>
              <p className="mt-1 text-lg text-gray-900">{uye.tc_no}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Durum</label>
              <span className={`inline-flex mt-1 px-3 py-1 text-sm font-semibold rounded-full ${
                uye.durum === 'aktif' ? 'bg-green-100 text-green-800' :
                uye.durum === 'pasif' ? 'bg-gray-100 text-gray-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {uye.durum}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Telefon</label>
              <p className="mt-1 text-lg text-gray-900">{uye.telefon || '-'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="mt-1 text-lg text-gray-900">{uye.email || '-'}</p>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-500">Adres</label>
              <p className="mt-1 text-gray-900">{uye.adres || '-'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Giriş Tarihi</label>
              <p className="mt-1 text-gray-900">
                {new Date(uye.giris_tarihi).toLocaleDateString('tr-TR')}
              </p>
            </div>

            {uye.cikis_tarihi && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Çıkış Tarihi</label>
                <p className="mt-1 text-gray-900">
                  {new Date(uye.cikis_tarihi).toLocaleDateString('tr-TR')}
                </p>
              </div>
            )}

            {uye.notlar && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500">Notlar</label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{uye.notlar}</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="text-sm text-gray-500">
            <p>Oluşturulma: {new Date(uye.created_at).toLocaleString('tr-TR')}</p>
            <p>Son Güncelleme: {new Date(uye.updated_at).toLocaleString('tr-TR')}</p>
          </div>
        </div>
      </div>
      
      {/* Aile Üyeleri Section */}
      <div className="card-macos">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Aile Üyeleri</h2>
            </div>
            <button
              onClick={() => {
                resetAileForm();
                setShowAileForm(true);
              }}
              className="btn-macos flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Aile Üyesi Ekle</span>
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {aileUyeleri.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">Henüz aile üyesi kaydı yok</p>
              <p className="text-xs text-gray-400 mt-1">Yukarıdaki butonu kullanarak ekleyebilirsiniz</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {aileUyeleri.map((aile) => (
                <div
                  key={aile.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    aile.is_active === false ? 'bg-gray-100 opacity-60' : 'bg-gray-50/50 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">
                        {aile.yakinlik}
                      </span>
                      {aile.cinsiyet && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                          {aile.cinsiyet}
                        </span>
                      )}
                      {aile.is_active === false && (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                          Pasif
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditAileUyesi(aile)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmDeleteAileUyesi(aile.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-gray-900 mb-2">{aile.ad_soyad}</h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {aile.tc_no && (
                      <div>
                        <p className="text-xs text-gray-500">TC No</p>
                        <p className="text-gray-900">{aile.tc_no}</p>
                      </div>
                    )}
                    {aile.dogum_tarihi && (
                      <div>
                        <p className="text-xs text-gray-500">Doğum Tarihi</p>
                        <p className="text-gray-900">{new Date(aile.dogum_tarihi).toLocaleDateString('tr-TR')}</p>
                      </div>
                    )}
                    {aile.telefon && (
                      <div>
                        <p className="text-xs text-gray-500">Telefon</p>
                        <p className="text-gray-900">{aile.telefon}</p>
                      </div>
                    )}
                    {aile.email && (
                      <div>
                        <p className="text-xs text-gray-500">E-posta</p>
                        <p className="text-gray-900">{aile.email}</p>
                      </div>
                    )}
                    {aile.meslek && (
                      <div>
                        <p className="text-xs text-gray-500">Meslek</p>
                        <p className="text-gray-900">{aile.meslek}</p>
                      </div>
                    )}
                    {aile.is_yeri && (
                      <div>
                        <p className="text-xs text-gray-500">İş Yeri</p>
                        <p className="text-gray-900">{aile.is_yeri}</p>
                      </div>
                    )}
                    {aile.egitim_durumu && (
                      <div>
                        <p className="text-xs text-gray-500">Eğitim</p>
                        <p className="text-gray-900">{aile.egitim_durumu}</p>
                      </div>
                    )}
                    {aile.kan_grubu && (
                      <div>
                        <p className="text-xs text-gray-500">Kan Grubu</p>
                        <p className="text-gray-900">{aile.kan_grubu}</p>
                      </div>
                    )}
                  </div>
                  
                  {(aile.ozel_durum || aile.notlar) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {aile.ozel_durum && (
                        <p className="text-xs text-orange-600">Özel Durum: {aile.ozel_durum}</p>
                      )}
                      {aile.notlar && (
                        <p className="text-xs text-gray-500 mt-1">Not: {aile.notlar}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Aidatlar Section */}
      <div className="card-macos">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Aidat Takibi</h2>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Aidat Özet Kartları */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-600 font-medium">Toplam Aidat</p>
              <p className="text-xl font-bold text-blue-700">
                {aidatlar.reduce((sum, a) => sum + a.tutar, 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-green-600 font-medium">Ödenen</p>
              <p className="text-xl font-bold text-green-700">
                {aidatlar.reduce((sum, a) => sum + a.odenen, 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-xs text-red-600 font-medium">Kalan Borç</p>
              <p className="text-xl font-bold text-red-700">
                {aidatlar.reduce((sum, a) => sum + (a.tutar - a.odenen), 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-xs text-orange-600 font-medium">Geciken</p>
              <p className="text-xl font-bold text-orange-700">
                {aidatlar.filter(a => a.durum === 'gecikti' || (a.tutar - a.odenen > 0 && a.durum !== 'odendi')).length} adet
              </p>
            </div>
          </div>
          
          {aidatlar.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">Henüz aidat kaydı yok</p>
              <p className="text-xs text-gray-400 mt-1">Aidat modülünden bu üyeye aidat tanımlayabilirsiniz</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Dönem</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Tutar</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Ödenen</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Kalan</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Durum</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Ödeme Tarihi</th>
                  </tr>
                </thead>
                <tbody>
                  {aidatlar.map((aidat) => (
                    <tr key={aidat.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {aylar.find(a => a.value === aidat.ay)?.label} {aidat.yil}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {aidat.tutar.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td className="py-3 px-4 text-right text-green-600">
                        {aidat.odenen.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td className="py-3 px-4 text-right text-orange-600">
                        {(aidat.tutar - aidat.odenen).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          aidat.durum === 'odendi' 
                            ? 'bg-green-100 text-green-700' 
                            : aidat.durum === 'gecikti'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {aidat.durum === 'odendi' ? 'Ödendi' : aidat.durum === 'gecikti' ? 'Gecikti' : 'Bekliyor'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600">
                        {aidat.odeme_tarihi 
                          ? new Date(aidat.odeme_tarihi).toLocaleDateString('tr-TR')
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Gelir Geçmişi */}
      <div className="card-macos">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Gelir Geçmişi</h2>
            <span className="ml-auto text-sm text-gray-500">
              Toplam: {gelirler.reduce((sum, g) => sum + g.tutar, 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </span>
          </div>
        </div>
        
        <div className="p-6">
          {gelirler.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Bu üyeyle ilişkili gelir kaydı yok</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Tarih</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Tutar</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Açıklama</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Makbuz No</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Kaynak</th>
                  </tr>
                </thead>
                <tbody>
                  {gelirler.map((gelir) => (
                    <tr key={gelir.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{new Date(gelir.tarih).toLocaleDateString('tr-TR')}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">
                        +{gelir.tutar.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{gelir.aciklama || '-'}</td>
                      <td className="py-3 px-4 text-gray-500">{gelir.makbuz_no || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        {gelir.aidat_id ? (
                          <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                            💰 Aidat {gelir.aidat_ay && gelir.aidat_yil ? `${aylar[gelir.aidat_ay - 1]} ${gelir.aidat_yil}` : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Gider Geçmişi */}
      <div className="card-macos">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Gider Geçmişi</h2>
            <span className="ml-auto text-sm text-gray-500">
              Toplam: {giderler.reduce((sum, g) => sum + g.tutar, 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </span>
          </div>
        </div>
        
        <div className="p-6">
          {giderler.length === 0 ? (
            <div className="text-center py-8">
              <TrendingDown className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Bu üyeyle ilişkili gider kaydı yok</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Tarih</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Tutar</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Açıklama</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Fatura No</th>
                  </tr>
                </thead>
                <tbody>
                  {giderler.map((gider) => (
                    <tr key={gider.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{new Date(gider.tarih).toLocaleDateString('tr-TR')}</td>
                      <td className="py-3 px-4 text-right text-red-600 font-medium">
                        -{gider.tutar.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{gider.aciklama || '-'}</td>
                      <td className="py-3 px-4 text-gray-500">{gider.fatura_no || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Aile Üyesi Ekle/Düzenle Modal */}
      <Dialog open={showAileForm} onOpenChange={(open) => { if (!open) { resetAileForm(); } setShowAileForm(open); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAileUyesi ? 'Aile Üyesini Düzenle' : 'Aile Üyesi Ekle'}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAddAileUyesi} className="space-y-6 px-6 py-4">
            {/* Temel Bilgiler */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Temel Bilgiler</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Yakınlık *</label>
                  <select
                    value={yakinlik}
                    onChange={(e) => setYakinlik(e.target.value)}
                    className="input-macos"
                    required
                  >
                    <option value="">Seçiniz...</option>
                    <option value="Eş">Eş</option>
                    <option value="Çocuk">Çocuk</option>
                    <option value="Anne">Anne</option>
                    <option value="Baba">Baba</option>
                    <option value="Kardeş">Kardeş</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad *</label>
                  <input
                    type="text"
                    value={adSoyad}
                    onChange={(e) => setAdSoyad(e.target.value)}
                    className="input-macos"
                    placeholder="Ad Soyad"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">TC Kimlik No</label>
                  <input
                    type="text"
                    value={aileTcNo}
                    onChange={(e) => setAileTcNo(e.target.value)}
                    className="input-macos"
                    placeholder="11 haneli TC No"
                    maxLength={11}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cinsiyet</label>
                  <select
                    value={aileCinsiyet}
                    onChange={(e) => setAileCinsiyet(e.target.value)}
                    className="input-macos"
                  >
                    <option value="">Seçiniz...</option>
                    <option value="Erkek">Erkek</option>
                    <option value="Kadın">Kadın</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Doğum Tarihi</label>
                  <input
                    type="date"
                    value={dogumTarihi}
                    onChange={(e) => setDogumTarihi(e.target.value)}
                    className="input-macos"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kan Grubu</label>
                  <select
                    value={aileKanGrubu}
                    onChange={(e) => setAileKanGrubu(e.target.value)}
                    className="input-macos"
                  >
                    <option value="">Seçiniz...</option>
                    <option value="A+">A Rh+</option>
                    <option value="A-">A Rh-</option>
                    <option value="B+">B Rh+</option>
                    <option value="B-">B Rh-</option>
                    <option value="AB+">AB Rh+</option>
                    <option value="AB-">AB Rh-</option>
                    <option value="0+">0 Rh+</option>
                    <option value="0-">0 Rh-</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* İletişim Bilgileri */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">İletişim Bilgileri</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={aileTelefon}
                    onChange={(e) => setAileTelefon(e.target.value)}
                    className="input-macos"
                    placeholder="555 123 4567"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                  <input
                    type="email"
                    value={aileEmail}
                    onChange={(e) => setAileEmail(e.target.value)}
                    className="input-macos"
                    placeholder="ornek@email.com"
                  />
                </div>
              </div>
            </div>
            
            {/* Meslek ve Eğitim */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Meslek ve Eğitim</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meslek</label>
                  <input
                    type="text"
                    value={aileMeslek}
                    onChange={(e) => setAileMeslek(e.target.value)}
                    className="input-macos"
                    placeholder="Meslek"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">İş Yeri</label>
                  <input
                    type="text"
                    value={aileIsYeri}
                    onChange={(e) => setAileIsYeri(e.target.value)}
                    className="input-macos"
                    placeholder="İş yeri adı"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Eğitim Durumu</label>
                  <select
                    value={aileEgitimDurumu}
                    onChange={(e) => setAileEgitimDurumu(e.target.value)}
                    className="input-macos"
                  >
                    <option value="">Seçiniz...</option>
                    <option value="İlkokul">İlkokul</option>
                    <option value="Ortaokul">Ortaokul</option>
                    <option value="Lise">Lise</option>
                    <option value="Üniversite">Üniversite</option>
                    <option value="Lisansüstü">Lisansüstü</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Ek Bilgiler */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Ek Bilgiler</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Özel Durum</label>
                  <input
                    type="text"
                    value={aileOzelDurum}
                    onChange={(e) => setAileOzelDurum(e.target.value)}
                    className="input-macos"
                    placeholder="Engel durumu, kronik hastalık vb."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
                  <input
                    type="text"
                    value={aileNotlar}
                    onChange={(e) => setAileNotlar(e.target.value)}
                    className="input-macos"
                    placeholder="Ek notlar"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <button
                type="button"
                onClick={() => { resetAileForm(); setShowAileForm(false); }}
                className="btn-macos-secondary"
              >
                İptal
              </button>
              <button
                type="submit"
                className="btn-macos"
              >
                {editingAileUyesi ? 'Güncelle' : 'Kaydet'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Üye Silme Onay Dialog */}
      <ConfirmDialog
        open={showDeleteUyeConfirm}
        onOpenChange={setShowDeleteUyeConfirm}
        title="Üyeyi Sil"
        description="Bu üyeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        cancelText="İptal"
        variant="danger"
        onConfirm={handleDelete}
      />
      
      {/* Aile Üyesi Silme Onay Dialog */}
      <ConfirmDialog
        open={showDeleteAileConfirm}
        onOpenChange={setShowDeleteAileConfirm}
        title="Aile Üyesini Sil"
        description="Bu aile üyesini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        cancelText="İptal"
        variant="danger"
        onConfirm={handleDeleteAileUyesi}
      />
    </div>
  );
};

export default UyelerDetailPage;
