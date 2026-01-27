import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { FormField, FormSection, FormActions } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const ToplantilarCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [formData, setFormData] = React.useState({
    baslik: '',
    toplanti_tipi: 'Yönetim Kurulu',
    tarih: new Date().toISOString().split('T')[0],
    saat: '14:00',
    yer: '',
    gundem: '',
    kararlar: '',
    katilimci_sayisi: '',
    durum: 'Planlandı',
    notlar: '',
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.baslik) newErrors.baslik = 'Başlık zorunludur';
    if (!formData.tarih) newErrors.tarih = 'Tarih zorunludur';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      await invoke('create_toplanti', {
        tenantIdParam: tenant.id,
        data: {
          baslik: formData.baslik,
          toplanti_tipi: formData.toplanti_tipi,
          tarih: formData.tarih + (formData.saat ? 'T' + formData.saat : ''),
          yer: formData.yer || null,
          gundem: formData.gundem || null,
          kararlar: formData.kararlar || null,
          katilimci_sayisi: formData.katilimci_sayisi ? parseInt(formData.katilimci_sayisi) : null,
          durum: formData.durum,
          notlar: formData.notlar || null,
        },
      });
      toast.success('Toplantı başarıyla oluşturuldu');
      navigate('/toplantilar');
    } catch (error) {
      console.error('Failed to create toplanti:', error);
      toast.error('Toplantı oluşturulamadı: ' + error);
    } finally {
      setSubmitting(false);
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
        title="Yeni Toplantı Ekle"
        description="Dernek toplantısı oluşturun"
        breadcrumbs={[
          { label: 'Toplantılar', href: '/toplantilar' },
          { label: 'Yeni Toplantı' },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Temel Bilgiler */}
            <FormSection title="Temel Bilgiler" columns={2}>
              <FormField 
                label="Toplantı Başlığı" 
                required 
                error={errors.baslik}
                className="col-span-2"
              >
                <Input
                  value={formData.baslik}
                  onChange={(e) => handleChange('baslik', e.target.value)}
                  placeholder="2026 Yılı 1. Olağan Yönetim Kurulu Toplantısı"
                />
              </FormField>
              
              <FormField label="Toplantı Tipi" required>
                <select
                  value={formData.toplanti_tipi}
                  onChange={(e) => handleChange('toplanti_tipi', e.target.value)}
                  className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Yönetim Kurulu">Yönetim Kurulu</option>
                  <option value="Genel Kurul">Genel Kurul</option>
                  <option value="Denetim Kurulu">Denetim Kurulu</option>
                  <option value="Komisyon">Komisyon</option>
                  <option value="Olağanüstü">Olağanüstü</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </FormField>
              
              <FormField label="Durum" required>
                <select
                  value={formData.durum}
                  onChange={(e) => handleChange('durum', e.target.value)}
                  className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Planlandı">Planlandı</option>
                  <option value="Devam Ediyor">Devam Ediyor</option>
                  <option value="Tamamlandı">Tamamlandı</option>
                  <option value="İptal Edildi">İptal Edildi</option>
                  <option value="Ertelendi">Ertelendi</option>
                </select>
              </FormField>
            </FormSection>

            {/* Tarih ve Yer */}
            <FormSection title="Tarih ve Yer" columns={3}>
              <FormField label="Tarih" required error={errors.tarih}>
                <Input
                  type="date"
                  value={formData.tarih}
                  onChange={(e) => handleChange('tarih', e.target.value)}
                />
              </FormField>
              
              <FormField label="Saat">
                <Input
                  type="time"
                  value={formData.saat}
                  onChange={(e) => handleChange('saat', e.target.value)}
                />
              </FormField>
              
              <FormField label="Katılımcı Sayısı">
                <Input
                  type="number"
                  value={formData.katilimci_sayisi}
                  onChange={(e) => handleChange('katilimci_sayisi', e.target.value)}
                  min="0"
                  placeholder="0"
                />
              </FormField>
              
              <FormField label="Toplantı Yeri" className="col-span-3">
                <Input
                  value={formData.yer}
                  onChange={(e) => handleChange('yer', e.target.value)}
                  placeholder="Dernek Merkezi / Online (Zoom)"
                />
              </FormField>
            </FormSection>

            {/* Gündem ve Kararlar */}
            <FormSection title="Gündem ve Kararlar">
              <FormField label="Gündem Maddeleri">
                <textarea
                  value={formData.gundem}
                  onChange={(e) => handleChange('gundem', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="1. Açılış ve yoklama&#10;2. Bir önceki toplantı tutanağının okunması&#10;3. Mali durum değerlendirmesi&#10;4. Dilek ve temenniler&#10;5. Kapanış"
                />
              </FormField>
              
              <FormField label="Alınan Kararlar">
                <textarea
                  value={formData.kararlar}
                  onChange={(e) => handleChange('kararlar', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="1. Karar 1...&#10;2. Karar 2..."
                />
              </FormField>
            </FormSection>

            {/* Notlar */}
            <FormSection title="Ek Bilgiler">
              <FormField label="Ek Notlar">
                <textarea
                  value={formData.notlar}
                  onChange={(e) => handleChange('notlar', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Toplantı ile ilgili ek bilgiler..."
                />
              </FormField>
            </FormSection>

            {/* Form Actions */}
            <FormActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/toplantilar')}
              >
                İptal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Kaydediliyor...' : 'Toplantı Oluştur'}
              </Button>
            </FormActions>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default ToplantilarCreatePage;
