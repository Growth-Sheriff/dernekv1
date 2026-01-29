import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { useLicenseStore } from '@/store/licenseStore';

const API_URL = 'http://157.90.154.48:8000';

const loginSchema = z.object({
  mode: z.enum(['LOCAL', 'ONLINE', 'HYBRID']),
  email: z.string().email('Geçerli bir email girin'),
  password: z.string().min(1, 'Şifre gerekli'),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const setRememberMe = useAuthStore((state) => state.setRememberMe);
  const saveCredentials = useAuthStore((state) => state.saveCredentials);
  const savedCredentials = useAuthStore((state) => state.savedCredentials);
  const setMode = useLicenseStore((state) => state.setMode);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      mode: 'ONLINE',
      email: savedCredentials?.email || '',
      password: savedCredentials?.password || '',
      rememberMe: !!savedCredentials,
    },
  });

  const selectedMode = watch('mode');

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      // Web için HTTP API kullan
      const response = await fetch(`${API_URL}/api/v1/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: data.email, password: data.password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Giriş başarısız');
      }

      const result = await response.json();

      // Beni Hatırla ayarını kaydet
      setRememberMe(data.rememberMe ?? true);
      if (data.rememberMe) {
        saveCredentials(data.email, data.password);
      }

      // Auth store'a kaydet
      login(result.user, result.tenant, result.access_token);
      setMode(data.mode);

      toast.success('Giriş başarılı!');
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Giriş başarısız');
    } finally {
      setIsLoading(false);
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
                    className={`relative flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${selectedMode === mode
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300'
                      } ${mode === 'LOCAL' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      value={mode}
                      {...register('mode')}
                      disabled={mode === 'LOCAL'}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{mode}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Web paneli için ONLINE veya HYBRID seçin. LOCAL sadece masaüstü uygulamasında çalışır.
              </p>
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
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p className="text-xs text-gray-500">LOCAL: Offline | ONLINE: Uzak sunucu | HYBRID: Her ikisi</p>
          </div>

          {/* Super Admin Link */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Link
              to="/super-admin/login"
              className="block text-center text-sm text-purple-600 hover:text-purple-700 hover:underline"
            >
              🔐 Super Admin Paneli
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
