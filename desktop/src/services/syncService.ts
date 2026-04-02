/**
 * Sync Service v3 - Sunucu Uyumlu Tek Endpoint Senkronizasyon
 * 
 * Desktop ↔ Backend arasında çift yönlü veri senkronizasyonu.
 * Sunucunun tek POST /sync/sync endpoint'ini kullanır.
 * HYBRID lisans modunda çalışır.
 */

import { invoke } from '@tauri-apps/api/core';
import { API_BASE_URL } from '../config';

export interface SyncableRecord {
    id: string;
    tenant_id: string;
    [key: string]: any;
}

export type SyncAction = 'create' | 'update' | 'delete';
export type SyncTableName = 'uyeler' | 'gelirler' | 'giderler' | 'kasalar' | 'aidatlar' | 'aidat_takip';

/** Sunucu SyncChangeItem formatı */
interface ServerSyncChange {
    table: string;
    id: string;
    operation: string; // insert | update | delete
    data: Record<string, any>;
    version: number;
    changed_at: string;
}

/** Sunucu SyncRequest formatı */
interface ServerSyncRequest {
    tenant_id: string;
    device_id?: string;
    client_version?: string;
    last_sync_at?: string;
    changes: ServerSyncChange[];
}

/** Sunucu SyncResponse formatı */
interface ServerSyncResponse {
    status: string; // ok | partial | error
    server_time: string;
    applied: Array<{ table: string; id: string; status: string; reason?: string }>;
    rejected: Array<{ table: string; id: string; status: string; reason?: string }>;
    conflicts: Array<{ table: string; id: string; status: string; reason?: string }>;
    changes: ServerSyncChange[]; // Server → Client delta
}

interface SyncStats {
    pushed: number;
    pulled: number;
    failed: number;
    lastSync: string | null;
}

/**
 * Sync Service Class - Sunucunun tek POST /sync/sync endpoint'ini kullanır
 */
class SyncService {
    private isOnline: boolean = navigator.onLine;
    private isSyncing: boolean = false;
    private token: string | null = null;
    private licenseMode: 'local' | 'hybrid' | 'online' = 'local';
    private syncInterval: NodeJS.Timeout | null = null;
    private stats: SyncStats = { pushed: 0, pulled: 0, failed: 0, lastSync: null };
    private lastSyncAt: string | null = null;
    private deviceId: string | null = null;

