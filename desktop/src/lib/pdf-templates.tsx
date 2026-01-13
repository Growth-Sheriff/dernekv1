/**
 * Mali Rapor PDF Şablonları
 * Bilanço, Gelir-Gider Tablosu, Kesin Hesap
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  baseStyles,
  PDFHeader,
  PDFFooter,
  PDFPageNumber,
  formatCurrency,
  formatDateShort,
  downloadPdf,
} from '@/lib/pdf-utils';

// Rapor türleri
export type MaliRaporTipi = 'bilanco' | 'gelir-gider' | 'kesin-hesap' | 'aidat-raporu';

// Bilanço verileri
interface BilancoDurum {
  aktifler: {
    kasa: number;
    banka: number;
    alacaklar: number;
    demirbaslar: number;
    digerAktifler: number;
  };
  pasifler: {
    borclar: number;
    oncekiDonemFarki: number;
    cariFark: number;
  };
}

// Gelir-Gider özeti
interface GelirGiderOzet {
  donem: string;
  gelirler: Array<{ kategori: string; tutar: number }>;
  giderler: Array<{ kategori: string; tutar: number }>;
  toplamGelir: number;
  toplamGider: number;
  fark: number;
}

// Aidat raporu
interface AidatRaporItem {
  uyeAd: string;
  uyeSoyad: string;
  toplamBorç: number;
  odenen: number;
  kalan: number;
  geciken: number;
}

interface AidatRaporData {
  donem: string;
  yil: number;
  items: AidatRaporItem[];
  toplamTahakkuk: number;
  toplamTahsilat: number;
  toplamKalan: number;
}

// Bilanço PDF
interface BilancoReportProps {
  tenantName: string;
  tarih: string;
  durum: BilancoDurum;
}

export const BilancoReport: React.FC<BilancoReportProps> = ({ tenantName, tarih, durum }) => {
  const toplamAktif = Object.values(durum.aktifler).reduce((a, b) => a + b, 0);
  const toplamPasif = Object.values(durum.pasifler).reduce((a, b) => a + b, 0);
  const ozkaynaklar = toplamAktif - toplamPasif;

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PDFHeader title="BİLANÇO" tenantName={tenantName} subtitle={`${tarih} Tarihi İtibariyle`} />

        {/* Aktifler */}
        <View style={baseStyles.section}>
          <Text style={baseStyles.sectionTitle}>AKTİFLER (VARLIKLAR)</Text>
          <View style={baseStyles.table}>
            <View style={[baseStyles.tableRow, baseStyles.tableRowHeader]}>
              <Text style={[baseStyles.tableCell, baseStyles.tableCellHeader, { width: '70%' }]}>Hesap</Text>
              <Text style={[baseStyles.tableCell, baseStyles.tableCellHeader, { width: '30%', textAlign: 'right' }]}>Tutar</Text>
            </View>
            <View style={baseStyles.tableRow}>
              <Text style={[baseStyles.tableCell, { width: '70%' }]}>Kasa</Text>
              <Text style={[baseStyles.tableCell, { width: '30%', textAlign: 'right' }]}>{formatCurrency(durum.aktifler.kasa)}</Text>
            </View>
            <View style={[baseStyles.tableRow, baseStyles.tableRowAlternate]}>
              <Text style={[baseStyles.tableCell, { width: '70%' }]}>Banka</Text>
              <Text style={[baseStyles.tableCell, { width: '30%', textAlign: 'right' }]}>{formatCurrency(durum.aktifler.banka)}</Text>
            </View>
            <View style={baseStyles.tableRow}>
              <Text style={[baseStyles.tableCell, { width: '70%' }]}>Alacaklar</Text>
              <Text style={[baseStyles.tableCell, { width: '30%', textAlign: 'right' }]}>{formatCurrency(durum.aktifler.alacaklar)}</Text>
            </View>
            <View style={[baseStyles.tableRow, baseStyles.tableRowAlternate]}>
              <Text style={[baseStyles.tableCell, { width: '70%' }]}>Demirbaşlar</Text>
              <Text style={[baseStyles.tableCell, { width: '30%', textAlign: 'right' }]}>{formatCurrency(durum.aktifler.demirbaslar)}</Text>
            </View>
            <View style={baseStyles.tableRow}>
              <Text style={[baseStyles.tableCell, { width: '70%' }]}>Diğer Aktifler</Text>
              <Text style={[baseStyles.tableCell, { width: '30%', textAlign: 'right' }]}>{formatCurrency(durum.aktifler.digerAktifler)}</Text>
            </View>
            <View style={[baseStyles.tableRow, { backgroundColor: '#e0e7ff' }]}>
              <Text style={[baseStyles.tableCell, baseStyles.bold, { width: '70%' }]}>TOPLAM AKTİFLER</Text>
              <Text style={[baseStyles.tableCell, baseStyles.bold, { width: '30%', textAlign: 'right' }]}>{formatCurrency(toplamAktif)}</Text>
            </View>
          </View>
        </View>

        {/* Pasifler */}
        <View style={baseStyles.section}>
          <Text style={baseStyles.sectionTitle}>PASİFLER (KAYNAKLAR)</Text>
          <View style={baseStyles.table}>
            <View style={[baseStyles.tableRow, baseStyles.tableRowHeader]}>
              <Text style={[baseStyles.tableCell, baseStyles.tableCellHeader, { width: '70%' }]}>Hesap</Text>
              <Text style={[baseStyles.tableCell, baseStyles.tableCellHeader, { width: '30%', textAlign: 'right' }]}>Tutar</Text>
            </View>
            <View style={baseStyles.tableRow}>
              <Text style={[baseStyles.tableCell, { width: '70%' }]}>Borçlar</Text>
              <Text style={[baseStyles.tableCell, { width: '30%', textAlign: 'right' }]}>{formatCurrency(durum.pasifler.borclar)}</Text>
            </View>
            <View style={[baseStyles.tableRow, baseStyles.tableRowAlternate]}>
              <Text style={[baseStyles.tableCell, { width: '70%' }]}>Önceki Dönem Farkı</Text>
              <Text style={[baseStyles.tableCell, { width: '30%', textAlign: 'right' }]}>{formatCurrency(durum.pasifler.oncekiDonemFarki)}</Text>
            </View>
            <View style={baseStyles.tableRow}>
              <Text style={[baseStyles.tableCell, { width: '70%' }]}>Cari Dönem Farkı</Text>
              <Text style={[baseStyles.tableCell, { width: '30%', textAlign: 'right' }]}>{formatCurrency(durum.pasifler.cariFark)}</Text>
            </View>
            <View style={[baseStyles.tableRow, { backgroundColor: '#fef3c7' }]}>
              <Text style={[baseStyles.tableCell, baseStyles.bold, { width: '70%' }]}>ÖZKAYNAKLAR</Text>
              <Text style={[baseStyles.tableCell, baseStyles.bold, { width: '30%', textAlign: 'right', color: ozkaynaklar >= 0 ? '#059669' : '#dc2626' }]}>{formatCurrency(ozkaynaklar)}</Text>
            </View>
          </View>
        </View>

        <PDFFooter tenantName={tenantName} />
        <PDFPageNumber />
      </Page>
    </Document>
  );
};

