import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FileText, Download, Printer, Calendar, Filter } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface MizanItem {
  hesapKodu: string;
  hesapAdi: string;
  borcToplam: number;
  alacakToplam: number;
  borcBakiye: number;
  alacakBakiye: number;
}

export const MizanPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  
  const [loading, setLoading] = React.useState(true);
  const [mizanData, setMizanData] = React.useState<MizanItem[]>([]);
  const [baslangicTarihi, setBaslangicTarihi] = React.useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-01-01`;
  });
  const [bitisTarihi, setBitisTarihi] = React.useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [sadeceBakiyeli, setSadeceBakiyeli] = React.useState(true);

  React.useEffect(() => {
    if (tenant) {
      loadMizan();
    }
  }, [tenant, baslangicTarihi, bitisTarihi, sadeceBakiyeli]);

  const loadMizan = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      
      const hesaplar: MizanItem[] = [];
      
      // Kasa hesapları
      const kasalar = await invoke<any[]>('get_kasalar', { tenantIdParam: tenant.id });
      kasalar.filter(k => k.is_active).forEach((kasa, idx) => {
        const borcToplam = kasa.bakiye > 0 ? kasa.bakiye : 0;
        const alacakToplam = kasa.bakiye < 0 ? Math.abs(kasa.bakiye) : 0;
        hesaplar.push({
          hesapKodu: `100.${String(idx + 1).padStart(2, '0')}`,
          hesapAdi: `Kasa - ${kasa.kasa_adi}`,
          borcToplam,
          alacakToplam,
          borcBakiye: borcToplam - alacakToplam > 0 ? borcToplam - alacakToplam : 0,
          alacakBakiye: alacakToplam - borcToplam > 0 ? alacakToplam - borcToplam : 0,
        });
      });
      
      // Gelir hesapları
      try {
        const gelirler = await invoke<any[]>('get_gelirler', { tenantIdParam: tenant.id });
        const gelirToplam = gelirler.filter(g => {
          const tarih = new Date(g.tarih);
          return tarih >= new Date(baslangicTarihi) && tarih <= new Date(bitisTarihi);
        }).reduce((sum, g) => sum + (g.tutar || 0), 0);
        
        if (gelirToplam > 0) {
          hesaplar.push({
            hesapKodu: '600.00',
            hesapAdi: 'Gelirler',
            borcToplam: 0,
            alacakToplam: gelirToplam,
            borcBakiye: 0,
            alacakBakiye: gelirToplam,
          });
        }
      } catch (e) {}
      
      // Gider hesapları
      try {
        const giderler = await invoke<any[]>('get_giderler', { tenantIdParam: tenant.id });
        const giderToplam = giderler.filter(g => {
          const tarih = new Date(g.tarih);
          return tarih >= new Date(baslangicTarihi) && tarih <= new Date(bitisTarihi);
        }).reduce((sum, g) => sum + (g.tutar || 0), 0);
        
        if (giderToplam > 0) {
          hesaplar.push({
            hesapKodu: '770.00',
            hesapAdi: 'Giderler',
            borcToplam: giderToplam,
            alacakToplam: 0,
            borcBakiye: giderToplam,
            alacakBakiye: 0,
          });
        }
      } catch (e) {}
      
      // Demirbaşlar
      try {
        const demirbaslar = await invoke<any[]>('get_demirbaslar', { tenantIdParam: tenant.id });
        const demirbasToplam = demirbaslar.filter(d => d.is_active && d.durum === 'Aktif')
          .reduce((sum, d) => sum + (d.guncel_deger || d.alis_degeri || 0), 0);
        
        if (demirbasToplam > 0) {
          hesaplar.push({
            hesapKodu: '255.00',
            hesapAdi: 'Demirbaşlar',
            borcToplam: demirbasToplam,
            alacakToplam: 0,
            borcBakiye: demirbasToplam,
            alacakBakiye: 0,
          });
        }
      } catch (e) {}
      
      // Cariler
      try {
        const cariler = await invoke<any[]>('get_cariler', { tenantIdParam: tenant.id });
        let toplamAlacak = 0;
        let toplamBorc = 0;
        
        cariler.filter(c => c.is_active).forEach(c => {
          const bakiye = (c.alacak_bakiye || 0) - (c.borc_bakiye || 0);
          if (bakiye > 0) toplamAlacak += bakiye;
          else toplamBorc += Math.abs(bakiye);
        });
        
        if (toplamAlacak > 0) {
          hesaplar.push({
            hesapKodu: '120.00',
            hesapAdi: 'Cari Alacaklar',
            borcToplam: toplamAlacak,
            alacakToplam: 0,
            borcBakiye: toplamAlacak,
            alacakBakiye: 0,
          });
        }
        
        if (toplamBorc > 0) {
          hesaplar.push({
            hesapKodu: '320.00',
            hesapAdi: 'Cari Borçlar',
            borcToplam: 0,
            alacakToplam: toplamBorc,
            borcBakiye: 0,
            alacakBakiye: toplamBorc,
          });
        }
      } catch (e) {}
      
      // Filtrele
      let filteredData = hesaplar;
      if (sadeceBakiyeli) {
        filteredData = hesaplar.filter(h => h.borcBakiye !== 0 || h.alacakBakiye !== 0);
      }
      
      // Sırala
      filteredData.sort((a, b) => a.hesapKodu.localeCompare(b.hesapKodu));
      
      setMizanData(filteredData);
    } catch (error) {
      console.error('Mizan yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  // Toplamlar
  const toplamlar = mizanData.reduce((acc, item) => ({
    borcToplam: acc.borcToplam + item.borcToplam,
    alacakToplam: acc.alacakToplam + item.alacakToplam,
    borcBakiye: acc.borcBakiye + item.borcBakiye,
    alacakBakiye: acc.alacakBakiye + item.alacakBakiye,
  }), { borcToplam: 0, alacakToplam: 0, borcBakiye: 0, alacakBakiye: 0 });

  const handleExportPDF = () => {
    alert('PDF export özelliği eklenecek');
  };

  const handleExportExcel = () => {
    alert('Excel export özelliği eklenecek');
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mizan Raporu</h1>
          <p className="text-gray-500">Hesap bazlı borç/alacak özeti</p>
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
        <div className="flex items-center gap-6">
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
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sadeceBakiyeli}
              onChange={(e) => setSadeceBakiyeli(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Sadece bakiyeli hesaplar</span>
          </label>
        </div>
      </div>

      {/* Mizan Tablosu */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold">Mizan Tablosu</h2>
            <span className="text-sm text-gray-500 ml-2">({mizanData.length} hesap)</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Hesap Kodu</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Hesap Adı</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Borç Toplamı</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Alacak Toplamı</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Borç Bakiye</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Alacak Bakiye</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mizanData.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{item.hesapKodu}</td>
                  <td className="px-4 py-3 text-sm">{item.hesapAdi}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.borcToplam)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.alacakToplam)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">
                    {item.borcBakiye > 0 ? formatCurrency(item.borcBakiye) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                    {item.alacakBakiye > 0 ? formatCurrency(item.alacakBakiye) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-semibold">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm">TOPLAM</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(toplamlar.borcToplam)}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(toplamlar.alacakToplam)}</td>
                <td className="px-4 py-3 text-sm text-right text-blue-600">{formatCurrency(toplamlar.borcBakiye)}</td>
                <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(toplamlar.alacakBakiye)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Denge Kontrolü */}
      <div className={`p-4 rounded-xl border ${
        Math.abs(toplamlar.borcBakiye - toplamlar.alacakBakiye) < 0.01 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {Math.abs(toplamlar.borcBakiye - toplamlar.alacakBakiye) < 0.01 
              ? '✓ Mizan dengeli' 
              : '⚠ Mizan dengeli değil'}
          </span>
          <span className="text-sm">
            Fark: {formatCurrency(Math.abs(toplamlar.borcBakiye - toplamlar.alacakBakiye))}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MizanPage;
