import React from 'react';
import { Bell, Search, User, Command, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
// import { Text } from '@/components/ui/typography'; // Text şimdilik normal span olsun
import { Input } from '@/components/ui/input';
// import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ViewModeToggle } from '@/components/ui/view-mode-toggle';
import { useAuthStore } from '@/store/authStore';

interface HeaderProps {
  className?: string;
}

// Basit Text bileşeni (Eğer typography yoksa)
const Text = ({ children, className, variant, weight }: any) => (
  <span className={cn(className, variant === 'small' ? 'text-sm' : 'text-xs', weight === 'medium' ? 'font-medium' : '')}>{children}</span>
);

export const Header: React.FC<HeaderProps> = ({ className }) => {
  const [searchFocused, setSearchFocused] = React.useState(false);
  const { user, tenant } = useAuthStore();

  return (
    <header
      className={cn(
        'flex h-14 items-center justify-between px-6',
        'bg-background/80 backdrop-blur-xl',
        'border-b border-border/50',
        'sticky top-0 z-40', // Web için sticky
        className
      )}
    >
      {/* Left: Global Search */}
      <div className="flex items-center flex-1 max-w-lg">
        <div className={cn(
          'relative w-full transition-all duration-200',
          searchFocused && 'w-full'
        )}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Ara veya komut yaz..."
            className={cn(
              'w-full pl-9 pr-20 h-9',
              'bg-muted/40 hover:bg-muted/60',
              'border-transparent hover:border-border/50',
              'focus:bg-background focus:border-border',
              'placeholder:text-muted-foreground/60',
              'transition-all duration-200'
            )}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {/* Keyboard Shortcut Hint */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <Command className="h-3 w-3" />
              <span>K</span>
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 ml-4">
        <ViewModeToggle />
        <ThemeToggle />

        {/* Notifications */}
        <button
          className={cn(
            'relative p-2 rounded-lg',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-muted/60',
            'transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          aria-label="Bildirimler"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
        </button>

        <div className="h-6 w-px bg-border/50 mx-1" />

        {/* User Menu */}
        <button
          className={cn(
            'flex items-center gap-3 p-1.5 pr-3 rounded-lg',
            'hover:bg-muted/60',
            'transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shadow-sm">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
          </div>

          <div className="hidden md:flex flex-col items-start">
            <Text variant="small" weight="medium" className="text-foreground leading-tight">
              {user?.full_name || 'Admin User'}
            </Text>
            <Text variant="caption" className="text-muted-foreground leading-tight">
              {tenant?.name || 'Demo Dernek'}
            </Text>
          </div>

          <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
        </button>
      </div>
    </header>
  );
};
