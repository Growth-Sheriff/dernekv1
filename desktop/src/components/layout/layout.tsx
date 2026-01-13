import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { SkipToContent } from '@/components/ui/accessibility';

export const Layout: React.FC = () => {
  const location = useLocation();
  console.log('🏠 Layout render - current path:', location.pathname);
  
  return (
    <div className="flex h-screen bg-background">
      {/* Skip to main content link for keyboard users */}
      <SkipToContent targetId="main-content" />
      
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main 
          id="main-content"
          className="flex-1 overflow-y-auto p-6"
          role="main"
          aria-label="Ana içerik"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
