import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Pencil, Trash2, User, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
}

export const GelirlerVirtualTable: React.FC<GelirlerVirtualTableProps> = ({
  gelirler,
  onEdit,
  onDelete,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling konfigürasyonu
  const virtualizer = useVirtualizer({
    count: gelirler.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 65, // Tahmini satır yüksekliği (px)
    overscan: 5, // Görünür alanın dışında kaç satır render edilsin
  });

  if (gelirler.length === 0) {
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
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
          <div className="col-span-2">Tarih</div>
          <div className="col-span-2 text-right">Tutar</div>
          <div className="col-span-3">Açıklama</div>
          <div className="col-span-2">Makbuz No</div>
          <div className="col-span-1 text-center">Üye</div>
          <div className="col-span-1 text-center">Aidat</div>
          <div className="col-span-1 text-right">İşlemler</div>
        </div>
      </div>

      {/* Virtual Scrolling Container */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: '600px' }} // Sabit yükseklik - virtual scrolling için gerekli
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const gelir = gelirler[virtualRow.index];

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
                <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  {/* Tarih */}
                  <div className="col-span-2">
                    <span className="text-sm text-gray-900">
                      {new Date(gelir.tarih).toLocaleDateString('tr-TR')}
                    </span>
                  </div>

                  {/* Tutar */}
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-semibold text-green-600">
                      +₺{gelir.tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Açıklama */}
                  <div className="col-span-3">
                    <span className="text-sm text-gray-700 line-clamp-1">
                      {gelir.aciklama || '-'}
                    </span>
                  </div>

                  {/* Makbuz No */}
                  <div className="col-span-2">
                    <span className="text-sm text-gray-600">
                      {gelir.makbuz_no || '-'}
                    </span>
                  </div>

                  {/* Üye */}
                  <div className="col-span-1 text-center">
                    {gelir.uye_id ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-700 rounded-full">
                        <User className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </div>

                  {/* Aidat */}
                  <div className="col-span-1 text-center">
                    {gelir.aidat_id ? (
                      <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        Aidat
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </div>

                  {/* İşlemler */}
                  <div className="col-span-1 flex justify-end gap-1">
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
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer - Toplam kayıt sayısı */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
        <div className="text-sm text-gray-600">
          Toplam <span className="font-semibold">{gelirler.length}</span> gelir kaydı gösteriliyor
          {virtualizer.getVirtualItems().length < gelirler.length && (
            <span className="ml-2 text-xs text-gray-500">
              (Ekranda: {virtualizer.getVirtualItems().length})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
