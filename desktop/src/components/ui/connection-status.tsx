import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useSyncStore } from '../../store/syncStore';
import { useLicenseStore } from '../../store/licenseStore';
import { cn } from '../../lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

interface ConnectionStatusProps {
  showText?: boolean;
  className?: string;
}

/**
 * Header'da gösterilecek bağlantı durumu göstergesi
 */
export function ConnectionStatus({ showText = false, className }: ConnectionStatusProps) {
  const { isOnline, status, lastOnlineAt, checkConnection } = useNetworkStatus();
  const { isSyncing, pendingChanges, lastSyncAt } = useSyncStore();
  const { mode: licenseMode } = useLicenseStore();

  // LOCAL modda gösterme
  if (licenseMode === 'LOCAL') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-1.5 text-muted-foreground', className)}>
              <CloudOff className="h-4 w-4" />
              {showText && <span className="text-xs">Yerel Mod</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Yerel mod aktif - Senkronizasyon kapalı</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Senkronizasyon durumu
  if (isSyncing) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-1.5 text-blue-500', className)}>
              <RefreshCw className="h-4 w-4 animate-spin" />
              {showText && <span className="text-xs">Senkronize ediliyor...</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Veriler senkronize ediliyor</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Bağlantı durumuna göre ikon
  const getStatusIcon = () => {
    if (status === 'checking') {
      return <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />;
    }
    
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    
    if (pendingChanges > 0) {
      return <Cloud className="h-4 w-4 text-yellow-500" />;
    }
    
    return <Wifi className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (status === 'checking') return 'Kontrol ediliyor...';
    if (!isOnline) return 'Çevrimdışı';
    if (pendingChanges > 0) return `${pendingChanges} bekleyen`;
    return 'Çevrimiçi';
  };

  const getTooltipContent = () => {
    const lines: string[] = [];
    
    if (isOnline) {
      lines.push('✅ Sunucuya bağlı');
    } else {
      lines.push('❌ Sunucuya bağlantı yok');
    }
    
    if (pendingChanges > 0) {
      lines.push(`⏳ ${pendingChanges} değişiklik bekliyor`);
    }
    
    if (lastSyncAt) {
      const lastSync = new Date(lastSyncAt);
      lines.push(`🔄 Son sync: ${lastSync.toLocaleTimeString('tr-TR')}`);
    }
    
    if (!isOnline && lastOnlineAt) {
      lines.push(`📴 Son çevrimiçi: ${lastOnlineAt.toLocaleTimeString('tr-TR')}`);
    }
    
    return lines;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            onClick={() => checkConnection()}
            className={cn(
              'flex items-center gap-1.5 hover:opacity-80 transition-opacity',
              className
            )}
          >
            {getStatusIcon()}
            {showText && (
              <span className={cn(
                'text-xs',
                isOnline ? 'text-green-600' : 'text-red-500'
              )}>
                {getStatusText()}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            {getTooltipContent().map((line, i) => (
              <p key={i}>{line}</p>
            ))}
            <p className="text-xs text-muted-foreground mt-2">
              Tıklayarak bağlantıyı kontrol edebilirsiniz
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ConnectionStatus;
