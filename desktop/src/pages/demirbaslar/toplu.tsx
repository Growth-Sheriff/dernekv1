import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Package, Plus, Save, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/common/page-header';
import { FormField, FormSection, FormActions } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TopluDemirbasItem {
  id: number;
  ad: string;
  adet: number;
  kategori: string;
  birim_fiyat_mi: boolean;
  alis_bedeli: string;
  konum: string;
  aciklama: string;
}

interface TopluDemirbasResult {
  success: boolean;
  olusturulan_adet: number;
  mesaj: string;
  ana_demirbas_id?: string;
}

const kategoriler = ['Mobilya', 'Elektronik', 'Araç', 'Makine', 'Ofis Malzemesi', 'Diğer'];

export const DemirbasTopluPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  const [saving, setSaving] = React.useState(false);
  
  const [items, setItems] = React.useState<TopluDemirbasItem[]>([
    {
      id: 1,
      ad: '',
      adet: 1,
      kategori: '',
      birim_fiyat_mi: true,
      alis_bedeli: '',
      konum: '',
      aciklama: '',
    },
  ]);

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: Math.max(...prev.map(i => i.id), 0) + 1,
        ad: '',
        adet: 1,
        kategori: '',
        birim_fiyat_mi: true,
        alis_bedeli: '',
        konum: '',
        aciklama: '',
      },
    ]);
  };

  const removeItem = (id: number) => {
    if (items.length === 1) {
      toast.error('En az bir demirbaş olmalı');
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: number, field: keyof TopluDemirbasItem, value: any) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    // Validasyon
    const invalidItems = items.filter(item => !item.ad || item.adet < 1);
    if (invalidItems.length > 0) {
      toast.error('Tüm demirbaşlar için ad ve adet (en az 1) girilmelidir');
      return;
    }

    setSaving(true);

    try {
      let toplamOlusturulan = 0;
      const hatalar: string[] = [];

      // Her satır için ayrı backend çağrısı yap
      for (const item of items) {
        try {
          const result = await invoke<TopluDemirbasResult>('toplu_demirbas_olustur', {
            tenantIdParam: tenant.id,
            data: {
              ad: item.ad,
              adet: item.adet,
              kategori: item.kategori || null,
              birim_fiyat_mi: item.birim_fiyat_mi,
              alis_bedeli: item.alis_bedeli ? parseFloat(item.alis_bedeli) : null,
              konum: item.konum || null,
              aciklama: item.aciklama || null,
            },
          });
          
          if (result.success) {
            toplamOlusturulan += result.olusturulan_adet;
          } else {
            hatalar.push(`${item.ad}: ${result.mesaj}`);
          }
        } catch (err) {
          hatalar.push(`${item.ad}: ${err}`);
        }
      }

      if (hatalar.length > 0) {
        toast.warning(`${toplamOlusturulan} demirbaş oluşturuldu, ${hatalar.length} hata var`);
      } else {
        toast.success(`Toplam ${toplamOlusturulan} adet demirbaş başarıyla oluşturuldu`);
      }
      
      navigate('/demirbaslar');
    } catch (error) {
      console.error('Failed to create demirbas:', error);
      toast.error('Demirbaş oluşturulamadı: ' + error);
    } finally {
      setSaving(false);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.adet, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Toplu Demirbaş Girişi"
        description={`Birden fazla demirbaş kaydı ekleyin (Toplam: ${totalItems} adet)`}
        icon={Package}
        breadcrumbs={[
          { label: 'Demirbaşlar', href: '/demirbaslar' },
          { label: 'Toplu Giriş' },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Demirbaş Listesi</h3>
              <Button type="button" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Satır Ekle
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className="p-4 border rounded-lg bg-muted/30 space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">
                      Demirbaş #{index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-6 gap-4">
                    <FormField label="Demirbaş Adı" htmlFor={`ad-${item.id}`} required className="col-span-2">
                      <Input
                        id={`ad-${item.id}`}
                        value={item.ad}
                        onChange={(e) => updateItem(item.id, 'ad', e.target.value)}
                        required
                        placeholder="Örn: Sandalye"
                      />
                    </FormField>

                    <FormField label="Adet" htmlFor={`adet-${item.id}`} required>
                      <Input
                        id={`adet-${item.id}`}
                        type="number"
                        value={item.adet}
                        onChange={(e) => updateItem(item.id, 'adet', parseInt(e.target.value) || 1)}
                        min={1}
                        required
                      />
                    </FormField>

                    <FormField label="Kategori" htmlFor={`kategori-${item.id}`}>
                      <select
                        id={`kategori-${item.id}`}
                        value={item.kategori}
                        onChange={(e) => updateItem(item.id, 'kategori', e.target.value)}
                        className="w-full h-9 px-3 py-1 text-sm border rounded-md bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                      >
                        <option value="">Seçiniz</option>
                        {kategoriler.map(k => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label="Konum" htmlFor={`konum-${item.id}`}>
                      <Input
                        id={`konum-${item.id}`}
                        value={item.konum}
                        onChange={(e) => updateItem(item.id, 'konum', e.target.value)}
                        placeholder="Toplantı Odası"
                      />
                    </FormField>

                    <FormField label="Bedel (₺)" htmlFor={`bedel-${item.id}`}>
                      <Input
                        id={`bedel-${item.id}`}
                        type="number"
                        value={item.alis_bedeli}
                        onChange={(e) => updateItem(item.id, 'alis_bedeli', e.target.value)}
                        step="0.01"
                        min={0}
                        placeholder="0.00"
                      />
                    </FormField>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.birim_fiyat_mi}
                        onChange={(e) => updateItem(item.id, 'birim_fiyat_mi', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Birim fiyat (her bir demirbaş için)
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {item.birim_fiyat_mi 
                        ? `Toplam: ${(parseFloat(item.alis_bedeli || '0') * item.adet).toFixed(2)} ₺`
                        : `Birim: ${(parseFloat(item.alis_bedeli || '0') / (item.adet || 1)).toFixed(2)} ₺`
                      }
                    </span>
                  </div>

                  {item.aciklama !== undefined && (
                    <FormField label="Açıklama" htmlFor={`aciklama-${item.id}`}>
                      <Input
                        id={`aciklama-${item.id}`}
                        value={item.aciklama}
                        onChange={(e) => updateItem(item.id, 'aciklama', e.target.value)}
                        placeholder="Ek açıklama (opsiyonel)"
                      />
                    </FormField>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Toplam kayıt sayısı</span>
                <span className="font-semibold">{totalItems} adet demirbaş oluşturulacak</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                * Her demirbaş için otomatik seri numarası oluşturulacaktır
              </p>
            </div>

            <FormActions>
              <Button type="button" variant="outline" onClick={() => navigate('/demirbaslar')}>
                İptal
              </Button>
              <Button type="submit" disabled={saving || items.length === 0}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Kaydediliyor...' : `${totalItems} Demirbaş Oluştur`}
              </Button>
            </FormActions>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default DemirbasTopluPage;
