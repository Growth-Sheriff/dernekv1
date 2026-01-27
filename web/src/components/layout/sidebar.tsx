import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useViewMode } from '@/store/viewModeStore';
import {
  LayoutDashboard,
  Users,
  Wallet,
  FileText,
  Settings,
  ChevronDown,
  LogOut,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Landmark,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Crown,
  Zap,
  Calendar,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Navigation configuration
// ============================================================================

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Üyeler', href: '/uyeler', icon: Users },
  {
    name: 'Aidat',
    href: '/aidat',
    icon: CreditCard,
    children: [
      { name: 'Aidat Listesi', href: '/aidat', icon: CreditCard },
      { name: 'Aidat Tanım', href: '/aidat/tanim', icon: CreditCard },
      { name: 'Toplu İşlemler', href: '/aidat/toplu-islemler', icon: CreditCard },
      { name: 'Kişi Bazlı', href: '/aidat/kisi-bazli-toplu', icon: CreditCard },
    ],
  },
  {
    name: 'Mali İşlemler',
    href: '/mali',
    icon: Wallet,
    children: [
      { name: 'Kasalar', href: '/mali/kasalar', icon: Landmark },
      { name: 'Gelirler', href: '/mali/gelirler', icon: TrendingUp },
      { name: 'Gelir Türleri', href: '/mali/gelir-turleri', icon: TrendingUp },
      { name: 'Giderler', href: '/mali/giderler', icon: TrendingDown },
      { name: 'Gider Türleri', href: '/mali/gider-turleri', icon: TrendingDown },
      { name: 'Virmanlar', href: '/mali/virmanlar', icon: ArrowLeftRight },
      { name: 'Kurlar', href: '/mali/kurlar', icon: Landmark },
      { name: 'Yıl Sonu Devir', href: '/mali/yilsonu-devir', icon: Landmark },
    ],
  },
  { name: 'Etkinlikler', href: '/etkinlikler', icon: Calendar },
  { name: 'Toplantılar', href: '/toplantilar', icon: Users },
  { name: 'Belgeler', href: '/belgeler', icon: FileText },
  { name: 'Bütçe', href: '/butce', icon: Wallet },
  { name: 'Demirbaşlar', href: '/demirbaslar', icon: Landmark },
  { name: 'Cari Hesaplar', href: '/cari', icon: CreditCard },
  {
    name: 'Raporlar',
    href: '/raporlar',
    icon: FileText,
    children: [
      { name: 'Genel Raporlar', href: '/raporlar', icon: FileText },
      { name: 'Mali Raporlar', href: '/raporlar/mali', icon: TrendingUp },
      { name: 'Aidat Raporları', href: '/raporlar/aidat', icon: CreditCard },
      { name: 'Üye Raporları', href: '/raporlar/uyeler', icon: Users },
      { name: 'Bilanço', href: '/raporlar/bilanco', icon: FileText },
      { name: 'Mizan', href: '/raporlar/mizan', icon: FileText },
      { name: 'Kesin Hesap', href: '/raporlar/kesin-hesap', icon: FileText },
      { name: 'Kasa Raporu', href: '/raporlar/kasa', icon: Wallet },
    ],
  },
  { name: 'Ayarlar', href: '/ayarlar', icon: Settings },
];

