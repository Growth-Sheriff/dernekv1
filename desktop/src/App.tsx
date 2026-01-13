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

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  console.log('🔐 ProtectedRoute - isAuthenticated:', isAuthenticated);
  
  if (!isAuthenticated) {
    console.log('🔐 ProtectedRoute - Redirecting to /login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('🔐 ProtectedRoute - Rendering children');
  return <>{children}</>;
};

// Auth Check Component - Router içinde çalışır
const AuthenticatedRedirect: React.FC<{ hasSetup: boolean }> = ({ hasSetup }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  
  if (!hasSetup) {
    return <Navigate to="/onboarding/welcome" replace />;
  }
  
  return <LoginPage hasSetup={hasSetup} />;
};

function AppContent() {
  const [loading, setLoading] = useState(true);
  const [hasSetup, setHasSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    console.log('🔄 checkInitialSetup useEffect çalışıyor');
    checkInitialSetup();
  }, []);
  
  // SESSION VALIDATION: Check session every 5 minutes
  useEffect(() => {
    console.log('🔐 Session check useEffect - isAuthenticated:', isAuthenticated);
    if (!isAuthenticated) return;
    
    const checkSession = async () => {
      console.log('🔍 Session check başlıyor...');
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        // Backend LoginResponse dönüyor, success field'ını kontrol et
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
        // Session check hatası olursa da logout yapma, sadece logla
      }
    };
    
    // Initial check - biraz gecikme ile yap
    const initialCheck = setTimeout(checkSession, 2000);
    
    // Check every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
    };
  }, [isAuthenticated, logout]);

  const checkInitialSetup = async () => {
    console.log('🏁 checkInitialSetup çalışıyor, isTauri:', isTauri());
    if (!isTauri()) {
      setError('Bu uygulama Tauri ortamında çalıştırılmalıdır.');
      setLoading(false);
      return;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      console.log('📡 check_initial_setup çağrılıyor...');
      const result = await invoke<{ count: number }>('check_initial_setup');
      console.log('📡 check_initial_setup sonuç:', result);
      
      if (result.count > 0) {
        setHasSetup(true);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
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
        <ProtectedRoute>
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
      
      {/* Fallback - Login'e yönlendir */}
      <Route path="*" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
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
