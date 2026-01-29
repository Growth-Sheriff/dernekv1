import { RouteObject } from 'react-router-dom';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AdminLayout } from './components/layout/admin-layout';
import { MainLayout } from './components/layout/main-layout';
import AdminDashboard from './pages/admin/dashboard';
import TenantsPage from './pages/admin/tenants';
import LicensesPage from './pages/admin/licenses';

// Super Admin
import SuperAdminLoginPage from './pages/super-admin/login';
import SuperAdminDashboard from './pages/super-admin/dashboard';

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

// Etkinlikler
import EtkinliklerListPage from './pages/etkinlikler/list';
import EtkinliklerCreatePage from './pages/etkinlikler/create';
import EtkinliklerDetailPage from './pages/etkinlikler/detail';

// Toplantılar
import ToplantilarListPage from './pages/toplantilar/list';
import ToplantilarCreatePage from './pages/toplantilar/create';
import ToplantilarDetailPage from './pages/toplantilar/detail';

// Raporlar
import RaporlarIndexPage from './pages/raporlar/index';
// Diğer rapor sayfaları import edilecek...

// Belgeler
import BelgelerListPage from './pages/belgeler/list';

// Arşiv
import ArsivPage from './pages/arsiv';

// Bütçe
import ButceListPage from './pages/butce/list';
import ButceCreatePage from './pages/butce/create';
import ButceDetailPage from './pages/butce/detail';

// Demirbaşlar
import { DemirbaslarListPage, DemirbasCreatePage, DemirbasDetailPage, DemirbasTopluPage } from './pages/demirbaslar';

// Cari
import { CariListPage, CariCreatePage, CariDetailPage } from './pages/cari';

// Vadeli İşlemler
import { VadeliIslemlerListPage } from './pages/vadeli-islemler';

// Köy
import KoyIndexPage from './pages/koy/index';
import KoyKasalarPage from './pages/koy/kasalar';
import KoyGelirlerPage from './pages/koy/gelirler';
import KoyGiderlerPage from './pages/koy/giderler';
import KoyVirmanlarPage from './pages/koy/virmanlar';

// Ayarlar
import AyarlarGenelPage from './pages/ayarlar/genel';
import AyarlarKullanicilarPage from './pages/ayarlar/kullanicilar';
import AyarlarYedeklemePage from './pages/ayarlar/yedekleme';
import LisansPage from './pages/ayarlar/lisans';
import LicenseUpgradePage from './pages/LicenseUpgrade';

// ============================================================================
// Guards
// ============================================================================
const ProtectedGuard = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export const routes: RouteObject[] = [
  // Super Admin Routes - FIRST (most specific)
  {
    path: '/super-admin/login',
    element: <SuperAdminLoginPage />,
  },
  {
    path: '/super-admin/dashboard',
    element: <SuperAdminDashboard />,
  },
  {
    path: '/super-admin',
    element: <Navigate to="/super-admin/login" replace />,
  },
  // Customer Login
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/admin',
    element: <ProtectedGuard />,
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
            path: 'etkinlikler',
            children: [
              { index: true, element: <EtkinliklerListPage /> },
              { path: 'create', element: <EtkinliklerCreatePage /> },
              { path: ':id', element: <EtkinliklerDetailPage /> },
            ],
          },
          {
            path: 'toplantilar',
            children: [
              { index: true, element: <ToplantilarListPage /> },
              { path: 'create', element: <ToplantilarCreatePage /> },
              { path: ':id', element: <ToplantilarDetailPage /> },
            ],
          },
          {
            path: 'raporlar',
            children: [
              { index: true, element: <RaporlarIndexPage /> },
            ]
          },
          {
            path: 'belgeler',
            element: <BelgelerListPage />,
          },
          {
            path: 'butce',
            children: [
              { index: true, element: <ButceListPage /> },
              { path: 'create', element: <ButceCreatePage /> },
              { path: ':id', element: <ButceDetailPage /> },
            ],
          },
          {
            path: 'demirbaslar',
            children: [
              { index: true, element: <DemirbaslarListPage /> },
              { path: 'create', element: <DemirbasCreatePage /> },
              { path: 'toplu', element: <DemirbasTopluPage /> },
              { path: ':id', element: <DemirbasDetailPage /> },
              { path: ':id/edit', element: <DemirbasCreatePage /> },
            ],
          },
          {
            path: 'cari',
            children: [
              { index: true, element: <CariListPage /> },
              { path: 'create', element: <CariCreatePage /> },
              { path: ':id', element: <CariDetailPage /> },
              { path: ':id/edit', element: <CariCreatePage /> },
            ],
          },
          {
            path: 'vadeli-islemler',
            element: <VadeliIslemlerListPage />,
          },
          {
            path: 'arsiv',
            element: <ArsivPage />,
          },
          {
            path: 'koy',
            children: [
              { index: true, element: <KoyIndexPage /> },
              { path: 'kasalar', element: <KoyKasalarPage /> },
              { path: 'gelirler', element: <KoyGelirlerPage /> },
              { path: 'giderler', element: <KoyGiderlerPage /> },
              { path: 'virmanlar', element: <KoyVirmanlarPage /> },
            ],
          },
          {
            path: 'ayarlar',
            children: [
              { path: 'genel', element: <AyarlarGenelPage /> },
              { path: 'kullanicilar', element: <AyarlarKullanicilarPage /> },
              { path: 'yedekleme', element: <AyarlarYedeklemePage /> },
              { path: 'lisans', element: <LisansPage /> },
              { path: 'lisans-yukseltme', element: <LicenseUpgradePage /> },
            ]
          }
        ]
      }
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />
  }
];
