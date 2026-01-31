/**
 * Sync Service v2 - Tam Senkronizasyon Sistemi
 * 
 * Desktop ↔ Backend arasında çift yönlü veri senkronizasyonu.
 * HYBRID lisans modunda çalışır.
 */

import { invoke } from '@tauri-apps/api/core';

const API_BASE_URL = 'http://157.90.154.48:8000/api/v1';

export interface SyncableRecord {
    id: string;
    tenant_id: string;
    [key: string]: any;
}

export type SyncAction = 'create' | 'update' | 'delete';
export type SyncTableName = 'uyeler' | 'gelirler' | 'giderler' | 'kasalar' | 'aidatlar' | 'aidat_takip';

interface SyncStats {
    pushed: number;
    pulled: number;
    failed: number;
    lastSync: string | null;
}

/**
 * Sync Service Class
 */
class SyncService {
    private isOnline: boolean = navigator.onLine;
    private isSyncing: boolean = false;
    private token: string | null = null;
    private licenseMode: 'local' | 'hybrid' | 'online' = 'local';
    private syncInterval: NodeJS.Timeout | null = null;
    private stats: SyncStats = { pushed: 0, pulled: 0, failed: 0, lastSync: null };

    constructor() {
        // Online/offline listener
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('📶 Online - Senkronizasyon başlıyor...');
            this.fullSync();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 Offline - Değişiklikler kuyruğa alınacak');
        });
    }

    /**
     * Token ve lisans modunu ayarla + otomatik sync başlat
     */
    configure(token: string, licenseMode: 'local' | 'hybrid' | 'online') {
        this.token = token;
        this.licenseMode = licenseMode;
        console.log(`🔧 SyncService: mode=${licenseMode}, token=${token ? 'set' : 'missing'}`);

        // Önceki interval'ı temizle
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        // HYBRID modda otomatik sync başlat
        if (licenseMode === 'hybrid' && token) {
            // İlk sync hemen yap
            setTimeout(() => this.fullSync(), 2000);

            // Her 2 dakikada sync tekrarla
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
     * Tam senkronizasyon (push + pull)
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

            // 1. Önce pending changes'ları push et
            const pushResult = await this.pushPendingChanges(tenantId);

            // 2. Sonra sunucudan pull et
            const pullResult = await this.pullFromServer(tenantId);

            this.stats = {
                pushed: pushResult.success,
                pulled: pullResult.counts ? Object.values(pullResult.counts).reduce((a, b) => a + b, 0) : 0,
                failed: pushResult.failed,
                lastSync: new Date().toISOString()
            };

            console.log(`✅ Sync tamamlandı: ${this.stats.pushed} pushed, ${this.stats.pulled} pulled`);
            return this.stats;
        } catch (error) {
            console.error('❌ Sync hatası:', error);
            return { pushed: 0, pulled: 0, failed: 0 };
        } finally {
            this.isSyncing = false;
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
            const endpoint = this.getEndpoint(tableName);

            console.log(`📤 Sync: ${tableName}/${action} -> ${endpoint}`);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(this.transformData(tableName, data, action))
            });

            if (response.ok) {
                // Sync başarılı, işaretle
                try {
                    await invoke('mark_changes_synced', {
                        tenantIdParam: tenantId,
                        changeIds: [data.id]
                    });
                } catch (e) {
                    console.warn('mark_changes_synced hatası:', e);
                }
                console.log(`✅ Sync başarılı: ${tableName}/${data.id}`);
                return true;
            } else {
                const text = await response.text();
                console.error(`❌ Sync hatası: ${response.status} - ${text}`);
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
    private getEndpoint(table: SyncTableName): string {
        const endpoints: Record<SyncTableName, string> = {
            'uyeler': '/sync/uye',
            'gelirler': '/sync/gelir',
            'giderler': '/sync/gider',
            'kasalar': '/sync/kasa',
            'aidatlar': '/sync/aidat',
            'aidat_takip': '/sync/aidat'
        };
        return endpoints[table] || `/sync/${table}`;
    }

    /**
     * Veriyi backend formatına dönüştür
     */
    private transformData(table: SyncTableName, data: SyncableRecord, action: SyncAction): any {
        const now = new Date().toISOString();

        // Temel alanları ekle
        const baseData: any = {
            ...data,
            created_at: data.created_at || now,
            updated_at: now,
            is_active: action === 'delete' ? 0 : 1
        };

        // Tablo bazında dönüşüm
        switch (table) {
            case 'uyeler':
                return {
                    ...baseData,
                    ad: baseData.ad || '',
                    soyad: baseData.soyad || '',
                    uye_no: baseData.uye_no || '0',
                    tc_no: baseData.tc_no || '',
                    uye_turu: baseData.uye_turu || baseData.uyelik_tipi || 'Asil',
                    durum: action === 'delete' ? 'PASIF' : (baseData.durum || 'AKTIF'),
                    kayit_tarihi: baseData.giris_tarihi || baseData.kayit_tarihi || now.split('T')[0]
                };
            case 'gelirler':
                return {
                    ...baseData,
                    tutar: parseFloat(baseData.tutar) || 0,
                    tarih: baseData.tarih || now.split('T')[0],
                    aciklama: baseData.aciklama || ''
                };
            case 'giderler':
                return {
                    ...baseData,
                    tutar: parseFloat(baseData.tutar) || 0,
                    tarih: baseData.tarih || now.split('T')[0],
                    aciklama: baseData.aciklama || ''
                };
            case 'kasalar':
                return {
                    ...baseData,
                    ad: baseData.ad || baseData.kasa_adi || 'Kasa',
                    bakiye: parseFloat(baseData.bakiye) || 0,
                    para_birimi: baseData.para_birimi || 'TRY'
                };
            case 'aidatlar':
            case 'aidat_takip':
                return {
                    ...baseData,
                    uye_id: baseData.uye_id || '',
                    yil: parseInt(baseData.yil) || new Date().getFullYear(),
                    ay: parseInt(baseData.ay) || 1,
                    tutar: parseFloat(baseData.tutar) || 0,
                    odendi: baseData.odendi ? 1 : 0
                };
            default:
                return baseData;
        }
    }

    /**
     * Bekleyen tüm değişiklikleri push et
     */
    async pushPendingChanges(tenantId: string): Promise<{ success: number; failed: number }> {
        let success = 0;
        let failed = 0;

        try {
            // Bekleyen değişiklikleri al
            const changes = await invoke<any[]>('get_pending_sync_changes', { tenantIdParam: tenantId });

            if (!changes || changes.length === 0) {
                console.log('📭 Bekleyen değişiklik yok');
                return { success: 0, failed: 0 };
            }

            console.log(`📤 ${changes.length} değişiklik push ediliyor...`);

            for (const change of changes) {
                const data = typeof change.data === 'string' ? JSON.parse(change.data) : change.data;

                const synced = await this.syncSingleRecord(
                    tenantId,
                    change.table_name as SyncTableName,
                    change.action as SyncAction,
                    { id: change.record_id, tenant_id: tenantId, ...data }
                );

                if (synced) {
                    success++;
                } else {
                    failed++;
                }
            }

            console.log(`📤 Push tamamlandı: ${success} başarılı, ${failed} başarısız`);
        } catch (error) {
            console.error('Push hatası:', error);
        }

        return { success, failed };
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

            const result = await response.json();
            const data = result.data || result;
            const counts: Record<string, number> = {};
            const changes: any[] = [];

            // Veriyi change formatına dönüştür
            const tables: SyncTableName[] = ['uyeler', 'gelirler', 'giderler', 'kasalar'];

            for (const table of tables) {
                const items = data[table];
                if (items && Array.isArray(items)) {
                    counts[table] = items.length;
                    for (const item of items) {
                        changes.push({
                            table_name: table,
                            record_id: item.id,
                            action: 'update',
                            data: item
                        });
                    }
                }
            }

            // Aidatlar özel işlem
            if (data.aidatlar && Array.isArray(data.aidatlar)) {
                counts.aidatlar = data.aidatlar.length;
                for (const aidat of data.aidatlar) {
                    changes.push({
                        table_name: 'aidat_takip',
                        record_id: aidat.id,
                        action: 'update',
                        data: aidat
                    });
                }
            }

            // Tüm değişiklikleri tek seferde uygula
            if (changes.length > 0) {
                try {
                    const applied = await invoke<number>('apply_sync_changes', {
                        tenantIdParam: tenantId,
                        changes: changes
                    });
                    console.log(`📥 ${applied} kayıt local DB'ye uygulandı`);
                } catch (e) {
                    console.error('apply_sync_changes hatası:', e);
                }
            }

            console.log('📥 Pull tamamlandı:', counts);
            return { success: true, counts };
        } catch (error) {
            console.error('❌ Pull hatası:', error);
            return { success: false, counts: {} };
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
            // Tüm verileri local DB'den al
            const uyeler = await invoke<any[]>('get_uyeler', { tenantIdParam: tenantId });
            const gelirler = await invoke<any[]>('get_gelirler', { tenantIdParam: tenantId, yil: new Date().getFullYear() });
            const giderler = await invoke<any[]>('get_giderler', { tenantIdParam: tenantId, yil: new Date().getFullYear() });
            const kasalar = await invoke<any[]>('get_kasalar', { tenantIdParam: tenantId });

            console.log(`📊 Bulundu: ${uyeler?.length || 0} üye, ${gelirler?.length || 0} gelir, ${giderler?.length || 0} gider, ${kasalar?.length || 0} kasa`);

            // Toplu push endpoint'ine gönder
            const pushData = {
                tenant_id: tenantId,
                uyeler: (uyeler || []).map(u => this.transformData('uyeler', { ...u, tenant_id: tenantId }, 'create')),
                gelirler: (gelirler || []).map(g => this.transformData('gelirler', { ...g, tenant_id: tenantId }, 'create')),
                giderler: (giderler || []).map(g => this.transformData('giderler', { ...g, tenant_id: tenantId }, 'create')),
                kasalar: (kasalar || []).map(k => this.transformData('kasalar', { ...k, tenant_id: tenantId }, 'create')),
                aidatlar: []
            };

            const response = await fetch(`${API_BASE_URL}/sync/push`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(pushData)
            });

            if (response.ok) {
                const result = await response.json();
                counts.uyeler = pushData.uyeler.length;
                counts.gelirler = pushData.gelirler.length;
                counts.giderler = pushData.giderler.length;
                counts.kasalar = pushData.kasalar.length;

                console.log('✅ İlk senkronizasyon tamamlandı:', result);
                return { success: true, counts };
            } else {
                const text = await response.text();
                console.error('❌ İlk sync hatası:', response.status, text);
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
