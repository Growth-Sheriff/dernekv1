import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/store/authStore';

interface TopluAidatRequest {
  yil: number;
  varsayilan_tutar: number;
  sadece_aktif_uyeler: boolean;
  kasa_id: string;
  otomatik_gelir_olustur: boolean;
}

interface CokluYilOdemeRequest {
  uye_id: string;
  baslangic_yili: number;
  bitis_yili: number;
  toplam_tutar: number;
  odeme_tarihi: string;
  kasa_id: string;
}

interface Uye {
  id: string;
  uye_no: string;
  ad_soyad: string;
}

const AidatTopluIslemlerPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  const [activeTab, setActiveTab] = useState<'toplu' | 'coklu'>('toplu');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [kasalar, setKasalar] = useState<any[]>([]);
  const [uyeler, setUyeler] = useState<Uye[]>([]);

  // Toplu Aidat Form
  const [topluForm, setTopluForm] = useState<TopluAidatRequest>({
    yil: new Date().getFullYear(),
    varsayilan_tutar: 1000,
    sadece_aktif_uyeler: true,
    kasa_id: '',
    otomatik_gelir_olustur: true,
  });

  // Çoklu Yıl Ödeme Form
  const [cokluForm, setCokluForm] = useState<CokluYilOdemeRequest>({
    uye_id: '',
    baslangic_yili: new Date().getFullYear() - 2,
    bitis_yili: new Date().getFullYear(),
    toplam_tutar: 0,
    odeme_tarihi: new Date().toISOString().split('T')[0],
    kasa_id: '',
  });

  // Kasaları yükle
  useEffect(() => {
    if (!tenant) return;
    const loadKasalar = async () => {
      try {
        const result = await invoke('get_kasalar', {
          tenantIdParam: tenant.id,
        });
        setKasalar(result as any[]);
        if ((result as any[]).length > 0) {
          const firstKasaId = (result as any[])[0].id;
          setTopluForm(prev => ({ ...prev, kasa_id: firstKasaId }));
          setCokluForm(prev => ({ ...prev, kasa_id: firstKasaId }));
        }
      } catch (error) {
        console.error('Kasalar yüklenemedi:', error);
      }
    };
    loadKasalar();
  }, [tenant]);

  // Üyeleri yükle
  useEffect(() => {
    if (!tenant) return;
    const loadUyeler = async () => {
      try {
        const result = await invoke<Uye[]>('get_uyeler', {
          tenantIdParam: tenant.id,
          skip: 0,
          limit: 1000,
        });
        setUyeler(result);
      } catch (error) {
        console.error('Üyeler yüklenemedi:', error);
      }
    };
    loadUyeler();
  }, [tenant]);

  const handleTopluAidatOlustur = async () => {
    if (!tenant) return;
    if (!topluForm.kasa_id) {
      alert('Lütfen kasa seçiniz!');
      return;
    }
    
    setLoading(true);
    try {
      const result = await invoke('toplu_aidat_olustur', {
        tenantIdParam: tenant.id,
        data: topluForm,
      });
      setResult(result);
      setShowConfirm(false);
    } catch (error) {
      console.error('Hata:', error);
      alert('İşlem başarısız: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleCokluYilOdeme = async () => {
    if (!tenant) return;
    if (!cokluForm.kasa_id) {
      alert('Lütfen kasa seçiniz!');
      return;
    }
    if (!cokluForm.uye_id) {
      alert('Lütfen üye ID giriniz!');
      return;
    }
    
    setLoading(true);
    try {
      const result = await invoke('coklu_yil_odeme', {
        tenantIdParam: tenant.id,
        data: cokluForm,
      });
      setResult(result);
    } catch (error) {
      console.error('Hata:', error);
      alert('İşlem başarısız: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Toplu İşlemler</h1>
        <p className="text-gray-600 mt-1">
          Aidat oluşturma ve ödeme işlemlerini toplu olarak gerçekleştirin
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('toplu')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'toplu'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Toplu Aidat Oluştur
        </button>
        <button
          onClick={() => setActiveTab('coklu')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'coklu'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Çoklu Yıl Ödemesi
        </button>
      </div>

      {/* Result Alert */}
      {result && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            {result.success && (
              <div>
                <strong>✓ İşlem Başarılı!</strong>
                <div className="mt-2">
                  {result.mesaj && <p>{result.mesaj}</p>}
                  {result.olusturulan_adet && (
                    <p>Oluşturulan kayıt: {result.olusturulan_adet}</p>
                  )}
                  {result.toplam_tutar && (
                    <p>Toplam tutar: ₺{result.toplam_tutar.toLocaleString('tr-TR')}</p>
                  )}
                  {result.odenen_yil_sayisi && (
                    <p>Ödenen yıl sayısı: {result.odenen_yil_sayisi}</p>
                  )}
                  {result.yillar && (
                    <p>Yıllar: {result.yillar.join(', ')}</p>
                  )}
                </div>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Tab Content */}
      {activeTab === 'toplu' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Toplu Aidat Oluştur</h2>
          <p className="text-gray-600 mb-6">
            Tüm aktif üyeler için belirtilen yıla ait aidat kayıtları oluşturulur.
          </p>

          <div className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="yil">Yıl *</Label>
              <Input
                id="yil"
                type="number"
                value={topluForm.yil}
                onChange={(e) =>
                  setTopluForm({ ...topluForm, yil: parseInt(e.target.value) })
                }
              />
            </div>

            <div>
              <Label htmlFor="tutar">Varsayılan Tutar (₺) *</Label>
              <Input
                id="tutar"
                type="number"
                step="0.01"
                value={topluForm.varsayilan_tutar}
                onChange={(e) =>
                  setTopluForm({ ...topluForm, varsayilan_tutar: parseFloat(e.target.value) })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Üyenin özel aidat tutarı tanımlıysa o tutar kullanılır, yoksa bu varsayılan tutar uygulanır
              </p>
            </div>

            <div>
              <Label htmlFor="kasa">Kasa Seçimi *</Label>
              <select
                id="kasa"
                value={topluForm.kasa_id}
                onChange={(e) => setTopluForm({ ...topluForm, kasa_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Kasa Seçiniz</option>
                {kasalar.map((kasa) => (
                  <option key={kasa.id} value={kasa.id}>
                    {kasa.kasa_adi} ({kasa.para_birimi})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Aidat ödemeleri bu kasaya gelir olarak kaydedilecek
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="aktif"
                checked={topluForm.sadece_aktif_uyeler}
                onCheckedChange={(checked) =>
                  setTopluForm({ ...topluForm, sadece_aktif_uyeler: checked as boolean })
                }
              />
              <Label htmlFor="aktif" className="cursor-pointer">
                Sadece aktif üyeler
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="gelir"
                checked={topluForm.otomatik_gelir_olustur}
                onCheckedChange={(checked) =>
                  setTopluForm({ ...topluForm, otomatik_gelir_olustur: checked as boolean })
                }
              />
              <Label htmlFor="gelir" className="cursor-pointer">
                Otomatik gelir kaydı oluştur
              </Label>
            </div>
            <p className="text-xs text-gray-500 -mt-2 ml-6">
              ✓ Aidat ödemeleri otomatik olarak gelir kaydı oluşturur
              <br />
              ✓ Kasa bakiyesi otomatik güncellenir
            </p>

            <Button
              onClick={() => setShowConfirm(true)}
              className="w-full"
              size="lg"
            >
              Aidatları Oluştur
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'coklu' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Çoklu Yıl Ödemesi</h2>
          <p className="text-gray-600 mb-6">
            Bir üye için birden fazla yılın aidat ödemesini tek seferde yapın.
          </p>

          <div className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="uye">Üye Seçimi *</Label>
              <select
                id="uye"
                value={cokluForm.uye_id}
                onChange={(e) =>
                  setCokluForm({ ...cokluForm, uye_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Üye Seçiniz...</option>
                {uyeler.map((uye) => (
                  <option key={uye.id} value={uye.id}>
                    {uye.uye_no} - {uye.ad_soyad}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="baslangic">Başlangıç Yılı *</Label>
                <Input
                  id="baslangic"
                  type="number"
                  value={cokluForm.baslangic_yili}
                  onChange={(e) =>
                    setCokluForm({ ...cokluForm, baslangic_yili: parseInt(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label htmlFor="bitis">Bitiş Yılı *</Label>
                <Input
                  id="bitis"
                  type="number"
                  value={cokluForm.bitis_yili}
                  onChange={(e) =>
                    setCokluForm({ ...cokluForm, bitis_yili: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="toplam">Toplam Tutar (₺) *</Label>
              <Input
                id="toplam"
                type="number"
                step="0.01"
                value={cokluForm.toplam_tutar}
                onChange={(e) =>
                  setCokluForm({ ...cokluForm, toplam_tutar: parseFloat(e.target.value) })
                }
              />
              {cokluForm.baslangic_yili && cokluForm.bitis_yili && cokluForm.toplam_tutar > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Yıllık tutar: ₺
                  {(cokluForm.toplam_tutar / (cokluForm.bitis_yili - cokluForm.baslangic_yili + 1)).toLocaleString('tr-TR')}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="kasa-coklu">Kasa Seçimi *</Label>
              <select
                id="kasa-coklu"
                value={cokluForm.kasa_id}
                onChange={(e) => setCokluForm({ ...cokluForm, kasa_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Kasa Seçiniz</option>
                {kasalar.map((kasa) => (
                  <option key={kasa.id} value={kasa.id}>
                    {kasa.kasa_adi} ({kasa.para_birimi})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Ödemeler bu kasaya gelir olarak kaydedilecek ve bakiye otomatik güncellenecek
              </p>
            </div>
            <div>
              <Label htmlFor="tarih">Ödeme Tarihi *</Label>
              <Input
                id="tarih"
                type="date"
                value={cokluForm.odeme_tarihi}
                onChange={(e) =>
                  setCokluForm({ ...cokluForm, odeme_tarihi: e.target.value })
                }
              />
            </div>

            <Button
              onClick={handleCokluYilOdeme}
              disabled={!cokluForm.uye_id || loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'İşleniyor...' : 'Ödemeyi Kaydet'}
            </Button>
          </div>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toplu Aidat Oluştur - Onay</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              <strong>{topluForm.yil}</strong> yılı için tüm{' '}
              {topluForm.sadece_aktif_uyeler ? 'aktif' : ''} üyelere{' '}
              <strong>₺{topluForm.varsayilan_tutar}</strong> tutarında aidat kaydı oluşturulacak.
            </p>
            <Alert>
              <AlertDescription>
                Bu işlem geri alınamaz. Devam etmek istediğinize emin misiniz?
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              İptal
            </Button>
            <Button onClick={handleTopluAidatOlustur} disabled={loading}>
              {loading ? 'Oluşturuluyor...' : 'Onayla ve Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AidatTopluIslemlerPage;