const simpleNavigation: NavItem[] = [
  { name: 'Mali Özet', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Aidat', href: '/aidat', icon: CreditCard },
  { name: 'Gelirler', href: '/mali/gelirler', icon: TrendingUp },
  { name: 'Giderler', href: '/mali/giderler', icon: TrendingDown },
  { name: 'Ayarlar', href: '/ayarlar', icon: Settings },
];

// ============================================================================
// Types
// ============================================================================

interface SidebarProps {
  className?: string;
}

interface SidebarItemProps {
  item: NavItem;
  collapsed: boolean;
  depth?: number;
}

// ============================================================================
// Premium Sidebar Item
// ============================================================================

const SidebarItem: React.FC<SidebarItemProps> = ({ item, collapsed, depth = 0 }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;

  const isChildActive = hasChildren && item.children?.some(
    child => location.pathname === child.href || location.pathname.startsWith(child.href + '/')
  );

  React.useEffect(() => {
    if (isChildActive) setIsOpen(true);
  }, [isChildActive]);

  if (hasChildren) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl',
            'transition-all duration-300 ease-out group relative overflow-hidden',
            isChildActive
              ? 'text-white'
              : 'text-gray-600 hover:text-gray-900',
            collapsed && 'justify-center px-2'
          )}
        >
          {/* Active gradient background */}
          {isChildActive && (
            <div
              className="absolute inset-0 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                boxShadow: '0 4px 15px -3px rgba(59,130,246,0.5)',
              }}
            />
          )}

          {/* Hover effect */}
          <div className={cn(
            'absolute inset-0 rounded-xl transition-all duration-300',
            isChildActive ? 'bg-transparent' : 'bg-transparent group-hover:bg-blue-50'
          )} />

          <div className="relative z-10 flex items-center gap-3 w-full">
            {Icon && (
              <Icon className={cn(
                'h-[18px] w-[18px] flex-shrink-0 transition-all duration-300',
                isChildActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
              )} />
            )}
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.name}</span>
                <ChevronDown className={cn(
                  'h-4 w-4 transition-transform duration-300',
                  isChildActive ? 'text-white/70' : 'text-gray-400',
                  isOpen && 'rotate-180'
                )} />
              </>
            )}
          </div>
        </button>

        {/* Submenu */}
        <div className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          !collapsed && isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}>
          <div className="ml-4 pl-3 border-l-2 border-blue-100 space-y-1 py-1">
            {item.children?.map((child) => (
              <SidebarItem key={child.name} item={child} collapsed={false} depth={depth + 1} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isActive = location.pathname === item.href ||
    (item.href !== '/' && location.pathname.startsWith(item.href + '/'));

  return (
    <NavLink
      to={item.href!}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl relative overflow-hidden group',
        'transition-all duration-300 ease-out',
        depth > 0 ? 'py-2 text-[13px]' : '',
        collapsed && 'justify-center px-2'
      )}
    >
      {/* Active gradient background */}
      {isActive && depth === 0 && (
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            boxShadow: '0 4px 15px -3px rgba(59,130,246,0.5)',
          }}
        />
      )}
      {isActive && depth > 0 && (
        <div className="absolute inset-0 bg-blue-50 rounded-xl" />
      )}

      {/* Hover effect */}
      <div className={cn(
        'absolute inset-0 rounded-xl transition-all duration-300',
        isActive ? 'bg-transparent' : 'bg-transparent group-hover:bg-blue-50'
      )} />

      {/* Hover accent line */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-all duration-300',
        !isActive && 'bg-blue-500 scale-y-0 group-hover:scale-y-100'
      )} />

      <div className={cn(
        'relative z-10 flex items-center gap-3',
        isActive && depth === 0 ? 'text-white' : '',
        isActive && depth > 0 ? 'text-blue-600' : '',
        !isActive ? 'text-gray-600 group-hover:text-gray-900' : ''
      )}>
        {Icon && (
          <Icon className={cn(
            'flex-shrink-0 transition-all duration-300',
            depth > 0 ? 'h-4 w-4' : 'h-[18px] w-[18px]',
            !isActive && 'group-hover:scale-110 group-hover:text-blue-600'
          )} />
        )}
        {!collapsed && <span>{item.name}</span>}
      </div>

      {/* Badge */}
      {item.badge && !collapsed && (
        <span
          className="relative z-10 ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            color: 'white',
          }}
        >
          {item.badge}
        </span>
      )}
    </NavLink>
  );
};

