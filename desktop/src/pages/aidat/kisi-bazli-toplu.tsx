import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, User, Calendar, DollarSign, Save, AlertCircle, CheckCircle } from 'lucide-react';
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

export const KisiBazliTopluAidatPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [uyeler, setUyeler] = React.useState<Uye[]>([]);
  const [tanimlar, setTanimlar] = React.useState<AidatTanimi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [result, setResult] = React.useState<TopluAidatResult | null>(null);
  
  const [selectedUye, setSelectedUye] = React.useState('');
  const [baslangicYili, setBaslangicYili] = React.useState(new Date().getFullYear());
  const [bitisYili, setBitisYili] = React.useState(new Date().getFullYear());

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
    if (!tenant || !selectedUye) {
      alert('Lütfen bir üye seçin');
      return;
    }
    
    if (baslangicYili > bitisYili) {
      alert('Başlangıç yılı bitiş yılından büyük olamaz');
      return;
    }
    
    setSaving(true);
    setResult(null);
    
    try {
      const res = await invoke<TopluAidatResult>('toplu_aidat_kisi_bazli', {
        tenantIdParam: tenant.id,
        uyeId: selectedUye,
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

  const yillar = [];
  for (let y = 2020; y <= 2030; y++) {
    yillar.push(y);
  }

  const secilenUye = uyeler.find(u => u.id === selectedUye);
  const yilAraligi = bitisYili - baslangicYili + 1;

  // Seçilen yıllar için tanım kontrolü
  const eksikTanimlar: number[] = [];
  for (let y = baslangicYili; y <= bitisYili; y++) {
    if (!tanimlar.find(t => t.yil === y)) {
      eksikTanimlar.push(y);
    }
  }

  const getTanim = (yil: number) => tanimlar.find(t => t.yil === yil);

  const formatCurrency = (value?: number) => {
    if (!value) return '₺0';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/aidat')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold">Kişi Bazlı Toplu Aidat</h1>
          <p className="text-gray-600 text-sm">Bir üye için birden fazla yıl aidat kaydı oluşturun</p>
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

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        {/* Üye Seçimi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="inline h-4 w-4 mr-1" />
            Üye Seçin <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedUye}
            onChange={(e) => setSelectedUye(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Üye seçin...</option>
            {uyeler.map(u => (
              <option key={u.id} value={u.id}>
                {u.uye_no} - {u.ad} {u.soyad}
              </option>
            ))}
          </select>
        </div>

        {/* Yıl Aralığı */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="inline h-4 w-4 mr-1" />
            Yıl Aralığı
          </label>
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
                <strong>Uyarı:</strong> Şu yıllar için aidat tanımı bulunamadı: {eksikTanimlar.join(', ')}. 
                Bu yıllar için aidat tutarı 0₺ olarak kaydedilecektir.
              </p>
            </div>
          </div>
        )}

        {/* Önizleme */}
        {selectedUye && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Önizleme</h4>
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Üye:</strong> {secilenUye?.ad} {secilenUye?.soyad}
              </p>
              <p className="text-sm">
                <strong>Yıl Aralığı:</strong> {baslangicYili} - {bitisYili} ({yilAraligi} yıl)
              </p>
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">Oluşturulacak Kayıtlar:</p>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left px-2 py-1">Yıl</th>
                        <th className="text-right px-2 py-1">Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: yilAraligi }, (_, i) => baslangicYili + i).map(yil => {
                        const tanim = getTanim(yil);
                        return (
                          <tr key={yil} className="border-t">
                            <td className="px-2 py-1">{yil}</td>
                            <td className={`text-right px-2 py-1 ${tanim ? 'text-green-600' : 'text-gray-400'}`}>
                              {formatCurrency(tanim?.tutar || 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/aidat')}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !selectedUye}
            className="btn-macos flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Kaydediliyor...' : 'Toplu Aidat Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KisiBazliTopluAidatPage;
