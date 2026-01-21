import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
}

export const UyelerVirtualTable: React.FC<UyelerVirtualTableProps> = ({
  uyeler,
  borcDurumlari,
  onView,
  onEdit,
  onDelete,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling konfigürasyonu
  const virtualizer = useVirtualizer({
    count: uyeler.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Tahmini satır yüksekliği (px)
    overscan: 5, // Görünür alanın dışında kaç satır render edilsin
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

  if (uyeler.length === 0) {
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
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-1">Üye No</div>
          <div className="col-span-2">TC No</div>
          <div className="col-span-2">Ad Soyad</div>
          <div className="col-span-1">Üyelik Tipi</div>
          <div className="col-span-2">Telefon</div>
          <div className="col-span-2 text-right">Kalan Borç</div>
          <div className="col-span-1">Durum</div>
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
            const uye = uyeler[virtualRow.index];
            const borcDurumu = borcDurumlari[uye.id];

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
                <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  {/* Üye No */}
                  <div className="col-span-1">
                    <span className="font-mono text-sm text-gray-900">{uye.uye_no}</span>
                  </div>

                  {/* TC No */}
                  <div className="col-span-2">
                    <span className="text-sm text-gray-600">{uye.tc_no}</span>
                  </div>

                  {/* Ad Soyad */}
                  <div className="col-span-2">
                    <span className="text-sm font-medium text-gray-900">{uye.ad_soyad}</span>
                  </div>

                  {/* Üyelik Tipi */}
                  <div className="col-span-1">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {uye.uyelik_tipi || 'Asil'}
                    </span>
                  </div>

                  {/* Telefon */}
                  <div className="col-span-2">
                    <span className="text-sm text-gray-600">{uye.telefon || '-'}</span>
                  </div>

                  {/* Kalan Borç */}
                  <div className="col-span-2 text-right">
                    {borcDurumu ? (
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
                    )}
                  </div>

                  {/* Durum */}
                  <div className="col-span-1">
                    {getDurumBadge(uye.durum)}
                  </div>

                  {/* İşlemler */}
                  <div className="col-span-1 flex justify-end gap-1">
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
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer - Toplam kayıt sayısı */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
        <div className="text-sm text-gray-600">
          Toplam <span className="font-semibold">{uyeler.length}</span> üye gösteriliyor
          {virtualizer.getVirtualItems().length < uyeler.length && (
            <span className="ml-2 text-xs text-gray-500">
              (Ekranda: {virtualizer.getVirtualItems().length})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
