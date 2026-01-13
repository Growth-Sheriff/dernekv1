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

export const ButceCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [formData, setFormData] = React.useState({
    yil: new Date().getFullYear(),
    kategori: 'Genel',
    aciklama: '',
    planlanan_gelir: '',
    planlanan_gider: '',
    gerceklesen_gelir: '',
    gerceklesen_gider: '',
    notlar: '',
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.kategori) newErrors.kategori = 'Kategori zorunludur';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      await invoke('create_butce', {
        tenantIdParam: tenant.id,
        data: {
          yil: formData.yil,
          kategori: formData.kategori,
          aciklama: formData.aciklama || null,
          planlanan_gelir: formData.planlanan_gelir ? parseFloat(formData.planlanan_gelir) : 0,
          planlanan_gider: formData.planlanan_gider ? parseFloat(formData.planlanan_gider) : 0,
          gerceklesen_gelir: formData.gerceklesen_gelir ? parseFloat(formData.gerceklesen_gelir) : null,
          gerceklesen_gider: formData.gerceklesen_gider ? parseFloat(formData.gerceklesen_gider) : null,
          notlar: formData.notlar || null,
        },
      });
      toast.success('Bütçe kalemi başarıyla oluşturuldu');
      navigate('/butce');
    } catch (error) {
      console.error('Failed to create butce:', error);
      toast.error('Bütçe oluşturulamadı: ' + error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Yıl seçenekleri
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Yeni Bütçe Kalemi Ekle"
        description="Yıllık bütçe planlaması yapın"
        breadcrumbs={[
          { label: 'Bütçe', href: '/butce' },
          { label: 'Yeni Bütçe Kalemi' },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Temel Bilgiler */}
            <FormSection title="Temel Bilgiler" columns={2}>
              <FormField label="Bütçe Yılı" required>
                <select
                  value={formData.yil}
                  onChange={(e) => handleChange('yil', parseInt(e.target.value))}
                  className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </FormField>
              
              <FormField label="Kategori" required error={errors.kategori}>
                <select
                  value={formData.kategori}
                  onChange={(e) => handleChange('kategori', e.target.value)}
                  className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Genel">Genel</option>
                  <option value="Aidat Gelirleri">Aidat Gelirleri</option>
                  <option value="Bağış Gelirleri">Bağış Gelirleri</option>
                  <option value="Etkinlik Gelirleri">Etkinlik Gelirleri</option>
                  <option value="Diğer Gelirler">Diğer Gelirler</option>
                  <option value="Personel Giderleri">Personel Giderleri</option>
                  <option value="Kira Giderleri">Kira Giderleri</option>
                  <option value="Fatura Giderleri">Fatura Giderleri</option>
                  <option value="Etkinlik Giderleri">Etkinlik Giderleri</option>
                  <option value="Yönetim Giderleri">Yönetim Giderleri</option>
                  <option value="Diğer Giderler">Diğer Giderler</option>
                </select>
              </FormField>
              
              <FormField label="Açıklama" className="col-span-2">
                <Input
                  value={formData.aciklama}
                  onChange={(e) => handleChange('aciklama', e.target.value)}
                  placeholder="Bütçe kalemi açıklaması..."
                />
              </FormField>
            </FormSection>

            {/* Planlanan Tutarlar */}
            <FormSection title="Planlanan Tutarlar" columns={2}>
              <FormField label="Planlanan Gelir (₺)">
                <Input
                  type="number"
                  value={formData.planlanan_gelir}
                  onChange={(e) => handleChange('planlanan_gelir', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </FormField>
              
              <FormField label="Planlanan Gider (₺)">
                <Input
                  type="number"
                  value={formData.planlanan_gider}
                  onChange={(e) => handleChange('planlanan_gider', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </FormField>
            </FormSection>

            {/* Gerçekleşen Tutarlar */}
            <FormSection 
              title="Gerçekleşen Tutarlar" 
              description="Bu alanlar sonradan güncellenebilir"
              columns={2}
            >
              <FormField label="Gerçekleşen Gelir (₺)">
                <Input
                  type="number"
                  value={formData.gerceklesen_gelir}
                  onChange={(e) => handleChange('gerceklesen_gelir', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </FormField>
              
              <FormField label="Gerçekleşen Gider (₺)">
                <Input
                  type="number"
                  value={formData.gerceklesen_gider}
                  onChange={(e) => handleChange('gerceklesen_gider', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </FormField>
            </FormSection>

            {/* Notlar */}
            <FormSection title="Ek Bilgiler">
              <FormField label="Notlar">
                <textarea
                  value={formData.notlar}
                  onChange={(e) => handleChange('notlar', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Ek bilgiler, notlar..."
                />
              </FormField>
            </FormSection>

            {/* Form Actions */}
            <FormActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/butce')}
              >
                İptal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Kaydediliyor...' : 'Bütçe Kalemi Oluştur'}
              </Button>
            </FormActions>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default ButceCreatePage;