// Gelir-Gider Tablosu PDF
interface GelirGiderReportProps {
  tenantName: string;
  data: GelirGiderOzet;
}

export const GelirGiderReport: React.FC<GelirGiderReportProps> = ({ tenantName, data }) => {
  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PDFHeader title="GELİR-GİDER TABLOSU" tenantName={tenantName} period={data.donem} />

        {/* Gelirler */}
        <View style={baseStyles.section}>
          <Text style={baseStyles.sectionTitle}>GELİRLER</Text>
          <View style={baseStyles.table}>
            <View style={[baseStyles.tableRow, baseStyles.tableRowHeader]}>
              <Text style={[baseStyles.tableCell, baseStyles.tableCellHeader, { width: '70%' }]}>Kategori</Text>
              <Text style={[baseStyles.tableCell, baseStyles.tableCellHeader, { width: '30%', textAlign: 'right' }]}>Tutar</Text>
            </View>
            {data.gelirler.map((g, i) => (
              <View key={i} style={[baseStyles.tableRow, i % 2 === 1 ? baseStyles.tableRowAlternate : {}]}>
                <Text style={[baseStyles.tableCell, { width: '70%' }]}>{g.kategori}</Text>
                <Text style={[baseStyles.tableCell, { width: '30%', textAlign: 'right' }]}>{formatCurrency(g.tutar)}</Text>
              </View>
            ))}
            <View style={[baseStyles.tableRow, { backgroundColor: '#d1fae5' }]}>
              <Text style={[baseStyles.tableCell, baseStyles.bold, { width: '70%' }]}>TOPLAM GELİR</Text>
              <Text style={[baseStyles.tableCell, baseStyles.bold, { width: '30%', textAlign: 'right', color: '#059669' }]}>{formatCurrency(data.toplamGelir)}</Text>
            </View>
          </View>
        </View>

        {/* Giderler */}
        <View style={baseStyles.section}>
          <Text style={baseStyles.sectionTitle}>GİDERLER</Text>
          <View style={baseStyles.table}>
            <View style={[baseStyles.tableRow, baseStyles.tableRowHeader]}>
              <Text style={[baseStyles.tableCell, baseStyles.tableCellHeader, { width: '70%' }]}>Kategori</Text>
              <Text style={[baseStyles.tableCell, baseStyles.tableCellHeader, { width: '30%', textAlign: 'right' }]}>Tutar</Text>
            </View>
            {data.giderler.map((g, i) => (
              <View key={i} style={[baseStyles.tableRow, i % 2 === 1 ? baseStyles.tableRowAlternate : {}]}>
                <Text style={[baseStyles.tableCell, { width: '70%' }]}>{g.kategori}</Text>
                <Text style={[baseStyles.tableCell, { width: '30%', textAlign: 'right' }]}>{formatCurrency(g.tutar)}</Text>
              </View>
            ))}
            <View style={[baseStyles.tableRow, { backgroundColor: '#fee2e2' }]}>
              <Text style={[baseStyles.tableCell, baseStyles.bold, { width: '70%' }]}>TOPLAM GİDER</Text>
              <Text style={[baseStyles.tableCell, baseStyles.bold, { width: '30%', textAlign: 'right', color: '#dc2626' }]}>{formatCurrency(data.toplamGider)}</Text>
            </View>
          </View>
        </View>

        {/* Özet */}
        <View style={[baseStyles.section, { backgroundColor: data.fark >= 0 ? '#ecfdf5' : '#fef2f2', padding: 15, borderRadius: 4 }]}>
          <View style={baseStyles.summaryRow}>
            <Text style={[baseStyles.summaryLabel, { fontSize: 14 }]}>DÖNEM SONUCU</Text>
            <Text style={[baseStyles.summaryValue, { fontSize: 18, color: data.fark >= 0 ? '#059669' : '#dc2626' }]}>
              {formatCurrency(data.fark)}
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 5 }}>
            {data.fark >= 0 ? 'Gelir fazlası' : 'Gider fazlası'}
          </Text>
        </View>

        <PDFFooter tenantName={tenantName} />
        <PDFPageNumber />
      </Page>
    </Document>
  );
};

