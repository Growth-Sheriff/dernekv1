import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FileText, Download, Printer, Calendar, TrendingUp, TrendingDown, Building } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface GelirGiderKalem {
  kategori: string;
  tutar: number;
}

interface KesinHesapData {
  donemBaslangic: string;
  donemBitis: string;
  acilisBakiye: number;
  gelirler: GelirGiderKalem[];
  giderler: GelirGiderKalem[];
  toplamGelir: number;
  toplamGider: number;
  donemSonucu: number;
  kapanisBakiye: number;
}

export const KesinHesapPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<KesinHesapData | null>(null);
  const [yil, setYil] = React.useState(new Date().getFullYear());

  React.useEffect(() => {
    if (tenant) {
      loadKesinHesap();
    }
  }, [tenant, yil]);

  const loadKesinHesap = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      
      const donemBaslangic = `${yil}-01-01`;
      const donemBitis = `${yil}-12-31`;
      
      // Gelirler
      let gelirlerByKategori: { [key: string]: number } = {};
      try {
        const gelirler = await invoke<any[]>('get_gelirler', { tenantIdParam: tenant.id });
        gelirler.filter(g => {
          const tarih = new Date(g.tarih);
          return tarih >= new Date(donemBaslangic) && tarih <= new Date(donemBitis);
        }).forEach(g => {
          const kategori = g.tur_adi || 'Diğer Gelirler';
          gelirlerByKategori[kategori] = (gelirlerByKategori[kategori] || 0) + (g.tutar || 0);
        });
      } catch (e) {}
      
      // Giderler
      let giderlerByKategori: { [key: string]: number } = {};
      try {
        const giderler = await invoke<any[]>('get_giderler', { tenantIdParam: tenant.id });
        giderler.filter(g => {
          const tarih = new Date(g.tarih);
          return tarih >= new Date(donemBaslangic) && tarih <= new Date(donemBitis);
        }).forEach(g => {
          const kategori = g.tur_adi || 'Diğer Giderler';
          giderlerByKategori[kategori] = (giderlerByKategori[kategori] || 0) + (g.tutar || 0);
        });
      } catch (e) {}
      
      // Aidat gelirleri
      try {
        const aidatlar = await invoke<any[]>('get_all_aidat', { tenantIdParam: tenant.id });
        const aidatGelir = aidatlar.filter(a => {
          return a.odeme_tarihi && 
            new Date(a.odeme_tarihi) >= new Date(donemBaslangic) && 
            new Date(a.odeme_tarihi) <= new Date(donemBitis);
        }).reduce((sum, a) => sum + (a.odenen_tutar || 0), 0);
        
        if (aidatGelir > 0) {
          gelirlerByKategori['Aidat Gelirleri'] = (gelirlerByKategori['Aidat Gelirleri'] || 0) + aidatGelir;
        }
      } catch (e) {}
      
      // Kasa bakiyeleri
      const kasalar = await invoke<any[]>('get_kasalar', { tenantIdParam: tenant.id });
      const kapanisBakiye = kasalar.filter(k => k.is_active).reduce((sum, k) => sum + (k.bakiye || 0), 0);
      
      const gelirArray = Object.entries(gelirlerByKategori).map(([kategori, tutar]) => ({ kategori, tutar }));
      const giderArray = Object.entries(giderlerByKategori).map(([kategori, tutar]) => ({ kategori, tutar }));
      
      const toplamGelir = gelirArray.reduce((sum, g) => sum + g.tutar, 0);
      const toplamGider = giderArray.reduce((sum, g) => sum + g.tutar, 0);
      const donemSonucu = toplamGelir - toplamGider;
      const acilisBakiye = kapanisBakiye - donemSonucu;
      
      setData({
        donemBaslangic,
        donemBitis,
        acilisBakiye,
        gelirler: gelirArray.sort((a, b) => b.tutar - a.tutar),
        giderler: giderArray.sort((a, b) => b.tutar - a.tutar),
        toplamGelir,
        toplamGider,
        donemSonucu,
        kapanisBakiye,
      });
    } catch (error) {
      console.error('Kesin hesap yüklenemedi:', error);
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
    alert('PDF export özelliği eklenecek (imza alanları ile)');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Veri yüklenemedi</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kesin Hesap Raporu</h1>
          <p className="text-gray-500">Genel Kurula sunulacak yıllık mali rapor</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={yil}
            onChange={(e) => setYil(Number(e.target.value))}
            className="px-4 py-2 border rounded-lg"
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            PDF (İmzalı)
          </button>
        </div>
      </div>

      {/* Rapor Başlığı */}
      <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Building className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold">{tenant?.name}</h2>
        </div>
        <h3 className="text-lg font-semibold text-gray-700">
          {yil} Yılı Kesin Hesap Raporu
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Dönem: {formatDate(data.donemBaslangic)} - {formatDate(data.donemBitis)}
        </p>
      </div>

      {/* Açılış ve Kapanış */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <p className="text-sm opacity-80">Dönem Başı Bakiye</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(data.acilisBakiye)}</p>
          <p className="text-sm opacity-80 mt-2">01.01.{yil} itibarıyla</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <p className="text-sm opacity-80">Dönem Sonu Bakiye</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(data.kapanisBakiye)}</p>
          <p className="text-sm opacity-80 mt-2">31.12.{yil} itibarıyla</p>
        </div>
      </div>

      {/* Gelir ve Gider Tabloları */}
      <div className="grid grid-cols-2 gap-6">
        {/* Gelirler */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b bg-green-50">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-800">GELİR TABLOSU</h3>
            </div>
          </div>
          <div className="p-4">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-sm font-medium text-gray-600">Gelir Türü</th>
                  <th className="text-right px-3 py-2 text-sm font-medium text-gray-600">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.gelirler.map((g, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-sm">{g.kategori}</td>
                    <td className="px-3 py-2 text-sm text-right font-medium">{formatCurrency(g.tutar)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-green-100">
                <tr>
                  <td className="px-3 py-3 font-bold text-green-800">TOPLAM GELİR</td>
                  <td className="px-3 py-3 text-right font-bold text-green-800">{formatCurrency(data.toplamGelir)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Giderler */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b bg-red-50">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-800">GİDER TABLOSU</h3>
            </div>
          </div>
          <div className="p-4">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-sm font-medium text-gray-600">Gider Türü</th>
                  <th className="text-right px-3 py-2 text-sm font-medium text-gray-600">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.giderler.map((g, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-sm">{g.kategori}</td>
                    <td className="px-3 py-2 text-sm text-right font-medium">{formatCurrency(g.tutar)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-red-100">
                <tr>
                  <td className="px-3 py-3 font-bold text-red-800">TOPLAM GİDER</td>
                  <td className="px-3 py-3 text-right font-bold text-red-800">{formatCurrency(data.toplamGider)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Dönem Sonucu */}
      <div className={`rounded-xl p-6 ${data.donemSonucu >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-medium">DÖNEM SONUCU</p>
            <p className="text-sm text-gray-600">{data.donemSonucu >= 0 ? 'Fazla (Kar)' : 'Açık (Zarar)'}</p>
          </div>
          <p className={`text-4xl font-bold ${data.donemSonucu >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(data.donemSonucu)}
          </p>
        </div>
      </div>

      {/* Özet */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold mb-4">Dönem Özeti</h3>
        <table className="w-full">
          <tbody className="divide-y">
            <tr>
              <td className="py-2 text-gray-600">Dönem Başı Bakiye</td>
              <td className="py-2 text-right font-medium">{formatCurrency(data.acilisBakiye)}</td>
            </tr>
            <tr>
              <td className="py-2 text-gray-600">Toplam Gelir (+)</td>
              <td className="py-2 text-right font-medium text-green-600">+{formatCurrency(data.toplamGelir)}</td>
            </tr>
            <tr>
              <td className="py-2 text-gray-600">Toplam Gider (-)</td>
              <td className="py-2 text-right font-medium text-red-600">-{formatCurrency(data.toplamGider)}</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="py-2 font-bold">Dönem Sonu Bakiye</td>
              <td className="py-2 text-right font-bold">{formatCurrency(data.kapanisBakiye)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* İmza Alanları */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold mb-6 text-center">Onay</h3>
        <div className="grid grid-cols-3 gap-8 text-center">
          <div className="border-t-2 pt-4">
            <p className="font-medium">Başkan</p>
            <p className="text-sm text-gray-500 mt-1">İmza</p>
          </div>
          <div className="border-t-2 pt-4">
            <p className="font-medium">Sayman</p>
            <p className="text-sm text-gray-500 mt-1">İmza</p>
          </div>
          <div className="border-t-2 pt-4">
            <p className="font-medium">Sekreter</p>
            <p className="text-sm text-gray-500 mt-1">İmza</p>
          </div>
        </div>
        <p className="text-center text-sm text-gray-500 mt-6">
          Tarih: ....../....../..........
        </p>
      </div>
    </div>
  );
};

export default KesinHesapPage;
