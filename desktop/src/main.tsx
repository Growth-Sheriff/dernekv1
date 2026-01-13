import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'
import { Toaster } from 'sonner'

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
    <App />
    <Toaster position="top-right" richColors />
  </React.StrictMode>,
)
