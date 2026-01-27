import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Calendar, User, DollarSign, Clock, CheckCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface AidatTakip {
  id: string;
  uye_id: string;
  uye_ad_soyad?: string;
  yil: number;
  ay: number;
  tutar: number;
  odenen: number;
  odeme_tarihi?: string;
  gecikme_gun: number;
  gecikme_faiz: number;
  durum: string;
  tahsilat_turu?: string;
  aciklama?: string;
  created_at: string;
  updated_at?: string;
}

interface Kasa {
  id: string;
  kasa_adi: string;
  bakiye: number;
}

const aylar = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const AidatDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [aidat, setAidat] = React.useState<AidatTakip | null>(null);
  const [kasalar, setKasalar] = React.useState<Kasa[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showOdemeModal, setShowOdemeModal] = React.useState(false);
  const [odemeAmount, setOdemeAmount] = React.useState('');
  const [selectedKasa, setSelectedKasa] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (tenant && id) {
      loadAidat();
      loadKasalar();
    }
  }, [tenant, id]);

  const loadKasalar = async () => {
    if (!tenant) return;
    try {
      const data = await invoke<Kasa[]>('get_kasalar', {
        tenantIdParam: tenant.id,
      });
      setKasalar(data);
      if (data.length > 0) {
        setSelectedKasa(data[0].id);
      }
    } catch (error) {
      console.error('Kasalar yüklenemedi:', error);
    }
  };

  const loadAidat = async () => {
    if (!tenant || !id) return;
    
    try {
      setLoading(true);
      const data = await invoke<AidatTakip>('get_aidat_by_id', {
        tenantIdParam: tenant.id,
        aidatId: id,
      });
      setAidat(data);
      setOdemeAmount(String(data.tutar - data.odenen));
    } catch (error) {
      console.error('Failed to load aidat:', error);
      alert('Aidat yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleOdeme = async () => {
    if (!tenant || !id || !odemeAmount || !selectedKasa) {
      alert('Lütfen kasa seçiniz!');
      return;
    }
    
    try {
      setSubmitting(true);
      await invoke('add_aidat_odeme_with_gelir', {
        tenantIdParam: tenant.id,
        aidatId: id,
        odemeTutari: parseFloat(odemeAmount),
        kasaId: selectedKasa,
      });
      setShowOdemeModal(false);
      loadAidat();
      alert('Ödeme başarıyla kaydedildi ve gelir oluşturuldu!');
    } catch (error) {
      alert('Ödeme kaydedilemedi: ' + error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!tenant || !id) return;
    
    if (!confirm('Bu aidat kaydını silmek istediğinizden emin misiniz?')) return;
    
    try {
      await invoke('delete_aidat', {
        tenantIdParam: tenant.id,
        aidatId: id,
      });
      navigate('/aidat');
    } catch (error) {
      alert('Aidat silinemedi: ' + error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!aidat) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900">Aidat bulunamadı</h2>
        <button
          onClick={() => navigate('/aidat')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Aidat listesine dön
        </button>
      </div>
    );
  }

  const kalanTutar = aidat.tutar - aidat.odenen;
  const odemeOrani = aidat.tutar > 0 ? (aidat.odenen / aidat.tutar) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/aidat')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {aylar[aidat.ay - 1]} {aidat.yil} Aidatı
            </h1>
            <p className="text-gray-600 mt-1">
              {aidat.uye_ad_soyad || `Üye #${aidat.uye_id}`}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDelete}
            className="flex items-center px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Sil
          </button>
        </div>
      </div>

      {/* Durum Badge */}
      <div className="flex items-center space-x-3">
        {aidat.durum === 'odendi' ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Ödendi
          </span>
        ) : aidat.durum === 'gecikti' ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-4 h-4 mr-1" />
            Gecikmiş
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4 mr-1" />
            Bekliyor
          </span>
        )}
      </div>

      {/* Ana Bilgiler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tutar Bilgileri */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Tutar Bilgileri</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Aidat Tutarı:</span>
              <span className="font-medium">{aidat.tutar.toLocaleString('tr-TR')} ₺</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ödenen:</span>
              <span className="font-medium text-green-600">{aidat.odenen.toLocaleString('tr-TR')} ₺</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Kalan:</span>
              <span className="font-medium text-red-600">{kalanTutar.toLocaleString('tr-TR')} ₺</span>
            </div>
            {aidat.gecikme_faiz > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Gecikme Faizi:</span>
                <span className="font-medium text-orange-600">{aidat.gecikme_faiz.toLocaleString('tr-TR')} ₺</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="pt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Ödeme Durumu</span>
              <span className="font-medium">{odemeOrani.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-500 h-3 rounded-full transition-all" 
                style={{ width: `${odemeOrani}%` }}
              />
            </div>
          </div>

          {kalanTutar > 0 && (
            <button
              onClick={() => setShowOdemeModal(true)}
              className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Ödeme Al
            </button>
          )}
        </div>

        {/* Detay Bilgileri */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Detay Bilgileri</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Dönem:</span>
              <span className="font-medium">{aylar[aidat.ay - 1]} {aidat.yil}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Üye:</span>
              <span className="font-medium">{aidat.uye_ad_soyad || aidat.uye_id}</span>
            </div>
            {aidat.gecikme_gun > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Gecikme Süresi:</span>
                <span className="font-medium text-red-600">{aidat.gecikme_gun} gün</span>
              </div>
            )}
            {aidat.odeme_tarihi && (
              <div className="flex justify-between">
                <span className="text-gray-600">Son Ödeme Tarihi:</span>
                <span className="font-medium">
                  {new Date(aidat.odeme_tarihi).toLocaleDateString('tr-TR')}
                </span>
              </div>
            )}
            {aidat.tahsilat_turu && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tahsilat Türü:</span>
                <span className="font-medium">{aidat.tahsilat_turu}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Kayıt Tarihi:</span>
              <span className="font-medium">
                {new Date(aidat.created_at).toLocaleDateString('tr-TR')}
              </span>
            </div>
          </div>

          {aidat.aciklama && (
            <div className="pt-4 border-t">
              <span className="text-sm text-gray-600">Açıklama:</span>
              <p className="mt-1 text-gray-900">{aidat.aciklama}</p>
            </div>
          )}
        </div>
      </div>

      {/* Ödeme Modal */}
      {showOdemeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ödeme Al</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kalan Tutar
                </label>
                <div className="text-2xl font-bold text-gray-900">
                  {kalanTutar.toLocaleString('tr-TR')} ₺
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ödeme Tutarı
                </label>
                <input
                  type="number"
                  value={odemeAmount}
                  onChange={(e) => setOdemeAmount(e.target.value)}
                  step="0.01"
                  max={kalanTutar}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kasa Seçimi *
                </label>
                <select
                  value={selectedKasa}
                  onChange={(e) => setSelectedKasa(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Kasa Seçiniz</option>
                  {kasalar.map((kasa) => (
                    <option key={kasa.id} value={kasa.id}>
                      {kasa.kasa_adi} ({kasa.bakiye.toLocaleString('tr-TR')} ₺)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Ödeme bu kasaya gelir olarak kaydedilecektir.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowOdemeModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleOdeme}
                disabled={submitting || !odemeAmount || !selectedKasa}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AidatDetailPage;
