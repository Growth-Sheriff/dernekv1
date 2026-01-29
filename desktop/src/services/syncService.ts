/**
 * Sync Service - Tüm modüller için otomatik senkronizasyon
 * 
 * Bu servis, HYBRID lisans modunda çalışırken tüm CRUD işlemlerini
 * otomatik olarak sunucuya senkronize eder.
 */

import { invoke } from '@tauri-apps/api/core';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://157.90.154.48:8000/api/v1';

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
        // Sunucu sync endpoint'leri - hepsi POST ile çalışır
        const endpoints: Record<SyncTableName, string> = {
            'uyeler': '/v1/sync/uye',
            'gelirler': '/v1/sync/gelir',
            'giderler': '/v1/sync/gider',
            'kasalar': '/v1/sync/kasa',
            'aidatlar': '/v1/sync/aidat',
            'etkinlikler': '/v1/sync/etkinlik',
            'gelir_turleri': '/v1/sync/gelir-turu',
            'gider_turleri': '/v1/sync/gider-turu'
        };

        // Sync endpoint'ler hep aynı, action body içinde gönderiliyor
        return endpoints[table];
    }

    /**
     * HTTP metodunu belirle - sync endpoint'ler hep POST kullanır
     */
    private getMethod(action: SyncAction): string {
        // Sync API hep POST kullanır, action body içinde
        return 'POST';
    }

    /**
     * Veriyi backend formatına dönüştür
     */
    private transformData(table: SyncTableName, data: SyncableRecord): any {
        // Backend sync API tam veri bekliyor (id ve tenant_id dahil)
        const now = new Date().toISOString();

        // Temel alanları ekle (any olarak cast et)
        const baseData: any = {
            ...data,
            created_at: data.created_at || now,
            updated_at: now
        };

        // Tablo bazında dönüşüm
        switch (table) {
            case 'uyeler':
                return {
                    ...baseData,
                    ad_soyad: baseData.ad_soyad || `${baseData.ad || ''} ${baseData.soyad || ''}`.trim(),
                    uye_no: baseData.uye_no || '0',
                    tc_no: baseData.tc_no || '',
                    giris_tarihi: baseData.giris_tarihi || now.split('T')[0]
                };
            case 'gelirler':
                return {
                    ...baseData,
                    kasa_id: baseData.kasa_id || '',
                    tarih: baseData.tarih || now.split('T')[0],
                    tutar: baseData.tutar || 0
                };
            case 'giderler':
                return {
                    ...baseData,
                    kasa_id: baseData.kasa_id || '',
                    tarih: baseData.tarih || now.split('T')[0],
                    tutar: baseData.tutar || 0
                };
            default:
                return baseData;
        }
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

    /**
     * Sunucudan veri çek ve local DB'ye kaydet
     */
    async pullFromServer(tenantId: string): Promise<{ success: boolean; counts: Record<string, number> }> {
        if (!this.shouldSync()) {
            return { success: false, counts: {} };
        }

        try {
            console.log('📥 Sunucudan veri çekiliyor...');

            const response = await fetch(`${API_BASE_URL}/sync/pull/${tenantId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('❌ Pull hatası:', response.status, response.statusText);
                return { success: false, counts: {} };
            }

            const data = await response.json();
            const counts: Record<string, number> = {};

            // Üyeleri local DB'ye kaydet
            if (data.uyeler && Array.isArray(data.uyeler)) {
                counts.uyeler = data.uyeler.length;
                for (const uye of data.uyeler) {
                    try {
                        await invoke('upsert_uye_from_sync', {
                            tenantIdParam: tenantId,
                            uye: uye
                        });
                    } catch (e) {
                        console.warn('Üye upsert hatası:', e);
                    }
                }
            }

            // Gelirleri local DB'ye kaydet
            if (data.gelirler && Array.isArray(data.gelirler)) {
                counts.gelirler = data.gelirler.length;
                for (const gelir of data.gelirler) {
                    try {
                        await invoke('upsert_gelir_from_sync', {
                            tenantIdParam: tenantId,
                            gelir: gelir
                        });
                    } catch (e) {
                        console.warn('Gelir upsert hatası:', e);
                    }
                }
            }

            // Giderleri local DB'ye kaydet
            if (data.giderler && Array.isArray(data.giderler)) {
                counts.giderler = data.giderler.length;
                for (const gider of data.giderler) {
                    try {
                        await invoke('upsert_gider_from_sync', {
                            tenantIdParam: tenantId,
                            gider: gider
                        });
                    } catch (e) {
                        console.warn('Gider upsert hatası:', e);
                    }
                }
            }

            // Kasaları local DB'ye kaydet
            if (data.kasalar && Array.isArray(data.kasalar)) {
                counts.kasalar = data.kasalar.length;
                for (const kasa of data.kasalar) {
                    try {
                        await invoke('upsert_kasa_from_sync', {
                            tenantIdParam: tenantId,
                            kasa: kasa
                        });
                    } catch (e) {
                        console.warn('Kasa upsert hatası:', e);
                    }
                }
            }

            // Aidatları local DB'ye kaydet
            if (data.aidatlar && Array.isArray(data.aidatlar)) {
                counts.aidatlar = data.aidatlar.length;
                for (const aidat of data.aidatlar) {
                    try {
                        await invoke('upsert_aidat_from_sync', {
                            tenantIdParam: tenantId,
                            aidat: aidat
                        });
                    } catch (e) {
                        console.warn('Aidat upsert hatası:', e);
                    }
                }
            }

            console.log('✅ Pull tamamlandı:', counts);
            return { success: true, counts };
        } catch (error) {
            console.error('❌ Pull hatası:', error);
            return { success: false, counts: {} };
        }
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
