import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { routes } from './routes';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/login';
import { Layout } from './components/layout/layout';
import { Toaster } from './components/ui/toast';
import { ThemeProvider } from './components/providers/theme-provider';

// Onboarding Pages
import OnboardingWelcomePage from './pages/onboarding/welcome';
import OnboardingLicensePage from './pages/onboarding/license';
import OnboardingSetupPage from './pages/onboarding/setup';

// Dashboard
import DashboardPage from './pages/dashboard/index';

// Arşiv - doğrudan import
import ArsivPage from './pages/arsiv';

// Tauri kontrolü
const isTauri = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
};

// Protected Route Wrapper - loading ve hydration durumunda bekle
const ProtectedRoute: React.FC<{ children: React.ReactNode; loading?: boolean }> = ({ children, loading }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  // Hydration veya loading durumunda hiçbir şey render etme
  if (!hasHydrated || loading) {
    return null;
  }

  if (!isAuthenticated) {
    console.log('🔐 ProtectedRoute - Redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Auth Check Component - Router içinde çalışır
const AuthenticatedRedirect: React.FC<{ hasSetup: boolean; loading?: boolean }> = ({ hasSetup, loading }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, hasHydrated, navigate]);

  // Hydration veya loading durumunda bekle
  if (!hasHydrated || loading) {
    return null;
  }

  if (!hasSetup) {
    return <Navigate to="/onboarding/welcome" replace />;
  }

  return <LoginPage hasSetup={hasSetup} />;
};

function AppContent() {
  const [loading, setLoading] = useState(true);
  const [hasSetup, setHasSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, logout, _hasHydrated } = useAuthStore();

  useEffect(() => {
    console.log('🔄 checkInitialSetup useEffect çalışıyor');
    checkInitialSetup();
  }, []);

  // SESSION VALIDATION: Check session every 5 minutes (sadece authenticated olduğunda)
  useEffect(() => {
    if (!isAuthenticated || loading) return;

    const checkSession = async () => {
      console.log('🔍 Periyodik session check başlıyor...');
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke<{ success: boolean; message: string }>('check_session');
        console.log('🔍 Session check result:', result);

        if (!result.success) {
          console.warn('❌ Session expired - logging out');
          logout();
        } else {
          console.log('✅ Session valid');
        }
      } catch (error) {
        console.error('🔴 Session check failed:', error);
      }
    };

    // Check every 5 minutes (ilk check zaten initial setup'ta yapıldı)
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, logout, loading]);

  // AUTO-SYNC: Pull data from server when in HYBRID mode
  useEffect(() => {
    if (!isAuthenticated || loading) return;

    const runAutoSync = async () => {
      try {
        // Check license mode from localStorage
        const licenseStorage = localStorage.getItem('license-storage');
        if (!licenseStorage) return;

        const parsedLicense = JSON.parse(licenseStorage);
        const licenseMode = parsedLicense?.state?.mode || parsedLicense?.state?.license?.plan;

        // Only sync in HYBRID mode
        if (licenseMode !== 'HYBRID') {
          console.log(`📡 Sync skipped - mode: ${licenseMode}`);
          return;
        }

        // Get tenant info
        const authStorage = localStorage.getItem('auth-storage');
        if (!authStorage) return;

        const parsedAuth = JSON.parse(authStorage);
        const tenantId = parsedAuth?.state?.tenant?.id;
        const token = parsedAuth?.state?.token;

        if (!tenantId || !token) return;

        console.log('🔄 Auto-sync starting (HYBRID mode)...');

        // Import sync service and start full sync
        const { syncService } = await import('@/services/syncService');
        syncService.configure(token, 'hybrid');
        await syncService.fullSync();

        console.log('✅ Auto-sync completed');
      } catch (error) {
        console.warn('🔴 Auto-sync failed:', error);
      }
    };

    // Initial sync on login
    runAutoSync();

    // Sync every 2 minutes
    const syncInterval = setInterval(runAutoSync, 2 * 60 * 1000);
    return () => clearInterval(syncInterval);
  }, [isAuthenticated, loading]);


  const checkInitialSetup = async () => {
    console.log('🏁 checkInitialSetup çalışıyor, isTauri:', isTauri());
    if (!isTauri()) {
      setError('Bu uygulama Tauri ortamında çalıştırılmalıdır.');
      setLoading(false);
      return;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');

      // 1. Önce setup durumunu kontrol et
      console.log('📡 check_initial_setup çağrılıyor...');
      const setupResult = await invoke<{ count: number }>('check_initial_setup');
      console.log('📡 check_initial_setup sonuç:', setupResult);

      if (setupResult.count > 0) {
        setHasSetup(true);
      }

      // 2. Eğer localStorage'da isAuthenticated varsa, session'ı kontrol et
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          if (parsed?.state?.isAuthenticated) {
            console.log('🔐 localStorage\'da authenticated bulundu, session kontrol ediliyor...');
            try {
              const sessionResult = await invoke<{ success: boolean; message: string }>('check_session');
              console.log('🔐 Session check result:', sessionResult);

              if (!sessionResult.success) {
                console.warn('❌ Session geçersiz - logout yapılıyor');
                // localStorage'daki auth bilgisini temizle
                const savedCredentials = parsed?.state?.savedCredentials;
                const rememberMe = parsed?.state?.rememberMe;
                localStorage.setItem('auth-storage', JSON.stringify({
                  state: {
                    user: null,
                    tenant: null,
                    token: null,
                    isAuthenticated: false,
                    rememberMe: rememberMe ?? true,
                    savedCredentials: savedCredentials ?? null,
                    _hasHydrated: true,
                  },
                  version: 0,
                }));
                // Sayfayı yenile
                window.location.reload();
                return;
              }
            } catch (sessionError) {
              console.error('🔴 Session check hatası:', sessionError);
              // Hata durumunda oturumu temizle
              logout();
            }
          }
        } catch (parseError) {
          console.error('🔴 Auth storage parse hatası:', parseError);
        }
      }
    } catch (error) {
      console.error('🔴 Initial setup check failed:', error);
      setHasSetup(false);
    } finally {
      setLoading(false);
      console.log('✅ checkInitialSetup tamamlandı');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Tauri Gerekli</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <code className="bg-gray-100 px-3 py-1 rounded text-sm">npm run tauri:dev</code>
        </div>
      </div>
    );
  }

  // Hydration veya setup kontrolü tamamlanana kadar splash screen göster
  if (!_hasHydrated || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Animasyonlu Arka Plan Efektleri */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>

        {/* Ana İçerik */}
        <div className="relative z-10 text-center px-8">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl rotate-6 opacity-50"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl">
                <span className="text-4xl font-black text-white tracking-tight">B</span>
              </div>
            </div>

            {/* Başlık */}
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-200 to-indigo-300 mb-3 tracking-tight">
              BADER
            </h1>
            <p className="text-xl font-light text-blue-200/80 tracking-widest uppercase">
              Muhasebe Sistemleri
            </p>
          </div>

          {/* Alt Başlık */}
          <div className="mb-12">
            <p className="text-sm text-blue-300/60 font-medium tracking-wide">
              Dernek & Vakıf Yönetim Platformu
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-64 mx-auto mb-6">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 rounded-full animate-pulse"
                style={{
                  animation: 'progress 2s ease-in-out infinite',
                  width: '100%',
                }}
              ></div>
            </div>
          </div>

          {/* Yükleniyor Metni */}
          <div className="flex items-center justify-center gap-2 text-blue-200/70">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span className="text-sm font-medium ml-2">Sistem hazırlanıyor</span>
          </div>
        </div>

        {/* Alt Bilgi */}
        <div className="absolute bottom-8 text-center">
          <p className="text-xs text-blue-300/40 font-medium">
            © 2026 BADER Yazılım Teknolojileri
          </p>
          <p className="text-[10px] text-blue-300/30 mt-1">
            v3.0.0 • Enterprise Edition
          </p>
        </div>

        {/* CSS Animasyonu */}
        <style>{`
          @keyframes progress {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<AuthenticatedRedirect hasSetup={hasSetup} />} />
      <Route path="/onboarding/welcome" element={<OnboardingWelcomePage />} />
      <Route path="/onboarding/license" element={<OnboardingLicensePage />} />
      <Route path="/onboarding/setup" element={<OnboardingSetupPage />} />

      {/* Protected Routes - Layout ile */}
      <Route path="/" element={
        <ProtectedRoute loading={loading}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Arşiv - manuel route */}
        <Route path="arsiv" element={<ArsivPage />} />

        {/* routes.tsx'den gelen tüm child route'lar */}
        {routes.find(r => r.path === '/')?.children?.map((child, index) => (
          child.index ? null : (
            <Route key={index} path={child.path} element={child.element}>
              {child.children?.map((nested, nestedIndex) => (
                nested.index ? (
                  <Route key={nestedIndex} index element={nested.element} />
                ) : (
                  <Route key={nestedIndex} path={nested.path} element={nested.element} />
                )
              ))}
            </Route>
          )
        ))}
      </Route>

      {/* Fallback - Login'e yönlendir - loading durumunda bekle */}
      <Route path="*" element={
        loading ? null : (isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />)
      } />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
        <Toaster />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
