/**
 * Sync Service - Tüm modüller için otomatik senkronizasyon
 * 
 * Bu servis, HYBRID lisans modunda çalışırken tüm CRUD işlemlerini
 * otomatik olarak sunucuya senkronize eder.
 */

import { invoke } from '@tauri-apps/api/core';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://bader.app/api';

export interface SyncableRecord {
    id: string;
    tenant_id: string;
    [key: string]: any;
}

export type SyncAction = 'create' | 'update' | 'delete';
export type SyncTableName = 'uyeler' | 'gelirler' | 'giderler' | 'kasalar' | 'aidatlar' | 'etkinlikler' | 'gelir_turleri' | 'gider_turleri';

/**
 * Sync Service Class
 */
class SyncService {
    private isOnline: boolean = navigator.onLine;
    private syncQueue: Map<string, { table: SyncTableName; action: SyncAction; data: any }> = new Map();
    private isSyncing: boolean = false;
    private token: string | null = null;
    private licenseMode: 'local' | 'hybrid' | 'online' = 'local';

    constructor() {
        // Online/offline listener
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('📶 Online - Senkronizasyon başlıyor...');
            this.processPendingChanges();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 Offline - Değişiklikler kuyruğa alınacak');
        });
    }

    /**
     * Token ve lisans modunu ayarla
     */
    configure(token: string, licenseMode: 'local' | 'hybrid' | 'online') {
        this.token = token;
        this.licenseMode = licenseMode;
        console.log(`🔧 SyncService yapılandırıldı: mode=${licenseMode}`);
    }

    /**
     * LOCAL modda sync yapma
     */
    private shouldSync(): boolean {
        return this.licenseMode !== 'local' && this.isOnline && !!this.token;
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
        // Local DB'ye sync_changes tablosuna kaydet
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

        // Eğer online ve sync modundaysak hemen gönder
        if (this.shouldSync()) {
            await this.syncSingleRecord(tenantId, tableName, action, data);
        }
    }

    /**
     * Tek bir kaydı sunucuya senkronize et
     */
    private async syncSingleRecord(
        tenantId: string,
        tableName: SyncTableName,
        action: SyncAction,
        data: SyncableRecord
    ): Promise<boolean> {
        try {
            const endpoint = this.getEndpoint(tableName, action, data.id);
            const method = this.getMethod(action);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: action !== 'delete' ? JSON.stringify(this.transformData(tableName, data)) : undefined
            });

            if (response.ok) {
                // Sync başarılı, işaretle
                await invoke('mark_changes_synced', {
                    tenantIdParam: tenantId,
                    changeIds: [data.id]
                });
                console.log(`✅ Sync başarılı: ${tableName}/${action}/${data.id}`);
                return true;
            } else {
                console.error(`❌ Sync hatası: ${response.status} ${response.statusText}`);
                return false;
            }
        } catch (error) {
            console.error('Sync hatası:', error);
            return false;
        }
    }

    /**
     * Backend endpoint'ini belirle
     */
    private getEndpoint(table: SyncTableName, action: SyncAction, id: string): string {
        const endpoints: Record<SyncTableName, string> = {
            'uyeler': '/v1/members',
            'gelirler': '/v1/gelirler',
            'giderler': '/v1/giderler',
            'kasalar': '/v1/kasalar',
            'aidatlar': '/v1/aidatlar',
            'etkinlikler': '/v1/etkinlikler',
            'gelir_turleri': '/v1/gelir-turleri',
            'gider_turleri': '/v1/gider-turleri'
        };

        const base = endpoints[table];
        if (action === 'create') return base;
        return `${base}/${id}`;
    }

    /**
     * HTTP metodunu belirle
     */
    private getMethod(action: SyncAction): string {
        switch (action) {
            case 'create': return 'POST';
            case 'update': return 'PUT';
            case 'delete': return 'DELETE';
        }
    }

    /**
     * Veriyi backend formatına dönüştür
     */
    private transformData(table: SyncTableName, data: SyncableRecord): any {
        // Tablo bazında dönüşüm gerekirse burada yap
        // Şimdilik direkt gönder
        const { id, tenant_id, ...rest } = data;
        return rest;
    }

    /**
     * Bekleyen tüm değişiklikleri işle
     */
    async processPendingChanges(): Promise<{ success: number; failed: number }> {
        if (!this.shouldSync() || this.isSyncing) {
            return { success: 0, failed: 0 };
        }

        this.isSyncing = true;
        let success = 0;
        let failed = 0;

        try {
            // Tenant ID'yi localStorage'dan al
            const authData = localStorage.getItem('auth-storage');
            if (!authData) {
                console.log('Auth data bulunamadı');
                return { success: 0, failed: 0 };
            }

            const parsed = JSON.parse(authData);
            const tenantId = parsed?.state?.tenant?.id;
            if (!tenantId) {
                console.log('Tenant ID bulunamadı');
                return { success: 0, failed: 0 };
            }

            // Bekleyen değişiklikleri al
            const changes = await invoke<any[]>('get_pending_sync_changes', { tenantIdParam: tenantId });

            if (changes.length === 0) {
                console.log('📭 Bekleyen değişiklik yok');
                return { success: 0, failed: 0 };
            }

            console.log(`🔄 ${changes.length} değişiklik senkronize ediliyor...`);

            for (const change of changes) {
                const synced = await this.syncSingleRecord(
                    tenantId,
                    change.table_name as SyncTableName,
                    change.action as SyncAction,
                    { id: change.record_id, tenant_id: tenantId, ...change.data }
                );

                if (synced) {
                    success++;
                } else {
                    failed++;
                }
            }

            console.log(`✅ Sync tamamlandı: ${success} başarılı, ${failed} başarısız`);
        } catch (error) {
            console.error('ProcessPendingChanges hatası:', error);
        } finally {
            this.isSyncing = false;
        }

        return { success, failed };
    }

    /**
     * Manuel senkronizasyon tetikle
     */
    async manualSync(): Promise<{ success: number; failed: number }> {
        if (!this.isOnline) {
            throw new Error('Çevrimdışısınız, senkronizasyon yapılamaz');
        }
        return this.processPendingChanges();
    }

    /**
     * Senkronizasyon durumu
     */
    getStatus(): { isOnline: boolean; isSyncing: boolean; mode: string } {
        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            mode: this.licenseMode
        };
    }
}

