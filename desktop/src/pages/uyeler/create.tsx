import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { FormField, FormSection, FormActions } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { uyeSchema, type UyeForm } from '@/schemas';

export const UyelerCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<UyeForm>({
    resolver: zodResolver(uyeSchema),
    defaultValues: {
      uyelik_tipi: 'Asil',
      durum: 'Aktif',
      giris_tarihi: new Date().toISOString().split('T')[0],
      cocuk_sayisi: 0,
      aidat_indirimi_yuzde: 0,
    },
  });

  const onSubmit = async (data: UyeForm) => {
    if (!tenant) {
      toast.error('Tenant bulunamadı');
      return;
    }

    try {
      await invoke('create_uye', {
        tenantIdParam: tenant.id,
        data: {
          tc_no: data.tc_no,
          ad: data.ad,
          soyad: data.soyad,
          uyelik_tipi: data.uyelik_tipi || 'Asil',
          durum: data.durum,
          giris_tarihi: data.giris_tarihi,
          telefon: data.telefon || null,
          telefon2: data.telefon2 || null,
          email: data.email || null,
          cinsiyet: data.cinsiyet || null,
          dogum_tarihi: data.dogum_tarihi || null,
          dogum_yeri: data.dogum_yeri || null,
          kan_grubu: data.kan_grubu || null,
          aile_durumu: data.aile_durumu || null,
          cocuk_sayisi: data.cocuk_sayisi || null,
          egitim_durumu: data.egitim_durumu || null,
          meslek: data.meslek || null,
          is_yeri: data.is_yeri || null,
          il: data.il || null,
          ilce: data.ilce || null,
          mahalle: data.mahalle || null,
          adres: data.adres || null,
          posta_kodu: data.posta_kodu || null,
          ozel_aidat_tutari: data.ozel_aidat_tutari || null,
          aidat_indirimi_yuzde: data.aidat_indirimi_yuzde || null,
          referans_uye_id: data.referans_uye_id ? String(data.referans_uye_id) : null,
          notlar: data.notlar || null,
        },
      });
      
      toast.success('Üye başarıyla oluşturuldu');
      navigate('/uyeler');
    } catch (error) {
      console.error('Failed to create uye:', error);
      toast.error('Üye oluşturulamadı: ' + error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Yeni Üye Ekle"
        description="Yeni dernek üyesi kaydedin"
        breadcrumbs={[
          { label: 'Üyeler', href: '/uyeler' },
          { label: 'Yeni Üye' },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Temel Bilgiler */}
            <FormSection title="Temel Bilgiler" columns={3}>
              <FormField label="TC Kimlik No" required error={errors.tc_no?.message}>
                <Input {...register('tc_no')} maxLength={11} placeholder="12345678901" />
              </FormField>
              
              <FormField label="Ad" required error={errors.ad?.message}>
                <Input {...register('ad')} placeholder="Ahmet" />
              </FormField>
              
              <FormField label="Soyad" required error={errors.soyad?.message}>
                <Input {...register('soyad')} placeholder="Yılmaz" />
              </FormField>
              
              <FormField label="Giriş Tarihi" required error={errors.giris_tarihi?.message}>
                <Input type="date" {...register('giris_tarihi')} />
              </FormField>
              
              <FormField label="Üyelik Tipi" className="col-span-1">
                <select 
                  {...register('uyelik_tipi')} 
                  className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Asil">Asil</option>
                  <option value="Onursal">Onursal</option>
                  <option value="Fahri">Fahri</option>
                  <option value="Kurumsal">Kurumsal</option>
                </select>
              </FormField>
              
              <FormField label="Durum" required className="col-span-1">
                <select 
                  {...register('durum')} 
                  className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Pasif">Pasif</option>
                  <option value="Ayrıldı">Ayrıldı</option>
                </select>
              </FormField>
            </FormSection>

            {/* İletişim Bilgileri */}
            <FormSection title="İletişim" columns={3}>
              <FormField label="Telefon">
                <Input type="tel" {...register('telefon')} placeholder="0555 123 4567" />
              </FormField>
              
              <FormField label="Telefon 2">
                <Input type="tel" {...register('telefon2')} placeholder="0555 987 6543" />
              </FormField>
              
              <FormField label="Email" error={errors.email?.message}>
                <Input type="email" {...register('email')} placeholder="ornek@email.com" />
              </FormField>
            </FormSection>

            {/* Kişisel Bilgiler */}
            <FormSection title="Kişisel Bilgiler" columns={4}>
              <FormField label="Cinsiyet">
                <select 
                  {...register('cinsiyet')} 
                  className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Seçiniz</option>
                  <option value="Erkek">Erkek</option>
                  <option value="Kadın">Kadın</option>
                </select>
              </FormField>
              
              <FormField label="Doğum Tarihi">
                <Input type="date" {...register('dogum_tarihi')} />
              </FormField>
              
              <FormField label="Doğum Yeri">
                <Input {...register('dogum_yeri')} placeholder="İstanbul" />
              </FormField>
              
              <FormField label="Kan Grubu">
                <Input {...register('kan_grubu')} placeholder="A Rh+" />
              </FormField>
              
              <FormField label="Aile Durumu">
                <select 
                  {...register('aile_durumu')} 
                  className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Seçiniz</option>
                  <option value="Bekar">Bekar</option>
                  <option value="Evli">Evli</option>
                  <option value="Dul">Dul</option>
                </select>
              </FormField>
              
              <FormField label="Çocuk Sayısı">
                <Input type="number" {...register('cocuk_sayisi', { valueAsNumber: true })} min="0" />
              </FormField>
            </FormSection>

            {/* Meslek Bilgileri */}
            <FormSection title="Meslek" columns={3}>
              <FormField label="Eğitim Durumu">
                <Input {...register('egitim_durumu')} placeholder="Üniversite" />
              </FormField>
              
              <FormField label="Meslek">
                <Input {...register('meslek')} placeholder="Mühendis" />
              </FormField>
              
              <FormField label="İş Yeri">
                <Input {...register('is_yeri')} placeholder="ABC Şirketi" />
              </FormField>
            </FormSection>

            {/* Adres Bilgileri */}
            <FormSection title="Adres" columns={4}>
              <FormField label="İl">
                <Input {...register('il')} placeholder="İstanbul" />
              </FormField>
              
              <FormField label="İlçe">
                <Input {...register('ilce')} placeholder="Kadıköy" />
              </FormField>
              
              <FormField label="Mahalle">
                <Input {...register('mahalle')} placeholder="Caferağa" />
              </FormField>
              
              <FormField label="Posta Kodu">
                <Input {...register('posta_kodu')} placeholder="34710" />
              </FormField>
              
              <FormField label="Açık Adres" className="col-span-4">
                <textarea 
                  {...register('adres')} 
                  rows={2} 
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Sokak, cadde, bina no, vb." 
                />
              </FormField>
            </FormSection>

            {/* Aidat Bilgileri */}
            <FormSection title="Aidat" columns={2}>
              <FormField label="Özel Aidat Tutarı (TL)" hint="Boş bırakılırsa varsayılan tutar kullanılır">
                <Input 
                  type="number" 
                  {...register('ozel_aidat_tutari', { valueAsNumber: true })} 
                  step="0.01" 
                  placeholder="Varsayılan tutar kullanılır" 
                />
              </FormField>
              
              <FormField label="Aidat İndirimi (%)">
                <Input 
                  type="number" 
                  {...register('aidat_indirimi_yuzde', { valueAsNumber: true })} 
                  min="0" 
                  max="100" 
                  placeholder="0" 
                />
              </FormField>
            </FormSection>

            {/* Notlar */}
            <FormSection title="Ek Bilgiler">
              <FormField label="Notlar">
                <textarea 
                  {...register('notlar')} 
                  rows={3} 
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Ek bilgiler, özel durumlar..."
                />
              </FormField>
            </FormSection>

            {/* Form Actions */}
            <FormActions>
              <Button type="button" variant="outline" onClick={() => navigate('/uyeler')}>
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </FormActions>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default UyelerCreatePage;
