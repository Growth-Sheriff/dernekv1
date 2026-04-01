/**
 * Notification & Presence Service
 * 
 * Super Admin'den gelen bildirimleri almak ve online durumunu bildirmek için.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://35.195.123.84:8000/api/v1';

export interface Notification {
    id: string;
    title: string;
    message: string;
    notification_type: 'info' | 'warning' | 'error' | 'success' | 'announcement';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    action_url?: string;
    action_label?: string;
    created_at: string;
    is_read: boolean;
}

export interface HeartbeatData {
    device_id?: string;
    current_page?: string;
    platform: 'desktop' | 'web' | 'mobile';
}

class NotificationService {
    private token: string | null = null;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private notificationCallbacks: ((notifications: Notification[]) => void)[] = [];
    private unreadCountCallbacks: ((count: number) => void)[] = [];
    private lastFetchTime: number = 0;
    private currentPage: string = '/';
    private deviceId: string | null = null;
    private platform: 'desktop' | 'web' | 'mobile' = 'web';

    /**
     * Servisi başlat
     */
    start(token: string, deviceId?: string, platform: 'desktop' | 'web' | 'mobile' = 'web') {
        this.token = token;
        this.deviceId = deviceId || null;
        this.platform = platform;

        // İlk bildirimleri al
        this.fetchNotifications();

        // Heartbeat başlat (30 saniyede bir)
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 30000);

        // İlk heartbeat
        this.sendHeartbeat();

        // Bildirimleri periyodik kontrol et (60 saniyede bir)
        setInterval(() => {
            this.fetchNotifications();
        }, 60000);

        console.log('🔔 NotificationService başlatıldı');
    }

    /**
     * Servisi durdur
     */
    stop() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        this.token = null;
        console.log('🔔 NotificationService durduruldu');
    }

    /**
     * Mevcut sayfayı güncelle
     */
    setCurrentPage(page: string) {
        this.currentPage = page;
    }

    /**
     * Bildirim dinleyici ekle
     */
    onNotifications(callback: (notifications: Notification[]) => void) {
        this.notificationCallbacks.push(callback);
        return () => {
            this.notificationCallbacks = this.notificationCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Okunmamış sayı dinleyici ekle
     */
    onUnreadCountChange(callback: (count: number) => void) {
        this.unreadCountCallbacks.push(callback);
        return () => {
            this.unreadCountCallbacks = this.unreadCountCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Heartbeat gönder
     */
    async sendHeartbeat(): Promise<void> {
        if (!this.token) return;

        try {
            const data: HeartbeatData = {
                device_id: this.deviceId || undefined,
                current_page: this.currentPage,
                platform: this.platform,
            };

            await fetch(`${API_BASE_URL}/notifications/heartbeat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`,
                },
                body: JSON.stringify(data),
            });
        } catch (error) {
            console.warn('Heartbeat gönderilemedi:', error);
        }
    }

    /**
     * Bildirimleri getir
     */
    async fetchNotifications(): Promise<Notification[]> {
        if (!this.token) return [];

        try {
            const response = await fetch(`${API_BASE_URL}/notifications/my-notifications`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Bildirimler alınamadı');
            }

            const notifications: Notification[] = await response.json();

            // Callback'leri çağır
            this.notificationCallbacks.forEach(cb => cb(notifications));

            // Okunmamış sayısı
            const unreadCount = notifications.filter(n => !n.is_read).length;
            this.unreadCountCallbacks.forEach(cb => cb(unreadCount));

            return notifications;
        } catch (error) {
            console.warn('Bildirimler alınamadı:', error);
            return [];
        }
    }

    /**
     * Okunmamış sayısını getir
     */
    async fetchUnreadCount(): Promise<number> {
        if (!this.token) return 0;

        try {
            const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (!response.ok) return 0;

            const data = await response.json();
            const count = data.unread_count || 0;

            // Callback'leri çağır
            this.unreadCountCallbacks.forEach(cb => cb(count));

            return count;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Bildirimi okundu olarak işaretle
     */
    async markAsRead(notificationId: string): Promise<boolean> {
        if (!this.token) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/mark-read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                // Bildirimleri yenile
                this.fetchNotifications();
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Tüm bildirimleri okundu olarak işaretle
     */
    async markAllAsRead(): Promise<boolean> {
        if (!this.token) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                // Bildirimleri yenile
                this.fetchNotifications();
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }
}

// Singleton instance
export const notificationService = new NotificationService();
export default notificationService;
