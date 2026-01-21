import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
}

export const AidatTakipVirtualTable: React.FC<AidatTakipVirtualTableProps> = ({
  aidatlar,
  onOdemeEkle,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling konfigürasyonu
  const virtualizer = useVirtualizer({
    count: aidatlar.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 65, // Tahmini satır yüksekliği (px)
    overscan: 5, // Görünür alanın dışında kaç satır render edilsin
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

  if (aidatlar.length === 0) {
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
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
          <div className="col-span-3">Üye</div>
          <div className="col-span-1">Yıl</div>
          <div className="col-span-2 text-right">Tutar</div>
          <div className="col-span-2 text-right">Ödenen</div>
          <div className="col-span-2 text-right">Kalan</div>
          <div className="col-span-1">Durum</div>
          <div className="col-span-1 text-center">İşlem</div>
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
            const aidat = aidatlar[virtualRow.index];

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
                  {/* Üye Ad Soyad */}
                  <div className="col-span-3">
                    <span className="text-sm font-medium text-gray-900">{aidat.uye_ad_soyad}</span>
                  </div>

                  {/* Yıl */}
                  <div className="col-span-1">
                    <span className="text-sm text-gray-700">{aidat.yil}</span>
                  </div>

                  {/* Tutar */}
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      ₺{aidat.tutar.toFixed(2)}
                    </span>
                  </div>

                  {/* Ödenen */}
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-semibold text-green-600">
                      ₺{aidat.odenen_tutar.toFixed(2)}
                    </span>
                  </div>

                  {/* Kalan */}
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-semibold text-red-600">
                      ₺{aidat.kalan_tutar.toFixed(2)}
                    </span>
                  </div>

                  {/* Durum */}
                  <div className="col-span-1">
                    <div className="flex items-center gap-2">
                      {getDurumIcon(aidat.durum)}
                      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getDurumBadge(aidat.durum)}`}>
                        {aidat.durum}
                      </span>
                    </div>
                  </div>

                  {/* İşlem */}
                  <div className="col-span-1 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOdemeEkle(aidat)}
                      className="text-sm py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Ödeme Ekle</span>
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
          Toplam <span className="font-semibold">{aidatlar.length}</span> aidat kaydı gösteriliyor
          {virtualizer.getVirtualItems().length < aidatlar.length && (
            <span className="ml-2 text-xs text-gray-500">
              (Ekranda: {virtualizer.getVirtualItems().length})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
