import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Clock, Calendar, Landmark, Banknote, Pencil, CreditCard, ArrowLeftRight } from 'lucide-react';
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
  devir_bakiye?: number;
  toplam_gelir?: number;
  toplam_gider?: number;
  virman_giris?: number;
  virman_cikis?: number;
  is_active: boolean;
  created_at: string;
}

interface Hareket {
  id: string;
  tip: string;
  tutar: number;
  aciklama?: string;
  tarih: string;
  kategori?: string;
}

interface VadeliIslem {
  id: string;
  kasa_id?: string;
  islem_tipi: string;
  tutar: number;
  aciklama?: string;
  vade_tarihi: string;
  durum: string;
}

interface Virman {
  id: string;
  kaynak_kasa_id: string;
  hedef_kasa_id: string;
  tutar: number;
  aciklama?: string;
  tarih: string;
}

export const KasaDetayPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [kasa, setKasa] = React.useState<Kasa | null>(null);
  const [hareketler, setHareketler] = React.useState<Hareket[]>([]);
  const [vadeliIslemler, setVadeliIslemler] = React.useState<VadeliIslem[]>([]);
  const [virmanlar, setVirmanlar] = React.useState<Virman[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'hareketler' | 'vadeli' | 'virman'>('hareketler');

  React.useEffect(() => {
    if (tenant && id) {
      loadData();
    }
  }, [tenant, id]);

  const loadData = async () => {
    if (!tenant || !id) return;
    
    try {
      setLoading(true);
      // Kasa bilgisi
      const kasaResult = await invoke<Kasa[]>('get_kasalar', {
        tenantIdParam: tenant.id,
      });
      const kasaData = kasaResult.find(k => k.id === id);
      setKasa(kasaData || null);

      // Son hareketler (gelirler + giderler)
      const [gelirlerResult, giderlerResult] = await Promise.all([
        invoke<any[]>('get_gelirler', { tenantIdParam: tenant.id, skip: 0, limit: 1000 }),
        invoke<any[]>('get_giderler', { tenantIdParam: tenant.id, skip: 0, limit: 1000 }),
      ]);
      
      const gelirHareketler = gelirlerResult
        .filter(g => g.kasa_id === id)
        .map(g => ({
          id: g.id,
          tip: 'Gelir',
          tutar: g.tutar,
          aciklama: g.aciklama,
          tarih: g.tarih,
          kategori: g.tur_adi,
        }));
      
      const giderHareketler = giderlerResult
        .filter(g => g.kasa_id === id)
        .map(g => ({
          id: g.id,
          tip: 'Gider',
          tutar: g.tutar,
          aciklama: g.aciklama,
          tarih: g.tarih,
          kategori: g.tur_adi,
        }));
      
      const tumHareketler = [...gelirHareketler, ...giderHareketler]
        .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime())
        .slice(0, 50);
      
      setHareketler(tumHareketler);

      // Vadeli işlemler - bu kasaya ait
      try {
        const vadeliResult = await invoke<VadeliIslem[]>('get_vadeli_islemler', {
          tenantIdParam: tenant.id,
          durum: 'Bekleyen',
        });
        setVadeliIslemler(vadeliResult.filter(v => v.kasa_id === id));
      } catch (e) {
        console.error('Vadeli işlemler yüklenemedi:', e);
      }

      // Virmanlar - bu kasaya giren/çıkan
      try {
        const virmanResult = await invoke<Virman[]>('get_virmanlar', {
          tenantIdParam: tenant.id,
        });
        setVirmanlar(virmanResult.filter(v => v.kaynak_kasa_id === id || v.hedef_kasa_id === id));
      } catch (e) {
        console.error('Virmanlar yüklenemedi:', e);
      }
    } catch (error) {
      console.error('Failed to load kasa detay:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const getKasaTipiIcon = (tip?: string) => {
    switch (tip) {
      case 'Banka': return <Landmark className="h-10 w-10 text-blue-600" />;
      default: return <Banknote className="h-10 w-10 text-green-600" />;
    }
  };

  // Özet hesapla
  const toplamGelir = hareketler.filter(h => h.tip === 'Gelir').reduce((sum, h) => sum + h.tutar, 0);
  const toplamGider = hareketler.filter(h => h.tip === 'Gider').reduce((sum, h) => sum + h.tutar, 0);
  const bekleyenVadeli = vadeliIslemler.filter(v => v.durum === 'Bekleyen');
  const bekleyenGelir = bekleyenVadeli.filter(v => v.islem_tipi === 'Gelir').reduce((sum, v) => sum + v.tutar, 0);
  const bekleyenGider = bekleyenVadeli.filter(v => v.islem_tipi === 'Gider').reduce((sum, v) => sum + v.tutar, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!kasa) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Kasa bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/mali/kasalar')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              {getKasaTipiIcon(kasa.kasa_tipi)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{kasa.kasa_adi}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                  {kasa.kasa_tipi || 'Nakit'}
                </span>
                {kasa.banka_adi && (
                  <span className="text-sm text-gray-500">{kasa.banka_adi}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/mali/kasalar')}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <Pencil className="h-4 w-4" />
          Düzenle
        </button>
      </div>

      {/* Bakiye ve Özet Kartları */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Mevcut Bakiye</p>
            <Wallet className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(kasa.bakiye)}</p>
          {kasa.devir_bakiye && kasa.devir_bakiye > 0 && (
            <p className="text-xs text-gray-500 mt-1">Devir: {formatCurrency(kasa.devir_bakiye)}</p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Toplam Gelir</p>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(kasa.toplam_gelir || toplamGelir)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Toplam Gider</p>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(kasa.toplam_gider || toplamGider)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Virman Net</p>
            <ArrowLeftRight className="h-5 w-5 text-purple-600" />
          </div>
          <p className={`text-2xl font-bold ${(kasa.virman_giris || 0) - (kasa.virman_cikis || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency((kasa.virman_giris || 0) - (kasa.virman_cikis || 0))}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Giriş: {formatCurrency(kasa.virman_giris || 0)} | Çıkış: {formatCurrency(kasa.virman_cikis || 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Beklenen Net</p>
            <Clock className="h-5 w-5 text-orange-600" />
          </div>
          <p className={`text-2xl font-bold ${bekleyenGelir - bekleyenGider >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(bekleyenGelir - bekleyenGider)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Vadeli işlemler</p>
        </div>
      </div>

      {/* Banka Bilgileri */}
      {kasa.kasa_tipi === 'Banka' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-medium mb-4">Banka Bilgileri</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Banka</p>
              <p className="font-medium">{kasa.banka_adi || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Şube</p>
              <p className="font-medium">{kasa.sube || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Hesap No</p>
              <p className="font-medium">{kasa.hesap_no || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">IBAN</p>
              <p className="font-mono text-sm">{kasa.iban || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('hareketler')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'hareketler'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Son Hareketler ({hareketler.length})
            </button>
            <button
              onClick={() => setActiveTab('vadeli')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'vadeli'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Vadeli İşlemler ({bekleyenVadeli.length})
            </button>
            <button
              onClick={() => setActiveTab('virman')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'virman'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Virmanlar ({virmanlar.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'hareketler' && (
            <>
              {hareketler.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz hareket bulunmuyor</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Tarih</th>
                      <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Tip</th>
                      <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Kategori</th>
                      <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Açıklama</th>
                      <th className="text-right px-4 py-2 text-sm font-medium text-gray-600">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {hareketler.map((h) => (
                      <tr key={h.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{formatDate(h.tarih)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            h.tip === 'Gelir' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {h.tip}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{h.kategori || '-'}</td>
                        <td className="px-4 py-3 text-sm">{h.aciklama || '-'}</td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${
                          h.tip === 'Gelir' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {h.tip === 'Gelir' ? '+' : '-'}{formatCurrency(h.tutar)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {activeTab === 'vadeli' && (
            <>
              {bekleyenVadeli.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Bekleyen vadeli işlem bulunmuyor</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Vade Tarihi</th>
                      <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Tip</th>
                      <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Açıklama</th>
                      <th className="text-right px-4 py-2 text-sm font-medium text-gray-600">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bekleyenVadeli.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{formatDate(v.vade_tarihi)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            v.islem_tipi === 'Gelir' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {v.islem_tipi}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{v.aciklama || '-'}</td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${
                          v.islem_tipi === 'Gelir' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(v.tutar)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {activeTab === 'virman' && (
            <>
              {virmanlar.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Bu kasayla ilgili virman bulunmuyor</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Tarih</th>
                      <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Yön</th>
                      <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Açıklama</th>
                      <th className="text-right px-4 py-2 text-sm font-medium text-gray-600">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {virmanlar.map((v) => {
                      const isGiris = v.hedef_kasa_id === id;
                      return (
                        <tr key={v.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{formatDate(v.tarih)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              isGiris ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {isGiris ? 'Giriş' : 'Çıkış'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{v.aciklama || '-'}</td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${
                            isGiris ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {isGiris ? '+' : '-'}{formatCurrency(v.tutar)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default KasaDetayPage;