// ============================================================================
// Premium Sidebar
// ============================================================================

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const { isSimple } = useViewMode();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentNavigation = isSimple ? simpleNavigation : navigation;

  return (
    <aside
      className={cn(
        'flex flex-col h-full relative overflow-hidden',
        'transition-all duration-300 ease-out',
        collapsed ? 'w-20' : 'w-72',
        className
      )}
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.98) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '4px 0 24px -12px rgba(0,0,0,0.1)',
      }}
    >
      {/* Decorative gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.03) 0%, transparent 50%, rgba(139,92,246,0.03) 100%)',
        }}
      />

      {/* Animated accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #3b82f6)',
          backgroundSize: '200% 100%',
          animation: 'gradientMove 4s linear infinite',
        }}
      />

      {/* Header */}
      <div className={cn(
        'flex items-center h-20 px-5 relative z-10',
        'border-b border-gray-100',
        collapsed && 'justify-center px-2'
      )}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="relative">
              {/* Logo glow */}
              <div
                className="absolute inset-0 rounded-2xl blur-lg opacity-50"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
              />
              {/* Logo */}
              <div
                className="relative h-12 w-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  boxShadow: '0 8px 24px -8px rgba(59,130,246,0.6)',
                }}
              >
                <span className="text-white font-black text-xl">B</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-gray-900 text-lg tracking-tight font-bold">
                  BADER
                </span>
                <span
                  className="px-1.5 py-0.5 text-[9px] font-bold rounded flex items-center gap-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                    color: 'white',
                  }}
                >
                  <Crown className="w-2.5 h-2.5" /> PRO
                </span>
              </div>
              <span className="text-gray-400 text-xs flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Enterprise Suite
              </span>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div
              className="absolute inset-0 rounded-xl blur-lg opacity-50"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
            />
            <div
              className="relative h-10 w-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                boxShadow: '0 8px 24px -8px rgba(59,130,246,0.6)',
              }}
            >
              <span className="text-white font-black text-lg">B</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats (when expanded) - Only in EXPERT MODE */}
      {!collapsed && !isSimple && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div
            className="p-3 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.08) 100%)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-gray-700">Bugün</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-blue-600">24</p>
                <p className="text-[10px] text-gray-500">İşlem</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600">+₺2.5k</p>
                <p className="text-[10px] text-gray-500">Gelir</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 relative z-10 scrollbar-thin">
        {currentNavigation.map((item) => (
          <SidebarItem key={item.name} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 space-y-2 relative z-10">
        {/* Upgrade Banner (when expanded) */}
        {!collapsed && !isSimple && (
          <div
            className="p-3 rounded-xl mb-2 cursor-pointer transition-transform hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">Premium Aktif</span>
            </div>
            <p className="text-[10px] text-gray-400">Tüm özelliklere erişiminiz var</p>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl',
            'text-red-500 hover:text-red-600',
            'transition-all duration-300 group relative overflow-hidden',
            collapsed && 'justify-center px-2'
          )}
        >
          <div className="absolute inset-0 rounded-xl bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-300" />
          <LogOut className="h-[18px] w-[18px] flex-shrink-0 relative z-10 group-hover:scale-110 transition-transform duration-300" />
          {!collapsed && <span className="relative z-10">Çıkış Yap</span>}
        </button>

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl',
            'text-gray-500 hover:text-gray-700',
            'transition-all duration-300 group relative overflow-hidden',
            collapsed && 'justify-center px-2'
          )}
        >
          <div className="absolute inset-0 rounded-xl bg-gray-50 opacity-0 group-hover:opacity-100 transition-all duration-300" />
          {collapsed ? (
            <PanelLeft className="h-[18px] w-[18px] relative z-10 group-hover:scale-110 transition-transform duration-300" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px] relative z-10 group-hover:scale-110 transition-transform duration-300" />
              <span className="relative z-10">Daralt</span>
            </>
          )}
        </button>
      </div>

      {/* CSS for gradient animation */}
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </aside>
  );
};
