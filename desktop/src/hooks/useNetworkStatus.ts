import { useState, useEffect, useCallback } from 'react';

type ConnectionStatus = 'online' | 'offline' | 'checking';

interface UseNetworkStatusReturn {
  isOnline: boolean;
  status: ConnectionStatus;
  lastOnlineAt: Date | null;
  checkConnection: () => Promise<boolean>;
}

/**
 * Network durumunu takip eden hook
 * Online/offline geçişlerini dinler ve API sunucusuna ping atar
 */
export function useNetworkStatus(): UseNetworkStatusReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [status, setStatus] = useState<ConnectionStatus>(
    navigator.onLine ? 'online' : 'offline'
  );
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(
    navigator.onLine ? new Date() : null
  );

  /**
   * API sunucusuna ping atarak gerçek bağlantı durumunu kontrol et
   */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setStatus('checking');
    
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 saniye timeout
      
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const online = response.ok;
      setIsOnline(online);
      setStatus(online ? 'online' : 'offline');
      
      if (online) {
        setLastOnlineAt(new Date());
      }
      
      return online;
    } catch (error) {
      setIsOnline(false);
      setStatus('offline');
      return false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Browser online event');
      setIsOnline(true);
      setStatus('online');
      setLastOnlineAt(new Date());
      
      // Gerçek bağlantıyı kontrol et
      checkConnection();
    };

    const handleOffline = () => {
      console.log('📴 Browser offline event');
      setIsOnline(false);
      setStatus('offline');
    };

    // Event listener'ları ekle
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // İlk yüklenmede bağlantıyı kontrol et
    if (navigator.onLine) {
      checkConnection();
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  return {
    isOnline,
    status,
    lastOnlineAt,
    checkConnection,
  };
}

export default useNetworkStatus;
