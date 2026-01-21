import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// React Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 dakika - Data 5 dk fresh sayılır
      gcTime: 10 * 60 * 1000, // 10 dakika - Cache'de 10 dk kalır (eski adı: cacheTime)
      refetchOnWindowFocus: false, // Window focus'ta otomatik refetch yapma
      retry: 1, // Hata durumunda 1 kere retry
    },
  },
})

// Global error handler - debug için
window.onerror = (message, source, lineno, colno, error) => {
  console.error('🔴 GLOBAL ERROR:', { message, source, lineno, colno, error });
  // Hata durumunda alert göster (debug için)
  alert(`Hata: ${message}\nKaynak: ${source}:${lineno}`);
};

window.onunhandledrejection = (event) => {
  console.error('🔴 UNHANDLED PROMISE:', event.reason);
};

console.log('📱 Uygulama başlatılıyor...');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  </React.StrictMode>,
)
