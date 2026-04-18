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
import { parseTRNumber } from '@/lib/formatters';

// ============================================================================
// TYPES
// ============================================================================

interface TopluAidatRequest {
  yil: number;
  varsayilan_tutar: number;
  sadece_aktif_uyeler: boolean;
  kasa_id: string;
  otomatik_gelir_olustur: boolean;
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

interface UyelikTuruDagilim {
  uye_turu: string;
  adet: number;
  ortalama_tutar: number;
  toplam_tutar: number;
}

interface Uye {
  id: string;
  uye_no: string;
  ad_soyad: string;
  uyelik_tipi?: string;
}

interface AidatBorc {
  yil: number;
  tutar: number;
  odenen: number;
  kalan: number;
}

const UYELIK_TIPLERI = ['Tümü', 'Asil', 'Fahri', 'Onursal', 'Kurumsal'];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AidatTopluIslemlerPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  const [activeTab, setActiveTab] = useState<'toplu' | 'ozel' | 'tahsilat'>('toplu');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [kasalar, setKasalar] = useState<any[]>([]);
  const [uyeler, setUyeler] = useState<Uye[]>([]);

  // Tab 1: Toplu Borçlandırma
  const [topluForm, setTopluForm] = useState<TopluAidatRequest>({
    yil: new Date().getFullYear(),
    varsayilan_tutar: 1000,
    sadece_aktif_uyeler: true,
    kasa_id: '',
    otomatik_gelir_olustur: false,
  });
  const [selectedUyeTuru, setSelectedUyeTuru] = useState('Tümü');
  const [showOnizleme, setShowOnizleme] = useState(false);
  const [onizleme, setOnizleme] = useState<TopluAidatOnizleme | null>(null);

  // Tab 2: Özel Tutar Borçlandırma
  const [ozelForm, setOzelForm] = useState({
    yil: new Date().getFullYear(),
    tutar: 0,
    secili_uyeler: [] as string[],
  });

  // Tab 3: Çoklu Dönem Tahsilatı
  const [tahsilatForm, setTahsilatForm] = useState({
    uye_id: '',
    odeme_tutari: 0,
    odeme_tarihi: new Date().toISOString().split('T')[0],
    kasa_id: '',
  });
  const [uyeBorclari, setUyeBorclari] = useState<AidatBorc[]>([]);
  const [seciliYillar, setSeciliYillar] = useState<number[]>([]);

  // Load kasalar & uyeler
  useEffect(() => {
    if (!tenant) return;
    const load = async () => {
      try {
        const [kasaResult, uyeResult] = await Promise.all([
          invoke('get_kasalar', { tenantIdParam: tenant.id }),
          invoke<Uye[]>('get_uyeler', { tenantIdParam: tenant.id, skip: 0, limit: 1000 }),
        ]);
        setKasalar(kasaResult as any[]);
        setUyeler(uyeResult);
        if ((kasaResult as any[]).length > 0) {
          const firstKasa = (kasaResult as any[])[0].id;
          setTopluForm(prev => ({ ...prev, kasa_id: firstKasa }));
          setTahsilatForm(prev => ({ ...prev, kasa_id: firstKasa }));
        }
      } catch (error) {
        console.error('Veri yüklenemedi:', error);
      }
    };
    load();
  }, [tenant]);

  // Tab 3: Üye seçildiğinde borçlarını getir
  useEffect(() => {
    if (!tenant || !tahsilatForm.uye_id) return;
    const loadBorclar = async () => {
      try {
        setLoading(true);
        const borclar = await invoke<AidatBorc[]>('get_uye_aidat_borclari', {
          tenantIdParam: tenant.id,
          uyeId: tahsilatForm.uye_id,
        });
        setUyeBorclari(borclar);
        setSeciliYillar(borclar.map(b => b.yil));
      } catch (error) {
        console.error('Borçlar yüklenemedi:', error);
        setUyeBorclari([]);
      } finally {
        setLoading(false);
      }
    };
    loadBorclar();
  }, [tenant, tahsilatForm.uye_id]);

  // ========================================================================
  // TAB 1: TOPLU BORÇLANDIRMA
  // ========================================================================

