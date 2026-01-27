import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Users, Calendar, DollarSign, Save, AlertCircle, CheckCircle, X, Check } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Uye {
  id: string;
  uye_no?: string;
  ad: string;
  soyad: string;
}

interface AidatTanimi {
  id: string;
  yil: number;
  tutar: number;
}

interface TopluAidatResult {
  eklenen: number;
  zaten_var: number;
  hatali: number;
}

export const CokluTopluAidatPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [uyeler, setUyeler] = React.useState<Uye[]>([]);
  const [tanimlar, setTanimlar] = React.useState<AidatTanimi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [result, setResult] = React.useState<TopluAidatResult | null>(null);
  
  const [selectedUyeler, setSelectedUyeler] = React.useState<string[]>([]);
  const [baslangicYili, setBaslangicYili] = React.useState(new Date().getFullYear());
  const [bitisYili, setBitisYili] = React.useState(new Date().getFullYear());
  const [searchUye, setSearchUye] = React.useState('');

  React.useEffect(() => {
    if (tenant) {
      loadData();
    }
  }, [tenant]);

  const loadData = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      const [uyeResult, tanimResult] = await Promise.all([
        invoke<Uye[]>('get_uyeler', { tenantIdParam: tenant.id }),
        invoke<AidatTanimi[]>('get_aidat_tanimlari', { tenantIdParam: tenant.id }),
      ]);
      setUyeler(uyeResult);
      setTanimlar(tanimResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!tenant || selectedUyeler.length === 0) {
      alert('Lütfen en az bir üye seçin');
      return;
    }
    
    if (baslangicYili > bitisYili) {
      alert('Başlangıç yılı bitiş yılından büyük olamaz');
      return;
    }
    
    setSaving(true);
    setResult(null);
    
    try {
      const res = await invoke<TopluAidatResult>('toplu_aidat_coklu_uye', {
        tenantIdParam: tenant.id,
        uyeIds: selectedUyeler,
        baslangicYili,
        bitisYili,
      });
      setResult(res);
    } catch (error) {
      console.error('Failed to create toplu aidat:', error);
      alert('Toplu aidat oluşturulamadı: ' + error);
    } finally {
      setSaving(false);
    }
  };

  const toggleUye = (uyeId: string) => {
    setSelectedUyeler(prev => 
      prev.includes(uyeId) 
        ? prev.filter(id => id !== uyeId)
        : [...prev, uyeId]
    );
  };

  const selectAll = () => {
    setSelectedUyeler(uyeler.map(u => u.id));
  };

  const deselectAll = () => {
    setSelectedUyeler([]);
  };

  const yillar = [];
  for (let y = 2020; y <= 2030; y++) {
    yillar.push(y);
  }

  const yilAraligi = bitisYili - baslangicYili + 1;

  // Seçilen yıllar için tanım kontrolü
  const eksikTanimlar: number[] = [];
  for (let y = baslangicYili; y <= bitisYili; y++) {
    if (!tanimlar.find(t => t.yil === y)) {
      eksikTanimlar.push(y);
    }
  }

  // Filtrelenmiş üyeler
  const filteredUyeler = uyeler.filter(u => 
    u.ad.toLowerCase().includes(searchUye.toLowerCase()) ||
    u.soyad.toLowerCase().includes(searchUye.toLowerCase()) ||
    u.uye_no?.toLowerCase().includes(searchUye.toLowerCase())
  );

  const formatCurrency = (value?: number) => {
    if (!value) return '₺0';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  // Toplam tutar hesapla
  const toplamTutar = Array.from({ length: yilAraligi }, (_, i) => baslangicYili + i)
    .reduce((sum, yil) => {
      const tanim = tanimlar.find(t => t.yil === yil);
      return sum + (tanim?.tutar || 0);
    }, 0) * selectedUyeler.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/aidat')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold">Çoklu Üye Toplu Aidat</h1>
          <p className="text-gray-600 text-sm">Birden fazla üye için toplu aidat kaydı oluşturun</p>
        </div>
      </div>

      {/* Sonuç Mesajı */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="font-medium text-green-800">İşlem Tamamlandı</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{result.eklenen}</p>
              <p className="text-sm text-gray-600">Eklenen</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{result.zaten_var}</p>
              <p className="text-sm text-gray-600">Zaten Var</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{result.hatali}</p>
              <p className="text-sm text-gray-600">Hatalı</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Sol Panel - Üye Seçimi */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              Üye Seçimi
              <span className="text-sm text-gray-500">({selectedUyeler.length} seçili)</span>
            </h3>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Tümünü Seç
              </button>
              <button
                onClick={deselectAll}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Temizle
              </button>
            </div>
          </div>
          
          <input
            type="text"
            value={searchUye}
            onChange={(e) => setSearchUye(e.target.value)}
            placeholder="Üye ara..."
            className="w-full px-3 py-2 border rounded-lg mb-3"
          />
          
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            {filteredUyeler.map(u => (
              <label
                key={u.id}
                className={`flex items-center gap-3 px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                  selectedUyeler.includes(u.id) ? 'bg-blue-50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedUyeler.includes(u.id)}
                  onChange={() => toggleUye(u.id)}
                  className="rounded"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{u.ad} {u.soyad}</p>
                  <p className="text-xs text-gray-500">{u.uye_no}</p>
                </div>
                {selectedUyeler.includes(u.id) && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Sağ Panel - Yıl Seçimi ve Önizleme */}
        <div className="space-y-6">
          {/* Yıl Aralığı */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-medium flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-gray-400" />
              Yıl Aralığı
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Başlangıç Yılı</label>
                <select
                  value={baslangicYili}
                  onChange={(e) => setBaslangicYili(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {yillar.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bitiş Yılı</label>
                <select
                  value={bitisYili}
                  onChange={(e) => setBitisYili(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {yillar.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Eksik Tanım Uyarısı */}
          {eksikTanimlar.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  <strong>Uyarı:</strong> {eksikTanimlar.join(', ')} yılları için aidat tanımı yok.
                </p>
              </div>
            </div>
          )}

          {/* Özet */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-medium flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-gray-400" />
              İşlem Özeti
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Seçili Üye</span>
                <span className="font-medium">{selectedUyeler.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Yıl Aralığı</span>
                <span className="font-medium">{baslangicYili} - {bitisYili} ({yilAraligi} yıl)</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Toplam Kayıt</span>
                <span className="font-medium">{selectedUyeler.length * yilAraligi}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Toplam Tutar</span>
                <span className="font-bold text-lg text-green-600">{formatCurrency(toplamTutar)}</span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/aidat')}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || selectedUyeler.length === 0}
              className="btn-macos flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Kaydediliyor...' : 'Toplu Aidat Oluştur'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CokluTopluAidatPage;
