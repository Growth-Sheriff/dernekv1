import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  PieChart,
  Settings,
  Mountain,
  LogOut,
  UserCog,
  Package,
  Building2,
  Clock,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/typography';
import { useAuthStore } from '@/store/authStore';

interface SidebarProps {
  className?: string;
}

interface NavItem {
  name: string;
  href?: string;
  icon?: React.ElementType;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Üyeler', href: '/uyeler', icon: Users },
  { 
    name: 'Aidat Yönetimi',
    icon: CreditCard,
    children: [
      { name: 'Aidat Listesi', href: '/aidat' },
      { name: 'Aidat Tanımları', href: '/aidat/tanim' },
      { name: 'Toplu Aidat İşlemleri', href: '/aidat/toplu-islemler' },
      { name: 'Kişi Bazlı Toplu', href: '/aidat/kisi-bazli-toplu' },
      { name: 'Çoklu Üye Toplu', href: '/aidat/coklu-toplu' },
    ]
  },
  { 
    name: 'Mali İşlemler',
    icon: Wallet,
    children: [
      { name: 'Kasalar', href: '/mali/kasalar' },
      { name: 'Gelirler', href: '/mali/gelirler', icon: TrendingUp },
      { name: 'Giderler', href: '/mali/giderler', icon: TrendingDown },
      { name: 'Gelir Türleri', href: '/mali/gelir-turleri' },
      { name: 'Gider Türleri', href: '/mali/gider-turleri' },
      { name: 'Virmanlar', href: '/mali/virmanlar' },
      { name: 'Kur Yönetimi', href: '/mali/kurlar' },
      { name: 'Yıl Sonu Devir', href: '/mali/yilsonu-devir' },
    ]
  },
  { name: 'Etkinlikler', href: '/etkinlikler', icon: Calendar },
  { name: 'Toplantılar', href: '/toplantilar', icon: FileText },
  { 
    name: 'Raporlar',
    icon: PieChart,
    children: [
      { name: 'Genel', href: '/raporlar' },
      { name: 'Mali Rapor', href: '/raporlar/mali' },
      { name: 'Aidat Raporu', href: '/raporlar/aidat' },
      { name: 'Üyeler Raporu', href: '/raporlar/uyeler' },
      { name: 'Bilanço', href: '/raporlar/bilanco' },
      { name: 'Mizan', href: '/raporlar/mizan' },
      { name: 'Kesin Hesap', href: '/raporlar/kesin-hesap' },
      { name: 'Kasa Raporu', href: '/raporlar/kasa' },
    ]
  },
  { name: 'Belgeler', href: '/belgeler', icon: FileText },
  { name: 'Arşiv', href: '/arsiv', icon: Archive },
  { name: 'Bütçe', href: '/butce', icon: PieChart },
  { name: 'Demirbaşlar', href: '/demirbaslar', icon: Package },
  { name: 'Cari Hesaplar', href: '/cari', icon: Building2 },
  { name: 'Vadeli İşlemler', href: '/vadeli-islemler', icon: Clock },
  { name: 'Köy Modülü', href: '/koy', icon: Mountain },
  { 
    name: 'Ayarlar',
    icon: Settings,
    children: [
      { name: 'Genel', href: '/ayarlar/genel' },
      { name: 'Kullanıcı Yönetimi', href: '/settings/users', icon: UserCog },
      { name: 'Yedekleme', href: '/ayarlar/yedekleme' },
    ]
  },
];

// ============================================================================
// SidebarItem - Single navigation item
// ============================================================================

interface SidebarItemProps {
  item: NavItem;
  collapsed: boolean;
  depth?: number;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ item, collapsed, depth = 0 }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(() => {
    if (item.children) {
      return item.children.some(child => child.href === location.pathname);
    }
    return false;
  });

  const hasChildren = item.children && item.children.length > 0;
  const Icon = item.icon;

  // Check if any child is active
  const isChildActive = hasChildren && item.children?.some(
    child => location.pathname === child.href || location.pathname.startsWith(child.href + '/')
  );

  if (hasChildren) {
    return (
      <div className="space-y-0.5">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg',
            'transition-all duration-200 ease-out',
            'text-sidebar-foreground/70 hover:text-sidebar-foreground',
            'hover:bg-sidebar-accent/50',
            isChildActive && 'text-sidebar-foreground bg-sidebar-accent/30',
            collapsed && 'justify-center px-2'
          )}
        >
          {Icon && (
            <Icon className={cn(
              'h-[18px] w-[18px] flex-shrink-0 transition-colors',
              isChildActive ? 'text-primary' : 'text-sidebar-foreground/60'
            )} />
          )}
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.name}</span>
              <ChevronDown className={cn(
                'h-4 w-4 text-sidebar-foreground/40 transition-transform duration-200',
                isOpen && 'rotate-180'
              )} />
            </>
          )}
        </button>

        {/* Submenu */}
        {!collapsed && isOpen && (
          <div className="ml-3 pl-3 border-l border-sidebar-border/50 space-y-0.5">
            {item.children?.map((child) => (
              <SidebarItem key={child.name} item={child} collapsed={false} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.href!}
      className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg',
        'transition-all duration-200 ease-out',
        depth > 0 ? 'py-1.5 text-[13px]' : '',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
        collapsed && 'justify-center px-2'
      )}
    >
      {Icon && (
        <Icon className={cn(
          'flex-shrink-0 transition-colors',
          depth > 0 ? 'h-4 w-4' : 'h-[18px] w-[18px]'
        )} />
      )}
      {!collapsed && <span>{item.name}</span>}
    </NavLink>
  );
};

// ============================================================================
// Sidebar - Main component (macOS style)
// ============================================================================

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full',
        'bg-sidebar border-r border-sidebar-border',
        'transition-all duration-300 ease-out',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Header - macOS traffic light area */}
      <div className={cn(
        'flex items-center h-14 px-4',
        'border-b border-sidebar-border/50',
        // macOS title bar style - draggable area
        'app-region-drag'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">B</span>
            </div>
            <div>
              <Text variant="body" weight="semibold" className="text-sidebar-foreground leading-tight">
                BADER
              </Text>
              <Text variant="caption" className="text-sidebar-foreground/50 leading-tight">
                Dernek Yönetimi
              </Text>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
            <span className="text-primary font-bold text-sm">B</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
        {navigation.map((item) => (
          <SidebarItem key={item.name} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border/50 space-y-0.5">
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg',
            'text-destructive/80 hover:text-destructive hover:bg-destructive/10',
            'transition-all duration-200',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
          {!collapsed && <span>Çıkış Yap</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg',
            'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
            'transition-all duration-200',
            collapsed && 'justify-center px-2'
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-[18px] w-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px]" />
              <span>Daralt</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