  const handleOnizleme = async () => {
    if (!tenant || !topluForm.kasa_id) {
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

  const handleTopluBorclandir = async () => {
    if (!tenant || !topluForm.kasa_id) {
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
      setShowOnizleme(false);
    } catch (error) {
      console.error('Hata:', error);
      alert('İşlem başarısız: ' + error);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // TAB 2: ÖZEL TUTAR BORÇLANDIRMA
  // ========================================================================

  const handleOzelBorclandir = async () => {
    if (!tenant || ozelForm.secili_uyeler.length === 0) {
      alert('Lütfen en az bir üye seçiniz!');
      return;
    }

    setLoading(true);
    try {
      const result = await invoke('ozel_tutar_borclandir', {
        tenantIdParam: tenant.id,
        uyeIds: ozelForm.secili_uyeler,
        yil: ozelForm.yil,
        tutar: ozelForm.tutar,
      });
      setResult(result);
    } catch (error) {
      console.error('Hata:', error);
      alert('İşlem başarısız: ' + error);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // TAB 3: ÇOKLU DÖNEM TAHSİLATI
  // ========================================================================

  const handleTahsilat = async () => {
    if (!tenant || !tahsilatForm.uye_id || !tahsilatForm.kasa_id) {
      alert('Lütfen tüm alanları doldurunuz!');
      return;
    }
    if (seciliYillar.length === 0) {
      alert('Lütfen en az bir yıl seçiniz!');
      return;
    }

    setLoading(true);
    try {
      const result = await invoke('coklu_donem_tahsilat', {
        tenantIdParam: tenant.id,
        uyeId: tahsilatForm.uye_id,
        yillar: seciliYillar,
        odemeTutari: tahsilatForm.odeme_tutari,
        odemeTarihi: tahsilatForm.odeme_tarihi,
        kasaId: tahsilatForm.kasa_id,
      });
      setResult(result);
      // Borçları güncelle
      setTahsilatForm(prev => ({ ...prev, uye_id: '' }));
      setUyeBorclari([]);
      setSeciliYillar([]);
    } catch (error) {
      console.error('Hata:', error);
      alert('İşlem başarısız: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const toggleYil = (yil: number) => {
    setSeciliYillar(prev =>
      prev.includes(yil) ? prev.filter(y => y !== yil) : [...prev, yil]
    );
  };

  const toplamBorc = uyeBorclari
    .filter(b => seciliYillar.includes(b.yil))
    .reduce((sum, b) => sum + b.kalan, 0);

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Aidat Toplu İşlemleri</h1>
        <p className="text-gray-600 mt-1">
          Aidat borçlandırma ve tahsilat işlemlerini toplu olarak gerçekleştirin
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
          Toplu Aidat Borçlandırma
        </button>
        <button
          onClick={() => setActiveTab('ozel')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'ozel'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Seçili Üyelere Özel Tutar
        </button>
        <button
          onClick={() => setActiveTab('tahsilat')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'tahsilat'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Çoklu Dönem Tahsilatı
        </button>
      </div>

      {/* Result Alert */}
      {result && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            <strong>✓ İşlem Başarılı!</strong>
            {result.mesaj && <p className="mt-2">{result.mesaj}</p>}
            {result.olusturulan_adet && <p>Oluşturulan kayıt: {result.olusturulan_adet}</p>}
            {result.toplam_tutar && <p>Toplam: ₺{result.toplam_tutar.toLocaleString('tr-TR')}</p>}
          </AlertDescription>
        </Alert>
      )}

      {/* TAB 1: Toplu Borçlandırma */}
      {activeTab === 'toplu' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Toplu Aidat Borçlandırma</h2>
          <p className="text-gray-600 mb-6">
            Seçilen üye türü veya tüm aktif üyeler için aidat borç kaydı oluşturulur.
          </p>

          <div className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="uyeTuru">Üye Türü</Label>
              <select
                id="uyeTuru"
                value={selectedUyeTuru}
                onChange={(e) => setSelectedUyeTuru(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {UYELIK_TIPLERI.map(tip => (
                  <option key={tip} value={tip}>{tip}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Sadece seçilen türdeki üyeler borçlandırılır
              </p>
            </div>

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
                type="text"
                inputMode="decimal"
                value={topluForm.varsayilan_tutar}
                onChange={(e) =>
                  setTopluForm({ ...topluForm, varsayilan_tutar: parseTRNumber(e.target.value) ?? 0 })
                }
                placeholder="0,00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Sadece tanım ve özel tutar olmayan üyeler için kullanılır
              </p>
            </div>

            <div>
              <Label htmlFor="kasa">Kasa *</Label>
              <select
                id="kasa"
                value={topluForm.kasa_id}
                onChange={(e) => setTopluForm({ ...topluForm, kasa_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Kasa Seçiniz</option>
                {kasalar.map((kasa) => (
                  <option key={kasa.id} value={kasa.id}>
                    {kasa.kasa_adi}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="aktif"
                checked={topluForm.sadece_aktif_uyeler}
                onCheckedChange={(checked) =>
                  setTopluForm({ ...topluForm, sadece_aktif_uyeler: checked as boolean })
                }
              />
              <Label htmlFor="aktif">Sadece aktif üyeler</Label>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                <strong>ℹ️ Borçlandırma Mantığı</strong>
                <div className="mt-2 space-y-1 text-xs">
                  <p>1. Üyenin özel aidat tutarı varsa o kullanılır</p>
                  <p>2. Yoksa üyelik türüne göre aidat tanımı kullanılır</p>
                  <p>3. Tanım da yoksa varsayılan tutar uygulanır</p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleOnizleme} disabled={loading} variant="outline" className="flex-1">
                {loading ? 'Yükleniyor...' : '📊 Önizleme'}
              </Button>
              <Button onClick={handleTopluBorclandir} disabled={loading} className="flex-1">
                Borçlandır
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 2: Özel Tutar */}
      {activeTab === 'ozel' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Seçili Üyelere Özel Tutar Borçlandırma</h2>
          <p className="text-gray-600 mb-6">
            Belirli üyeler için tanımdan bağımsız özel tutar ile borçlandırma yapın.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Yıl</Label>
                <Input
                  type="number"
                  value={ozelForm.yil}
                  onChange={(e) => setOzelForm({ ...ozelForm, yil: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Tutar (₺)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={ozelForm.tutar}
                  onChange={(e) => setOzelForm({ ...ozelForm, tutar: parseTRNumber(e.target.value) ?? 0 })}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <Label>Üye Seçimi ({ozelForm.secili_uyeler.length} seçili)</Label>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {uyeler.map(uye => (
                  <label
                    key={uye.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border-b"
                  >
                    <input
                      type="checkbox"
                      checked={ozelForm.secili_uyeler.includes(uye.id)}
                      onChange={() => {
                        setOzelForm(prev => ({
                          ...prev,
                          secili_uyeler: prev.secili_uyeler.includes(uye.id)
                            ? prev.secili_uyeler.filter(id => id !== uye.id)
                            : [...prev.secili_uyeler, uye.id],
                        }));
                      }}
                    />
                    <span className="text-sm">
                      {uye.uye_no} - {uye.ad_soyad}
                      {uye.uyelik_tipi && <span className="text-xs text-gray-500 ml-2">({uye.uyelik_tipi})</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={handleOzelBorclandir} disabled={loading || ozelForm.secili_uyeler.length === 0}>
              {loading ? 'İşleniyor...' : 'Özel Tutar ile Borçlandır'}
            </Button>
          </div>
        </Card>
      )}

      {/* TAB 3: Çoklu Dönem Tahsilatı */}
      {activeTab === 'tahsilat' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Çoklu Dönem Tahsilatı</h2>
          <p className="text-gray-600 mb-6">
            Bir üyenin birden fazla dönem için aidat ödemesini toplu olarak tahsil edin.
          </p>

          <div className="space-y-4 max-w-2xl">
            <div>
              <Label>Üye Seçimi *</Label>
              <select
                value={tahsilatForm.uye_id}
                onChange={(e) => setTahsilatForm({ ...tahsilatForm, uye_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Üye Seçiniz...</option>
                {uyeler.map((uye) => (
                  <option key={uye.id} value={uye.id}>
                    {uye.uye_no} - {uye.ad_soyad}
                  </option>
                ))}
              </select>
            </div>

            {uyeBorclari.length > 0 && (
              <>
                <div>
                  <Label>Borçlu Olunan Dönemler</Label>
                  <div className="border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-2 text-left">Seç</th>
                          <th className="p-2 text-left">Yıl</th>
                          <th className="p-2 text-right">Toplam</th>
                          <th className="p-2 text-right">Ödenen</th>
                          <th className="p-2 text-right">Kalan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uyeBorclari.map((borc) => (
                          <tr key={borc.yil} className="border-t">
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={seciliYillar.includes(borc.yil)}
                                onChange={() => toggleYil(borc.yil)}
                              />
                            </td>
                            <td className="p-2 font-medium">{borc.yil}</td>
                            <td className="p-2 text-right">₺{borc.tutar.toLocaleString('tr-TR')}</td>
                            <td className="p-2 text-right text-green-600">₺{borc.odenen.toLocaleString('tr-TR')}</td>
                            <td className="p-2 text-right text-red-600 font-medium">
                              ₺{borc.kalan.toLocaleString('tr-TR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-bold">
                        <tr>
                          <td colSpan={4} className="p-2 text-right">Toplam Borç:</td>
                          <td className="p-2 text-right text-red-600">₺{toplamBorc.toLocaleString('tr-TR')}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ödeme Tutarı (₺) *</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={tahsilatForm.odeme_tutari}
                      onChange={(e) =>
                        setTahsilatForm({ ...tahsilatForm, odeme_tutari: parseTRNumber(e.target.value) ?? 0 })
                      }
                      placeholder="0,00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {tahsilatForm.odeme_tutari >= toplamBorc ? 'Tam Ödeme' : 'Kısmi Ödeme'}
                    </p>
                  </div>
                  <div>
                    <Label>Ödeme Tarihi *</Label>
                    <Input
                      type="date"
                      value={tahsilatForm.odeme_tarihi}
                      onChange={(e) =>
                        setTahsilatForm({ ...tahsilatForm, odeme_tarihi: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Kasa *</Label>
                  <select
                    value={tahsilatForm.kasa_id}
                    onChange={(e) => setTahsilatForm({ ...tahsilatForm, kasa_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Kasa Seçiniz</option>
                    {kasalar.map((kasa) => (
                      <option key={kasa.id} value={kasa.id}>
                        {kasa.kasa_adi}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={handleTahsilat}
                  disabled={loading || seciliYillar.length === 0 || !tahsilatForm.kasa_id}
                  className="w-full"
                >
                  {loading ? 'İşleniyor...' : 'Tahsilatı Kaydet'}
                </Button>
              </>
            )}

            {tahsilatForm.uye_id && uyeBorclari.length === 0 && !loading && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-yellow-800">
                  Bu üyenin borcu bulunmamaktadır.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>
      )}

      {/* Önizleme Dialog */}
      <Dialog open={showOnizleme} onOpenChange={setShowOnizleme}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📊 Borçlandırma Önizleme - {topluForm.yil}</DialogTitle>
          </DialogHeader>
          {onizleme && (
            <div className="py-4 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-blue-50">
                  <div className="text-sm text-gray-600">Toplam Üye</div>
                  <div className="text-2xl font-bold">{onizleme.toplam_uye_sayisi}</div>
                </Card>
                <Card className="p-4 bg-green-50">
                  <div className="text-sm text-gray-600">Borçlandırılacak</div>
                  <div className="text-2xl font-bold">{onizleme.borclandirilacak_uye_sayisi}</div>
                </Card>
                <Card className="p-4 bg-yellow-50">
                  <div className="text-sm text-gray-600">Zaten Var</div>
                  <div className="text-2xl font-bold">{onizleme.zaten_aidat_var}</div>
                </Card>
                <Card className="p-4 bg-purple-50">
                  <div className="text-sm text-gray-600">Toplam Tutar</div>
                  <div className="text-2xl font-bold">₺{onizleme.toplam_borclandirilacak_tutar.toLocaleString('tr-TR')}</div>
                </Card>
              </div>

              {onizleme.uyelik_turu_dagilimi.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Üyelik Türü Dağılımı</h3>
                  <div className="space-y-2">
                    {onizleme.uyelik_turu_dagilimi.map((dagilim, idx) => (
                      <Card key={idx} className="p-4 flex justify-between">
                        <div>
                          <div className="font-medium">{dagilim.uye_turu}</div>
                          <div className="text-sm text-gray-600">
                            {dagilim.adet} üye • Ort: ₺{dagilim.ortalama_tutar.toLocaleString('tr-TR')}
                          </div>
                        </div>
                        <div className="font-bold">₺{dagilim.toplam_tutar.toLocaleString('tr-TR')}</div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {onizleme.uyarilar.length > 0 && (
                <Alert className="bg-yellow-50">
                  <AlertDescription>
                    <strong>⚠️ Dikkat</strong>
                    <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
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
                handleTopluBorclandir();
              }}
              disabled={!onizleme || onizleme.borclandirilacak_uye_sayisi === 0}
            >
              Onayla ve Borçlandır
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AidatTopluIslemlerPage;
