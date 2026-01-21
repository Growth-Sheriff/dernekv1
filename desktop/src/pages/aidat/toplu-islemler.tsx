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

interface UyelikTuruDagilim {
  uye_turu: string;
  adet: number;
  ortalama_tutar: number;
  toplam_tutar: number;
}

interface TopluAidatOnizleme {
  success: boolean;
  toplam_uye_sayisi: number;
  borclandirilacak_uye_sayisi: number;
  zaten_aidat_var: number;
  uyelik_turu_dagilimi: UyelikTuruDagilim[];
  ozel_tutarli_uyeler: number;
  tanim_tutarli_uyeler: number;
  varsayilan_tutarli_uyeler: number;
  toplam_borclandirilacak_tutar: number;
  ortalama_tutar: number;
  uyarilar: string[];
}

const AidatTopluIslemlerPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  const [activeTab, setActiveTab] = useState<'toplu' | 'coklu'>('toplu');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOnizleme, setShowOnizleme] = useState(false);
  const [onizleme, setOnizleme] = useState<TopluAidatOnizleme | null>(null);
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

  const handleOnizleme = async () => {
    if (!tenant) return;
    if (!topluForm.kasa_id) {
      alert('Lütfen kasa seçiniz!');
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<TopluAidatOnizleme>('toplu_aidat_onizleme', {
        tenantIdParam: tenant.id,
        data: topluForm,
      });
      setOnizleme(result);
      setShowOnizleme(true);
    } catch (error) {
      console.error('Önizleme hatası:', error);
      alert('Önizleme yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

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
      setShowOnizleme(false);
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

            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                <strong>ℹ️ Borçlandırma İşlemi</strong>
                <div className="mt-2 space-y-1">
                  <p>• Sadece aidat <strong>borç kaydı</strong> oluşturulur (durum: beklemede)</p>
                  <p>• Gelir kaydı ve kasa güncellemesi <strong>ödeme yapıldığında</strong> gerçekleşir</p>
                  <p>• Üyelik türüne göre farklı tutarlar uygulanabilir</p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                onClick={handleOnizleme}
                disabled={loading}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                {loading ? 'Yükleniyor...' : '📊 Önizleme Göster'}
              </Button>
              <Button
                onClick={() => setShowConfirm(true)}
                className="flex-1"
                size="lg"
              >
                Aidatları Oluştur
              </Button>
            </div>
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

      {/* Önizleme Dialog */}
      <Dialog open={showOnizleme} onOpenChange={setShowOnizleme}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📊 Toplu Aidat Önizleme - {topluForm.yil}</DialogTitle>
          </DialogHeader>
          {onizleme && (
            <div className="py-4 space-y-6">
              {/* Özet Bilgiler */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="text-sm text-gray-600">Toplam Üye</div>
                  <div className="text-2xl font-bold text-blue-700">{onizleme.toplam_uye_sayisi}</div>
                </Card>
                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="text-sm text-gray-600">Borçlandırılacak</div>
                  <div className="text-2xl font-bold text-green-700">{onizleme.borclandirilacak_uye_sayisi}</div>
                </Card>
                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <div className="text-sm text-gray-600">Zaten Aidat Var</div>
                  <div className="text-2xl font-bold text-yellow-700">{onizleme.zaten_aidat_var}</div>
                </Card>
                <Card className="p-4 bg-purple-50 border-purple-200">
                  <div className="text-sm text-gray-600">Toplam Tutar</div>
                  <div className="text-2xl font-bold text-purple-700">
                    ₺{onizleme.toplam_borclandirilacak_tutar.toLocaleString('tr-TR')}
                  </div>
                </Card>
              </div>

              {/* Üyelik Türü Dağılımı */}
              {onizleme.uyelik_turu_dagilimi.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Üyelik Türü Dağılımı</h3>
                  <div className="space-y-2">
                    {onizleme.uyelik_turu_dagilimi.map((dagilim, idx) => (
                      <Card key={idx} className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">{dagilim.uye_turu}</div>
                            <div className="text-sm text-gray-600">
                              {dagilim.adet} üye • Ortalama: ₺{dagilim.ortalama_tutar.toLocaleString('tr-TR')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">
                              ₺{dagilim.toplam_tutar.toLocaleString('tr-TR')}
                            </div>
                            <div className="text-xs text-gray-500">Toplam</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Tutar Kaynağı */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Tutar Kaynağı</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3 text-center">
                    <div className="text-sm text-gray-600">Özel Tutar</div>
                    <div className="text-xl font-bold text-blue-600">{onizleme.ozel_tutarli_uyeler}</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-sm text-gray-600">Tanım</div>
                    <div className="text-xl font-bold text-green-600">{onizleme.tanim_tutarli_uyeler}</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-sm text-gray-600">Varsayılan</div>
                    <div className="text-xl font-bold text-gray-600">{onizleme.varsayilan_tutarli_uyeler}</div>
                  </Card>
                </div>
              </div>

              {/* Uyarılar */}
              {onizleme.uyarilar.length > 0 && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertDescription className="text-sm text-yellow-800">
                    <strong>⚠️ Dikkat</strong>
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                      {onizleme.uyarilar.map((uyari, idx) => (
                        <li key={idx}>{uyari}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOnizleme(false)}>
              Kapat
            </Button>
            <Button
              onClick={() => {
                setShowOnizleme(false);
                setShowConfirm(true);
              }}
              disabled={!onizleme || onizleme.borclandirilacak_uye_sayisi === 0}
            >
              Devam Et ve Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
