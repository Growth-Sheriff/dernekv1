import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import api from '@/lib/api';

interface TenantData {
  name: string;
  slug: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
  admin_password_confirm: string;
  address: string;
  phone: string;
}

export const OnboardingSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TenantData>({
    name: '',
    slug: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    admin_password_confirm: '',
    address: '',
    phone: '',
  });
  const [passwordError, setPasswordError] = useState<string>('');

  const handleChange = (field: keyof TenantData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Email validation
    if (field === 'admin_email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setPasswordError('Geçerli bir email adresi girin');
      } else {
        setPasswordError('');
      }
    }

    // Auto-generate slug from name
    if (field === 'name') {
      const slug = value
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };



  const handleComplete = async () => {
    console.log('🔵 handleComplete çağrıldı');
    console.log('📝 Form data:', formData);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.admin_email)) {
      toast.error('Geçerli bir email adresi girin');
      setPasswordError('Geçerli bir email adresi girin');
      return;
    }

    // Şifre eşleşme kontrolü
    if (formData.admin_password !== formData.admin_password_confirm) {
      toast.error('Şifreler eşleşmiyor!');
      setPasswordError('Şifreler eşleşmiyor!');
      return;
    }

    // Güçlü şifre kontrolü
    if (formData.admin_password.length < 8) {
      toast.error('Şifre en az 8 karakter olmalıdır');
      setPasswordError('Şifre en az 8 karakter olmalıdır');
      return;
    }

    if (!/[A-Z]/.test(formData.admin_password)) {
      toast.error('Şifre en az 1 büyük harf içermelidir');
      setPasswordError('Şifre en az 1 büyük harf içermelidir');
      return;
    }

    if (!/[a-z]/.test(formData.admin_password)) {
      toast.error('Şifre en az 1 küçük harf içermelidir');
      setPasswordError('Şifre en az 1 küçük harf içermelidir');
      return;
    }

    if (!/[0-9]/.test(formData.admin_password)) {
      toast.error('Şifre en az 1 rakam içermelidir');
      setPasswordError('Şifre en az 1 rakam içermelidir');
      return;
    }

    setPasswordError('');

    // License key'i localStorage'dan al
    const validatedLicenseKey = localStorage.getItem('validated_license_key');
    const licenseMode = localStorage.getItem('license_mode'); // 'hybrid' or 'local'

    if (!validatedLicenseKey) {
      toast.error('Lisans bilgisi bulunamadı. Lütfen lisans sayfasına dönün.');
      navigate('/onboarding/license');
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Setup başlıyor... Mod:', licenseMode);

      // Dinamik import - Tauri hazır olduğunda çalışır
      const { invoke } = await import('@tauri-apps/api/core');

      let tenantId = '';
      let userId = '';

      // 1. EĞER HYBRID MOD İSE -> ÖNCE SUNUCUDA OLUŞTUR
      if (licenseMode === 'hybrid') {
        try {
          console.log('🌐 Sunucuda tenant oluşturuluyor...');
          const serverResponse = await api.post<{ success: boolean, tenant_id: string, user_id: string, message: string }>('/auth/register-hybrid', {
            email: formData.admin_email,
            password: formData.admin_password,
            name: formData.admin_name,
            tenant_name: formData.name,
            license_key: validatedLicenseKey,
            slug: formData.slug,
            phone: formData.phone,
            address: formData.address
          });

          if (serverResponse.success) {
            console.log('✅ Sunucu kayıt başarılı:', serverResponse);
            tenantId = serverResponse.tenant_id;
            userId = serverResponse.user_id;
          } else {
            throw new Error(serverResponse.message || 'Sunucu kaydı başarısız');
          }

        } catch (serverError: any) {
          console.error('❌ Sunucu kayıt hatası:', serverError);
          toast.error('Sunucu ile iletişim kurulamadı: ' + (serverError.message || 'Bilinmeyen hata'));
          setLoading(false);
          return; // Sunucu kaydı başarısızsa devam etme
        }
      }

      // 2. YEREL VERİTABANINDA OLUŞTUR (ID'leri sunucudan aldıysak onları kullan, yoksa yeni üret)
      console.log('🏠 Yerel veritabanı güncelleniyor...');

      const localResponse = await invoke<{ tenant_id: string; user_id: string; message: string }>('create_tenant', {
        request: {
          data: {
            license_key: validatedLicenseKey,
            name: formData.name,
            slug: formData.slug,
            admin_name: formData.admin_name,
            admin_email: formData.admin_email,
            admin_password: formData.admin_password,
            phone: formData.phone || null,
            address: formData.address || null,
          },
          server_ids: (tenantId && userId) ? { tenant_id: tenantId, user_id: userId } : null
        }
      });

      console.log('✅ Yerel kurulum tamamlandı:', localResponse);

      // Kurulum tamamlandı temizliği
      localStorage.removeItem('validated_license_key');
      localStorage.removeItem('license_mode');

      toast.success('Kurulum başarıyla tamamlandı! Giriş sayfasına yönlendiriliyorsunuz...');

      setTimeout(() => {
        window.location.href = '/';
      }, 1000);

    } catch (error: any) {
      console.error('Setup hatası:', error);
      toast.error('Kurulum sırasında hata: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full p-8 bg-white/95 backdrop-blur">
        <div className="space-y-6">
          {/* Zaten hesabınız var mı linki */}
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600">
              Zaten hesabınız var mı?{' '}
              <button
                onClick={() => window.location.href = '/'}
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                Giriş Yapın
              </button>
            </p>
          </div>
          {/* Progress */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex-1">
              <div className="flex items-center">
                {[1, 2].map((num) => (
                  <React.Fragment key={num}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}
                    >
                      {num}
                    </div>
                    {num < 2 && (
                      <div
                        className={`flex-1 h-1 mx-2 ${step > num ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Step 1: Dernek Bilgileri */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Dernek Bilgileriniz
                </h2>
                <p className="text-gray-600">
                  Derneğinizin temel bilgilerini girin
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Dernek Adı *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Örn: İstanbul Erzurum Dernekleri Federasyonu"
                  />
                </div>

                <div>
                  <Label htmlFor="slug">Kısa Ad (URL) *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    placeholder="istanbul-erzurum-dernekleri"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Sistem URL'lerinde kullanılacak benzersiz ad
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="0212 123 45 67"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Adres</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Dernek adresi"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/onboarding/license')}
                  className="w-full"
                >
                  ← Geri
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!formData.name || !formData.slug}
                  className="w-full"
                >
                  Devam Et →
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Yönetici Hesabı */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Yönetici Hesabı
                </h2>
                <p className="text-gray-600">
                  Sisteme giriş yapacak ilk yönetici hesabını oluşturun
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="admin_name">Ad Soyad *</Label>
                  <Input
                    id="admin_name"
                    value={formData.admin_name}
                    onChange={(e) => handleChange('admin_name', e.target.value)}
                    placeholder="Ahmet Yılmaz"
                  />
                </div>

                <div>
                  <Label htmlFor="admin_email">Email</Label>
                  <Input
                    id="admin_email"
                    type="email"
                    value={formData.admin_email}
                    onChange={(e) => handleChange('admin_email', e.target.value)}
                    placeholder="admin@dernek.com"
                  />
                </div>

                <div>
                  <Label htmlFor="admin_password">Şifre *</Label>
                  <Input
                    id="admin_password"
                    type="password"
                    value={formData.admin_password}
                    onChange={(e) => handleChange('admin_password', e.target.value)}
                    placeholder="En az 6 karakter"
                  />
                </div>

                <div>
                  <Label htmlFor="admin_password_confirm">Şifre Tekrar *</Label>
                  <Input
                    id="admin_password_confirm"
                    type="password"
                    value={formData.admin_password_confirm}
                    onChange={(e) => {
                      handleChange('admin_password_confirm', e.target.value);
                      if (passwordError) setPasswordError('');
                    }}
                    placeholder="Şifrenizi tekrar girin"
                    className={passwordError ? 'border-red-500' : ''}
                  />
                  {passwordError && (
                    <p className="text-xs text-red-500 mt-1">{passwordError}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Bu bilgilerle sisteme giriş yapabileceksiniz
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-full"
                >
                  ← Geri
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={!formData.admin_name || !formData.admin_password || !formData.admin_password_confirm || loading}
                  className="w-full"
                >
                  {loading ? 'Tamamlanıyor...' : 'Kurulumu Tamamla ✓'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default OnboardingSetupPage;
