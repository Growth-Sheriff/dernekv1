/**
 * Device Fingerprint Service - Web Version
 * 
 * Tarayıcı bilgilerini toplayıp sunucuya kaydeden servis.
 * Login sonrasında çağrılır.
 */

export interface DeviceInfo {
    device_id: string;
    device_name: string;
    device_type: 'desktop' | 'web' | 'mobile';
    platform: string;
    os_version: string;
    app_version: string;

    // Browser fingerprint
    screen_resolution?: string;
    user_agent?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://157.90.154.48:8000/api/v1';

class DeviceFingerprintService {
    private deviceInfo: DeviceInfo | null = null;

    /**
     * Cihaz (tarayıcı) bilgilerini topla
     */
    async collectDeviceInfo(): Promise<DeviceInfo> {
        if (this.deviceInfo) {
            return this.deviceInfo;
        }

        const deviceId = this.getDeviceId();
        const browserInfo = this.getBrowserInfo();

        this.deviceInfo = {
            device_id: deviceId,
            device_name: browserInfo.browserName || 'Web Browser',
            device_type: 'web',
            platform: browserInfo.platform || 'web',
            os_version: browserInfo.osVersion || 'unknown',
            app_version: '1.0.0',
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            user_agent: navigator.userAgent,
        };

        return this.deviceInfo;
    }

    /**
     * Benzersiz cihaz (session) ID'si al veya oluştur
     */
    getDeviceId(): string {
        let deviceId = localStorage.getItem('bader_web_device_id');
        if (!deviceId) {
            // Fingerprint oluştur
            const fingerprint = this.generateFingerprint();
            deviceId = `web_${fingerprint}`;
            localStorage.setItem('bader_web_device_id', deviceId);
        }
        return deviceId;
    }

    /**
     * Basit bir browser fingerprint oluştur
     */
    generateFingerprint(): string {
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.width.toString(),
            screen.height.toString(),
            screen.colorDepth.toString(),
            new Date().getTimezoneOffset().toString(),
            navigator.hardwareConcurrency?.toString() || '0',
            (navigator as any).deviceMemory?.toString() || '0',
        ];

        // Simple hash
        let hash = 0;
        const str = components.join('|');
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        return Math.abs(hash).toString(16).padStart(8, '0');
    }

    /**
     * Tarayıcı bilgilerini al
     */
    getBrowserInfo(): { browserName?: string; platform?: string; osVersion?: string } {
        const ua = navigator.userAgent;
        let browserName = 'Unknown Browser';
        let platform = 'web';
        let osVersion = 'unknown';

        // Browser detection
        if (ua.includes('Chrome') && !ua.includes('Edg')) {
            browserName = 'Chrome';
        } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
            browserName = 'Safari';
        } else if (ua.includes('Firefox')) {
            browserName = 'Firefox';
        } else if (ua.includes('Edg')) {
            browserName = 'Edge';
        } else if (ua.includes('Opera') || ua.includes('OPR')) {
            browserName = 'Opera';
        }

        // Platform/OS detection
        if (ua.includes('Win')) {
            platform = 'Windows';
            const match = ua.match(/Windows NT (\d+\.\d+)/);
            if (match) {
                const version = parseFloat(match[1]);
                if (version >= 10) osVersion = 'Windows 10/11';
                else if (version >= 6.3) osVersion = 'Windows 8.1';
                else if (version >= 6.2) osVersion = 'Windows 8';
                else if (version >= 6.1) osVersion = 'Windows 7';
                else osVersion = `Windows NT ${match[1]}`;
            }
        } else if (ua.includes('Mac')) {
            platform = 'macOS';
            const match = ua.match(/Mac OS X (\d+[._]\d+)/);
            if (match) {
                osVersion = `macOS ${match[1].replace('_', '.')}`;
            }
        } else if (ua.includes('Linux')) {
            platform = 'Linux';
            osVersion = 'Linux';
        } else if (ua.includes('Android')) {
            platform = 'Android';
            const match = ua.match(/Android (\d+\.?\d*)/);
            if (match) osVersion = `Android ${match[1]}`;
        } else if (ua.includes('iPhone') || ua.includes('iPad')) {
            platform = 'iOS';
            const match = ua.match(/OS (\d+[._]\d+)/);
            if (match) osVersion = `iOS ${match[1].replace('_', '.')}`;
        }

        return { browserName, platform, osVersion };
    }

    /**
     * Cihazı sunucuya kaydet
     */
    async registerDevice(token: string): Promise<{ status: string; device_id: string; activation_id: string }> {
        const deviceInfo = await this.collectDeviceInfo();

        const response = await fetch(`${API_BASE_URL}/devices/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Platform': 'web',
            },
            body: JSON.stringify(deviceInfo),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Cihaz kaydedilemedi');
        }

        const result = await response.json();
        console.log('🌐 Web cihazı sunucuya kaydedildi:', result);
        return result;
    }

    /**
     * Cihaz bilgilerini sıfırla (logout için)
     */
    clearDeviceInfo(): void {
        this.deviceInfo = null;
    }
}

export const deviceFingerprintService = new DeviceFingerprintService();
export default deviceFingerprintService;
