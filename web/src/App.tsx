import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import './styles/globals.css';

// ============================================================================
// Inline Login Page
// ============================================================================
function LoginPage() {
  const [email, setEmail] = useState('admin@dernek.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      if (email && password) {
        login(
          { id: '1', email, full_name: 'Admin Kullanıcı', tenant_id: '1', role: 'admin' },
          { id: '1', name: 'Demo Dernek', slug: 'demo' },
          'mock-token-web'
        );
        navigate('/');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">B</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">BADER Web</h1>
          <p className="text-blue-200/80">Dernek Yönetim Sistemi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Sidebar Navigation (Desktop tarzı)
// ============================================================================
const menuItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/uyeler', label: 'Üyeler', icon: '👥' },
  { path: '/aidat', label: 'Aidat', icon: '💰' },
  { path: '/mali/gelirler', label: 'Gelirler', icon: '📈' },
  { path: '/mali/giderler', label: 'Giderler', icon: '📉' },
  { path: '/mali/kasalar', label: 'Kasalar', icon: '🏦' },
  { path: '/raporlar', label: 'Raporlar', icon: '📋' },
  { path: '/ayarlar', label: 'Ayarlar', icon: '⚙️' },
];

function Sidebar() {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const { user, tenant } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-xl font-bold">B</span>
          </div>
          <div>
            <h1 className="font-bold">BADER</h1>
            <p className="text-xs text-slate-400">{tenant?.name || 'Web Edition'}</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
              <span className="text-sm">👤</span>
            </div>
            <span className="text-sm text-slate-300">{user?.full_name || 'Kullanıcı'}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-400 transition-colors"
            title="Çıkış"
          >
            🚪
          </button>
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// Layout (Desktop tarzı - Sidebar + Content)
// ============================================================================
function Layout() {
  return (
    <div className="min-h-screen flex bg-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

// ============================================================================
// Dashboard Page
// ============================================================================
function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Toplam Üye</p>
              <p className="text-3xl font-bold text-slate-800">156</p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Aylık Gelir</p>
              <p className="text-3xl font-bold text-green-600">₺45,200</p>
            </div>
            <div className="text-3xl">📈</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Aylık Gider</p>
              <p className="text-3xl font-bold text-red-600">₺12,800</p>
            </div>
            <div className="text-3xl">📉</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Kasa Bakiyesi</p>
              <p className="text-3xl font-bold text-blue-600">₺32,400</p>
            </div>
            <div className="text-3xl">🏦</div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">🎉 Web Uygulaması Çalışıyor!</h2>
        <p className="text-slate-600 mb-4">
          Desktop uygulamasının Web versiyonu başarıyla çalışıyor. Şu an mock data ile çalışıyorsunuz.
        </p>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Sonraki Adımlar:</h3>
          <ul className="list-disc list-inside text-blue-700 space-y-1">
            <li>Backend API bağlantısı kurulacak</li>
            <li>Tüm sayfalar API ile entegre edilecek</li>
            <li>Desktop ↔ Web senkronizasyonu aktif edilecek</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Placeholder Pages
// ============================================================================
function UyelerPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Üyeler</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-600">Üye listesi burada görüntülenecek...</p>
      </div>
    </div>
  );
}

function AidatPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Aidat İşlemleri</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-600">Aidat listesi burada görüntülenecek...</p>
      </div>
    </div>
  );
}

function GelirlerPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Gelirler</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-600">Gelir listesi burada görüntülenecek...</p>
      </div>
    </div>
  );
}

function GiderlerPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Giderler</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-600">Gider listesi burada görüntülenecek...</p>
      </div>
    </div>
  );
}

function KasalarPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Kasalar</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-600">Kasa listesi burada görüntülenecek...</p>
      </div>
    </div>
  );
}

function RaporlarPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Raporlar</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-600">Raporlar burada görüntülenecek...</p>
      </div>
    </div>
  );
}

function AyarlarPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Ayarlar</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-600">Ayarlar burada görüntülenecek...</p>
      </div>
    </div>
  );
}

// ============================================================================
// Protected Route
// ============================================================================
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// ============================================================================
// App
// ============================================================================
function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTimeout(() => setReady(true), 100);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-900">
        <div className="text-white text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse">
            <span className="text-2xl font-bold">B</span>
          </div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="uyeler" element={<UyelerPage />} />
          <Route path="aidat" element={<AidatPage />} />
          <Route path="mali/gelirler" element={<GelirlerPage />} />
          <Route path="mali/giderler" element={<GiderlerPage />} />
          <Route path="mali/kasalar" element={<KasalarPage />} />
          <Route path="raporlar" element={<RaporlarPage />} />
          <Route path="ayarlar" element={<AyarlarPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
