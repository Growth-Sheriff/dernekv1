import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  DollarSign, 
  Euro, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Save, 
  X,
  History,
  ArrowRight,
  RefreshCw,
  Calculator
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Kur {
  id: string;
  para_birimi: string;
  hedef_para_birimi: string;
  kur_degeri: number;
  gecerlilik_baslangic: string;
  aciklama?: string;
  is_active: boolean;
  created_at: string;
}

interface KurInput {
  para_birimi: string;
  hedef_para_birimi: string;
  kur_degeri: number;
  gecerlilik_baslangic: string;
  aciklama?: string;
}

type ParaBirimi = 'USD' | 'EUR';

export const KurlarPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  
  const [kurlar, setKurlar] = React.useState<Kur[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [showHistoryModal, setShowHistoryModal] = React.useState(false);
  const [historyParaBirimi, setHistoryParaBirimi] = React.useState<string>('');
  const [kurGecmisi, setKurGecmisi] = React.useState<Kur[]>([]);
  const [saving, setSaving] = React.useState(false);
  
  // Hızlı kur girişi için
  const [usdKur, setUsdKur] = React.useState<string>('');
  const [eurKur, setEurKur] = React.useState<string>('');
  const [selectedDate, setSelectedDate] = React.useState<string>(new Date().toISOString().split('T')[0]);

  // Modal form
  const [formData, setFormData] = React.useState<KurInput>({
    para_birimi: 'USD',
    hedef_para_birimi: 'TRY',
    kur_degeri: 0,
    gecerlilik_baslangic: new Date().toISOString().split('T')[0],
    aciklama: '',
  });

  React.useEffect(() => {
    if (tenant) {
      loadKurlar();
    }
  }, [tenant]);

  const loadKurlar = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      const result = await invoke<Kur[]>('get_guncel_kurlar', {
        tenantIdParam: tenant.id,
      });
      setKurlar(result);
      
      // Mevcut kurları inputlara yükle
      const usd = result.find(k => k.para_birimi === 'USD' && k.hedef_para_birimi === 'TRY');
      const eur = result.find(k => k.para_birimi === 'EUR' && k.hedef_para_birimi === 'TRY');
      
      if (usd) setUsdKur(usd.kur_degeri.toFixed(4));
      if (eur) setEurKur(eur.kur_degeri.toFixed(4));
      
    } catch (error) {
      console.error('Kurlar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSave = async (paraBirimi: ParaBirimi) => {
    if (!tenant) return;
    
    const kurDegeri = paraBirimi === 'USD' ? parseFloat(usdKur) : parseFloat(eurKur);
    
    if (!kurDegeri || kurDegeri <= 0) {
      alert('Geçerli bir kur değeri giriniz');
      return;
    }

    try {
      setSaving(true);
      await invoke('set_kur', {
        tenantIdParam: tenant.id,
        data: {
          para_birimi: paraBirimi,
          hedef_para_birimi: 'TRY',
          kur_degeri: kurDegeri,
          gecerlilik_baslangic: selectedDate,
          aciklama: null,
        },
      });
      
      await loadKurlar();
      alert(`${paraBirimi}/TRY kuru başarıyla güncellendi`);
    } catch (error) {
      console.error('Kur kaydedilemedi:', error);
      alert('Kur kaydedilemedi: ' + error);
    } finally {
      setSaving(false);
    }
  };

  const handleCustomSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    
    if (formData.kur_degeri <= 0) {
      alert('Kur değeri 0\'dan büyük olmalıdır');
      return;
    }

    try {
      setSaving(true);
      await invoke('set_kur', {
        tenantIdParam: tenant.id,
        data: formData,
      });
      
      setShowModal(false);
      await loadKurlar();
      alert('Kur başarıyla kaydedildi');
    } catch (error) {
      console.error('Kur kaydedilemedi:', error);
      alert('Kur kaydedilemedi: ' + error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKur = async (kurId: string) => {
    if (!tenant) return;
    
    if (!confirm('Bu kuru silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await invoke('delete_kur', {
        tenantIdParam: tenant.id,
        id: kurId,
      });
      await loadKurlar();
    } catch (error) {
      console.error('Kur silinemedi:', error);
      alert('Kur silinemedi: ' + error);
    }
  };

  const loadKurGecmisi = async (paraBirimi: string) => {
    if (!tenant) return;
    
    try {
      const result = await invoke<Kur[]>('get_kur_gecmisi', {
        tenantIdParam: tenant.id,
        paraBirimi: paraBirimi,
        hedefParaBirimi: 'TRY',
        limit: 30,
      });
      setKurGecmisi(result);
      setHistoryParaBirimi(paraBirimi);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Kur geçmişi yüklenemedi:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  const formatKur = (value: number) => {
    return new Intl.NumberFormat('tr-TR', { 
      minimumFractionDigits: 4, 
      maximumFractionDigits: 4 
    }).format(value);
  };

  const getParaBirimiIcon = (paraBirimi: string) => {
    switch (paraBirimi) {
      case 'USD': return <DollarSign className="h-6 w-6" />;
      case 'EUR': return <Euro className="h-6 w-6" />;
      default: return <TrendingUp className="h-6 w-6" />;
    }
  };

  const getParaBirimiColor = (paraBirimi: string) => {
    switch (paraBirimi) {
      case 'USD': return 'bg-green-100 text-green-700 border-green-200';
      case 'EUR': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (!tenant) {
    return <div className="p-4 text-gray-500">Lütfen giriş yapınız</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kur Yönetimi</h1>
          <p className="text-gray-600 mt-1">Döviz kurlarını tanımlayın ve yönetin</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadKurlar}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Özel Kur Ekle
          </button>
        </div>
      </div>

      {/* Hızlı Kur Girişi Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* USD/TRY Kartı */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">USD / TRY</h3>
                <p className="text-sm text-gray-500">Amerikan Doları</p>
              </div>
            </div>
            <button
              onClick={() => loadKurGecmisi('USD')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Kur Geçmişi"
            >
              <History className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">1 USD =</span>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={usdKur}
                onChange={(e) => setUsdKur(e.target.value)}
                placeholder="0.0000"
                className="w-full pl-20 pr-16 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold text-right"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">TRY</span>
            </div>
            <button
              onClick={() => handleQuickSave('USD')}
              disabled={saving || !usdKur}
              className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-5 w-5" />
              Kaydet
            </button>
          </div>
          
          {kurlar.find(k => k.para_birimi === 'USD' && k.hedef_para_birimi === 'TRY') && (
            <p className="text-sm text-gray-500 mt-3">
              Son güncelleme: {formatDate(kurlar.find(k => k.para_birimi === 'USD')!.gecerlilik_baslangic)}
            </p>
          )}
        </div>

        {/* EUR/TRY Kartı */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Euro className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">EUR / TRY</h3>
                <p className="text-sm text-gray-500">Euro</p>
              </div>
            </div>
            <button
              onClick={() => loadKurGecmisi('EUR')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Kur Geçmişi"
            >
              <History className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">1 EUR =</span>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={eurKur}
                onChange={(e) => setEurKur(e.target.value)}
                placeholder="0.0000"
                className="w-full pl-20 pr-16 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold text-right"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">TRY</span>
            </div>
            <button
              onClick={() => handleQuickSave('EUR')}
              disabled={saving || !eurKur}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-5 w-5" />
              Kaydet
            </button>
          </div>
          
          {kurlar.find(k => k.para_birimi === 'EUR' && k.hedef_para_birimi === 'TRY') && (
            <p className="text-sm text-gray-500 mt-3">
              Son güncelleme: {formatDate(kurlar.find(k => k.para_birimi === 'EUR')!.gecerlilik_baslangic)}
            </p>
          )}
        </div>
      </div>

      {/* Geçerlilik Tarihi Seçimi */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Geçerlilik Tarihi:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-sm text-gray-500">
            Bu tarihten itibaren girilen kurlar virman işlemlerinde kullanılacaktır.
          </span>
        </div>
      </div>

      {/* Tüm Kurlar Tablosu */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tanımlı Kurlar</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
        ) : kurlar.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calculator className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>Henüz kur tanımlanmamış</p>
            <p className="text-sm mt-1">Yukarıdaki kartlardan USD veya EUR kuru girebilirsiniz</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Kur Çifti</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Kur Değeri</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Geçerlilik Başlangıç</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Açıklama</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Durum</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {kurlar.map((kur) => (
                <tr key={kur.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border ${getParaBirimiColor(kur.para_birimi)}`}>
                        {getParaBirimiIcon(kur.para_birimi)}
                        {kur.para_birimi}
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <span className="px-2 py-1 rounded-md border bg-orange-100 text-orange-700 border-orange-200">
                        {kur.hedef_para_birimi}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-semibold text-gray-900">
                    {formatKur(kur.kur_degeri)}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {formatDate(kur.gecerlilik_baslangic)}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {kur.aciklama || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {kur.is_active ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Pasif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => loadKurGecmisi(kur.para_birimi)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Geçmiş"
                      >
                        <History className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteKur(kur.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bilgi Kartı */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <h3 className="font-medium text-blue-900 mb-2">💡 Kur Sistemi Hakkında</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Kurlar farklı para birimli kasalar arası virman işlemlerinde otomatik kullanılır.</li>
          <li>• Çapraz kur hesaplaması desteklenir (örn: USD→EUR için USD/TRY ve EUR/TRY kullanılır).</li>
          <li>• Virman sırasında kuru manuel olarak override edebilirsiniz.</li>
          <li>• Kur geçmişi tutularak geçmiş işlemler için referans oluşturulur.</li>
        </ul>
      </div>

      {/* Özel Kur Ekleme Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Özel Kur Ekle</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCustomSave} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kaynak Para Birimi
                  </label>
                  <select
                    value={formData.para_birimi}
                    onChange={(e) => setFormData({ ...formData, para_birimi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD - Amerikan Doları</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - İngiliz Sterlini</option>
                    <option value="TRY">TRY - Türk Lirası</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hedef Para Birimi
                  </label>
                  <select
                    value={formData.hedef_para_birimi}
                    onChange={(e) => setFormData({ ...formData, hedef_para_birimi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TRY">TRY - Türk Lirası</option>
                    <option value="USD">USD - Amerikan Doları</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - İngiliz Sterlini</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kur Değeri
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formData.kur_degeri || ''}
                  onChange={(e) => setFormData({ ...formData, kur_degeri: parseFloat(e.target.value) || 0 })}
                  placeholder="0.0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Geçerlilik Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={formData.gecerlilik_baslangic}
                  onChange={(e) => setFormData({ ...formData, gecerlilik_baslangic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={formData.aciklama || ''}
                  onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                  placeholder="Örn: TCMB günlük kur"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kur Geçmişi Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {historyParaBirimi}/TRY Kur Geçmişi
              </h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {kurGecmisi.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Kur geçmişi bulunamadı
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Tarih</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Kur</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Açıklama</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {kurGecmisi.map((kur) => (
                      <tr key={kur.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">
                          {formatDate(kur.gecerlilik_baslangic)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                          {formatKur(kur.kur_degeri)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {kur.aciklama || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KurlarPage;
