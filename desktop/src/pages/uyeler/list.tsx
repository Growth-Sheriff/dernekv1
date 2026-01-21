import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Download, Pencil, Trash2, Eye, EyeOff, RotateCcw, Users, Search, FileDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UyelerVirtualTable } from '@/components/uyeler/UyelerVirtualTable';
import { useUyeler } from '@/hooks/useUyeler';
import { ColumnSettingsModal } from '@/components/common/ColumnSettingsModal';
import { useColumnConfig } from '@/hooks/useColumnConfig';
import { UYELER_PAGE_CONFIG, PAGE_PRESETS } from '@/config/columnDefinitions';
import { PAGE_KEYS } from '@/types/columnConfig';

interface Uye {
  id: string;
  uye_no: string;
  tc_no: string;
  ad_soyad: string;
  telefon?: string;
  email?: string;
  giris_tarihi: string;
  durum: string;
  uyelik_tipi?: string;
  is_active?: boolean;
  referans_uye_id?: string;
}

interface UyeBorcDurumu {
  uye_id: string;
  toplam_borc: number;
  odenen: number;
  kalan_borc: number;
}

export const UyelerListPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);

  const [search, setSearch] = React.useState('');
  const [durum, setDurum] = React.useState<string>('');
  const [showInactive, setShowInactive] = React.useState(false);

  // React Query hook ile veri çekme (cache + auto-refetch)
  const { uyeler, borcDurumlari, isLoading: loading, refetch } = useUyeler({
    search: search || null,
    durum: durum || null,
    limit: 1000, // Daha fazla kayıt yükle (virtual scrolling ile performans sorunu yok)
  });

  // Column configuration
  const [showColumnSettings, setShowColumnSettings] = React.useState(false);
  const {
    config: columnConfig,
    isLoading: columnConfigLoading,
    saveConfig: saveColumnConfig,
    resetConfig: resetColumnConfig,
  } = useColumnConfig({
    pageKey: PAGE_KEYS.UYELER_LIST,
    defaultVisible: UYELER_PAGE_CONFIG.defaultVisible,
    defaultOrder: UYELER_PAGE_CONFIG.defaultColumns.map(c => c.id),
  });

  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingUye, setEditingUye] = React.useState<Uye | null>(null);
  const [formData, setFormData] = React.useState({
    // Temel Bilgiler
    tc_no: '',
    ad: '',
    soyad: '',
    giris_tarihi: new Date().toISOString().split('T')[0],
    durum: 'Aktif',
    uyelik_tipi: 'Asil',
    // İletişim
    telefon: '',
    telefon2: '',
    email: '',
    // Kişisel
    cinsiyet: '',
    dogum_tarihi: '',
    dogum_yeri: '',
    kan_grubu: '',
    aile_durumu: '',
    cocuk_sayisi: 0,
    // Meslek
    egitim_durumu: '',
    meslek: '',
    is_yeri: '',
    // Adres
    il: '',
    ilce: '',
    mahalle: '',
    adres: '',
    posta_kodu: '',
    // Aidat
    ozel_aidat_tutari: 0,
    aidat_indirimi_yuzde: 0,
    // Diğer
    referans_uye_id: '',
    notlar: '',
  });


  const handleCreateUye = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) {
      toast.error('Tenant bilgisi bulunamadı!');
      return;
    }
    
    // Validasyon
    if (!formData.tc_no || !formData.ad || !formData.soyad) {
      toast.error('TC Kimlik No, Ad ve Soyad alanları zorunludur!');
      return;
    }
    
    if (formData.tc_no.length !== 11) {
      toast.error('TC Kimlik No 11 haneli olmalıdır!');
      return;
    }
    
    try {
      await invoke('create_uye', {
        tenantIdParam: tenant.id,
        data: {
          // Temel Bilgiler
          tc_no: formData.tc_no,
          ad: formData.ad,
          soyad: formData.soyad,
          giris_tarihi: formData.giris_tarihi,
          durum: formData.durum,
          uyelik_tipi: formData.uyelik_tipi || null,
          // İletişim
          telefon: formData.telefon || null,
          telefon2: formData.telefon2 || null,
          email: formData.email || null,
          // Kişisel
          cinsiyet: formData.cinsiyet || null,
          dogum_tarihi: formData.dogum_tarihi || null,
          dogum_yeri: formData.dogum_yeri || null,
          kan_grubu: formData.kan_grubu || null,
          aile_durumu: formData.aile_durumu || null,
          cocuk_sayisi: formData.cocuk_sayisi || null,
          // Meslek
          egitim_durumu: formData.egitim_durumu || null,
          meslek: formData.meslek || null,
          is_yeri: formData.is_yeri || null,
          // Adres
          il: formData.il || null,
          ilce: formData.ilce || null,
          mahalle: formData.mahalle || null,
          adres: formData.adres || null,
          posta_kodu: formData.posta_kodu || null,
          // Aidat
          ozel_aidat_tutari: formData.ozel_aidat_tutari || null,
          aidat_indirimi_yuzde: formData.aidat_indirimi_yuzde || null,
          // Diğer
          referans_uye_id: formData.referans_uye_id || null,
          notlar: formData.notlar || null,
        },
      });
      
      toast.success('Üye başarıyla oluşturuldu!');
      setShowCreateModal(false);
      setFormData({
        tc_no: '',
        ad: '',
        soyad: '',
        giris_tarihi: new Date().toISOString().split('T')[0],
        durum: 'Aktif',
        uyelik_tipi: 'Asil',
        telefon: '',
        telefon2: '',
        email: '',
        cinsiyet: '',
        dogum_tarihi: '',
        dogum_yeri: '',
        kan_grubu: '',
        aile_durumu: '',
        cocuk_sayisi: 0,
        egitim_durumu: '',
        meslek: '',
        is_yeri: '',
        il: '',
        ilce: '',
        mahalle: '',
        adres: '',
        posta_kodu: '',
        ozel_aidat_tutari: 0,
        aidat_indirimi_yuzde: 0,
        referans_uye_id: '',
        notlar: '',
      });
      refetch();
    } catch (error) {
      console.error('Failed to create uye:', error);
      toast.error('Üye oluşturulamadı: ' + error);
    }
  };

  const handleEdit = (uye: Uye) => {
    setEditingUye(uye);
    // ad_soyad'ı böl (ilk boşlukta ayır)
    const parts = uye.ad_soyad?.split(' ') || ['', ''];
    const ad = parts[0] || '';
    const soyad = parts.slice(1).join(' ') || ''; // İlk kelimeden sonraki her şey soyad

    setFormData({
      tc_no: uye.tc_no || '',
      ad,
      soyad,
      giris_tarihi: uye.giris_tarihi || new Date().toISOString().split('T')[0],
      durum: uye.durum || 'Aktif',
      uyelik_tipi: uye.uyelik_tipi || 'Asil',
      telefon: uye.telefon || '',
      telefon2: (uye as any).telefon2 || '',
      email: uye.email || '',
      cinsiyet: (uye as any).cinsiyet || '',
      dogum_tarihi: (uye as any).dogum_tarihi || '',
      dogum_yeri: (uye as any).dogum_yeri || '',
      kan_grubu: (uye as any).kan_grubu || '',
      aile_durumu: (uye as any).aile_durumu || '',
      cocuk_sayisi: (uye as any).cocuk_sayisi || 0,
      egitim_durumu: (uye as any).egitim_durumu || '',
      meslek: (uye as any).meslek || '',
      is_yeri: (uye as any).is_yeri || '',
      il: (uye as any).il || '',
      ilce: (uye as any).ilce || '',
      mahalle: (uye as any).mahalle || '',
      adres: (uye as any).adres || '',
      posta_kodu: (uye as any).posta_kodu || '',
      ozel_aidat_tutari: (uye as any).ozel_aidat_tutari || 0,
      aidat_indirimi_yuzde: (uye as any).aidat_indirimi_yuzde || 0,
      referans_uye_id: (uye as any).referans_uye_id || '',
      notlar: (uye as any).notlar || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateUye = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !editingUye) return;
    
    if (!formData.ad || !formData.soyad) {
      toast.error('Ad ve Soyad alanları zorunludur!');
      return;
    }
    
    try {
      await invoke('update_uye', {
        tenantIdParam: tenant.id,
        uyeId: editingUye.id,
        data: {
          ad: formData.ad,
          soyad: formData.soyad,
          telefon: formData.telefon || null,
          telefon2: formData.telefon2 || null,
          email: formData.email || null,
          cinsiyet: formData.cinsiyet || null,
          dogum_tarihi: formData.dogum_tarihi || null,
          dogum_yeri: formData.dogum_yeri || null,
          kan_grubu: formData.kan_grubu || null,
          aile_durumu: formData.aile_durumu || null,
          cocuk_sayisi: formData.cocuk_sayisi || null,
          egitim_durumu: formData.egitim_durumu || null,
          meslek: formData.meslek || null,
          is_yeri: formData.is_yeri || null,
          il: formData.il || null,
          ilce: formData.ilce || null,
          mahalle: formData.mahalle || null,
          adres: formData.adres || null,
          posta_kodu: formData.posta_kodu || null,
          ozel_aidat_tutari: formData.ozel_aidat_tutari || null,
          aidat_indirimi_yuzde: formData.aidat_indirimi_yuzde || null,
          durum: formData.durum,
          notlar: formData.notlar || null,
        },
      });
      
      toast.success('Üye başarıyla güncellendi!');
      setShowEditModal(false);
      setEditingUye(null);
      setFormData({
        tc_no: '',
        ad: '',
        soyad: '',
        giris_tarihi: new Date().toISOString().split('T')[0],
        durum: 'Aktif',
        uyelik_tipi: 'Asil',
        telefon: '',
        telefon2: '',
        email: '',
        cinsiyet: '',
        dogum_tarihi: '',
        dogum_yeri: '',
        kan_grubu: '',
        aile_durumu: '',
        cocuk_sayisi: 0,
        egitim_durumu: '',
        meslek: '',
        is_yeri: '',
        il: '',
        ilce: '',
        mahalle: '',
        adres: '',
        posta_kodu: '',
        ozel_aidat_tutari: 0,
        aidat_indirimi_yuzde: 0,
        referans_uye_id: '',
        notlar: '',
      });
      refetch();
    } catch (error) {
      console.error('Failed to update uye:', error);
      toast.error('Üye güncellenemedi: ' + error);
    }
  };

  const handleDelete = async (id: string, adSoyad: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm(`"${adSoyad}" isimli üyeyi silmek istediğinizden emin misiniz?`)) {
      return;
    }
    
    if (!tenant) return;
    
    try {
      await invoke('delete_uye', {
        tenantIdParam: tenant.id,
        uyeId: id,
      });
      
      toast.success('Üye başarıyla silindi');
      refetch();
    } catch (error) {
      console.error('Failed to delete uye:', error);
      toast.error('Üye silinemedi: ' + error);
    }
  };

  const handleExport = async () => {
    if (!tenant) return;
    
    try {
      toast.loading('Excel dosyası oluşturuluyor...');
      const filePath = await invoke<string>('export_uyeler_excel', {
        tenantIdParam: tenant.id,
      });
      toast.success(`Excel dosyası oluşturuldu: ${filePath}`);
    } catch (error) {
      console.error('Export başarısız:', error);
      toast.error('Export başarısız: ' + error);
    }
  };

  // React Query hook otomatik olarak tenant, search, durum değiştiğinde refetch yapar
  // useEffect gerekmez

  return (
    <div className="space-y-6">
      <PageHeader
        title="Üyeler"
        description="Dernek üyelerini yönetin"
        icon={Users}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <FileDown className="h-4 w-4 mr-2" />
              Excel Export
            </Button>
            <Button onClick={() => navigate('/uyeler/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Üye
            </Button>
          </div>
        }
      />

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Üye Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUye} className="space-y-6 px-6 py-4">
            {/* Temel Bilgiler */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Temel Bilgiler</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TC Kimlik No *</label>
                  <input
                    type="text"
                    value={formData.tc_no}
                    onChange={(e) => setFormData({ ...formData, tc_no: e.target.value })}
                    maxLength={11}
                    className="input-macos"
                    placeholder="12345678901"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                  <input
                    type="text"
                    value={formData.ad}
                    onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                    className="input-macos"
                    placeholder="Ahmet"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Soyad *</label>
                  <input
                    type="text"
                    value={formData.soyad}
                    onChange={(e) => setFormData({ ...formData, soyad: e.target.value })}
                    className="input-macos"
                    placeholder="Yılmaz"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Üyelik Tipi</label>
                  <select
                    value={formData.uyelik_tipi}
                    onChange={(e) => setFormData({ ...formData, uyelik_tipi: e.target.value })}
                    className="input-macos"
                  >
                    <option value="Asil">Asil</option>
                    <option value="Onursal">Onursal</option>
                    <option value="Fahri">Fahri</option>
                    <option value="Kurumsal">Kurumsal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durum *</label>
                  <select
                    value={formData.durum}
                    onChange={(e) => setFormData({ ...formData, durum: e.target.value })}
                    className="input-macos"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Pasif">Pasif</option>
                    <option value="Ayrıldı">Ayrıldı</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giriş Tarihi *</label>
                  <input
                    type="date"
                    value={formData.giris_tarihi}
                    onChange={(e) => setFormData({ ...formData, giris_tarihi: e.target.value })}
                    className="input-macos"
                    required
                  />
                </div>
              </div>
            </div>

            {/* İletişim Bilgileri */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">İletişim Bilgileri</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={formData.telefon}
                    onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                    className="input-macos"
                    placeholder="0555 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon 2</label>
                  <input
                    type="tel"
                    value={formData.telefon2}
                    onChange={(e) => setFormData({ ...formData, telefon2: e.target.value })}
                    className="input-macos"
                    placeholder="0555 987 6543"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-macos"
                    placeholder="ornek@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Kişisel Bilgiler */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Kişisel Bilgiler</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cinsiyet</label>
                  <select
                    value={formData.cinsiyet}
                    onChange={(e) => setFormData({ ...formData, cinsiyet: e.target.value })}
                    className="input-macos"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Erkek">Erkek</option>
                    <option value="Kadın">Kadın</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Doğum Tarihi</label>
                  <input
                    type="date"
                    value={formData.dogum_tarihi}
                    onChange={(e) => setFormData({ ...formData, dogum_tarihi: e.target.value })}
                    className="input-macos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Doğum Yeri</label>
                  <input
                    type="text"
                    value={formData.dogum_yeri}
                    onChange={(e) => setFormData({ ...formData, dogum_yeri: e.target.value })}
                    className="input-macos"
                    placeholder="İstanbul"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kan Grubu</label>
                  <select
                    value={formData.kan_grubu}
                    onChange={(e) => setFormData({ ...formData, kan_grubu: e.target.value })}
                    className="input-macos"
                  >
                    <option value="">Seçiniz</option>
                    <option value="A Rh+">A Rh+</option>
                    <option value="A Rh-">A Rh-</option>
                    <option value="B Rh+">B Rh+</option>
                    <option value="B Rh-">B Rh-</option>
                    <option value="AB Rh+">AB Rh+</option>
                    <option value="AB Rh-">AB Rh-</option>
                    <option value="0 Rh+">0 Rh+</option>
                    <option value="0 Rh-">0 Rh-</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aile Durumu</label>
                  <select
                    value={formData.aile_durumu}
                    onChange={(e) => setFormData({ ...formData, aile_durumu: e.target.value })}
                    className="input-macos"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Bekar">Bekar</option>
                    <option value="Evli">Evli</option>
                    <option value="Dul">Dul</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Çocuk Sayısı</label>
                  <input
                    type="number"
                    value={formData.cocuk_sayisi}
                    onChange={(e) => setFormData({ ...formData, cocuk_sayisi: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="input-macos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Eğitim Durumu</label>
                  <select
                    value={formData.egitim_durumu}
                    onChange={(e) => setFormData({ ...formData, egitim_durumu: e.target.value })}
                    className="input-macos"
                  >
                    <option value="">Seçiniz</option>
                    <option value="İlkokul">İlkokul</option>
                    <option value="Ortaokul">Ortaokul</option>
                    <option value="Lise">Lise</option>
                    <option value="Ön Lisans">Ön Lisans</option>
                    <option value="Lisans">Lisans</option>
                    <option value="Yüksek Lisans">Yüksek Lisans</option>
                    <option value="Doktora">Doktora</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Meslek Bilgileri */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Meslek Bilgileri</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meslek</label>
                  <input
                    type="text"
                    value={formData.meslek}
                    onChange={(e) => setFormData({ ...formData, meslek: e.target.value })}
                    className="input-macos"
                    placeholder="Mühendis"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İş Yeri</label>
                  <input
                    type="text"
                    value={formData.is_yeri}
                    onChange={(e) => setFormData({ ...formData, is_yeri: e.target.value })}
                    className="input-macos"
                    placeholder="ABC Şirketi"
                  />
                </div>
              </div>
            </div>

            {/* Adres Bilgileri */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Adres Bilgileri</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İl</label>
                  <input
                    type="text"
                    value={formData.il}
                    onChange={(e) => setFormData({ ...formData, il: e.target.value })}
                    className="input-macos"
                    placeholder="İstanbul"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
                  <input
                    type="text"
                    value={formData.ilce}
                    onChange={(e) => setFormData({ ...formData, ilce: e.target.value })}
                    className="input-macos"
                    placeholder="Kadıköy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mahalle</label>
                  <input
                    type="text"
                    value={formData.mahalle}
                    onChange={(e) => setFormData({ ...formData, mahalle: e.target.value })}
                    className="input-macos"
                    placeholder="Caferağa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posta Kodu</label>
                  <input
                    type="text"
                    value={formData.posta_kodu}
                    onChange={(e) => setFormData({ ...formData, posta_kodu: e.target.value })}
                    className="input-macos"
                    placeholder="34710"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Açık Adres</label>
                <textarea
                  value={formData.adres}
                  onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                  rows={2}
                  className="input-macos resize-none"
                  placeholder="Sokak, cadde, bina no, daire no..."
                />
              </div>
            </div>

            {/* Aidat Bilgileri */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Aidat Bilgileri</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Özel Aidat Tutarı (TL)</label>
                  <input
                    type="number"
                    value={formData.ozel_aidat_tutari || ''}
                    onChange={(e) => setFormData({ ...formData, ozel_aidat_tutari: parseFloat(e.target.value) || 0 })}
                    step="0.01"
                    className="input-macos"
                    placeholder="Varsayılan tutar kullanılır"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aidat İndirimi (%)</label>
                  <input
                    type="number"
                    value={formData.aidat_indirimi_yuzde || ''}
                    onChange={(e) => setFormData({ ...formData, aidat_indirimi_yuzde: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    className="input-macos"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Referans Üye */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Referans Üye</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referans Üye Seçin</label>
                <select
                  value={formData.referans_uye_id}
                  onChange={(e) => setFormData({ ...formData, referans_uye_id: e.target.value })}
                  className="input-macos"
                >
                  <option value="">Referans üye yok</option>
                  {uyeler.map(u => (
                    <option key={u.id} value={u.id}>{u.ad_soyad} ({u.tc_no})</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Bu üyeyi derneğe kim tavsiye etti?</p>
              </div>
            </div>

            {/* Notlar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <textarea
                value={formData.notlar}
                onChange={(e) => setFormData({ ...formData, notlar: e.target.value })}
                rows={2}
                className="input-macos resize-none"
                placeholder="Üye hakkında ek bilgiler..."
              />
            </div>
            
            <DialogFooter>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn-macos-secondary"
              >
                İptal
              </button>
              <button type="submit" className="btn-macos">
                <Plus className="w-4 h-4 mr-2" />
                Üye Ekle
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal - Create Modal ile aynı form alanları */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Üye Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUye} className="space-y-6 px-6 py-4">
            {/* Temel Bilgiler */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Temel Bilgiler</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TC Kimlik No</label>
                  <input
                    type="text"
                    value={formData.tc_no}
                    className="input-macos bg-gray-100"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                  <input
                    type="text"
                    value={formData.ad}
                    onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                    className="input-macos"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Soyad *</label>
                  <input
                    type="text"
                    value={formData.soyad}
                    onChange={(e) => setFormData({ ...formData, soyad: e.target.value })}
                    className="input-macos"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Üyelik Tipi</label>
                  <select
                    value={formData.uyelik_tipi}
                    onChange={(e) => setFormData({ ...formData, uyelik_tipi: e.target.value })}
                    className="input-macos"
                  >
                    <option value="Asil">Asil</option>
                    <option value="Onursal">Onursal</option>
                    <option value="Fahri">Fahri</option>
                    <option value="Kurumsal">Kurumsal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durum *</label>
                  <select
                    value={formData.durum}
                    onChange={(e) => setFormData({ ...formData, durum: e.target.value })}
                    className="input-macos"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Pasif">Pasif</option>
                    <option value="Ayrıldı">Ayrıldı</option>
                  </select>
                </div>
              </div>
            </div>

            {/* İletişim Bilgileri */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">İletişim Bilgileri</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={formData.telefon}
                    onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                    className="input-macos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon 2</label>
                  <input
                    type="tel"
                    value={formData.telefon2}
                    onChange={(e) => setFormData({ ...formData, telefon2: e.target.value })}
                    className="input-macos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-macos"
                  />
                </div>
              </div>
            </div>

            {/* Kişisel Bilgiler */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Kişisel Bilgiler</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cinsiyet</label>
                  <select
                    value={formData.cinsiyet}
                    onChange={(e) => setFormData({ ...formData, cinsiyet: e.target.value })}
                    className="input-macos"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Erkek">Erkek</option>
                    <option value="Kadın">Kadın</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Doğum Tarihi</label>
                  <input
                    type="date"
                    value={formData.dogum_tarihi}
                    onChange={(e) => setFormData({ ...formData, dogum_tarihi: e.target.value })}
                    className="input-macos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Doğum Yeri</label>
                  <input
                    type="text"
                    value={formData.dogum_yeri}
                    onChange={(e) => setFormData({ ...formData, dogum_yeri: e.target.value })}
                    className="input-macos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kan Grubu</label>
                  <select
                    value={formData.kan_grubu}
                    onChange={(e) => setFormData({ ...formData, kan_grubu: e.target.value })}
                    className="input-macos"
                  >
                    <option value="">Seçiniz</option>
                    <option value="A Rh+">A Rh+</option>
                    <option value="A Rh-">A Rh-</option>
                    <option value="B Rh+">B Rh+</option>
                    <option value="B Rh-">B Rh-</option>
                    <option value="AB Rh+">AB Rh+</option>
                    <option value="AB Rh-">AB Rh-</option>
                    <option value="0 Rh+">0 Rh+</option>
                    <option value="0 Rh-">0 Rh-</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aile Durumu</label>
                  <select
                    value={formData.aile_durumu}
                    onChange={(e) => setFormData({ ...formData, aile_durumu: e.target.value })}
                    className="input-macos"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Bekar">Bekar</option>
                    <option value="Evli">Evli</option>
                    <option value="Dul">Dul</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Çocuk Sayısı</label>
                  <input
                    type="number"
                    value={formData.cocuk_sayisi}
                    onChange={(e) => setFormData({ ...formData, cocuk_sayisi: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="input-macos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Eğitim Durumu</label>
                  <select
                    value={formData.egitim_durumu}
                    onChange={(e) => setFormData({ ...formData, egitim_durumu: e.target.value })}
                    className="input-macos"
                  >
                    <option value="">Seçiniz</option>
                    <option value="İlkokul">İlkokul</option>
                    <option value="Ortaokul">Ortaokul</option>
                    <option value="Lise">Lise</option>
                    <option value="Ön Lisans">Ön Lisans</option>
                    <option value="Lisans">Lisans</option>
                    <option value="Yüksek Lisans">Yüksek Lisans</option>
                    <option value="Doktora">Doktora</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Meslek ve Adres */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Meslek & Adres</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meslek</label>
                  <input
                    type="text"
                    value={formData.meslek}
                    onChange={(e) => setFormData({ ...formData, meslek: e.target.value })}
                    className="input-macos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İş Yeri</label>
                  <input
                    type="text"
                    value={formData.is_yeri}
                    onChange={(e) => setFormData({ ...formData, is_yeri: e.target.value })}
                    className="input-macos"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İl</label>
                  <input
                    type="text"
                    value={formData.il}
                    onChange={(e) => setFormData({ ...formData, il: e.target.value })}
                    className="input-macos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
                  <input
                    type="text"
                    value={formData.ilce}
                    onChange={(e) => setFormData({ ...formData, ilce: e.target.value })}
                    className="input-macos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mahalle</label>
                  <input
                    type="text"
                    value={formData.mahalle}
                    onChange={(e) => setFormData({ ...formData, mahalle: e.target.value })}
                    className="input-macos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posta Kodu</label>
                  <input
                    type="text"
                    value={formData.posta_kodu}
                    onChange={(e) => setFormData({ ...formData, posta_kodu: e.target.value })}
                    className="input-macos"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Açık Adres</label>
                <textarea
                  value={formData.adres}
                  onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                  rows={2}
                  className="input-macos resize-none"
                />
              </div>
            </div>

            {/* Notlar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <textarea
                value={formData.notlar}
                onChange={(e) => setFormData({ ...formData, notlar: e.target.value })}
                rows={2}
                className="input-macos resize-none"
              />
            </div>
            
            <DialogFooter>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="btn-macos-secondary"
              >
                İptal
              </button>
              <button type="submit" className="btn-macos">
                Güncelle
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="card-macos">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Üye ara (ad, soyad, TC)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={durum}
              onChange={(e) => setDurum(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Durumlar</option>
              <option value="Aktif">Aktif</option>
              <option value="Pasif">Pasif</option>
              <option value="Ayrıldı">Ayrıldı</option>
            </select>
            
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`flex items-center px-4 py-2 border rounded-lg transition-colors ${
                showInactive ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-300 hover:bg-gray-50'
              }`}
              title={showInactive ? 'Pasif üyeleri gizle' : 'Pasif üyeleri göster'}
            >
              {showInactive ? <Eye className="h-5 w-5 mr-2" /> : <EyeOff className="h-5 w-5 mr-2" />}
              {showInactive ? 'Pasifleri Gizle' : 'Pasifleri Göster'}
            </button>
            
            <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="h-5 w-5 mr-2" />
              Dışa Aktar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-600">Yükleniyor...</div>
        ) : uyeler.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            Henüz üye kaydı yok. Yeni üye ekleyerek başlayın.
          </div>
        ) : (
          <UyelerVirtualTable
            uyeler={uyeler.filter(uye => showInactive || uye.is_active !== false)}
            borcDurumlari={borcDurumlari}
            onView={(id) => navigate(`/uyeler/${id}`)}
            onEdit={handleEdit}
            onDelete={(id, adSoyad) => handleDelete(id, adSoyad, { stopPropagation: () => {} } as any)}
            columnConfig={columnConfig}
            onColumnSettings={() => setShowColumnSettings(true)}
          />
        )}
      </div>

      {/* Column Settings Modal */}
      <ColumnSettingsModal
        open={showColumnSettings}
        onOpenChange={setShowColumnSettings}
        columns={UYELER_PAGE_CONFIG.defaultColumns}
        currentConfig={columnConfig || {
          visible: UYELER_PAGE_CONFIG.defaultVisible,
          order: UYELER_PAGE_CONFIG.defaultColumns.map(c => c.id),
        }}
        onSave={saveColumnConfig}
        onReset={resetColumnConfig}
        presets={PAGE_PRESETS[PAGE_KEYS.UYELER_LIST]}
      />
    </div>
  );
};

export default UyelerListPage;
