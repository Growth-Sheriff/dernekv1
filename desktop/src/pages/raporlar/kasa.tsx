import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Wallet, Download, Printer, Calendar, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Kasa {
  id: string;
  kasa_adi: string;
  bakiye: number;
  kasa_tipi?: string;
  is_active?: boolean;
}

interface HareketOzet {
  tarih: string;
  giren: number;
  cikan: number;
}

interface KasaRaporData {
  kasa: Kasa;
  acilisBakiye: number;
  toplamGiren: number;
  toplamCikan: number;
  kapanisBakiye: number;
  hareketler: HareketOzet[];
  kategoriDagilimi: { kategori: string; tutar: number; tip: string }[];
}

export const KasaRaporPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  
  const [loading, setLoading] = React.useState(true);
  const [kasalar, setKasalar] = React.useState<Kasa[]>([]);
  const [selectedKasa, setSelectedKasa] = React.useState<string>('all');
  const [raporData, setRaporData] = React.useState<KasaRaporData | null>(null);
  const [baslangicTarihi, setBaslangicTarihi] = React.useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [bitisTarihi, setBitisTarihi] = React.useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  React.useEffect(() => {
    if (tenant) {
      loadKasalar();
    }
  }, [tenant]);

  React.useEffect(() => {
    if (tenant && kasalar.length > 0) {
      loadRapor();
    }
  }, [tenant, selectedKasa, baslangicTarihi, bitisTarihi, kasalar]);

  const loadKasalar = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<Kasa[]>('get_kasalar', { tenantIdParam: tenant.id });
      setKasalar(result.filter(k => k.is_active !== false));
    } catch (error) {
      console.error('Kasalar yüklenemedi:', error);
    }
  };

  const loadRapor = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      
      const kasaIds = selectedKasa === 'all' 
        ? kasalar.map(k => k.id) 
        : [selectedKasa];
      
      // Gelirler (giren)
      let gelirler: any[] = [];
      try {
        const result = await invoke<any[]>('get_gelirler', { tenantIdParam: tenant.id });
        gelirler = result.filter(g => 
          kasaIds.includes(g.kasa_id) &&
          new Date(g.tarih) >= new Date(baslangicTarihi) &&
          new Date(g.tarih) <= new Date(bitisTarihi)
        );
      } catch (e) {}
      
      // Giderler (çıkan)
      let giderler: any[] = [];
      try {
        const result = await invoke<any[]>('get_giderler', { tenantIdParam: tenant.id });
        giderler = result.filter(g => 
          kasaIds.includes(g.kasa_id) &&
          new Date(g.tarih) >= new Date(baslangicTarihi) &&
          new Date(g.tarih) <= new Date(bitisTarihi)
        );
      } catch (e) {}
      
      const toplamGiren = gelirler.reduce((sum, g) => sum + (g.tutar || 0), 0);
      const toplamCikan = giderler.reduce((sum, g) => sum + (g.tutar || 0), 0);
      
      // Mevcut bakiye
      const mevcutBakiye = kasalar
        .filter(k => kasaIds.includes(k.id))
        .reduce((sum, k) => sum + (k.bakiye || 0), 0);
      
      // Açılış bakiyesi (mevcut - giren + çıkan)
      const acilisBakiye = mevcutBakiye - toplamGiren + toplamCikan;
      
      // Günlük hareketler
      const gunlukHareketler: { [key: string]: { giren: number; cikan: number } } = {};
      
      gelirler.forEach(g => {
        const tarih = g.tarih.split('T')[0];
        if (!gunlukHareketler[tarih]) {
          gunlukHareketler[tarih] = { giren: 0, cikan: 0 };
        }
        gunlukHareketler[tarih].giren += g.tutar || 0;
      });
      
      giderler.forEach(g => {
        const tarih = g.tarih.split('T')[0];
        if (!gunlukHareketler[tarih]) {
          gunlukHareketler[tarih] = { giren: 0, cikan: 0 };
        }
        gunlukHareketler[tarih].cikan += g.tutar || 0;
      });
      
      const hareketler = Object.entries(gunlukHareketler)
        .map(([tarih, data]) => ({ tarih, ...data }))
        .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
      
      // Kategori dağılımı
      const kategoriMap: { [key: string]: { tutar: number; tip: string } } = {};
      
      gelirler.forEach(g => {
        const kategori = g.tur_adi || 'Diğer Gelirler';
        if (!kategoriMap[kategori]) {
          kategoriMap[kategori] = { tutar: 0, tip: 'Gelir' };
        }
        kategoriMap[kategori].tutar += g.tutar || 0;
      });
      
      giderler.forEach(g => {
        const kategori = g.tur_adi || 'Diğer Giderler';
        if (!kategoriMap[kategori]) {
          kategoriMap[kategori] = { tutar: 0, tip: 'Gider' };
        }
        kategoriMap[kategori].tutar += g.tutar || 0;
      });
      
      const kategoriDagilimi = Object.entries(kategoriMap)
        .map(([kategori, data]) => ({ kategori, ...data }))
        .sort((a, b) => b.tutar - a.tutar);
      
      setRaporData({
        kasa: selectedKasa === 'all' 
          ? { id: 'all', kasa_adi: 'Tüm Kasalar', bakiye: mevcutBakiye }
          : kasalar.find(k => k.id === selectedKasa)!,
        acilisBakiye,
        toplamGiren,
        toplamCikan,
        kapanisBakiye: mevcutBakiye,
        hareketler,
        kategoriDagilimi,
      });
    } catch (error) {
      console.error('Rapor yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const handleExportPDF = () => {
    alert('PDF export özelliği eklenecek');
  };

  const handleExportExcel = () => {
    alert('Excel export özelliği eklenecek');
  };

  if (loading && kasalar.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kasa Raporu</h1>
          <p className="text-gray-500">Kasa bazlı hareket ve bakiye analizi</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-gray-400" />
            <label className="text-sm font-medium">Kasa:</label>
            <select
              value={selectedKasa}
              onChange={(e) => setSelectedKasa(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm min-w-[150px]"
            >
              <option value="all">Tüm Kasalar</option>
              {kasalar.map(k => (
                <option key={k.id} value={k.id}>{k.kasa_adi}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <label className="text-sm font-medium">Başlangıç:</label>
            <input
              type="date"
              value={baslangicTarihi}
              onChange={(e) => setBaslangicTarihi(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Bitiş:</label>
            <input
              type="date"
              value={bitisTarihi}
              onChange={(e) => setBitisTarihi(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : raporData && (
        <>
          {/* Özet Kartları */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <p className="text-sm text-gray-600 mb-1">Açılış Bakiyesi</p>
              <p className="text-xl font-bold">{formatCurrency(raporData.acilisBakiye)}</p>
              <p className="text-xs text-gray-500 mt-1">{formatDate(baslangicTarihi)}</p>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <p className="text-sm text-green-700">Giren</p>
              </div>
              <p className="text-xl font-bold text-green-600">+{formatCurrency(raporData.toplamGiren)}</p>
            </div>
            <div className="bg-red-50 rounded-xl border border-red-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-700">Çıkan</p>
              </div>
              <p className="text-xl font-bold text-red-600">-{formatCurrency(raporData.toplamCikan)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <p className="text-sm text-blue-700 mb-1">Kapanış Bakiyesi</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(raporData.kapanisBakiye)}</p>
              <p className="text-xs text-blue-500 mt-1">{formatDate(bitisTarihi)}</p>
            </div>
          </div>

          {/* Net Değişim */}
          <div className={`rounded-xl p-4 flex items-center justify-between ${
            raporData.toplamGiren - raporData.toplamCikan >= 0 
              ? 'bg-green-100 border border-green-200' 
              : 'bg-red-100 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              <span className="font-medium">Net Değişim</span>
            </div>
            <span className={`text-2xl font-bold ${
              raporData.toplamGiren - raporData.toplamCikan >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {raporData.toplamGiren - raporData.toplamCikan >= 0 ? '+' : ''}
              {formatCurrency(raporData.toplamGiren - raporData.toplamCikan)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Günlük Hareketler */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Günlük Hareketler</h3>
              </div>
              <div className="p-4 max-h-80 overflow-y-auto">
                {raporData.hareketler.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Hareket bulunamadı</p>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-sm font-medium text-gray-600">Tarih</th>
                        <th className="text-right px-3 py-2 text-sm font-medium text-green-600">Giren</th>
                        <th className="text-right px-3 py-2 text-sm font-medium text-red-600">Çıkan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {raporData.hareketler.map((h, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm">{formatDate(h.tarih)}</td>
                          <td className="px-3 py-2 text-sm text-right text-green-600">
                            {h.giren > 0 ? `+${formatCurrency(h.giren)}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-red-600">
                            {h.cikan > 0 ? `-${formatCurrency(h.cikan)}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Kategori Dağılımı */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Kategori Dağılımı</h3>
              </div>
              <div className="p-4 max-h-80 overflow-y-auto">
                {raporData.kategoriDagilimi.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Veri bulunamadı</p>
                ) : (
                  <div className="space-y-3">
                    {raporData.kategoriDagilimi.map((k, idx) => {
                      const maxTutar = Math.max(...raporData.kategoriDagilimi.map(x => x.tutar));
                      const width = (k.tutar / maxTutar) * 100;
                      return (
                        <div key={idx}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                k.tip === 'Gelir' ? 'bg-green-500' : 'bg-red-500'
                              }`}></span>
                              {k.kategori}
                            </span>
                            <span className={`font-medium ${
                              k.tip === 'Gelir' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(k.tutar)}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                k.tip === 'Gelir' ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${width}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default KasaRaporPage;
