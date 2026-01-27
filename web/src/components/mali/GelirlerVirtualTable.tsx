import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Pencil, Trash2, User, TrendingUp, Settings2, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ColumnConfig } from '@/types/columnConfig';
import { sortData } from '@/utils/sorting';
import { exportToExcel, exportToPDF, columnsToExportFormat } from '@/utils/export';
import { GELIRLER_COLUMNS } from '@/config/columnDefinitions';

interface Gelir {
  id: string;
  kasa_id: string;
  tarih: string;
  tutar: number;
  aciklama?: string;
  makbuz_no?: string;
  uye_id?: string;
  aidat_id?: string;
  created_at: string;
}

interface GelirlerVirtualTableProps {
  gelirler: Gelir[];
  onEdit: (gelir: Gelir) => void;
  onDelete: (gelirId: string) => void;
  columnConfig?: ColumnConfig | null;
  onColumnSettings?: () => void;
  onSort?: (columnId: string) => void;
}

export const GelirlerVirtualTable: React.FC<GelirlerVirtualTableProps> = ({
  gelirler,
  onEdit,
  onDelete,
  columnConfig,
  onColumnSettings,
  onSort,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Apply sorting to data
  const sortedGelirler = useMemo(() => {
    return sortData(gelirler, columnConfig?.sort);
  }, [gelirler, columnConfig?.sort]);

  const virtualizer = useVirtualizer({
    count: sortedGelirler.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 65,
    overscan: 5,
  });

  // Sütun render fonksiyonları
  const columnRenderers: Record<string, {
    header: string;
    render: (gelir: Gelir) => React.ReactNode;
    className?: string;
  }> = {
    tarih: {
      header: 'Tarih',
      render: (gelir) => (
        <span className="text-sm text-gray-900">
          {new Date(gelir.tarih).toLocaleDateString('tr-TR')}
        </span>
      ),
    },
    tutar: {
      header: 'Tutar',
      className: 'text-right',
      render: (gelir) => (
        <span className="text-sm font-semibold text-green-600">
          +₺{gelir.tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    aciklama: {
      header: 'Açıklama',
      render: (gelir) => (
        <span className="text-sm text-gray-700 line-clamp-1">
          {gelir.aciklama || '-'}
        </span>
      ),
    },
    makbuz_no: {
      header: 'Makbuz No',
      render: (gelir) => (
        <span className="text-sm text-gray-600">
          {gelir.makbuz_no || '-'}
        </span>
      ),
    },
    uye: {
      header: 'Üye',
      className: 'text-center',
      render: (gelir) => (
        gelir.uye_id ? (
          <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-700 rounded-full">
            <User className="w-4 h-4" />
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
      ),
    },
    aidat: {
      header: 'Aidat',
      className: 'text-center',
      render: (gelir) => (
        gelir.aidat_id ? (
          <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
            Aidat
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
      ),
    },
    actions: {
      header: 'İşlemler',
      className: 'text-right',
      render: (gelir) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(gelir)}
            title="Düzenle"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(gelir.id)}
            title="Sil"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
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

  if (sortedGelirler.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="flex flex-col items-center gap-2">
          <TrendingUp className="w-12 h-12 text-gray-300" />
          <p className="text-sm font-medium">Henüz gelir kaydı yok</p>
          <p className="text-xs text-gray-400">Yeni gelir kaydı eklemek için yukarıdaki butonu kullanın</p>
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
            const gelir = sortedGelirler[virtualRow.index];

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
                          {col.render(gelir)}
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
            Toplam <span className="font-semibold">{sortedGelirler.length}</span> gelir kaydı gösteriliyor
            {virtualizer.getVirtualItems().length < sortedGelirler.length && (
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
                const exportColumns = columnsToExportFormat(GELIRLER_COLUMNS, columnConfig?.visible || GELIRLER_COLUMNS.map(c => c.id));
                exportToExcel(sortedGelirler, exportColumns, {
                  filename: `gelirler-${new Date().toISOString().split('T')[0]}`,
                  sheetName: 'Gelirler',
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
                const exportColumns = columnsToExportFormat(GELIRLER_COLUMNS, columnConfig?.visible || GELIRLER_COLUMNS.map(c => c.id));
                exportToPDF(sortedGelirler, exportColumns, {
                  filename: `gelirler-${new Date().toISOString().split('T')[0]}`,
                  title: 'Gelirler Listesi',
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
