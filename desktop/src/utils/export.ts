import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ColumnDefinition } from '@/types/columnConfig';

/**
 * Export utilities for Excel and PDF
 */

interface ExportOptions {
  filename: string;
  sheetName?: string;
}

interface ExportColumn {
  id: string;
  label: string;
}

/**
 * Export data to Excel file
 */
export const exportToExcel = <T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  options: ExportOptions
): void => {
  try {
    // Create worksheet data
    const wsData: any[][] = [];

    // Header row
    wsData.push(columns.map(col => col.label));

    // Data rows
    data.forEach(row => {
      const rowData = columns.map(col => {
        const value = row[col.id];

        // Format value
        if (value == null) return '';
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
        if (value instanceof Date) return value.toLocaleDateString('tr-TR');

        // Check if it's a date string
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
          try {
            return new Date(value).toLocaleDateString('tr-TR');
          } catch {
            return value;
          }
        }

        return String(value);
      });

      wsData.push(rowData);
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = columns.map(() => ({ wch: 15 }));

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Sheet1');

    // Generate file
    XLSX.writeFile(wb, `${options.filename}.xlsx`);
  } catch (error) {
    console.error('Excel export failed:', error);
    throw new Error('Excel dosyası oluşturulamadı');
  }
};

/**
 * Export data to PDF file
 */
export const exportToPDF = <T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  options: ExportOptions & { title?: string; orientation?: 'portrait' | 'landscape' }
): void => {
  try {
    // Create PDF document
    const doc = new jsPDF({
      orientation: options.orientation || 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Add title
    if (options.title) {
      doc.setFontSize(16);
      doc.text(options.title, 14, 15);
    }

    // Prepare table data
    const headers = columns.map(col => col.label);
    const body = data.map(row =>
      columns.map(col => {
        const value = row[col.id];

        // Format value
        if (value == null) return '';
        if (typeof value === 'number') return value.toFixed(2);
        if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
        if (value instanceof Date) return value.toLocaleDateString('tr-TR');

        // Check if it's a date string
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
          try {
            return new Date(value).toLocaleDateString('tr-TR');
          } catch {
            return value;
          }
        }

        return String(value);
      })
    );

    // Generate table
    autoTable(doc, {
      head: [headers],
      body: body,
      startY: options.title ? 25 : 15,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 15, right: 10, bottom: 10, left: 10 },
    });

    // Add footer with page numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Sayfa ${i} / ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Save file
    doc.save(`${options.filename}.pdf`);
  } catch (error) {
    console.error('PDF export failed:', error);
    throw new Error('PDF dosyası oluşturulamadı');
  }
};

/**
 * Helper to convert ColumnDefinition to ExportColumn
 */
export const columnsToExportFormat = (
  columns: ColumnDefinition[],
  visibleColumnIds: string[]
): ExportColumn[] => {
  return columns
    .filter(col => visibleColumnIds.includes(col.id) && col.id !== 'actions')
    .map(col => ({
      id: col.id,
      label: col.label,
    }));
};
