import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

interface LoginProps {
  hasSetup: boolean;
}

export default function LoginPage({ hasSetup }: LoginProps) {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      const result = await invoke<{
        success: boolean;
        user?: {
          id: string;
          email: string;
          full_name: string;
          role: string;
          is_superuser: boolean;
        };
        tenant?: {
          id: string;
          name: string;
          slug: string;
        };
        license?: {
          plan: string;
          is_active: boolean;
          expires_at: string | null;
        };
        token?: string;
        message: string;
      }>('login', {
        request: {
          email: username.trim(),
          password: password
        }
      });

      if (result.success && result.user && result.tenant && result.token) {
        // Beni hatırla seçiliyse localStorage'a kaydet
        if (rememberMe) {
          localStorage.setItem('remember_me', 'true');
          localStorage.setItem('saved_username', username.trim());
        } else {
          localStorage.removeItem('remember_me');
          localStorage.removeItem('saved_username');
        }
        
        // User objesine tenant_id ekle (authStore için)
        const userWithTenantId = {
          ...result.user,
          tenant_id: result.tenant.id
        };
        
        login(userWithTenantId, result.tenant, result.token);
        toast.success('Giriş başarılı! Hoş geldiniz.');
        navigate('/dashboard');
      } else {
        const errorMsg = result.message || 'Giriş başarısız';
        toast.error(errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      let errorMsg = 'Giriş yapılamadı. Lütfen tekrar deneyin.';
      
      // Kullanıcı dostu hata mesajları
      if (err?.toString().includes('not found')) {
        errorMsg = 'Kullanıcı adı veya şifre hatalı.';
      } else if (err?.toString().includes('network')) {
        errorMsg = 'Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.';
      } else if (err?.toString().includes('timeout')) {
        errorMsg = 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = () => {
    navigate('/onboarding/welcome');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo/Başlık */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">BADER</h1>
            <p className="text-gray-500">Yönetim Sistemi</p>
          </div>

          {/* Hata Mesajı */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kullanıcı Adı / E-posta
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="admin veya admin@demo.com"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="••••••"
                required
                disabled={loading}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                Beni Hatırla
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          {/* Kurulum Butonu */}
          <div className="border-t pt-6">
            <button
              onClick={handleSetup}
              disabled={hasSetup}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                hasSetup
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {hasSetup ? '✓ Kurulum Tamamlanmış' : 'İlk Kurulum'}
            </button>
            {!hasSetup && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Sistemi ilk kez kullanıyorsanız kurulum yapın
              </p>
            )}
          </div>
        </div>

        {/* Alt Bilgi */}
        <p className="text-center text-gray-500 text-sm mt-6">
          © 2026 BADER Yönetim Sistemi
        </p>
      </div>
    </div>
  );
}