// Singleton instance
export const syncService = new SyncService();

// ============================================================================
// HELPER HOOKS VE FONKSİYONLAR
// ============================================================================

/**
 * Gelir oluşturma + sync
 */
export async function createGelirWithSync(tenantId: string, data: any): Promise<any> {
    // 1. Local DB'ye kaydet
    const result = await invoke<any>('create_gelir', {
        tenantIdParam: tenantId,
        ...data
    });

    // 2. Sync kuyruğuna ekle
    await syncService.queueChange(tenantId, 'gelirler', 'create', {
        id: result.id || data.id,
        tenant_id: tenantId,
        ...data
    });

    return result;
}

/**
 * Gelir güncelleme + sync
 */
export async function updateGelirWithSync(tenantId: string, id: string, data: any): Promise<any> {
    const result = await invoke<any>('update_gelir', {
        tenantIdParam: tenantId,
        gelirId: id,
        ...data
    });

    await syncService.queueChange(tenantId, 'gelirler', 'update', {
        id,
        tenant_id: tenantId,
        ...data
    });

    return result;
}

/**
 * Gelir silme + sync
 */
export async function deleteGelirWithSync(tenantId: string, id: string): Promise<void> {
    await invoke('delete_gelir', { tenantIdParam: tenantId, gelirId: id });

    await syncService.queueChange(tenantId, 'gelirler', 'delete', {
        id,
        tenant_id: tenantId
    });
}

/**
 * Gider oluşturma + sync
 */
export async function createGiderWithSync(tenantId: string, data: any): Promise<any> {
    const result = await invoke<any>('create_gider', {
        tenantIdParam: tenantId,
        ...data
    });

    await syncService.queueChange(tenantId, 'giderler', 'create', {
        id: result.id || data.id,
        tenant_id: tenantId,
        ...data
    });

    return result;
}

/**
 * Gider güncelleme + sync
 */
export async function updateGiderWithSync(tenantId: string, id: string, data: any): Promise<any> {
    const result = await invoke<any>('update_gider', {
        tenantIdParam: tenantId,
        giderId: id,
        ...data
    });

    await syncService.queueChange(tenantId, 'giderler', 'update', {
        id,
        tenant_id: tenantId,
        ...data
    });

    return result;
}

/**
 * Gider silme + sync
 */
export async function deleteGiderWithSync(tenantId: string, id: string): Promise<void> {
    await invoke('delete_gider', { tenantIdParam: tenantId, giderId: id });

    await syncService.queueChange(tenantId, 'giderler', 'delete', {
        id,
        tenant_id: tenantId
    });
}

/**
 * Üye oluşturma + sync
 */
export async function createUyeWithSync(tenantId: string, data: any): Promise<any> {
    const result = await invoke<any>('create_uye', {
        tenantIdParam: tenantId,
        ...data
    });

    await syncService.queueChange(tenantId, 'uyeler', 'create', {
        id: result.id || data.id,
        tenant_id: tenantId,
        ...data
    });

    return result;
}

/**
 * Üye güncelleme + sync
 */
export async function updateUyeWithSync(tenantId: string, id: string, data: any): Promise<any> {
    const result = await invoke<any>('update_uye', {
        tenantIdParam: tenantId,
        uyeId: id,
        ...data
    });

    await syncService.queueChange(tenantId, 'uyeler', 'update', {
        id,
        tenant_id: tenantId,
        ...data
    });

    return result;
}

/**
 * Üye silme + sync
 */
export async function deleteUyeWithSync(tenantId: string, id: string): Promise<void> {
    await invoke('delete_uye', { tenantIdParam: tenantId, uyeId: id });

    await syncService.queueChange(tenantId, 'uyeler', 'delete', {
        id,
        tenant_id: tenantId
    });
}

/**
 * Kasa oluşturma + sync
 */
export async function createKasaWithSync(tenantId: string, data: any): Promise<any> {
    const result = await invoke<any>('create_kasa', {
        tenantIdParam: tenantId,
        ...data
    });

    await syncService.queueChange(tenantId, 'kasalar', 'create', {
        id: result.id || data.id,
        tenant_id: tenantId,
        ...data
    });

    return result;
}

/**
 * Aidat oluşturma + sync
 */
export async function createAidatWithSync(tenantId: string, data: any): Promise<any> {
    const result = await invoke<any>('create_aidat', {
        tenantIdParam: tenantId,
        ...data
    });

    await syncService.queueChange(tenantId, 'aidatlar', 'create', {
        id: result.id || data.id,
        tenant_id: tenantId,
        ...data
    });

    return result;
}

/**
 * Aidat ödeme + sync
 */
export async function payAidatWithSync(tenantId: string, aidatId: string, data: any): Promise<any> {
    const result = await invoke<any>('pay_aidat', {
        tenantIdParam: tenantId,
        aidatId,
        ...data
    });

    await syncService.queueChange(tenantId, 'aidatlar', 'update', {
        id: aidatId,
        tenant_id: tenantId,
        odendi: true,
        ...data
    });

    return result;
}

export default syncService;
