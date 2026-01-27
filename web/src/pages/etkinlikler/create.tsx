import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Calendar, MapPin, Users, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/common/page-header';
import { Form, FormField, FormSection, FormActions } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export const EtkinliklerCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [formData, setFormData] = React.useState({
    etkinlik_tipi: 'DÜĞÜN',
    baslik: '',
    aciklama: '',
    baslangic_tarihi: new Date().toISOString().split('T')[0],
    bitis_tarihi: '',
    yer: '',
    durum: 'Planlandı',
    tahmini_butce: '',
    gerceklesen_butce: '',
    katilimci_sayisi: '',
    sorumlu_uye_id: '',
    notlar: '',
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.baslik.trim()) {
      newErrors.baslik = 'Başlık zorunludur';
    }
    if (!formData.baslangic_tarihi) {
      newErrors.baslangic_tarihi = 'Başlangıç tarihi zorunludur';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) {
      toast.error('Tenant bilgisi bulunamadı');
      return;
    }
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await invoke('create_etkinlik', {
        tenantIdParam: tenant.id,
        data: {
          baslik: formData.baslik,
          aciklama: formData.aciklama || null,
          baslangic_tarihi: formData.baslangic_tarihi,
          bitis_tarihi: formData.bitis_tarihi || null,
          yer: formData.yer || null,
          etkinlik_tipi: formData.etkinlik_tipi || null,
          durum: formData.durum || null,
          tahmini_butce: formData.tahmini_butce ? parseFloat(formData.tahmini_butce) : null,
          gerceklesen_butce: formData.gerceklesen_butce ? parseFloat(formData.gerceklesen_butce) : null,
          katilimci_sayisi: formData.katilimci_sayisi ? parseInt(formData.katilimci_sayisi) : null,
          sorumlu_uye_id: formData.sorumlu_uye_id || null,
          notlar: formData.notlar || null,
        },
      });
      toast.success('Etkinlik başarıyla oluşturuldu!');
      navigate('/etkinlikler');
    } catch (error) {
      console.error('Failed to create etkinlik:', error);
      toast.error('Etkinlik oluşturulamadı: ' + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Yeni Etkinlik Ekle"
        description="Dernek etkinliği oluşturun"
        breadcrumbs={[
          { label: 'Etkinlikler', href: '/etkinlikler' },
          { label: 'Yeni Etkinlik' },
        ]}
      />

      <Card>
        <CardContent className="p-6">
          <Form onSubmit={handleSubmit}>
            {/* Temel Bilgiler */}
            <FormSection title="Temel Bilgiler" columns={2}>
              <FormField label="Etkinlik Tipi" required htmlFor="etkinlik_tipi">
                <select
                  id="etkinlik_tipi"
                  value={formData.etkinlik_tipi}
                  onChange={(e) => handleChange('etkinlik_tipi', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="DÜĞÜN">Düğün</option>
                  <option value="NİŞAN">Nişan</option>
                  <option value="KINA">Kına</option>
                  <option value="SÜNNET">Sünnet</option>
                  <option value="CENAZE">Cenaze</option>
                  <option value="MEVLİT">Mevlit</option>
                  <option value="TOPLANTI">Toplantı</option>
                  <option value="GENEL KURUL">Genel Kurul</option>
                  <option value="DİĞER">Diğer</option>
                </select>
              </FormField>

              <FormField label="Durum" required htmlFor="durum">
                <select
                  id="durum"
                  value={formData.durum}
                  onChange={(e) => handleChange('durum', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Planlandı">Planlandı</option>
                  <option value="Devam Ediyor">Devam Ediyor</option>
                  <option value="Tamamlandı">Tamamlandı</option>
                  <option value="İptal">İptal</option>
                </select>
              </FormField>

              <FormField 
                label="Başlık" 
                required 
                htmlFor="baslik"
                error={errors.baslik}
                className="col-span-2"
              >
                <Input
                  id="baslik"
                  value={formData.baslik}
                  onChange={(e) => handleChange('baslik', e.target.value)}
                  placeholder="Örn: Ahmet Bey Düğünü"
                />
              </FormField>

              <FormField 
                label="Açıklama" 
                htmlFor="aciklama"
                className="col-span-2"
              >
                <textarea
                  id="aciklama"
                  value={formData.aciklama}
                  onChange={(e) => handleChange('aciklama', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Etkinlik detayları..."
                />
              </FormField>
            </FormSection>

            {/* Tarih ve Konum */}
            <FormSection title="Tarih ve Konum" divider columns={2}>
              <FormField 
                label="Başlangıç Tarihi" 
                required 
                htmlFor="baslangic_tarihi"
                error={errors.baslangic_tarihi}
              >
                <Input
                  id="baslangic_tarihi"
                  type="date"
                  value={formData.baslangic_tarihi}
                  onChange={(e) => handleChange('baslangic_tarihi', e.target.value)}
                />
              </FormField>

              <FormField label="Bitiş Tarihi" htmlFor="bitis_tarihi">
                <Input
                  id="bitis_tarihi"
                  type="date"
                  value={formData.bitis_tarihi}
                  onChange={(e) => handleChange('bitis_tarihi', e.target.value)}
                />
              </FormField>

              <FormField label="Yer" htmlFor="yer">
                <Input
                  id="yer"
                  value={formData.yer}
                  onChange={(e) => handleChange('yer', e.target.value)}
                  placeholder="Düğün salonu, dernek binası, vb."
                />
              </FormField>

              <FormField label="Katılımcı Sayısı" htmlFor="katilimci_sayisi">
                <Input
                  id="katilimci_sayisi"
                  type="number"
                  value={formData.katilimci_sayisi}
                  onChange={(e) => handleChange('katilimci_sayisi', e.target.value)}
                  placeholder="Tahmini veya gerçekleşen"
                />
              </FormField>
            </FormSection>

            {/* Finansal Bilgiler */}
            <FormSection title="Finansal Bilgiler" divider columns={2}>
              <FormField label="Tahmini Bütçe" htmlFor="tahmini_butce" helperText="TL cinsinden">
                <Input
                  id="tahmini_butce"
                  type="number"
                  step="0.01"
                  value={formData.tahmini_butce}
                  onChange={(e) => handleChange('tahmini_butce', e.target.value)}
                  placeholder="0.00"
                />
              </FormField>

              <FormField label="Gerçekleşen Bütçe" htmlFor="gerceklesen_butce" helperText="TL cinsinden">
                <Input
                  id="gerceklesen_butce"
                  type="number"
                  step="0.01"
                  value={formData.gerceklesen_butce}
                  onChange={(e) => handleChange('gerceklesen_butce', e.target.value)}
                  placeholder="0.00"
                />
              </FormField>
            </FormSection>

            {/* Notlar */}
            <FormSection title="Ek Bilgiler" divider>
              <FormField label="Notlar" htmlFor="notlar">
                <textarea
                  id="notlar"
                  value={formData.notlar}
                  onChange={(e) => handleChange('notlar', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Ekstra bilgiler, özel durumlar..."
                />
              </FormField>
            </FormSection>

            <FormActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/etkinlikler')}
              >
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </FormActions>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EtkinliklerCreatePage;
