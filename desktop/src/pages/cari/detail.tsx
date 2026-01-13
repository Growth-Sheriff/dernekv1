import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Building2, Pencil, Phone, Mail, MapPin, Plus, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Cari {
  id: string;
  cari_kodu?: string;
  tip: string;
  unvan: string;
  yetkili_kisi?: string;
  vergi_dairesi?: string;
  vergi_no?: string;
  telefon?: string;
  telefon2?: string;
  email?: string;
  web?: string;
  adres?: string;
  il?: string;
  ilce?: string;
  banka_adi?: string;
  iban?: string;
  odeme_vade?: number;
  risk_limiti?: number;
  borc_bakiye?: number;
  alacak_bakiye?: number;
  notlar?: string;
  is_active?: number;
  created_at?: string;
}

interface CariHareket {
  id: string;
  hareket_tipi: string;
  tutar: number;
  aciklama?: string;
  tarih: string;
  belge_no?: string;
}

export const CariDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [cari, setCari] = React.useState<Cari | null>(null);
  const [hareketler, setHareketler] = React.useState<CariHareket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showOdemeModal, setShowOdemeModal] = React.useState(false);
  const [odemeForm, setOdemeForm] = React.useState({
    tutar: '',
    aciklama: '',
    belge_no: '',
  });

  React.useEffect(() => {
    if (tenant && id) {
      loadData();
    }
  }, [tenant, id]);

  const loadData = async () => {
    if (!tenant || !id) return;
    
    try {
      setLoading(true);
      const [cariResult, hareketResult] = await Promise.all([
        invoke<Cari>('get_cari', {
          tenantIdParam: tenant.id,
          cariId: id,
        }),
        invoke<CariHareket[]>('get_cari_hareketler', {
          tenantIdParam: tenant.id,
          cariId: id,
        }),
      ]);
      setCari(cariResult);
      setHareketler(hareketResult);
    } catch (error) {
      console.error('Failed to load cari:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOdemeKaydet = async () => {
    if (!tenant || !id || !odemeForm.tutar) return;
    
    try {
      await invoke('odeme_kaydet_cari', {
        tenantIdParam: tenant.id,
        cariId: id,
        tutar: parseFloat(odemeForm.tutar),
        aciklama: odemeForm.aciklama || null,
        belgeNo: odemeForm.belge_no || null,
      });
      setShowOdemeModal(false);
      setOdemeForm({ tutar: '', aciklama: '', belge_no: '' });
      loadData();
    } catch (error) {
      console.error('Failed to save odeme:', error);
      alert('Ödeme kaydedilemedi: ' + error);
    }
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '₺0';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const getTipBadge = (tip?: string) => {
    switch (tip) {
      case 'Müşteri': return 'bg-blue-100 text-blue-800';
      case 'Tedarikçi': return 'bg-purple-100 text-purple-800';
      case 'Hem Müşteri Hem Tedarikçi': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHareketBadge = (tip: string) => {
    if (tip === 'Borç') return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!cari) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cari bulunamadı</p>
      </div>
    );
  }

  const netBakiye = (cari.borc_bakiye || 0) - (cari.alacak_bakiye || 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/cari')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">{cari.unvan}</h1>
                <span className={`px-2 py-1 text-xs rounded-full ${getTipBadge(cari.tip)}`}>
                  {cari.tip}
                </span>
                {cari.is_active === 0 && (
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-600">
                    Pasif
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm">
                {cari.cari_kodu} • {cari.yetkili_kisi}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowOdemeModal(true)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Ödeme Kaydet
          </button>
          <button
            onClick={() => navigate(`/cari/${id}/edit`)}
            className="btn-macos flex items-center gap-2"
          >
            <Pencil className="h-4 w-4" />
            Düzenle
          </button>
        </div>
      </div>

      {/* Bakiye Kartları */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Borç</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(cari.borc_bakiye)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Alacak</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(cari.alacak_bakiye)}</p>
            </div>
          </div>
        </div>
        <div className={`bg-white rounded-xl p-6 shadow-sm border ${netBakiye > 0 ? 'ring-2 ring-red-200' : netBakiye < 0 ? 'ring-2 ring-green-200' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${netBakiye > 0 ? 'bg-red-100' : netBakiye < 0 ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Building2 className={`h-5 w-5 ${netBakiye > 0 ? 'text-red-600' : netBakiye < 0 ? 'text-green-600' : 'text-gray-600'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Net Bakiye</p>
              <p className={`text-2xl font-bold ${netBakiye > 0 ? 'text-red-600' : netBakiye < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                {formatCurrency(Math.abs(netBakiye))}
              </p>
              <p className="text-xs text-gray-500">{netBakiye > 0 ? 'Borçlu' : netBakiye < 0 ? 'Alacaklı' : 'Denk'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Sol Panel - Detaylar */}
        <div className="col-span-2 space-y-6">
          {/* Cari Hareketleri */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Cari Hareketleri</h3>
            </div>
            {hareketler.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Henüz hareket bulunmuyor</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Tarih</th>
                      <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Tip</th>
                      <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Açıklama</th>
                      <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Belge No</th>
                      <th className="text-right px-4 py-2 text-sm font-medium text-gray-600">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {hareketler.map((h) => (
                      <tr key={h.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">{formatDate(h.tarih)}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getHareketBadge(h.hareket_tipi)}`}>
                            {h.hareket_tipi}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">{h.aciklama || '-'}</td>
                        <td className="px-4 py-2 text-sm font-mono">{h.belge_no || '-'}</td>
                        <td className={`px-4 py-2 text-sm text-right font-medium ${h.hareket_tipi === 'Borç' ? 'text-red-600' : 'text-green-600'}`}>
                          {h.hareket_tipi === 'Borç' ? '-' : '+'}{formatCurrency(h.tutar)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sağ Panel */}
        <div className="space-y-6">
          {/* İletişim Bilgileri */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-medium mb-4">İletişim Bilgileri</h3>
            <div className="space-y-4">
              {cari.telefon && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{cari.telefon}</p>
                    {cari.telefon2 && <p className="text-sm text-gray-500">{cari.telefon2}</p>}
                  </div>
                </div>
              )}
              {cari.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{cari.email}</p>
                    {cari.web && <a href={cari.web} target="_blank" className="text-sm text-blue-600 hover:underline">{cari.web}</a>}
                  </div>
                </div>
              )}
              {cari.adres && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{cari.adres}</p>
                    <p className="text-sm text-gray-500">{cari.ilce}, {cari.il}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vergi Bilgileri */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-medium mb-4">Vergi Bilgileri</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Vergi Dairesi</span>
                <span className="font-medium">{cari.vergi_dairesi || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vergi No</span>
                <span className="font-medium">{cari.vergi_no || '-'}</span>
              </div>
            </div>
          </div>

          {/* Banka Bilgileri */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-medium mb-4">Banka Bilgileri</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Banka</span>
                <span className="font-medium">{cari.banka_adi || '-'}</span>
              </div>
              {cari.iban && (
                <div>
                  <span className="text-gray-500 text-sm">IBAN</span>
                  <p className="font-mono text-sm break-all">{cari.iban}</p>
                </div>
              )}
            </div>
          </div>

          {/* Mali Ayarlar */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-medium mb-4">Mali Ayarlar</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Ödeme Vadesi</span>
                <span className="font-medium">{cari.odeme_vade || 30} gün</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Risk Limiti</span>
                <span className="font-medium">{cari.risk_limiti ? formatCurrency(cari.risk_limiti) : 'Belirlenmemiş'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ödeme Modal */}
      {showOdemeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Ödeme Kaydet</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tutar <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={odemeForm.tutar}
                  onChange={(e) => setOdemeForm({ ...odemeForm, tutar: e.target.value })}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <input
                  type="text"
                  value={odemeForm.aciklama}
                  onChange={(e) => setOdemeForm({ ...odemeForm, aciklama: e.target.value })}
                  placeholder="Ödeme açıklaması"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Belge No
                </label>
                <input
                  type="text"
                  value={odemeForm.belge_no}
                  onChange={(e) => setOdemeForm({ ...odemeForm, belge_no: e.target.value })}
                  placeholder="Makbuz/fatura no"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowOdemeModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleOdemeKaydet}
                className="btn-macos"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CariDetailPage;
