import { RouteObject } from 'react-router-dom';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AdminLayout } from './components/layout/admin-layout';
import { MainLayout } from './components/layout/main-layout';
import AdminDashboard from './pages/admin/dashboard';
import TenantsPage from './pages/admin/tenants';
import LicensesPage from './pages/admin/licenses';

// Auth
import LoginPage from './pages/auth/login';

// Dashboard
import DashboardPage from './pages/dashboard/index';

// Üyeler
import UyelerListPage from './pages/uyeler/list';
import UyelerDetailPage from './pages/uyeler/detail';
import UyelerCreatePage from './pages/uyeler/create';

// Aidat
import AidatListPage from './pages/aidat/list';
import AidatDetailPage from './pages/aidat/detail';
import AidatTopluIslemlerPage from './pages/aidat/toplu-islemler';
import AidatTanimPage from './pages/aidat/tanim';
import KisiBazliTopluAidatPage from './pages/aidat/kisi-bazli-toplu';
import CokluTopluAidatPage from './pages/aidat/coklu-toplu';

// Mali
import KasalarPage from './pages/mali/kasalar';
import KasaDetayPage from './pages/mali/kasa-detay';
import GelirlerPage from './pages/mali/gelirler';
import GiderlerPage from './pages/mali/giderler';
import VirmanlarPage from './pages/mali/virmanlar';
import GelirTuruYonetimiPage from './pages/mali/gelir-turu-yonetimi';
import GiderTuruYonetimiPage from './pages/mali/gider-turu-yonetimi';
import YilSonuDevirPage from './pages/mali/yilsonu-devir';
import KurlarPage from './pages/mali/kurlar';

// Raporlar
import RaporlarIndexPage from './pages/raporlar/index';

// Ayarlar
import AyarlarGenelPage from './pages/ayarlar/genel';


// ============================================================================
// Guards
// ============================================================================
const ProtectedGuard = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/admin',
    element: <ProtectedGuard />, // Admin auth check required ideally
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'tenants', element: <TenantsPage /> },
          { path: 'licenses', element: <LicensesPage /> },
        ]
      }
    ]
  },
  {
    path: '/',
    element: <ProtectedGuard />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'uyeler',
            children: [
              { index: true, element: <UyelerListPage /> },
              { path: 'create', element: <UyelerCreatePage /> },
              { path: ':id', element: <UyelerDetailPage /> },
              { path: ':id/edit', element: <UyelerCreatePage /> },
            ],
          },
          {
            path: 'aidat',
            children: [
              { index: true, element: <AidatListPage /> },
              { path: 'toplu-islemler', element: <AidatTopluIslemlerPage /> },
              { path: 'tanim', element: <AidatTanimPage /> },
              { path: 'kisi-bazli-toplu', element: <KisiBazliTopluAidatPage /> },
              { path: 'coklu-toplu', element: <CokluTopluAidatPage /> },
              { path: ':id', element: <AidatDetailPage /> },
            ],
          },
          {
            path: 'mali',
            children: [
              { path: 'kasalar', element: <KasalarPage /> },
              { path: 'kasa-detay/:id', element: <KasaDetayPage /> },
              { path: 'gelirler', element: <GelirlerPage /> },
              { path: 'gelir-turleri', element: <GelirTuruYonetimiPage /> },
              { path: 'giderler', element: <GiderlerPage /> },
              { path: 'gider-turleri', element: <GiderTuruYonetimiPage /> },
              { path: 'virmanlar', element: <VirmanlarPage /> },
              { path: 'kurlar', element: <KurlarPage /> },
              { path: 'yilsonu-devir', element: <YilSonuDevirPage /> },
            ],
          },
          {
            path: 'raporlar',
            children: [
              { index: true, element: <RaporlarIndexPage /> },
            ]
          },
          {
            path: 'ayarlar',
            children: [
              { path: 'genel', element: <AyarlarGenelPage /> },
            ]
          }
        ]
      }
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
];
