import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Package, Save } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/common/page-header';
import { FormField, FormSection, FormActions } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Uye {
  id: string;
  ad: string;
  soyad: string;
}

interface DemirbasForm {
  demirbas_no: string;
  ad: string;
  kategori: string;
  aciklama: string;
  marka_model: string;
  seri_no: string;
  alis_tarihi: string;
  alis_bedeli: string;
  garanti_bitis: string;
  amortisman_suresi: string;
  konum: string;
  sorumlu_uye_id: string;
  durum: string;
  notlar: string;
}

const kategoriler = ['Mobilya', 'Elektronik', 'Araç', 'Makine', 'Ofis Malzemesi', 'Diğer'];
const durumlar = ['Aktif', 'Bakımda', 'Hurda', 'Satıldı'];

export const DemirbasCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tenant = useAuthStore((state) => state.tenant);
  
  const isEdit = Boolean(id);
  
  const [form, setForm] = React.useState<DemirbasForm>({
    demirbas_no: '',
    ad: '',
    kategori: '',
    aciklama: '',
    marka_model: '',
    seri_no: '',
    alis_tarihi: '',
    alis_bedeli: '',
    garanti_bitis: '',
    amortisman_suresi: '5',
    konum: '',
    sorumlu_uye_id: '',
    durum: 'Aktif',
    notlar: '',
  });
  
  const [uyeler, setUyeler] = React.useState<Uye[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (tenant) {
      loadUyeler();
      if (isEdit && id) {
        loadDemirbas(id);
      }
    }
  }, [tenant, id]);

  const loadUyeler = async () => {
    if (!tenant) return;
    try {
      const result = await invoke<Uye[]>('get_uyeler', { tenantIdParam: tenant.id });
      setUyeler(result);
    } catch (error) {
      console.error('Failed to load uyeler:', error);
    }
  };

  const loadDemirbas = async (demirbasId: string) => {
    if (!tenant) return;
    setLoading(true);
    try {
      const result = await invoke<any>('get_demirbas', {
        tenantIdParam: tenant.id,
        demirbasId,
      });
      setForm({
        demirbas_no: result.demirbas_no || '',
        ad: result.ad || '',
        kategori: result.kategori || '',
        aciklama: result.aciklama || '',
        marka_model: result.marka_model || '',
        seri_no: result.seri_no || '',
        alis_tarihi: result.alis_tarihi || '',
        alis_bedeli: result.alis_bedeli?.toString() || '',
        garanti_bitis: result.garanti_bitis || '',
        amortisman_suresi: result.amortisman_suresi?.toString() || '5',
        konum: result.konum || '',
        sorumlu_uye_id: result.sorumlu_uye_id || '',
        durum: result.durum || 'Aktif',
        notlar: result.notlar || '',
      });
    } catch (error) {
      console.error('Failed to load demirbas:', error);
      toast.error('Demirbaş bilgileri yüklenemedi');
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
    
    if (!form.ad) {
      toast.error('Demirbaş adı zorunludur');
      return;
    }
    
    setSaving(true);
    
    try {
      const data = {
        demirbas_no: form.demirbas_no || null,
        ad: form.ad,
        kategori: form.kategori || null,
        aciklama: form.aciklama || null,
        marka_model: form.marka_model || null,
        seri_no: form.seri_no || null,
        alis_tarihi: form.alis_tarihi || null,
        alis_bedeli: form.alis_bedeli ? parseFloat(form.alis_bedeli) : null,
        garanti_bitis: form.garanti_bitis || null,
        amortisman_suresi: form.amortisman_suresi ? parseInt(form.amortisman_suresi) : 5,
        konum: form.konum || null,
        sorumlu_uye_id: form.sorumlu_uye_id || null,
        durum: form.durum,
        notlar: form.notlar || null,
      };
      
      if (isEdit && id) {
        await invoke('update_demirbas', {
          tenantIdParam: tenant.id,
          demirbasId: id,
          data,
        });
      } else {
        await invoke('create_demirbas', {
          tenantIdParam: tenant.id,
          data,
        });
      }
      
      navigate('/demirbaslar');
      toast.success(isEdit ? 'Demirbaş güncellendi' : 'Demirbaş oluşturuldu');
    } catch (error) {
      console.error('Failed to save demirbas:', error);
      toast.error('Demirbaş kaydedilemedi: ' + error);
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
            <div className="grid grid-cols-2 gap-4">
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
        title={isEdit ? 'Demirbaş Düzenle' : 'Yeni Demirbaş'}
        description="Demirbaş bilgilerini girin"
        icon={Package}
        breadcrumbs={[
          { label: 'Demirbaşlar', href: '/demirbaslar' },
          { label: isEdit ? 'Düzenle' : 'Yeni' },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Temel Bilgiler */}
            <FormSection title="Temel Bilgiler" columns={2}>
              <FormField label="Demirbaş No" htmlFor="demirbas_no">
                <Input
                  id="demirbas_no"
                  name="demirbas_no"
                  value={form.demirbas_no}
                  onChange={handleChange}
                  placeholder="DMB-001"
                />
              </FormField>
              <FormField label="Demirbaş Adı" htmlFor="ad" required>
                <Input
                  id="ad"
                  name="ad"
                  value={form.ad}
                  onChange={handleChange}
                  required
                  placeholder="Örn: Toplantı Masası"
                />
              </FormField>
              <FormField label="Kategori" htmlFor="kategori">
                <select
                  id="kategori"
                  name="kategori"
                  value={form.kategori}
                  onChange={handleChange}
                  className="w-full h-9 px-3 py-1 text-sm border rounded-md bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  <option value="">Seçiniz</option>
                  {kategoriler.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Marka / Model" htmlFor="marka_model">
                <Input
                  id="marka_model"
                  name="marka_model"
                  value={form.marka_model}
                  onChange={handleChange}
                  placeholder="Örn: IKEA Bekant"
                />
              </FormField>
              <FormField label="Açıklama" htmlFor="aciklama" className="col-span-2">
                <textarea
                  id="aciklama"
                  name="aciklama"
                  value={form.aciklama}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Demirbaş hakkında detaylı bilgi"
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:ring-2 focus:ring-ring focus:outline-none resize-none"
                />
              </FormField>
            </FormSection>

            {/* Mali Bilgiler */}
            <FormSection title="Mali Bilgiler" columns={3} divider>
              <FormField label="Alış Tarihi" htmlFor="alis_tarihi">
                <Input
                  id="alis_tarihi"
                  name="alis_tarihi"
                  type="date"
                  value={form.alis_tarihi}
                  onChange={handleChange}
                />
              </FormField>
              <FormField label="Alış Bedeli (₺)" htmlFor="alis_bedeli">
                <Input
                  id="alis_bedeli"
                  name="alis_bedeli"
                  type="number"
                  value={form.alis_bedeli}
                  onChange={handleChange}
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                />
              </FormField>
              <FormField label="Amortisman Süresi" htmlFor="amortisman_suresi">
                <select
                  id="amortisman_suresi"
                  name="amortisman_suresi"
                  value={form.amortisman_suresi}
                  onChange={handleChange}
                  className="w-full h-9 px-3 py-1 text-sm border rounded-md bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  <option value="3">3 Yıl</option>
                  <option value="5">5 Yıl</option>
                  <option value="10">10 Yıl</option>
                  <option value="15">15 Yıl</option>
                  <option value="20">20 Yıl</option>
                </select>
              </FormField>
            </FormSection>

            {/* Detay Bilgiler */}
            <FormSection title="Detay Bilgiler" columns={2} divider>
              <FormField label="Seri No" htmlFor="seri_no">
                <Input
                  id="seri_no"
                  name="seri_no"
                  value={form.seri_no}
                  onChange={handleChange}
                  placeholder="Ürün seri numarası"
                />
              </FormField>
              <FormField label="Garanti Bitiş Tarihi" htmlFor="garanti_bitis">
                <Input
                  id="garanti_bitis"
                  name="garanti_bitis"
                  type="date"
                  value={form.garanti_bitis}
                  onChange={handleChange}
                />
              </FormField>
              <FormField label="Konum" htmlFor="konum">
                <Input
                  id="konum"
                  name="konum"
                  value={form.konum}
                  onChange={handleChange}
                  placeholder="Örn: Toplantı Odası"
                />
              </FormField>
              <FormField label="Sorumlu Üye" htmlFor="sorumlu_uye_id">
                <select
                  id="sorumlu_uye_id"
                  name="sorumlu_uye_id"
                  value={form.sorumlu_uye_id}
                  onChange={handleChange}
                  className="w-full h-9 px-3 py-1 text-sm border rounded-md bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  <option value="">Seçiniz</option>
                  {uyeler.map(u => (
                    <option key={u.id} value={u.id}>{u.ad} {u.soyad}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Durum" htmlFor="durum">
                <select
                  id="durum"
                  name="durum"
                  value={form.durum}
                  onChange={handleChange}
                  className="w-full h-9 px-3 py-1 text-sm border rounded-md bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  {durumlar.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
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
              <Button type="button" variant="outline" onClick={() => navigate('/demirbaslar')}>
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

export default DemirbasCreatePage;
