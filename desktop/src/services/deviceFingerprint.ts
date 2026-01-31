/**
 * Device Fingerprint Service
 * 
 * Cihaz bilgilerini toplayıp sunucuya kaydeden servis.
 * Login sonrasında çağrılır.
 */

import { invoke } from '@tauri-apps/api/core';

export interface DeviceInfo {
    device_id: string;
    device_name: string;
    device_type: 'desktop' | 'web' | 'mobile';
    platform: string;
    os_version: string;
    app_version: string;

    // Hardware fingerprint
    cpu_info?: string;
    ram_size?: string;
    screen_resolution?: string;
    hostname?: string;
    username?: string;
    mac_address?: string;
    disk_serial?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://157.90.154.48:8000/api/v1';

class DeviceFingerprintService {
    private deviceInfo: DeviceInfo | null = null;

    /**
     * Cihaz bilgilerini topla
     */
    async collectDeviceInfo(): Promise<DeviceInfo> {
        if (this.deviceInfo) {
            return this.deviceInfo;
        }

        try {
            // Tauri backend'den cihaz bilgilerini al
            const deviceId = await this.getDeviceId();
            const systemInfo = await this.getSystemInfo();

            this.deviceInfo = {
                device_id: deviceId,
                device_name: systemInfo.hostname || 'Unknown Device',
                device_type: 'desktop',
                platform: systemInfo.platform || 'unknown',
                os_version: systemInfo.os_version || 'unknown',
                app_version: systemInfo.app_version || '1.0.0',

                cpu_info: systemInfo.cpu_info,
                ram_size: systemInfo.ram_size,
                screen_resolution: systemInfo.screen_resolution,
                hostname: systemInfo.hostname,
                username: systemInfo.username,
                mac_address: systemInfo.mac_address,
                disk_serial: systemInfo.disk_serial,
            };

            return this.deviceInfo;
        } catch (error) {
            console.error('Cihaz bilgisi toplanamadı:', error);

            // Fallback with minimal info
            return {
                device_id: await this.getDeviceId(),
                device_name: 'Desktop App',
                device_type: 'desktop',
                platform: this.detectPlatform(),
                os_version: 'unknown',
                app_version: '1.0.0',
            };
        }
    }

    /**
     * Benzersiz cihaz ID'si al veya oluştur
     */
    async getDeviceId(): Promise<string> {
        try {
            // Tauri backend'den device_id al
            const deviceId = await invoke<string>('get_device_id');
            return deviceId;
        } catch (error) {
            console.error('Device ID alınamadı:', error);

            // LocalStorage'dan al veya oluştur
            let deviceId = localStorage.getItem('bader_device_id');
            if (!deviceId) {
                deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                localStorage.setItem('bader_device_id', deviceId);
            }
            return deviceId;
        }
    }

    /**
     * Sistem bilgilerini al (Tauri backend'den)
     */
    async getSystemInfo(): Promise<{
        platform?: string;
        os_version?: string;
        app_version?: string;
        hostname?: string;
        username?: string;
        cpu_info?: string;
        ram_size?: string;
        screen_resolution?: string;
        mac_address?: string;
        disk_serial?: string;
    }> {
        try {
            const info = await invoke<{
                platform?: string;
                os_version?: string;
                app_version?: string;
                hostname?: string;
                username?: string;
                cpu_info?: string;
                ram_size?: string;
                screen_resolution?: string;
                mac_address?: string;
                disk_serial?: string;
            }>('get_system_info');
            return info;
        } catch (error) {
            console.warn('Sistem bilgisi alınamadı:', error);
            return {
                platform: this.detectPlatform(),
                screen_resolution: `${window.screen.width}x${window.screen.height}`,
            };
        }
    }

    /**
     * Platform algılama (fallback)
     */
    detectPlatform(): string {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('mac')) return 'macos';
        if (userAgent.includes('win')) return 'windows';
        if (userAgent.includes('linux')) return 'linux';
        return 'unknown';
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
                'X-Platform': 'desktop',
            },
            body: JSON.stringify(deviceInfo),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Cihaz kaydedilemedi');
        }

        const result = await response.json();
        console.log('🖥️ Cihaz sunucuya kaydedildi:', result);
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
