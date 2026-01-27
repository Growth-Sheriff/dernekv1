/**
 * Tauri API Shim - Web Versiyonu
 * 
 * Bu dosya Desktop'taki @tauri-apps/api/core modülünün yerine geçer.
 * Web ortamında HTTP istekleri yapar.
 */

import { invoke as apiInvoke } from '../api-client';

// Re-export invoke function
export const invoke = apiInvoke;

// Tauri event system mock (kullanılmıyorsa boş bırakabiliriz)
export const listen = async (event: string, handler: (payload: any) => void) => {
    console.log(`[WEB] Event listener registered for: ${event}`);
    // Web'de WebSocket ile gerçek event dinleme yapılabilir
    return () => { }; // Unlisten function
};

export const emit = async (event: string, payload?: any) => {
    console.log(`[WEB] Event emitted: ${event}`, payload);
};

export default { invoke, listen, emit };
