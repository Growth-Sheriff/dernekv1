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
export type SyncTableName = 'uyeler' | 'gelirler' | 'giderler' | 'kasalar' | 'aidat_takip' | 'virmanlar' | 'gelir_turleri' | 'gider_turleri' | 'etkinlikler';

/** Sunucu SyncChangeItem formatı */
interface ServerSyncChange {
    table: string;
    id: string;
    operation: string; // insert | update | delete
    data: Record<string, any>;
    version: number;
    changed_at: string;
    change_id?: string; // yerel sync_changes.id — ack eşlemesi için
}

/** Sunucu push sonucu tek kalem */
interface ServerSyncItemResult {
    table: string;
    id: string;
    status: string;
    reason?: string;
    version?: number;
    change_id?: string;
    server_version?: number;
    server_data?: Record<string, any>;
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
    applied: ServerSyncItemResult[];
    rejected: ServerSyncItemResult[];
    conflicts: ServerSyncItemResult[];
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
    private failureCount: number = 0;
    private nextRetryAt: number = 0;

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
            return false;
        }
        if (Date.now() < this.nextRetryAt) {
            console.log(`⏳ Sync backoff: ${Math.ceil((this.nextRetryAt - Date.now()) / 1000)}s sonra tekrar denenecek`);
            return false;
        }
        return true;
    }

    /** Başarısız istek sonrası üstel geri çekilme (30s → 15dk arası) */
    private registerFailure() {
        this.failureCount += 1;
        const delayMs = Math.min(30_000 * 2 ** (this.failureCount - 1), 15 * 60_000);
        this.nextRetryAt = Date.now() + delayMs;
    }

    private registerSuccess() {
        this.failureCount = 0;
        this.nextRetryAt = 0;
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
                this.registerFailure();
                return null;
            }

            this.registerSuccess();
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
            this.registerFailure();
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

            // 3. Başarılı push'ları işaretle + satır versiyonlarını sunucu değerine çek
            if (result.applied.length > 0) {
                try {
                    await invoke('mark_changes_synced', {
                        tenantIdParam: tenantId,
                        entries: result.applied.map(a => ({
                            change_id: a.change_id,
                            table: a.table,
                            id: a.id,
                            version: a.version
                        }))
                    });
                } catch (e) {
                    console.warn('mark_changes_synced hatası:', e);
                }
            }

            // 3b. Çatışmalar: sunucu-kazanır — bekleyen yerel değişiklik düşürülür,
            // sunucu kopyası yerel DB'ye uygulanır.
            if (result.conflicts && result.conflicts.length > 0) {
                await this.resolveConflicts(tenantId, result.conflicts);
            }

            // 4. Server'dan gelen değişiklikleri local DB'ye uygula
            const pulled = await this.applyServerChanges(tenantId, result.changes);

            this.stats = {
                pushed: result.applied.length,
                pulled,
                failed: result.rejected.length + (result.conflicts?.length || 0),
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

            // Rust get_pending_sync_changes zaten ServerSyncChange formatında döner
            // (change_id, table, id, operation, data, version, changed_at)
            return changes.map(change => ({
                change_id: change.change_id,
                table: change.table,
                id: change.id,
                operation: change.operation,
                data: { ...(change.data || {}), tenant_id: tenantId },
                version: change.version || 1,
                changed_at: change.changed_at || new Date().toISOString()
            }));
        } catch (error) {
            console.error('Pending changes alınamadı:', error);
            return [];
        }
    }

    /**
     * Çatışma çözümü: sunucu-kazanır.
     * 1) Bekleyen yerel değişiklik kuyruktan düşürülür (tekrar push edilmesin),
     * 2) Sunucunun kopyası yerel DB'ye uygulanır (versiyon dahil).
     */
    private async resolveConflicts(tenantId: string, conflicts: ServerSyncItemResult[]): Promise<void> {
        try {
            await invoke('mark_changes_synced', {
                tenantIdParam: tenantId,
                entries: conflicts.map(c => ({
                    change_id: c.change_id,
                    table: c.table,
                    id: c.id
                }))
            });

            const serverCopies = conflicts
                .filter(c => c.server_data)
                .map(c => ({
                    table: c.table,
                    id: c.id,
                    operation: c.server_data!.is_deleted ? 'delete' : 'update',
                    data: c.server_data!,
                    version: c.server_version || 1,
                    changed_at: (c.server_data!.updated_at as string) || new Date().toISOString()
                }));

            if (serverCopies.length > 0) {
                await this.applyServerChanges(tenantId, serverCopies as ServerSyncChange[]);
            }

            console.warn(`⚠️ ${conflicts.length} çatışma sunucu-kazanır stratejisiyle çözüldü:`,
                conflicts.map(c => `${c.table}/${c.id} (${c.reason})`).join(', '));
        } catch (e) {
            console.error('Çatışma çözümü hatası:', e);
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

    private notifyTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * Yerel bir yazım gerçekleşti — kuyruk kaydı Rust komutunun transaction'ında
     * zaten atıldı; burada yalnızca debounce'lu bir sync tetiklenir.
     */
    notifyLocalChange(): void {
        if (!this.shouldSync()) return;
        if (this.notifyTimer) clearTimeout(this.notifyTimer);
        this.notifyTimer = setTimeout(() => {
            this.notifyTimer = null;
            this.fullSync();
        }, 3000);
    }

    /**
     * @deprecated Kuyruk kaydı artık Rust CRUD komutlarının transaction'ında
     * otomatik atılıyor (db::outbox). Bu metot yalnızca geriye uyumluluk için
     * duruyor: payload yok sayılır, kayıt DB'deki güncel haliyle kuyruklanır
     * (tekilleştirme çift kaydı önler) ve debounce'lu sync tetiklenir.
     */
    async queueChange(
        tenantId: string,
        tableName: SyncTableName,
        _action: SyncAction,
        _data: SyncableRecord
    ): Promise<void> {
        void tenantId;
        void tableName;
        this.notifyLocalChange();
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
            // Tüm tabloları paralel çek
            const [uyeler, gelirler, giderler, kasalar, aidatTakip, virmanlar, gelirTurleri, giderTurleri, etkinlikler] = await Promise.all([
                invoke<any[]>('get_uyeler', { tenantIdParam: tenantId }).catch(() => []),
                invoke<any[]>('get_gelirler', { tenantIdParam: tenantId, yil: 0 }).catch(() => []),
                invoke<any[]>('get_giderler', { tenantIdParam: tenantId, yil: 0 }).catch(() => []),
                invoke<any[]>('get_kasalar', { tenantIdParam: tenantId }).catch(() => []),
                invoke<any[]>('get_aidat_takip', { tenantIdParam: tenantId, yil: 0 }).catch(() => []),
                invoke<any[]>('get_virmanlar', { tenantIdParam: tenantId }).catch(() => []),
                invoke<any[]>('get_gelir_turleri', { tenantIdParam: tenantId }).catch(() => []),
                invoke<any[]>('get_gider_turleri', { tenantIdParam: tenantId }).catch(() => []),
                invoke<any[]>('get_etkinlikler', { tenantIdParam: tenantId }).catch(() => []),
            ]);

            console.log(`📊 Bulundu: ${uyeler?.length || 0} üye, ${gelirler?.length || 0} gelir, ${giderler?.length || 0} gider, ${kasalar?.length || 0} kasa, ${aidatTakip?.length || 0} aidat, ${virmanlar?.length || 0} virman, ${etkinlikler?.length || 0} etkinlik`);

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
                        version: rec.version || 1,
                        changed_at: rec.updated_at || now
                    });
                }
            };

            addRecords(uyeler, 'uyeler');
            addRecords(gelirler, 'gelirler');
            addRecords(giderler, 'giderler');
            addRecords(kasalar, 'kasalar');
            addRecords(aidatTakip, 'aidat_takip');
            addRecords(virmanlar, 'virmanlar');
            addRecords(gelirTurleri, 'gelir_turleri');
            addRecords(giderTurleri, 'gider_turleri');
            addRecords(etkinlikler, 'etkinlikler');

            // Tek sync çağrısı
            const result = await this.executeSyncRequest(tenantId, changes);

            if (result && result.status !== 'error') {
                counts.uyeler = uyeler?.length || 0;
                counts.gelirler = gelirler?.length || 0;
                counts.giderler = giderler?.length || 0;
                counts.kasalar = kasalar?.length || 0;
                counts.aidat_takip = aidatTakip?.length || 0;
                counts.virmanlar = virmanlar?.length || 0;
                counts.gelir_turleri = gelirTurleri?.length || 0;
                counts.gider_turleri = giderTurleri?.length || 0;
                counts.etkinlikler = etkinlikler?.length || 0;

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