    constructor() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('📶 Online - Senkronizasyon başlıyor...');
            this.fullSync();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 Offline - Değişiklikler kuyruğa alınacak');
        });

        // Önceki sync zamanını localStorage'dan al
        this.lastSyncAt = localStorage.getItem('bader_last_sync_at');

        // Device ID al
        this.initDeviceId();
    }

    private async initDeviceId() {
        try {
            this.deviceId = await invoke<string>('get_device_id');
        } catch {
            this.deviceId = 'desktop-unknown';
        }
    }

    /**
     * Token ve lisans modunu ayarla + otomatik sync başlat
     */
    configure(token: string, licenseMode: 'local' | 'hybrid' | 'online') {
        this.token = token;
        this.licenseMode = licenseMode;
        console.log(`🔧 SyncService: mode=${licenseMode}, token=${token ? 'set' : 'missing'}`);

        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        if (licenseMode === 'hybrid' && token) {
            setTimeout(() => this.fullSync(), 2000);

            this.syncInterval = setInterval(() => {
                this.fullSync();
            }, 2 * 60 * 1000);

            console.log('🔄 Otomatik sync başlatıldı (2 dakika interval)');
        }
    }

    /**
     * Sync'i durdur
     */
    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.token = null;
        console.log('🔄 Sync durduruldu');
    }

    /**
     * LOCAL modda sync yapma
     */
    private shouldSync(): boolean {
        const canSync = this.licenseMode === 'hybrid' && this.isOnline && !!this.token;
        if (!canSync) {
            console.log(`⚠️ Sync atlandı: mode=${this.licenseMode}, online=${this.isOnline}, token=${!!this.token}`);
        }
        return canSync;
    }

    /**
     * SyncAction → sunucu operation formatına dönüştür
     */
    private actionToOperation(action: SyncAction): string {
        switch (action) {
            case 'create': return 'insert';
            case 'update': return 'update';
            case 'delete': return 'delete';
            default: return 'update';
        }
    }

    /**
     * Tek sync çağrısı — sunucunun POST /sync/sync endpoint'ini kullanır
     * Hem push (client→server) hem pull (server→client) tek seferde yapılır.
     */
    private async executeSyncRequest(
        tenantId: string,
        changes: ServerSyncChange[]
    ): Promise<ServerSyncResponse | null> {
        const syncRequest: ServerSyncRequest = {
            tenant_id: tenantId,
            device_id: this.deviceId || 'desktop-unknown',
            client_version: '3.0.0',
            last_sync_at: this.lastSyncAt || undefined,
            changes
        };

        try {
            console.log(`📡 Sync isteği: ${changes.length} değişiklik gönderiliyor...`);

            const response = await fetch(`${API_BASE_URL}/sync/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(syncRequest)
            });

            if (!response.ok) {
                const text = await response.text();
                console.error(`❌ Sync API hatası: ${response.status} - ${text}`);
                return null;
            }

            const result: ServerSyncResponse = await response.json();
            console.log(`📡 Sync yanıtı: status=${result.status}, applied=${result.applied.length}, rejected=${result.rejected.length}, server_changes=${result.changes.length}`);

            // Başarılı sync zamanını kaydet
            if (result.server_time) {
                this.lastSyncAt = result.server_time;
                localStorage.setItem('bader_last_sync_at', result.server_time);
            }

            return result;
        } catch (error) {
            console.error('❌ Sync isteği başarısız:', error);
            return null;
        }
    }

    /**
     * Sunucudan gelen değişiklikleri local DB'ye uygula
     */
    private async applyServerChanges(tenantId: string, serverChanges: ServerSyncChange[]): Promise<number> {
        if (!serverChanges || serverChanges.length === 0) return 0;

        const localChanges = serverChanges.map(sc => ({
            table_name: sc.table,
            record_id: sc.id,
            action: sc.operation === 'insert' ? 'create' : sc.operation === 'delete' ? 'delete' : 'update',
            data: { ...sc.data, id: sc.id, tenant_id: tenantId }
        }));

        try {
            const applied = await invoke<number>('apply_sync_changes', {
                tenantIdParam: tenantId,
                changes: localChanges
            });
            console.log(`📥 ${applied} kayıt local DB'ye uygulandı`);
            return applied;
        } catch (e) {
            console.error('apply_sync_changes hatası:', e);
            return 0;
        }
    }

    /**
     * Tam senkronizasyon (push + pull tek endpoint)
     */
    async fullSync(): Promise<{ pushed: number; pulled: number; failed: number }> {
        if (!this.shouldSync() || this.isSyncing) {
            return { pushed: 0, pulled: 0, failed: 0 };
        }

        this.isSyncing = true;
        console.log('🔄 Tam senkronizasyon başlıyor...');

        try {
            const tenantId = this.getTenantId();
            if (!tenantId) {
                console.error('❌ Tenant ID bulunamadı');
                return { pushed: 0, pulled: 0, failed: 0 };
            }

            // 1. Bekleyen local değişiklikleri topla
            const localChanges = await this.collectPendingChanges(tenantId);

            // 2. Tek sync çağrısı yap (push + pull birlikte)
            const result = await this.executeSyncRequest(tenantId, localChanges);

            if (!result) {
                return { pushed: 0, pulled: 0, failed: localChanges.length };
            }

            // 3. Başarılı push'ları işaretle
            const appliedIds = result.applied.map(a => a.id);
            if (appliedIds.length > 0) {
                try {
                    await invoke('mark_changes_synced', {
                        tenantIdParam: tenantId,
                        changeIds: appliedIds
                    });
                } catch (e) {
                    console.warn('mark_changes_synced hatası:', e);
                }
            }

            // 4. Server'dan gelen değişiklikleri local DB'ye uygula
            const pulled = await this.applyServerChanges(tenantId, result.changes);

            this.stats = {
                pushed: result.applied.length,
                pulled,
                failed: result.rejected.length,
                lastSync: new Date().toISOString()
            };

            console.log(`✅ Sync tamamlandı: ${this.stats.pushed} pushed, ${this.stats.pulled} pulled, ${this.stats.failed} rejected`);
            return this.stats;
        } catch (error) {
            console.error('❌ Sync hatası:', error);
            return { pushed: 0, pulled: 0, failed: 0 };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Bekleyen local değişiklikleri ServerSyncChange formatına dönüştür
     */
    private async collectPendingChanges(tenantId: string): Promise<ServerSyncChange[]> {
        try {
            const changes = await invoke<any[]>('get_pending_sync_changes', { tenantIdParam: tenantId });

            if (!changes || changes.length === 0) {
                console.log('📭 Bekleyen değişiklik yok');
                return [];
            }

            console.log(`📤 ${changes.length} bekleyen değişiklik bulundu`);

            return changes.map(change => {
                const data = typeof change.data === 'string' ? JSON.parse(change.data) : (change.data || {});
                return {
                    table: change.table_name,
                    id: change.record_id,
                    operation: this.actionToOperation(change.action as SyncAction),
                    data: { ...data, tenant_id: tenantId },
                    version: data.version || 0,
                    changed_at: change.local_updated_at || new Date().toISOString()
                };
            });
        } catch (error) {
            console.error('Pending changes alınamadı:', error);
            return [];
        }
    }

    /**
     * Tenant ID'yi localStorage'dan al
     */
    private getTenantId(): string | null {
        try {
            const authData = localStorage.getItem('auth-storage');
            if (!authData) return null;
            const parsed = JSON.parse(authData);
            return parsed?.state?.tenant?.id || null;
        } catch {
            return null;
        }
    }

    /**
     * Değişikliği kuyruğa ekle ve varsa hemen senkronize et
     */
    async queueChange(
        tenantId: string,
        tableName: SyncTableName,
        action: SyncAction,
        data: SyncableRecord
    ): Promise<void> {
        try {
            await invoke('queue_sync_change', {
                tenantIdParam: tenantId,
                change: {
                    table_name: tableName,
                    record_id: data.id,
                    action: action,
                    data: data,
                    local_updated_at: new Date().toISOString()
                }
            });
            console.log(`📝 Sync kuyruğuna eklendi: ${tableName}/${action}/${data.id}`);
        } catch (error) {
            console.error('Sync kuyruğuna ekleme hatası:', error);
        }

        // Online ve hybrid moddaysak hemen sync yap
        if (this.shouldSync()) {
            await this.fullSync();
        }
    }

    /**
     * İlk kurulum - Tüm local veriyi sunucuya gönder
     */
    async initialSync(tenantId: string): Promise<{ success: boolean; counts: Record<string, number> }> {
        if (!this.token) {
            console.error('❌ Token yok, sync yapılamaz');
            return { success: false, counts: {} };
        }

        console.log('🚀 İlk senkronizasyon başlıyor - Tüm veri sunucuya gönderiliyor...');

        const counts: Record<string, number> = {};

        try {
            const uyeler = await invoke<any[]>('get_uyeler', { tenantIdParam: tenantId });
            const gelirler = await invoke<any[]>('get_gelirler', { tenantIdParam: tenantId, yil: new Date().getFullYear() });
            const giderler = await invoke<any[]>('get_giderler', { tenantIdParam: tenantId, yil: new Date().getFullYear() });
            const kasalar = await invoke<any[]>('get_kasalar', { tenantIdParam: tenantId });

            console.log(`📊 Bulundu: ${uyeler?.length || 0} üye, ${gelirler?.length || 0} gelir, ${giderler?.length || 0} gider, ${kasalar?.length || 0} kasa`);

            // Tüm verileri ServerSyncChange formatına dönüştür
            const changes: ServerSyncChange[] = [];
            const now = new Date().toISOString();

            const addRecords = (records: any[] | null, table: string) => {
                if (!records) return;
                for (const rec of records) {
                    changes.push({
                        table,
                        id: rec.id,
                        operation: 'insert',
                        data: { ...rec, tenant_id: tenantId },
                        version: rec.version || 0,
                        changed_at: rec.updated_at || now
                    });
                }
            };

            addRecords(uyeler, 'uyeler');
            addRecords(gelirler, 'gelirler');
            addRecords(giderler, 'giderler');
            addRecords(kasalar, 'kasalar');

            // Tek sync çağrısı
            const result = await this.executeSyncRequest(tenantId, changes);

            if (result && result.status !== 'error') {
                counts.uyeler = uyeler?.length || 0;
                counts.gelirler = gelirler?.length || 0;
                counts.giderler = giderler?.length || 0;
                counts.kasalar = kasalar?.length || 0;

                // Server'dan gelen değişiklikleri de uygula
                if (result.changes.length > 0) {
                    await this.applyServerChanges(tenantId, result.changes);
                }

                console.log('✅ İlk senkronizasyon tamamlandı:', counts);
                return { success: true, counts };
            } else {
                console.error('❌ İlk sync hatası');
                return { success: false, counts: {} };
            }
        } catch (error) {
            console.error('❌ İlk sync hatası:', error);
            return { success: false, counts: {} };
        }
    }

    /**
     * Manuel senkronizasyon
     */
    async manualSync(): Promise<{ pushed: number; pulled: number; failed: number }> {
        if (!this.isOnline) {
            throw new Error('Çevrimdışısınız, senkronizasyon yapılamaz');
        }
        return this.fullSync();
    }

    /**
     * Sync durumu
     */
    getStatus(): { isOnline: boolean; isSyncing: boolean; mode: string; stats: SyncStats } {
        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            mode: this.licenseMode,
            stats: this.stats
        };
    }
}

// Singleton instance
export const syncService = new SyncService();
export default syncService;
