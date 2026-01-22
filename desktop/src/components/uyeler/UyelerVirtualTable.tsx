import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Eye, Pencil, Trash2, Settings2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ColumnConfig } from '@/types/columnConfig';
import { sortData } from '@/utils/sorting';

interface Uye {
  id: string;
  uye_no: string;
  tc_no: string;
  ad_soyad: string;
  telefon?: string;
  email?: string;
  giris_tarihi: string;
  durum: string;
  uyelik_tipi?: string;
  is_active?: boolean;
}

interface UyeBorcDurumu {
  uye_id: string;
  toplam_borc: number;
  odenen: number;
  kalan_borc: number;
}

interface UyelerVirtualTableProps {
  uyeler: Uye[];
  borcDurumlari: Record<string, UyeBorcDurumu>;
  onView: (uyeId: string) => void;
  onEdit: (uye: Uye) => void;
  onDelete: (uyeId: string, adSoyad: string) => void;
  columnConfig?: ColumnConfig | null;
  onColumnSettings?: () => void;
  onSort?: (columnId: string) => void;
}

export const UyelerVirtualTable: React.FC<UyelerVirtualTableProps> = ({
  uyeler,
  borcDurumlari,
  onView,
  onEdit,
  onDelete,
  columnConfig,
  onColumnSettings,
  onSort,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Apply sorting to data
  const sortedUyeler = useMemo(() => {
    return sortData(uyeler, columnConfig?.sort);
  }, [uyeler, columnConfig?.sort]);

  // Virtual scrolling konfigürasyonu
  const virtualizer = useVirtualizer({
    count: sortedUyeler.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  const getDurumBadge = (durum: string) => {
    const durumMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      'Aktif': { variant: 'default', label: 'Aktif' },
      'Pasif': { variant: 'secondary', label: 'Pasif' },
      'Askıda': { variant: 'outline', label: 'Askıda' },
      'İhraç': { variant: 'destructive', label: 'İhraç' },
    };
    const config = durumMap[durum] || { variant: 'default', label: durum };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Sütun render fonksiyonları
  const columnRenderers: Record<string, {
    header: string;
    render: (uye: Uye) => React.ReactNode;
    className?: string;
  }> = {
    uye_no: {
      header: 'Üye No',
      render: (uye) => <span className="font-mono text-sm text-gray-900">{uye.uye_no}</span>,
    },
    tc_no: {
      header: 'TC No',
      render: (uye) => <span className="text-sm text-gray-600">{uye.tc_no}</span>,
    },
    ad_soyad: {
      header: 'Ad Soyad',
      render: (uye) => <span className="text-sm font-medium text-gray-900">{uye.ad_soyad}</span>,
    },
    uyelik_tipi: {
      header: 'Üyelik Tipi',
      render: (uye) => (
        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
          {uye.uyelik_tipi || 'Asil'}
        </span>
      ),
    },
    telefon: {
      header: 'Telefon',
      render: (uye) => <span className="text-sm text-gray-600">{uye.telefon || '-'}</span>,
    },
    email: {
      header: 'E-posta',
      render: (uye) => <span className="text-sm text-gray-600">{uye.email || '-'}</span>,
    },
    giris_tarihi: {
      header: 'Giriş Tarihi',
      render: (uye) => (
        <span className="text-sm text-gray-600">
          {new Date(uye.giris_tarihi).toLocaleDateString('tr-TR')}
        </span>
      ),
    },
    kalan_borc: {
      header: 'Kalan Borç',
      className: 'text-right',
      render: (uye) => {
        const borcDurumu = borcDurumlari[uye.id];
        return borcDurumu ? (
          <span
            className={`text-sm font-semibold ${
              borcDurumu.kalan_borc > 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {borcDurumu.kalan_borc > 0
              ? `₺${borcDurumu.kalan_borc.toLocaleString('tr-TR')}`
              : '₺0'}
          </span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        );
      },
    },
    durum: {
      header: 'Durum',
      render: (uye) => getDurumBadge(uye.durum),
    },
    actions: {
      header: 'İşlemler',
      className: 'text-right',
      render: (uye) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(uye.id)}
            title="Detay"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(uye)}
            title="Düzenle"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(uye.id, uye.ad_soyad)}
            title="Sil"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  };

  // Config'e göre görünür sütunları belirle (order'a göre)
  const visibleColumns = useMemo(() => {
    if (!columnConfig) {
      // Default: tüm sütunlar
      return Object.keys(columnRenderers);
    }

    // Order'a göre sırala ve sadece visible olanları al
    return columnConfig.order.filter(colId =>
      columnConfig.visible.includes(colId) && columnRenderers[colId]
    );
  }, [columnConfig]);

  // Grid columns hesapla (eşit dağılım)
  const gridColsClass = `grid-cols-${Math.min(visibleColumns.length, 12)}`;

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

  if (sortedUyeler.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Üye bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Header - Sabit */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-2">
          <div className="grid gap-4 flex-1" style={{
            gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))`
          }}>
            {visibleColumns.map((colId) => {
              const col = columnRenderers[colId];
              const isSortable = colId !== 'actions'; // Actions column is not sortable

              return (
                <div
                  key={colId}
                  className={`text-xs font-medium text-gray-500 uppercase tracking-wider ${col.className || ''}`}
                >
                  {isSortable && onSort ? (
                    <button
                      onClick={() => onSort(colId)}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
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
            const uye = sortedUyeler[virtualRow.index];

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="absolute top-0 left-0 w-full border-b border-gray-100 hover:bg-gray-50 transition-colors"
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
                          {col.render(uye)}
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

      {/* Footer - Toplam kayıt sayısı */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
        <div className="text-sm text-gray-600">
          Toplam <span className="font-semibold">{sortedUyeler.length}</span> üye gösteriliyor
          {virtualizer.getVirtualItems().length < sortedUyeler.length && (
            <span className="ml-2 text-xs text-gray-500">
              (Ekranda: {virtualizer.getVirtualItems().length})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
