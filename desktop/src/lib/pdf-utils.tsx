/**
 * PDF Rapor Altyapısı
 * @react-pdf/renderer ile Türkçe destekli PDF oluşturma
 */

import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';
import React from 'react';

// Türkçe karakter desteği için font tanımları
// Not: Gerçek uygulamada Roboto veya benzeri bir font dosyası embed edilmelidir
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 'normal' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
  ],
});

// Temel stiller
export const baseStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Roboto',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1a56db',
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a56db',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
    padding: 8,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowHeader: {
    backgroundColor: '#f9fafb',
    fontWeight: 'bold',
  },
  tableRowAlternate: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    padding: 8,
    fontSize: 10,
  },
  tableCellHeader: {
    fontWeight: 'bold',
    fontSize: 10,
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: '#6b7280',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryValuePositive: {
    color: '#059669',
  },
  summaryValueNegative: {
    color: '#dc2626',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
  },
  infoBoxText: {
    fontSize: 10,
    color: '#1e40af',
  },
  bold: {
    fontWeight: 'bold',
  },
  textRight: {
    textAlign: 'right',
  },
  textCenter: {
    textAlign: 'center',
  },
});

// Para formatı
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(value);
};

// Tarih formatı
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

// Kısa tarih formatı
export const formatDateShort = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// PDF indirme fonksiyonu
export const downloadPdf = async (document: React.ReactElement, filename: string): Promise<void> => {
  const blob = await pdf(document).toBlob();
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// Ortak header bileşeni
interface PDFHeaderProps {
  title: string;
  subtitle?: string;
  tenantName?: string;
  period?: string;
}

export const PDFHeader: React.FC<PDFHeaderProps> = ({ title, subtitle, tenantName, period }) => (
  <View style={baseStyles.header}>
    <Text style={baseStyles.headerTitle}>{title}</Text>
    {tenantName && <Text style={baseStyles.headerSubtitle}>{tenantName}</Text>}
    {period && <Text style={baseStyles.headerSubtitle}>Dönem: {period}</Text>}
    {subtitle && <Text style={baseStyles.headerSubtitle}>{subtitle}</Text>}
    <Text style={[baseStyles.headerSubtitle, { marginTop: 5 }]}>
      Oluşturulma Tarihi: {formatDate(new Date())}
    </Text>
  </View>
);

// Ortak footer bileşeni
interface PDFFooterProps {
  tenantName?: string;
}

export const PDFFooter: React.FC<PDFFooterProps> = ({ tenantName }) => (
  <Text style={baseStyles.footer} fixed>
    {tenantName ? `${tenantName} - ` : ''}BADER Dernek Yönetim Sistemi ile oluşturulmuştur
  </Text>
);

// Sayfa numarası bileşeni
export const PDFPageNumber: React.FC = () => (
  <Text
    style={baseStyles.pageNumber}
    render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
    fixed
  />
);

// Export types for templates
export { Document, Page, Text, View, StyleSheet };
