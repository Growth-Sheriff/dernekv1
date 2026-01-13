import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Building2, Save } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/common/page-header';
import { FormField, FormSection, FormActions } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface CariForm {
  cari_kodu: string;
  tip: string;
  unvan: string;
  yetkili_kisi: string;
  vergi_dairesi: string;
  vergi_no: string;
  telefon: string;
  telefon2: string;
  email: string;
  web: string;
  adres: string;
  il: string;
  ilce: string;
  banka_adi: string;
  iban: string;
  odeme_vade: string;
  risk_limiti: string;
  notlar: string;
}

const tipler = ['Müşteri', 'Tedarikçi', 'Hem Müşteri Hem Tedarikçi'];

export const CariCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tenant = useAuthStore((state) => state.tenant);
  
  const isEdit = Boolean(id);
  
  const [form, setForm] = React.useState<CariForm>({
    cari_kodu: '',
    tip: 'Müşteri',
    unvan: '',
    yetkili_kisi: '',
    vergi_dairesi: '',
    vergi_no: '',
    telefon: '',
    telefon2: '',
    email: '',
    web: '',
    adres: '',
    il: '',
    ilce: '',
    banka_adi: '',
    iban: '',
    odeme_vade: '30',
    risk_limiti: '',
    notlar: '',
  });
  
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (tenant && isEdit && id) {
      loadCari(id);
    }
  }, [tenant, id]);

  const loadCari = async (cariId: string) => {
    if (!tenant) return;
    setLoading(true);
    try {
      const result = await invoke<any>('get_cari', {
        tenantIdParam: tenant.id,
        cariId,
      });
      setForm({
        cari_kodu: result.cari_kodu || '',
        tip: result.tip || 'Müşteri',
        unvan: result.unvan || '',
        yetkili_kisi: result.yetkili_kisi || '',
        vergi_dairesi: result.vergi_dairesi || '',
        vergi_no: result.vergi_no || '',
        telefon: result.telefon || '',
        telefon2: result.telefon2 || '',
        email: result.email || '',
        web: result.web || '',
        adres: result.adres || '',
        il: result.il || '',
        ilce: result.ilce || '',
        banka_adi: result.banka_adi || '',
        iban: result.iban || '',
        odeme_vade: result.odeme_vade?.toString() || '30',
        risk_limiti: result.risk_limiti?.toString() || '',
        notlar: result.notlar || '',
      });
    } catch (error) {
      console.error('Failed to load cari:', error);
      toast.error('Cari bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    
    if (!form.unvan) {
      toast.error('Ünvan zorunludur');
      return;
    }
    
    setSaving(true);
    
    try {
      const data = {
        cari_kodu: form.cari_kodu || null,
        tip: form.tip,
        unvan: form.unvan,
        yetkili_kisi: form.yetkili_kisi || null,
        vergi_dairesi: form.vergi_dairesi || null,
        vergi_no: form.vergi_no || null,
        telefon: form.telefon || null,
        telefon2: form.telefon2 || null,
        email: form.email || null,
        web: form.web || null,
        adres: form.adres || null,
        il: form.il || null,
        ilce: form.ilce || null,
        banka_adi: form.banka_adi || null,
        iban: form.iban || null,
        odeme_vade: form.odeme_vade ? parseInt(form.odeme_vade) : 30,
        risk_limiti: form.risk_limiti ? parseFloat(form.risk_limiti) : null,
        notlar: form.notlar || null,
      };
      
      if (isEdit && id) {
        await invoke('update_cari', {
          tenantIdParam: tenant.id,
          cariId: id,
          data,
        });
      } else {
        await invoke('create_cari', {
          tenantIdParam: tenant.id,
          data,
        });
      }
      
      navigate('/cari');
      toast.success(isEdit ? 'Cari güncellendi' : 'Cari oluşturuldu');
    } catch (error) {
      console.error('Failed to save cari:', error);
      toast.error('Cari kaydedilemedi: ' + error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-12 w-64" />
        <Card>
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={isEdit ? 'Cari Düzenle' : 'Yeni Cari'}
        description="Cari hesap bilgilerini girin"
        icon={Building2}
        breadcrumbs={[
          { label: 'Cari Hesaplar', href: '/cari' },
          { label: isEdit ? 'Düzenle' : 'Yeni' },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Temel Bilgiler */}
            <FormSection title="Temel Bilgiler" columns={3}>
              <FormField label="Cari Kodu" htmlFor="cari_kodu">
                <Input
                  id="cari_kodu"
                  name="cari_kodu"
                  value={form.cari_kodu}
                  onChange={handleChange}
                  placeholder="C-001"
                />
              </FormField>
              <FormField label="Tip" htmlFor="tip" required>
                <select
                  id="tip"
                  name="tip"
                  value={form.tip}
                  onChange={handleChange}
                  className="w-full h-9 px-3 py-1 text-sm border rounded-md bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  {tipler.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Ünvan" htmlFor="unvan" required>
                <Input
                  id="unvan"
                  name="unvan"
                  value={form.unvan}
                  onChange={handleChange}
                  required
                  placeholder="Firma veya kişi adı"
                />
              </FormField>
              <FormField label="Yetkili Kişi" htmlFor="yetkili_kisi">
                <Input
                  id="yetkili_kisi"
                  name="yetkili_kisi"
                  value={form.yetkili_kisi}
                  onChange={handleChange}
                  placeholder="Yetkili kişi adı"
                />
              </FormField>
              <FormField label="Vergi Dairesi" htmlFor="vergi_dairesi">
                <Input
                  id="vergi_dairesi"
                  name="vergi_dairesi"
                  value={form.vergi_dairesi}
                  onChange={handleChange}
                  placeholder="Vergi dairesi"
                />
              </FormField>
              <FormField label="Vergi No / TC" htmlFor="vergi_no">
                <Input
                  id="vergi_no"
                  name="vergi_no"
                  value={form.vergi_no}
                  onChange={handleChange}
                  placeholder="Vergi no veya TC kimlik no"
                />
              </FormField>
            </FormSection>

            {/* İletişim Bilgileri */}
            <FormSection title="İletişim Bilgileri" columns={2} divider>
              <FormField label="Telefon" htmlFor="telefon">
                <Input
                  id="telefon"
                  name="telefon"
                  type="tel"
                  value={form.telefon}
                  onChange={handleChange}
                  placeholder="0532 XXX XX XX"
                />
              </FormField>
              <FormField label="Telefon 2" htmlFor="telefon2">
                <Input
                  id="telefon2"
                  name="telefon2"
                  type="tel"
                  value={form.telefon2}
                  onChange={handleChange}
                  placeholder="Alternatif telefon"
                />
              </FormField>
              <FormField label="E-posta" htmlFor="email">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@firma.com"
                />
              </FormField>
              <FormField label="Web Sitesi" htmlFor="web">
                <Input
                  id="web"
                  name="web"
                  type="url"
                  value={form.web}
                  onChange={handleChange}
                  placeholder="www.firma.com"
                />
              </FormField>
              <FormField label="Adres" htmlFor="adres" className="col-span-2">
                <textarea
                  id="adres"
                  name="adres"
                  value={form.adres}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Açık adres"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:ring-2 focus:ring-ring focus:outline-none resize-none"
                />
              </FormField>
              <FormField label="İl" htmlFor="il">
                <Input
                  id="il"
                  name="il"
                  value={form.il}
                  onChange={handleChange}
                  placeholder="İl"
                />
              </FormField>
              <FormField label="İlçe" htmlFor="ilce">
                <Input
                  id="ilce"
                  name="ilce"
                  value={form.ilce}
                  onChange={handleChange}
                  placeholder="İlçe"
                />
              </FormField>
            </FormSection>

            {/* Banka ve Mali Bilgiler */}
            <FormSection title="Banka ve Mali Bilgiler" columns={2} divider>
              <FormField label="Banka Adı" htmlFor="banka_adi">
                <Input
                  id="banka_adi"
                  name="banka_adi"
                  value={form.banka_adi}
                  onChange={handleChange}
                  placeholder="Banka adı"
                />
              </FormField>
              <FormField label="IBAN" htmlFor="iban">
                <Input
                  id="iban"
                  name="iban"
                  value={form.iban}
                  onChange={handleChange}
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                />
              </FormField>
              <FormField label="Ödeme Vadesi (Gün)" htmlFor="odeme_vade">
                <Input
                  id="odeme_vade"
                  name="odeme_vade"
                  type="number"
                  value={form.odeme_vade}
                  onChange={handleChange}
                  min={0}
                  placeholder="30"
                />
              </FormField>
              <FormField label="Risk Limiti (₺)" htmlFor="risk_limiti">
                <Input
                  id="risk_limiti"
                  name="risk_limiti"
                  type="number"
                  value={form.risk_limiti}
                  onChange={handleChange}
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                />
              </FormField>
              <FormField label="Notlar" htmlFor="notlar" className="col-span-2">
                <textarea
                  id="notlar"
                  name="notlar"
                  value={form.notlar}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Ek notlar"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:ring-2 focus:ring-ring focus:outline-none resize-none"
                />
              </FormField>
            </FormSection>

            <FormActions>
              <Button type="button" variant="outline" onClick={() => navigate('/cari')}>
                İptal
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </FormActions>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default CariCreatePage;
