import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

interface LoginProps {
  hasSetup: boolean;
}

export default function LoginPage({ hasSetup }: LoginProps) {
  const navigate = useNavigate();
  const { login, setRememberMe: setStoreRememberMe, savedCredentials, saveCredentials, clearCredentials, rememberMe: storeRememberMe } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sayfa açıldığında kaydedilmiş kullanıcı bilgilerini yükle
  useEffect(() => {
    if (savedCredentials && storeRememberMe) {
      setUsername(savedCredentials.email);
      setPassword(savedCredentials.password);
      setRememberMe(true);
    }
  }, [savedCredentials, storeRememberMe]);

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
          key: string;
          type: string;
          plan: string;
          desktop_enabled: boolean;
          web_enabled: boolean;
          mobile_enabled: boolean;
          sync_enabled: boolean;
          is_active: boolean;
          end_date: string | null;
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
        setStoreRememberMe(rememberMe);

        if (rememberMe) {
          saveCredentials(username.trim(), password);
        } else {
          clearCredentials();
        }

        const userWithTenantId = {
          ...result.user,
          tenant_id: result.tenant.id
        };

        // Transform license for auth store
        const licenseForStore = result.license ? {
          key: result.license.key || '',
          type: result.license.type || result.license.plan || 'LOCAL',
          desktop_enabled: result.license.desktop_enabled ?? true,
          web_enabled: result.license.web_enabled ?? false,
          mobile_enabled: result.license.mobile_enabled ?? false,
          sync_enabled: result.license.sync_enabled ?? false,
          end_date: result.license.end_date || ''
        } : null;

        login(userWithTenantId, result.tenant, result.token, licenseForStore);
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      {/* Animated Mesh Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large animated blobs */}
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(147,197,253,0.5) 0%, transparent 70%)',
            animation: 'float 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-50"
          style={{
            background: 'radial-gradient(circle, rgba(196,181,253,0.5) 0%, transparent 70%)',
            animation: 'float 25s ease-in-out infinite reverse',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(251,207,232,0.4) 0%, transparent 70%)',
            animation: 'float 30s ease-in-out infinite',
          }}
        />

        {/* Floating glass orbs */}
        <div
          className="absolute top-20 right-1/4 w-20 h-20 rounded-full backdrop-blur-md"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            animation: 'floatOrb 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-32 left-1/4 w-16 h-16 rounded-full backdrop-blur-md"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 100%)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            animation: 'floatOrb 10s ease-in-out infinite 1s',
          }}
        />
        <div
          className="absolute top-1/3 left-20 w-12 h-12 rounded-full backdrop-blur-md"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 100%)',
            border: '1px solid rgba(255,255,255,0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
            animation: 'floatOrb 7s ease-in-out infinite 0.5s',
          }}
        />
        <div
          className="absolute bottom-1/4 right-20 w-24 h-24 rounded-full backdrop-blur-md"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 100%)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            animation: 'floatOrb 12s ease-in-out infinite 2s',
          }}
        />

        {/* Sparkle particles */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/40 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `sparkle ${2 + Math.random() * 3}s ease-in-out infinite ${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -30px) scale(1.05); }
          50% { transform: translate(-20px, 20px) scale(0.95); }
          75% { transform: translate(20px, 30px) scale(1.02); }
        }
        @keyframes floatOrb {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="w-full max-w-md px-4 relative z-10">
        {/* Glassmorphism Card */}
        <div
          className="relative rounded-3xl p-8 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.5) inset',
          }}
        >
          {/* Shimmer effect on card */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              animation: 'shimmer 3s infinite',
            }}
          />

          {/* Gradient accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 rounded-t-3xl" />

          {/* Content */}
          <div className="relative z-10">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <div
                  className="absolute inset-0 rounded-2xl rotate-6"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(99,102,241,0.3) 100%)',
                    backdropFilter: 'blur(10px)',
                  }}
                />
                <div
                  className="absolute inset-0 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                    boxShadow: '0 10px 40px -10px rgba(59,130,246,0.5)',
                  }}
                >
                  <span className="text-3xl font-black text-white">B</span>
                </div>
              </div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 mb-2">
                BADER
              </h1>
              <p className="text-gray-500 text-sm tracking-widest uppercase">Yönetim Sistemi</p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="mb-6 p-4 rounded-xl"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5 mb-6">
              {/* Email/Username Field */}
              <div className="relative group">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="peer w-full px-4 py-4 rounded-xl text-gray-800 placeholder-transparent focus:outline-none transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}
                  placeholder="E-posta"
                  required
                  disabled={loading}
                  id="email-input"
                />
                <label
                  htmlFor="email-input"
                  className="absolute left-4 -top-2.5 text-xs text-blue-600 bg-white/80 px-2 rounded transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-600"
                >
                  Kullanıcı Adı / E-posta
                </label>
              </div>

              {/* Password Field */}
              <div className="relative group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="peer w-full px-4 py-4 rounded-xl text-gray-800 placeholder-transparent focus:outline-none transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}
                  placeholder="Şifre"
                  required
                  disabled={loading}
                  id="password-input"
                />
                <label
                  htmlFor="password-input"
                  className="absolute left-4 -top-2.5 text-xs text-blue-600 bg-white/80 px-2 rounded transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-600"
                >
                  Şifre
                </label>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <label className="relative flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center transition-all duration-300 peer-checked:bg-blue-500"
                    style={{
                      background: rememberMe ? undefined : 'rgba(255,255,255,0.6)',
                      border: rememberMe ? 'none' : '1px solid rgba(0,0,0,0.15)',
                    }}
                  >
                    <svg className={`w-3 h-3 text-white transition-opacity ${rememberMe ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="ml-3 text-sm text-gray-600 group-hover:text-gray-800 transition-colors">Beni Hatırla</span>
                </label>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading || !username.trim() || !password}
                className="relative w-full py-4 rounded-xl font-semibold text-white overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
                  boxShadow: '0 10px 40px -10px rgba(99,102,241,0.5)',
                }}
              >
                {/* Shine effect */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    animation: 'shimmer 2s infinite',
                  }}
                />

                {/* Button content */}
                <span className="relative flex items-center justify-center gap-2">
                  {loading && (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200/50" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 text-xs text-gray-400 bg-white/50 rounded-full">veya</span>
              </div>
            </div>

            {/* Setup Button */}
            <button
              onClick={handleSetup}
              disabled={hasSetup}
              className={`w-full py-3 rounded-xl font-medium transition-all duration-300 ${hasSetup
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-emerald-600 hover:scale-[1.02]'
                }`}
              style={{
                background: hasSetup ? 'rgba(0,0,0,0.03)' : 'rgba(16,185,129,0.1)',
                border: hasSetup ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(16,185,129,0.2)',
              }}
            >
              {hasSetup ? '✓ Kurulum Tamamlanmış' : '🚀 İlk Kurulum'}
            </button>
            {!hasSetup && (
              <p className="text-xs text-gray-400 text-center mt-3">
                Sistemi ilk kez kullanıyorsanız kurulum yapın
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-400">© 2026 BADER Yazılım Teknolojileri</p>
          <p className="text-[10px] text-gray-300 mt-1">v3.0.0 • Enterprise Edition</p>
        </div>
      </div>
    </div>
  );
}