// Aidat Raporu PDF
interface AidatReportProps {
  tenantName: string;
  data: AidatRaporData;
}

export const AidatReport: React.FC<AidatReportProps> = ({ tenantName, data }) => {
  const tahsilatOrani = data.toplamTahakkuk > 0 ? (data.toplamTahsilat / data.toplamTahakkuk) * 100 : 0;

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PDFHeader title="AİDAT TAHSİLAT RAPORU" tenantName={tenantName} period={`${data.donem} ${data.yil}`} />

        {/* Özet */}
        <View style={baseStyles.infoBox}>
          <View style={[baseStyles.summaryRow, { marginBottom: 10 }]}>
            <Text style={baseStyles.infoBoxText}>Toplam Tahakkuk:</Text>
            <Text style={[baseStyles.infoBoxText, baseStyles.bold]}>{formatCurrency(data.toplamTahakkuk)}</Text>
          </View>
          <View style={[baseStyles.summaryRow, { marginBottom: 10 }]}>
            <Text style={baseStyles.infoBoxText}>Toplam Tahsilat:</Text>
            <Text style={[baseStyles.infoBoxText, baseStyles.bold, { color: '#059669' }]}>{formatCurrency(data.toplamTahsilat)}</Text>
          </View>
          <View style={[baseStyles.summaryRow, { marginBottom: 10 }]}>
            <Text style={baseStyles.infoBoxText}>Kalan Borç:</Text>
            <Text style={[baseStyles.infoBoxText, baseStyles.bold, { color: '#dc2626' }]}>{formatCurrency(data.toplamKalan)}</Text>
          </View>
          <View style={baseStyles.summaryRow}>
            <Text style={baseStyles.infoBoxText}>Tahsilat Oranı:</Text>
            <Text style={[baseStyles.infoBoxText, baseStyles.bold]}>{tahsilatOrani.toFixed(1)}%</Text>
          </View>
        </View>

        {/* Detay Tablo */}
        <View style={baseStyles.section}>
          <Text style={baseStyles.sectionTitle}>ÜYE BAZINDA DETAY</Text>
          <View style={baseStyles.table}>
            <View style={[baseStyles.tableRow, baseStyles.tableRowHeader]}>
              <Text style={[baseStyles.tableCell, baseStyles.tableCellHeader, { width: '35%' }]}>Üye Adı</Text>
              <Text style={[baseStyles.tableCell, baseStyles.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Borç</Text>
              <Text style={[baseStyles.tableCell, baseStyles.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Ödenen</Text>
              <Text style={[baseStyles.tableCell, baseStyles.tableCellHeader, { width: '25%', textAlign: 'right' }]}>Kalan</Text>
            </View>
            {data.items.slice(0, 30).map((item, i) => (
              <View key={i} style={[baseStyles.tableRow, i % 2 === 1 ? baseStyles.tableRowAlternate : {}]}>
                <Text style={[baseStyles.tableCell, { width: '35%' }]}>{item.uyeAd} {item.uyeSoyad}</Text>
                <Text style={[baseStyles.tableCell, { width: '20%', textAlign: 'right' }]}>{formatCurrency(item.toplamBorç)}</Text>
                <Text style={[baseStyles.tableCell, { width: '20%', textAlign: 'right', color: '#059669' }]}>{formatCurrency(item.odenen)}</Text>
                <Text style={[baseStyles.tableCell, { width: '25%', textAlign: 'right', color: item.kalan > 0 ? '#dc2626' : '#059669' }]}>{formatCurrency(item.kalan)}</Text>
              </View>
            ))}
          </View>
          {data.items.length > 30 && (
            <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 5 }}>
              ... ve {data.items.length - 30} üye daha (tüm liste için detaylı raporu indirin)
            </Text>
          )}
        </View>

        <PDFFooter tenantName={tenantName} />
        <PDFPageNumber />
      </Page>
    </Document>
  );
};

// Export download functions
export const downloadBilanco = (props: BilancoReportProps) => {
  return downloadPdf(<BilancoReport {...props} />, `Bilanco_${props.tarih.replace(/\//g, '-')}.pdf`);
};

export const downloadGelirGider = (props: GelirGiderReportProps) => {
  return downloadPdf(<GelirGiderReport {...props} />, `GelirGider_${props.data.donem.replace(/\s/g, '_')}.pdf`);
};

export const downloadAidatRaporu = (props: AidatReportProps) => {
  return downloadPdf(<AidatReport {...props} />, `AidatRaporu_${props.data.yil}_${props.data.donem}.pdf`);
};
