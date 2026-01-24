import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CreditCard, CheckCircle, Clock, AlertCircle, Settings2, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ColumnConfig } from '@/types/columnConfig';
import { sortData } from '@/utils/sorting';
import { exportToExcel, exportToPDF, columnsToExportFormat } from '@/utils/export';
import { AIDAT_TAKIP_COLUMNS } from '@/config/columnDefinitions';

interface AidatTakip {
  id: string;
  uye_id: string;
  uye_ad_soyad: string;
  yil: number;
  tutar: number;
  odenen_tutar: number;
  kalan_tutar: number;
  son_odeme_tarihi?: string;
  durum: 'ÖDENDİ' | 'KISMİ' | 'ÖDENMEDİ' | 'GECİKMİŞ';
  created_at: string;
}

interface AidatTakipVirtualTableProps {
  aidatlar: AidatTakip[];
  onOdemeEkle: (aidat: AidatTakip) => void;
  columnConfig?: ColumnConfig | null;
  onColumnSettings?: () => void;
  onSort?: (columnId: string) => void;
}

export const AidatTakipVirtualTable: React.FC<AidatTakipVirtualTableProps> = ({
  aidatlar,
  onOdemeEkle,
  columnConfig,
  onColumnSettings,
  onSort,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Apply sorting to data
  const sortedAidatlar = useMemo(() => {
    return sortData(aidatlar, columnConfig?.sort);
  }, [aidatlar, columnConfig?.sort]);

  const virtualizer = useVirtualizer({
    count: sortedAidatlar.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 65,
    overscan: 5,
  });

  const getDurumBadge = (durum: string): string => {
    const colors: Record<string, string> = {
      'ÖDENDİ': 'bg-green-100 text-green-800',
      'KISMİ': 'bg-yellow-100 text-yellow-800',
      'ÖDENMEDİ': 'bg-gray-100 text-gray-800',
      'GECİKMİŞ': 'bg-red-100 text-red-800',
    };
    return colors[durum] || colors['ÖDENMEDİ'];
  };

  const getDurumIcon = (durum: string) => {
    switch (durum) {
      case 'ÖDENDİ': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'KISMİ': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'GECİKMİŞ': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  // Sütun render fonksiyonları
  const columnRenderers: Record<string, {
    header: string;
    render: (aidat: AidatTakip) => React.ReactNode;
    className?: string;
  }> = {
    uye_ad_soyad: {
      header: 'Üye',
      render: (aidat) => <span className="text-sm font-medium text-gray-900">{aidat.uye_ad_soyad}</span>,
    },
    yil: {
      header: 'Yıl',
      render: (aidat) => <span className="text-sm text-gray-700">{aidat.yil}</span>,
    },
    tutar: {
      header: 'Tutar',
      className: 'text-right',
      render: (aidat) => (
        <span className="text-sm font-semibold text-gray-900">
          ₺{aidat.tutar.toFixed(2)}
        </span>
      ),
    },
    odenen_tutar: {
      header: 'Ödenen',
      className: 'text-right',
      render: (aidat) => (
        <span className="text-sm font-semibold text-green-600">
          ₺{aidat.odenen_tutar.toFixed(2)}
        </span>
      ),
    },
    kalan_tutar: {
      header: 'Kalan',
      className: 'text-right',
      render: (aidat) => (
        <span className="text-sm font-semibold text-red-600">
          ₺{aidat.kalan_tutar.toFixed(2)}
        </span>
      ),
    },
    son_odeme_tarihi: {
      header: 'Son Ödeme',
      render: (aidat) => (
        <span className="text-xs text-gray-600">
          {aidat.son_odeme_tarihi
            ? new Date(aidat.son_odeme_tarihi).toLocaleDateString('tr-TR')
            : '-'
          }
        </span>
      ),
    },
    durum: {
      header: 'Durum',
      render: (aidat) => (
        <div className="flex items-center gap-2">
          {getDurumIcon(aidat.durum)}
          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getDurumBadge(aidat.durum)}`}>
            {aidat.durum}
          </span>
        </div>
      ),
    },
    actions: {
      header: 'İşlem',
      className: 'text-center',
      render: (aidat) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOdemeEkle(aidat)}
          className="text-sm py-1.5 px-3 flex items-center gap-1.5"
        >
          <CreditCard className="w-4 h-4" />
          <span>Ödeme Ekle</span>
        </Button>
      ),
    },
  };

  // Config'e göre görünür sütunları belirle
  const visibleColumns = useMemo(() => {
    if (!columnConfig) {
      return Object.keys(columnRenderers);
    }

    return columnConfig.order.filter(colId =>
      columnConfig.visible.includes(colId) && columnRenderers[colId]
    );
  }, [columnConfig]);

  // Sort icon helper
  const getSortIcon = (columnId: string) => {
    if (!columnConfig?.sort || columnConfig.sort.columnId !== columnId) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    }
    if (columnConfig.sort.direction === 'asc') {
      return <ArrowUp className="w-3 h-3 text-blue-600" />;
    }
    return <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  if (sortedAidatlar.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="flex flex-col items-center gap-2">
          <CreditCard className="w-12 h-12 text-gray-300" />
          <p className="text-sm font-medium">Henüz aidat kaydı yok</p>
          <p className="text-xs text-gray-400">Yeni aidat kaydı eklemek için yukarıdaki butonu kullanın</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Header - Sabit */}
      <div className="bg-gray-50/50 border-b border-gray-100">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="grid gap-4 flex-1" style={{
            gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))`
          }}>
            {visibleColumns.map((colId) => {
              const col = columnRenderers[colId];
              const isSortable = colId !== 'actions';

              return (
                <div
                  key={colId}
                  className={`text-xs font-semibold text-gray-600 uppercase tracking-wide ${col.className || ''}`}
                >
                  {isSortable && onSort ? (
                    <button
                      onClick={() => onSort(colId)}
                      className="flex items-center gap-1 hover:text-gray-800 transition-colors"
                    >
                      <span>{col.header}</span>
                      {getSortIcon(colId)}
                    </button>
                  ) : (
                    <span>{col.header}</span>
                  )}
                </div>
              );
            })}
          </div>

          {onColumnSettings && (
            <button
              onClick={onColumnSettings}
              className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sütun Ayarları"
            >
              <Settings2 className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Virtual Scrolling Container */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: '600px' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const aidat = sortedAidatlar[virtualRow.index];

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="absolute top-0 left-0 w-full border-b border-gray-100 hover:bg-gray-50/50 transition-all duration-150"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="flex items-center px-6 py-4">
                  <div className="grid gap-4 flex-1" style={{
                    gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))`
                  }}>
                    {visibleColumns.map((colId) => {
                      const col = columnRenderers[colId];
                      return (
                        <div key={colId} className={col.className || ''}>
                          {col.render(aidat)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer - Toplam kayıt sayısı + Export */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Toplam <span className="font-semibold">{sortedAidatlar.length}</span> aidat kaydı gösteriliyor
            {virtualizer.getVirtualItems().length < sortedAidatlar.length && (
              <span className="ml-2 text-xs text-gray-500">
                (Ekranda: {virtualizer.getVirtualItems().length})
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const exportColumns = columnsToExportFormat(AIDAT_TAKIP_COLUMNS, columnConfig?.visible || AIDAT_TAKIP_COLUMNS.map(c => c.id));
                exportToExcel(sortedAidatlar, exportColumns, {
                  filename: `aidat-takip-${new Date().toISOString().split('T')[0]}`,
                  sheetName: 'Aidat Takip',
                });
              }}
              className="flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const exportColumns = columnsToExportFormat(AIDAT_TAKIP_COLUMNS, columnConfig?.visible || AIDAT_TAKIP_COLUMNS.map(c => c.id));
                exportToPDF(sortedAidatlar, exportColumns, {
                  filename: `aidat-takip-${new Date().toISOString().split('T')[0]}`,
                  title: 'Aidat Takip Listesi',
                  orientation: 'landscape',
                });
              }}
              className="flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
