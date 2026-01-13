import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/components/providers/theme-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        className={cn('h-8 w-8 p-0', className)}
        aria-label="Tema seç"
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </Button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-36 rounded-md border bg-popover p-1 shadow-md z-50">
          <button
            onClick={() => { setTheme('light'); setShowMenu(false); }}
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
              theme === 'light' && 'bg-accent'
            )}
          >
            <Sun className="h-4 w-4" />
            <span>Açık</span>
          </button>
          <button
            onClick={() => { setTheme('dark'); setShowMenu(false); }}
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
              theme === 'dark' && 'bg-accent'
            )}
          >
            <Moon className="h-4 w-4" />
            <span>Koyu</span>
          </button>
          <button
            onClick={() => { setTheme('system'); setShowMenu(false); }}
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
              theme === 'system' && 'bg-accent'
            )}
          >
            <Monitor className="h-4 w-4" />
            <span>Sistem</span>
          </button>
        </div>
      )}
    </div>
  );
}
