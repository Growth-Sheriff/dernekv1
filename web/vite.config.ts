import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            // Tauri API'lerini Web shim'lerine yönlendir
            '@tauri-apps/api/core': path.resolve(__dirname, './src/lib/tauri-shim/core.ts'),
            '@tauri-apps/plugin-dialog': path.resolve(__dirname, './src/lib/tauri-shim/dialog.ts'),
        },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
    // Tauri environment variables mock
    define: {
        '__TAURI__': false,
        '__TAURI_INTERNALS__': false,
    },
});
