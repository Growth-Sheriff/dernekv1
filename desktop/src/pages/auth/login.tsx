import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '@/store/authStore';
import { useLicenseStore } from '@/store/licenseStore';
import { loginSchema, type LoginForm } from '@/schemas';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const setRememberMe = useAuthStore((state) => state.setRememberMe);
  const saveCredentials = useAuthStore((state) => state.saveCredentials);
  const savedCredentials = useAuthStore((state) => state.savedCredentials);
  const setMode = useLicenseStore((state) => state.setMode);
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      mode: 'LOCAL',
      email: savedCredentials?.email || '',
      password: savedCredentials?.password || '',
      rememberMe: !!savedCredentials,
    },
  });

  // Kayıtlı credentials varsa form'a yükle
  React.useEffect(() => {
    if (savedCredentials) {
      setValue('email', savedCredentials.email);
      setValue('password', savedCredentials.password);
      setValue('rememberMe', true);
    }
  }, [savedCredentials, setValue]);

  // İlk açılışta tenant kontrolü yap
  React.useEffect(() => {
    checkInitialSetup();
  }, []);

  const checkInitialSetup = async () => {
    try {
      const result = await invoke<{ count: number }>('check_initial_setup');
      if (result.count === 0) {
        // Tenant yok, onboarding'e yönlendir
        navigate('/onboarding/welcome', { replace: true });
      }
    } catch (error) {
      console.error('Initial setup check failed:', error);
    }
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      if (data.mode === 'LOCAL') {
        // LOCAL modda basit email/password kontrolü
        
        // Önce tenant var mı kontrol et
        const setupResult = await invoke<{ count: number }>('check_initial_setup');
        
        if (setupResult.count === 0) {
          alert('❌ Sistemde hiç tenant bulunmuyor. Lütfen önce ilk kurulumu tamamlayın.');
          navigate('/onboarding/welcome');
          return;
        }
        
        // Backend'den gerçek tenant ve kullanıcı bilgilerini al
        const result = await invoke<{
          user: { id: string; email: string; full_name: string; tenant_id: string };
          tenant: { id: string; name: string; slug: string };
          token: string;
        }>('login_user', {
          email: data.email,
          password: data.password,
        });
        
        // Beni Hatırla ayarını kaydet + şifreyi de kaydet
        setRememberMe(data.rememberMe ?? true);
        if (data.rememberMe) {
          saveCredentials(data.email, data.password);
        }
        login(result.user, result.tenant, result.token);
        setMode('LOCAL');
        navigate('/');
      } else {
        throw new Error('ONLINE ve HYBRID modları henüz aktif değil');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert(error instanceof Error ? error.message : 'Giriş başarısız');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">BADER</h1>
            <p className="text-gray-600 mt-2">Dernek Yönetim Sistemi</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Çalışma Modu
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['LOCAL', 'ONLINE', 'HYBRID'] as const).map((mode) => (
                  <label
                    key={mode}
                    className="relative flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
                  >
                    <input
                      type="radio"
                      value={mode}
                      {...register('mode')}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{mode}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ornek@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <input
                type="password"
                {...register('password')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('rememberMe')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Beni Hatırla</span>
              </label>
              <a href="#" className="text-sm text-blue-600 hover:underline">
                Şifremi Unuttum
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>LOCAL mod: Offline çalışma</p>
            <p className="text-xs text-gray-400 mt-1">ONLINE ve HYBRID yakında aktif olacak</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
