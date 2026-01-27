import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

interface UyeDetail {
  id: string;
  tc_no: string;
  ad: string;
  soyad: string;
  ad_soyad?: string;
  telefon?: string;
  telefon2?: string;
  email?: string;
  cinsiyet?: string;
  dogum_tarihi?: string;
  dogum_yeri?: string;
  kan_grubu?: string;
  aile_durumu?: string;
  cocuk_sayisi?: number;
  egitim_durumu?: string;
  meslek?: string;
  is_yeri?: string;
  il?: string;
  ilce?: string;
  mahalle?: string;
  adres?: string;
  posta_kodu?: string;
  uyelik_tipi?: string;
  durum: string;
  giris_tarihi: string;
  ozel_aidat_tutari?: number;
  aidat_indirimi_yuzde?: number;
  referans_uye_id?: string;
  notlar?: string;
}

export const UyelerCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tenant = useAuthStore((state) => state.tenant);
  const isEditMode = Boolean(id);
  const [loading, setLoading] = React.useState(isEditMode);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<UyeForm>({
    resolver: zodResolver(uyeSchema),
    defaultValues: {
      uyelik_tipi: 'Asil',
      durum: 'Aktif',
      giris_tarihi: new Date().toISOString().split('T')[0],
      cocuk_sayisi: 0,
      aidat_indirimi_yuzde: 0,
    },
  });

  // Load existing member data when editing
  React.useEffect(() => {
    if (!isEditMode || !tenant || !id) return;

    const loadUye = async () => {
      try {
        setLoading(true);
        const result = await invoke<UyeDetail>('get_uye_by_id', {
          tenantIdParam: tenant.id,
          uyeId: id,
        });

        // Parse ad_soyad if ad/soyad are not directly available
        let ad = result.ad || '';
        let soyad = result.soyad || '';

        if ((!ad || !soyad) && result.ad_soyad) {
          const parts = result.ad_soyad.split(' ');
          ad = parts[0] || '';
          soyad = parts.slice(1).join(' ') || '';
        }

        reset({
          tc_no: result.tc_no || '',
          ad,
          soyad,
          uyelik_tipi: (result.uyelik_tipi || 'Asil') as 'Asil' | 'Onursal' | 'Fahri' | 'Kurumsal',
          durum: (result.durum || 'Aktif') as 'Aktif' | 'Pasif' | 'Ayrıldı',
          giris_tarihi: result.giris_tarihi || new Date().toISOString().split('T')[0],
          telefon: result.telefon || '',
          telefon2: result.telefon2 || '',
          email: result.email || '',
          cinsiyet: (result.cinsiyet || '') as '' | 'Erkek' | 'Kadın',
          dogum_tarihi: result.dogum_tarihi || '',
          dogum_yeri: result.dogum_yeri || '',
          kan_grubu: result.kan_grubu || '',
          aile_durumu: (result.aile_durumu || '') as '' | 'Bekar' | 'Evli' | 'Dul',
          cocuk_sayisi: result.cocuk_sayisi || 0,
          egitim_durumu: result.egitim_durumu || '',
          meslek: result.meslek || '',
          is_yeri: result.is_yeri || '',
          il: result.il || '',
          ilce: result.ilce || '',
          mahalle: result.mahalle || '',
          adres: result.adres || '',
          posta_kodu: result.posta_kodu || '',
          ozel_aidat_tutari: result.ozel_aidat_tutari || undefined,
          aidat_indirimi_yuzde: result.aidat_indirimi_yuzde || 0,
          referans_uye_id: undefined,
          notlar: result.notlar || '',
        });
      } catch (error) {
        console.error('Failed to load uye:', error);
        toast.error('Üye bilgileri yüklenemedi: ' + error);
        navigate('/uyeler');
      } finally {
        setLoading(false);
      }
    };

    loadUye();
  }, [isEditMode, tenant, id, reset, navigate]);

  const onSubmit = async (data: UyeForm) => {
    if (!tenant) {
      toast.error('Tenant bulunamadı');
      return;
    }

    try {
      if (isEditMode && id) {
        // Update existing member
        await invoke('update_uye', {
          tenantIdParam: tenant.id,
          uyeId: id,
          data: {
            ad: data.ad,
            soyad: data.soyad,
            uyelik_tipi: data.uyelik_tipi || 'Asil',
            durum: data.durum,
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
            notlar: data.notlar || null,
          },
        });

        toast.success('Üye başarıyla güncellendi');
        navigate(`/uyeler/${id}`);
      } else {
        // Create new member
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
      }
    } catch (error) {
      console.error('Failed to save uye:', error);
      toast.error(isEditMode ? 'Üye güncellenemedi: ' + error : 'Üye oluşturulamadı: ' + error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Üye bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={isEditMode ? "Üye Düzenle" : "Yeni Üye Ekle"}
        description={isEditMode ? "Üye bilgilerini güncelleyin" : "Yeni dernek üyesi kaydedin"}
        breadcrumbs={[
          { label: 'Üyeler', href: '/uyeler' },
          { label: isEditMode ? 'Düzenle' : 'Yeni Üye' },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Temel Bilgiler */}
            <FormSection title="Temel Bilgiler" columns={3}>
              <FormField label="TC Kimlik No" required error={errors.tc_no?.message}>
                <Input
                  {...register('tc_no')}
                  maxLength={11}
                  placeholder="12345678901"
                  disabled={isEditMode}
                  className={isEditMode ? 'bg-gray-100' : ''}
                />
              </FormField>

              <FormField label="Ad" required error={errors.ad?.message}>
                <Input {...register('ad')} placeholder="Ahmet" />
              </FormField>

              <FormField label="Soyad" required error={errors.soyad?.message}>
                <Input {...register('soyad')} placeholder="Yılmaz" />
              </FormField>

              <FormField label="Giriş Tarihi" required error={errors.giris_tarihi?.message}>
                <Input
                  type="date"
                  {...register('giris_tarihi')}
                  disabled={isEditMode}
                  className={isEditMode ? 'bg-gray-100' : ''}
                />
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
              <Button type="button" variant="outline" onClick={() => navigate(isEditMode ? `/uyeler/${id}` : '/uyeler')}>
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Kaydediliyor...' : (isEditMode ? 'Güncelle' : 'Kaydet')}
              </Button>
            </FormActions>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default UyelerCreatePage;

