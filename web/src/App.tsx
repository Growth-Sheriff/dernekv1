import { useEffect, useState } from 'react';
import { useRoutes, BrowserRouter } from 'react-router-dom';
import { routes } from './routes';
import { ThemeProvider } from '@/components/providers/theme-provider';
import './styles/globals.css';
import { Toaster } from 'sonner';

function AppRoutes() {
  const element = useRoutes(routes);
  return element;
}

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Simulate initial loading (hydration etc)
    const timer = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl mb-4 animate-pulse">
            <span className="text-2xl font-bold text-white">B</span>
          </div>
          <p className="text-blue-200 animate-pulse text-sm font-medium">Başlatılıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
