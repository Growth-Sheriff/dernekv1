import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FileSpreadsheet, TrendingUp, TrendingDown, Building2, Package, Wallet, Download, Printer, Calendar } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { downloadBilanco } from '@/lib/pdf-templates';
import { toast } from 'sonner';

interface BilancoItem {
  hesap: string;
  aciklama: string;
  tutar: number;
}

interface BilancoData {
  aktifler: BilancoItem[];
  pasifler: BilancoItem[];
  aktifToplam: number;
  pasifToplam: number;
  oncekiAktifToplam?: number;
  oncekiPasifToplam?: number;
}

export const BilancoPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<BilancoData>({
    aktifler: [],
    pasifler: [],
    aktifToplam: 0,
    pasifToplam: 0,
  });
  const [donemSonu, setDonemSonu] = React.useState(new Date().toISOString().split('T')[0]);
  const [karsilastir, setKarsilastir] = React.useState(false);

  React.useEffect(() => {
    if (tenant) {
      loadBilanco();
    }
  }, [tenant, donemSonu]);

  const loadBilanco = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      
      // Kasa bakiyeleri
      const kasalar = await invoke<any[]>('get_kasalar', { tenantIdParam: tenant.id });
      const kasaToplam = kasalar.filter(k => k.is_active).reduce((sum, k) => sum + (k.bakiye || 0), 0);
      const nakitKasalar = kasalar.filter(k => k.is_active && (!k.kasa_tipi || k.kasa_tipi === 'Nakit'));
      const bankaKasalar = kasalar.filter(k => k.is_active && k.kasa_tipi === 'Banka');
      
      const nakitToplam = nakitKasalar.reduce((sum, k) => sum + (k.bakiye || 0), 0);
      const bankaToplam = bankaKasalar.reduce((sum, k) => sum + (k.bakiye || 0), 0);
      
      // Demirbaş değerleri
      let demirbasToplam = 0;
      try {
        const demirbaslar = await invoke<any[]>('get_demirbaslar', { tenantIdParam: tenant.id });
        demirbasToplam = demirbaslar.filter(d => d.is_active && d.durum === 'Aktif')
          .reduce((sum, d) => sum + (d.guncel_deger || d.alis_degeri || 0), 0);
      } catch (e) {
        // Demirbaşlar komutu yoksa
      }
      
      // Cari alacaklar/borçlar
      let cariAlacak = 0;
      let cariBorclar = 0;
      try {
        const cariler = await invoke<any[]>('get_cariler', { tenantIdParam: tenant.id });
        cariler.forEach(c => {
          if (c.is_active) {
            const bakiye = (c.alacak_bakiye || 0) - (c.borc_bakiye || 0);
            if (bakiye > 0) cariAlacak += bakiye;
            else cariBorclar += Math.abs(bakiye);
          }
        });
      } catch (e) {
        // Cariler komutu yoksa
      }
      
      // Üye alacakları (ödenmemiş aidatlar)
      let uyeAlacak = 0;
      try {
        const aidatlar = await invoke<any[]>('get_all_aidat', { tenantIdParam: tenant.id });
        uyeAlacak = aidatlar.filter(a => a.durum !== 'Ödendi' && a.is_active !== false)
          .reduce((sum, a) => sum + (a.tutar || 0) - (a.odenen_tutar || 0), 0);
      } catch (e) {
        // Aidat komutu yoksa
      }
      
      // Aktifler
      const aktifler: BilancoItem[] = [
        { hesap: '100', aciklama: 'Kasa', tutar: nakitToplam },
        { hesap: '102', aciklama: 'Bankalar', tutar: bankaToplam },
        { hesap: '120', aciklama: 'Üye Alacakları', tutar: uyeAlacak },
        { hesap: '121', aciklama: 'Cari Alacaklar', tutar: cariAlacak },
        { hesap: '255', aciklama: 'Demirbaşlar (Net)', tutar: demirbasToplam },
      ];
      
      // Pasifler
      const pasifler: BilancoItem[] = [
        { hesap: '320', aciklama: 'Ticari Borçlar (Cari)', tutar: cariBorclar },
        { hesap: '340', aciklama: 'Alınan Avanslar', tutar: 0 },
        { hesap: '500', aciklama: 'Öz Kaynak', tutar: 0 },
      ];
      
      const aktifToplam = aktifler.reduce((sum, a) => sum + a.tutar, 0);
      const pasifToplam = pasifler.reduce((sum, p) => sum + p.tutar, 0);
      
      // Dönem karı/zararı hesapla ve pasife ekle
      const donemSonucu = aktifToplam - pasifToplam;
      if (donemSonucu >= 0) {
        pasifler.push({ hesap: '590', aciklama: 'Dönem Karı', tutar: donemSonucu });
      } else {
        aktifler.push({ hesap: '580', aciklama: 'Dönem Zararı (-)', tutar: Math.abs(donemSonucu) });
      }
      
      setData({
        aktifler: aktifler.filter(a => a.tutar !== 0),
        pasifler: pasifler.filter(p => p.tutar !== 0),
        aktifToplam,
        pasifToplam: pasifToplam + (donemSonucu >= 0 ? donemSonucu : 0),
      });
    } catch (error) {
      console.error('Bilanço yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  const handleExportPDF = async () => {
    try {
      // Aktifler ve pasifleri hesapla
      const kasa = data.aktifler.find(a => a.hesap === '100')?.tutar || 0;
      const banka = data.aktifler.find(a => a.hesap === '102')?.tutar || 0;
      const alacaklar = (data.aktifler.find(a => a.hesap === '120')?.tutar || 0) + 
                        (data.aktifler.find(a => a.hesap === '121')?.tutar || 0);
      const demirbaslar = data.aktifler.find(a => a.hesap === '255')?.tutar || 0;
      const digerAktifler = data.aktifler
        .filter(a => !['100', '102', '120', '121', '255'].includes(a.hesap))
        .reduce((sum, a) => sum + a.tutar, 0);
      
      const borclar = data.pasifler.find(p => p.hesap === '320')?.tutar || 0;
      const oncekiDonemFarki = data.pasifler.find(p => p.hesap === '500')?.tutar || 0;
      const cariFark = data.pasifler.find(p => p.hesap === '590')?.tutar || 0;

      await downloadBilanco({
        tenantName: tenant?.name || 'Dernek',
        tarih: donemSonu,
        durum: {
          aktifler: {
            kasa,
            banka,
            alacaklar,
            demirbaslar,
            digerAktifler,
          },
          pasifler: {
            borclar,
            oncekiDonemFarki,
            cariFark,
          },
        },
      });
      toast.success('Bilanço PDF olarak indirildi!');
    } catch (error) {
      console.error('PDF oluşturulamadı:', error);
      toast.error('PDF oluşturulamadı: ' + error);
    }
  };

  const handleExportExcel = () => {
    // TODO: Excel export işlevi
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
          <h1 className="text-2xl font-semibold">Bilanço Raporu</h1>
          <p className="text-gray-500">Dönem sonu varlık ve kaynak durumu</p>
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <label className="text-sm font-medium">Dönem Sonu:</label>
            <input
              type="date"
              value={donemSonu}
              onChange={(e) => setDonemSonu(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={karsilastir}
              onChange={(e) => setKarsilastir(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Önceki dönem ile karşılaştır</span>
          </label>
        </div>
      </div>

      {/* Bilanço Tablosu */}
      <div className="grid grid-cols-2 gap-6">
        {/* Aktifler */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b bg-green-50">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h2 className="font-semibold text-green-800">AKTİFLER (Varlıklar)</h2>
            </div>
          </div>
          <div className="p-4">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-sm font-medium text-gray-600">Hesap</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-gray-600">Açıklama</th>
                  <th className="text-right px-3 py-2 text-sm font-medium text-gray-600">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.aktifler.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm font-mono">{item.hesap}</td>
                    <td className="px-3 py-2 text-sm">{item.aciklama}</td>
                    <td className="px-3 py-2 text-sm text-right font-medium">{formatCurrency(item.tutar)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-green-50">
                <tr>
                  <td colSpan={2} className="px-3 py-3 font-semibold text-green-800">TOPLAM AKTİF</td>
                  <td className="px-3 py-3 text-right font-bold text-green-800">{formatCurrency(data.aktifToplam)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Pasifler */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b bg-blue-50">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-blue-800">PASİFLER (Kaynaklar)</h2>
            </div>
          </div>
          <div className="p-4">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-sm font-medium text-gray-600">Hesap</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-gray-600">Açıklama</th>
                  <th className="text-right px-3 py-2 text-sm font-medium text-gray-600">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.pasifler.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm font-mono">{item.hesap}</td>
                    <td className="px-3 py-2 text-sm">{item.aciklama}</td>
                    <td className="px-3 py-2 text-sm text-right font-medium">{formatCurrency(item.tutar)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-blue-50">
                <tr>
                  <td colSpan={2} className="px-3 py-3 font-semibold text-blue-800">TOPLAM PASİF</td>
                  <td className="px-3 py-3 text-right font-bold text-blue-800">{formatCurrency(data.pasifToplam)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-5 w-5 text-green-600" />
            <p className="text-sm text-gray-600">Kasa + Banka</p>
          </div>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(data.aktifler.filter(a => ['100', '102'].includes(a.hesap)).reduce((s, a) => s + a.tutar, 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-gray-600">Alacaklar</p>
          </div>
          <p className="text-xl font-bold text-blue-600">
            {formatCurrency(data.aktifler.filter(a => ['120', '121'].includes(a.hesap)).reduce((s, a) => s + a.tutar, 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-5 w-5 text-purple-600" />
            <p className="text-sm text-gray-600">Demirbaşlar</p>
          </div>
          <p className="text-xl font-bold text-purple-600">
            {formatCurrency(data.aktifler.filter(a => a.hesap === '255').reduce((s, a) => s + a.tutar, 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileSpreadsheet className="h-5 w-5 text-orange-600" />
            <p className="text-sm text-gray-600">Borçlar</p>
          </div>
          <p className="text-xl font-bold text-orange-600">
            {formatCurrency(data.pasifler.filter(p => p.hesap === '320').reduce((s, p) => s + p.tutar, 0))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BilancoPage;
