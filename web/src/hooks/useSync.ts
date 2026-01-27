import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSyncStore } from '../store/syncStore';
import { useLicenseStore } from '../store/licenseStore';
import { syncApi, SyncChange, SyncConflict } from '../lib/api';

interface UseSyncOptions {
  tenantId: string;
  autoSync?: boolean;
  syncInterval?: number; // ms cinsinden
}

interface UseSyncReturn {
  // Durum
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingChanges: number;
  conflicts: SyncConflict[];
  errors: string[];
  
  // Aksiyonlar
  sync: () => Promise<void>;
  pushChanges: () => Promise<void>;
  pullChanges: () => Promise<void>;
  resolveConflict: (conflictId: string, resolution: 'keep_local' | 'keep_server') => Promise<void>;
  queueChange: (change: Omit<SyncChange, 'local_updated_at'>) => Promise<void>;
}

export const useSync = (options: UseSyncOptions): UseSyncReturn => {
  const { tenantId, autoSync = true, syncInterval = 5 * 60 * 1000 } = options; // Default 5 dakika
  
  // Store state
  const {
    isSyncing,
    lastSyncAt,
    pendingChanges,
    syncErrors,
    startSync,
    finishSync,
    setPendingChanges,
    addSyncError,
    clearSyncErrors,
  } = useSyncStore();
  
  const { mode: licenseMode } = useLicenseStore();
  
  // Local state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  
  // Refs
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => {
      console.log('📶 Çevrimiçi oldu');
      setIsOnline(true);
      
      // Online olunca otomatik sync
      if (autoSync && pendingChanges > 0) {
        syncAll();
      }
    };
    
    const handleOffline = () => {
      console.log('📴 Çevrimdışı oldu');
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSync, pendingChanges]);
  
  // Device ID al
  useEffect(() => {
    const getDeviceId = async () => {
      try {
        const id = await invoke<string>('get_device_id');
        setDeviceId(id);
      } catch (error) {
        console.error('Device ID alınamadı:', error);
        // Fallback: rastgele ID oluştur
        setDeviceId(`device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      }
    };
    
    getDeviceId();
  }, []);
  
  // Auto sync timer
  useEffect(() => {
    if (!autoSync || licenseMode === 'LOCAL') {
      return;
    }
    
    syncTimerRef.current = setInterval(() => {
      if (isOnline && !isSyncing) {
        syncAll();
      }
    }, syncInterval);
    
    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, [autoSync, isOnline, isSyncing, syncInterval, licenseMode]);
  
  // Pending changes'ı yükle
  useEffect(() => {
    const loadPendingChanges = async () => {
      try {
        const count = await invoke<number>('get_pending_sync_count', { tenantIdParam: tenantId });
        setPendingChanges(count);
      } catch (error) {
        console.error('Pending changes yüklenemedi:', error);
      }
    };
    
    loadPendingChanges();
  }, [tenantId]);
  
  /**
   * Tüm değişiklikleri senkronize et (push + pull)
   */
  const syncAll = useCallback(async () => {
    if (!isOnline || isSyncing || licenseMode === 'LOCAL') {
      return;
    }
    
    startSync();
    clearSyncErrors();
    
    try {
      // 1. Push local changes
      await pushChanges();
      
      // 2. Pull server changes
      await pullChanges();
      
      finishSync(true);
    } catch (error) {
      addSyncError(String(error));
      finishSync(false);
    }
  }, [isOnline, isSyncing, licenseMode]);
  
  /**
   * Local değişiklikleri sunucuya gönder
   */
  const pushChanges = useCallback(async () => {
    if (!isOnline || licenseMode === 'LOCAL') {
      throw new Error('Çevrimdışı veya LOCAL modda push yapılamaz');
    }
    
    try {
      // Local'den bekleyen değişiklikleri al
      const changes = await invoke<SyncChange[]>('get_pending_sync_changes', { 
        tenantIdParam: tenantId 
      });
      
      if (changes.length === 0) {
        return;
      }
      
      // Sunucuya gönder
      const response = await syncApi.push({
        tenant_id: tenantId,
        device_id: deviceId,
        changes,
        last_sync_at: lastSyncAt || undefined,
      });
      
      // Başarılı sync'leri işaretle
      await invoke('mark_changes_synced', {
        tenantIdParam: tenantId,
        changeIds: changes.map(c => c.record_id),
      });
      
      // Conflict varsa kaydet
      if (response.conflicts.length > 0) {
        setConflicts(prev => [...prev, ...response.conflicts]);
      }
      
      setPendingChanges(0);
    } catch (error) {
      throw new Error(`Push hatası: ${error}`);
    }
  }, [isOnline, licenseMode, tenantId, deviceId, lastSyncAt]);
  
  /**
   * Sunucudan değişiklikleri çek
   */
  const pullChanges = useCallback(async () => {
    if (!isOnline || licenseMode === 'LOCAL') {
      throw new Error('Çevrimdışı veya LOCAL modda pull yapılamaz');
    }
    
    try {
      const response = await syncApi.pull({
        tenant_id: tenantId,
        device_id: deviceId,
        last_sync_at: lastSyncAt || undefined,
      });
      
      if (response.changes.length === 0) {
        return;
      }
      
      // Değişiklikleri local DB'ye uygula
      await invoke('apply_sync_changes', {
        tenantIdParam: tenantId,
        changes: response.changes,
      });
      
    } catch (error) {
      throw new Error(`Pull hatası: ${error}`);
    }
  }, [isOnline, licenseMode, tenantId, deviceId, lastSyncAt]);
  
  /**
   * Conflict çöz
   */
  const resolveConflict = useCallback(async (
    conflictId: string, 
    resolution: 'keep_local' | 'keep_server'
  ) => {
    try {
      await syncApi.resolveConflicts([{
        conflict_id: conflictId,
        resolution,
      }]);
      
      // Conflict listesinden kaldır
      setConflicts(prev => prev.filter(c => c.record_id !== conflictId));
    } catch (error) {
      throw new Error(`Conflict çözme hatası: ${error}`);
    }
  }, []);
  
  /**
   * Değişiklik kuyruğuna ekle
   */
  const queueChange = useCallback(async (
    change: Omit<SyncChange, 'local_updated_at'>
  ) => {
    try {
      await invoke('queue_sync_change', {
        tenantIdParam: tenantId,
        change: {
          ...change,
          local_updated_at: new Date().toISOString(),
        },
      });
      
      setPendingChanges(pendingChanges + 1);
    } catch (error) {
      console.error('Change kuyruğa eklenemedi:', error);
    }
  }, [tenantId, pendingChanges]);
  
  return {
    // Durum
    isOnline,
    isSyncing,
    lastSyncAt,
    pendingChanges,
    conflicts,
    errors: syncErrors,
    
    // Aksiyonlar
    sync: syncAll,
    pushChanges,
    pullChanges,
    resolveConflict,
    queueChange,
  };
};
