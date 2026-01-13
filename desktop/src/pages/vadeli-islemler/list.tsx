import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Clock, Search, Check, X, AlertTriangle, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { EvrakEkleme, EvrakData } from '@/components/common/EvrakEkleme';

interface VadeliIslem {
  id: string;
  kasa_id: string;
  kasa_adi?: string;
  islem_tipi: string;
  tutar: number;
  aciklama?: string;
  vade_tarihi: string;
  tekrar_tipi?: string;
  durum: string;
  created_at?: string;
}

interface Kasa {
  id: string;
  ad: string;
}

interface VadeliOzet {
  toplam: number;
  bekleyen: number;
  gerceklesen: number;
  iptal: number;
  toplam_gelir: number;
  toplam_gider: number;
  yaklasan_7_gun: number;
}

export const VadeliIslemlerListPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [islemler, setIslemler] = React.useState<VadeliIslem[]>([]);
  const [yaklasamlar, setYaklasanlar] = React.useState<VadeliIslem[]>([]);
  const [kasalar, setKasalar] = React.useState<Kasa[]>([]);
  const [ozet, setOzet] = React.useState<VadeliOzet | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [durumFilter, setDurumFilter] = React.useState('Bekleyen');
  const [tipFilter, setTipFilter] = React.useState('');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [evrakData, setEvrakData] = React.useState<EvrakData | null>(null);
  const [form, setForm] = React.useState({
    kasa_id: '',
    islem_tipi: 'Gelir',
    tutar: '',
    aciklama: '',
    vade_tarihi: '',
    tekrar_tipi: '',
  });

  React.useEffect(() => {
    if (tenant) {
      loadData();
    }
  }, [tenant, durumFilter]);

  const loadData = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      const [islemResult, yaklasamResult, kasaResult, ozetResult] = await Promise.all([
        invoke<VadeliIslem[]>('get_vadeli_islemler', {
          tenantIdParam: tenant.id,
          durum: durumFilter || null,
        }),
        invoke<VadeliIslem[]>('get_yaklasan_vadeler', {
          tenantIdParam: tenant.id,
          gunSayisi: 7,
        }),
        invoke<Kasa[]>('get_kasalar', { tenantIdParam: tenant.id }),
        invoke<VadeliOzet>('get_vadeli_ozet', { tenantIdParam: tenant.id }),
      ]);
      setIslemler(islemResult);
      setYaklasanlar(yaklasamResult);
      setKasalar(kasaResult);
      setOzet(ozetResult);
    } catch (error) {
      console.error('Failed to load vadeli islemler:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!tenant || !form.kasa_id || !form.tutar || !form.vade_tarihi) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }
    
    try {
      await invoke('create_vadeli_islem', {
        tenantIdParam: tenant.id,
        data: {
          kasa_id: form.kasa_id,
          islem_tipi: form.islem_tipi,
          tutar: parseFloat(form.tutar),
          aciklama: form.aciklama || null,
          vade_tarihi: form.vade_tarihi,
          tekrar_tipi: form.tekrar_tipi || null,
        },
      });
      setShowCreateModal(false);
      setForm({
        kasa_id: '',
        islem_tipi: 'Gelir',
        tutar: '',
        aciklama: '',
        vade_tarihi: '',
        tekrar_tipi: '',
      });
      loadData();
    } catch (error) {
      console.error('Failed to create vadeli islem:', error);
      toast.error('Vadeli işlem oluşturulamadı: ' + error);
    }
  };

  const handleGerceklestir = async (id: string) => {
    if (!tenant) return;
    if (!confirm('Bu vadeli işlemi gerçekleştirmek istediğinize emin misiniz?')) return;
    
    try {
      await invoke('gerceklestir_vadeli_islem', {
        tenantIdParam: tenant.id,
        vadeliIslemId: id,
      });
      loadData();
    } catch (error) {
      console.error('Failed to gerceklestir:', error);
      toast.error('İşlem gerçekleştirilemedi: ' + error);
    }
  };

  const handleIptal = async (id: string) => {
    if (!tenant) return;
    const neden = prompt('İptal nedeni:');
    if (neden === null) return;
    
    try {
      await invoke('iptal_vadeli_islem', {
        tenantIdParam: tenant.id,
        vadeliIslemId: id,
        neden: neden || 'Kullanıcı tarafından iptal edildi',
      });
      loadData();
    } catch (error) {
      console.error('Failed to iptal:', error);
      toast.error('İptal edilemedi: ' + error);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '₺0';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const getDurumBadge = (durum: string) => {
    switch (durum) {
      case 'Bekleyen': return 'bg-yellow-100 text-yellow-800';
      case 'Gerçekleşti': return 'bg-green-100 text-green-800';
      case 'İptal': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipBadge = (tip: string) => {
    if (tip === 'Gelir') return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  const isVadeGecmis = (tarih: string) => {
    return new Date(tarih) < new Date();
  };

  const filtered = islemler.filter(i => {
    const matchTip = !tipFilter || i.islem_tipi === tipFilter;
    return matchTip;
  });

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
      <PageHeader
        title="Vadeli İşlemler"
        description="Gelecekte gerçekleşecek gelir ve giderleri takip edin"
        icon={Clock}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Vadeli İşlem
          </Button>
        }
      />

      {/* Yaklaşan Vadeler Uyarısı */}
      {yaklasamlar.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-medium text-yellow-800">Yaklaşan Vadeler (7 gün içinde)</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {yaklasamlar.slice(0, 3).map(v => (
              <div key={v.id} className="bg-white rounded-lg p-3 border border-yellow-100">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 text-xs rounded-full ${getTipBadge(v.islem_tipi)}`}>
                    {v.islem_tipi}
                  </span>
                  <span className="text-sm text-gray-500">{formatDate(v.vade_tarihi)}</span>
                </div>
                <p className="font-medium mt-2">{v.aciklama || 'Açıklama yok'}</p>
                <p className={`text-lg font-bold ${v.islem_tipi === 'Gelir' ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(v.tutar)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Özet Kartları */}
      {ozet && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Bekleyen</p>
                <p className="text-xl font-bold">{ozet.bekleyen}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Beklenen Gelir</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(ozet.toplam_gelir)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Beklenen Gider</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(ozet.toplam_gider)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Check className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Gerçekleşen</p>
                <p className="text-xl font-bold">{ozet.gerceklesen}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex items-center gap-4">
          <select
            value={durumFilter}
            onChange={(e) => setDurumFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">Tüm Durumlar</option>
            <option value="Bekleyen">Bekleyen</option>
            <option value="Gerçekleşti">Gerçekleşti</option>
            <option value="İptal">İptal</option>
          </select>
          <select
            value={tipFilter}
            onChange={(e) => setTipFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">Tüm Tipler</option>
            <option value="Gelir">Gelir</option>
            <option value="Gider">Gider</option>
          </select>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Vade Tarihi</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tip</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Kasa</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Açıklama</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tekrar</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Tutar</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Durum</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Vadeli işlem bulunamadı
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id} className={`hover:bg-gray-50 ${v.durum === 'Bekleyen' && isVadeGecmis(v.vade_tarihi) ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className={isVadeGecmis(v.vade_tarihi) && v.durum === 'Bekleyen' ? 'text-red-600 font-medium' : ''}>
                        {formatDate(v.vade_tarihi)}
                      </span>
                      {isVadeGecmis(v.vade_tarihi) && v.durum === 'Bekleyen' && (
                        <span className="text-xs text-red-500">(Gecikmiş)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getTipBadge(v.islem_tipi)}`}>
                      {v.islem_tipi}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{v.kasa_adi}</td>
                  <td className="px-4 py-3 text-sm">{v.aciklama || '-'}</td>
                  <td className="px-4 py-3 text-sm">{v.tekrar_tipi || 'Tek Seferlik'}</td>
                  <td className={`px-4 py-3 text-right font-medium ${v.islem_tipi === 'Gelir' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(v.tutar)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${getDurumBadge(v.durum)}`}>
                      {v.durum}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {v.durum === 'Bekleyen' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleGerceklestir(v.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Gerçekleştir"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleIptal(v.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="İptal Et"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium mb-4">Yeni Vadeli İşlem</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kasa <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.kasa_id}
                    onChange={(e) => setForm({ ...form, kasa_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçiniz</option>
                    {kasalar.map(k => (
                      <option key={k.id} value={k.id}>{k.ad}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tip <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.islem_tipi}
                    onChange={(e) => setForm({ ...form, islem_tipi: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Gelir">Gelir</option>
                    <option value="Gider">Gider</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tutar <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.tutar}
                    onChange={(e) => setForm({ ...form, tutar: e.target.value })}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vade Tarihi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.vade_tarihi}
                    onChange={(e) => setForm({ ...form, vade_tarihi: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tekrar
                </label>
                <select
                  value={form.tekrar_tipi}
                  onChange={(e) => setForm({ ...form, tekrar_tipi: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tek Seferlik</option>
                  <option value="Haftalık">Haftalık</option>
                  <option value="Aylık">Aylık</option>
                  <option value="Yıllık">Yıllık</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={form.aciklama}
                  onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                  rows={2}
                  placeholder="İşlem açıklaması"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {tenant && (
                <EvrakEkleme
                  tenantId={tenant.id}
                  onEvrakChange={setEvrakData}
                  belgeTuru="vadeli_islem"
                />
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                İptal
              </Button>
              <Button onClick={handleCreate}>
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VadeliIslemlerListPage;
