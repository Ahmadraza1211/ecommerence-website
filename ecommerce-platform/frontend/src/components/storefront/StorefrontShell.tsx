'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MobileTabBar } from './MobileTabBar';
import { FloatingCartButton } from './FloatingCartButton';
import { NotificationPopup } from '@/components/storefront/NotificationPopup';
import { FloatingFashionIcons } from '@/components/storefront/FloatingFashionIcons';
import { BackgroundAudioPlayer } from '@/components/storefront/BackgroundAudioPlayer';
import { useThemeStore } from '@/lib/themeStore';

export function StorefrontShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const isAuth = pathname?.startsWith('/login') || pathname?.startsWith('/register');
  const { isDarkMode } = useThemeStore();

  const isMarketplaceOrProduct = 
    pathname === '/' || 
    pathname?.startsWith('/products') || 
    pathname?.startsWith('/product/');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className={`flex min-h-screen flex-col relative transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Background Image 3 with 13-15% Opacity on Marketplace & Product pages */}
      {isMarketplaceOrProduct && (
        <div 
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 opacity-14 dark:opacity-10"
          style={{
            backgroundImage: `url('/uploads/image3.jpg'), url('/images/image3.png'), url('/image3.png')`,
          }}
        />
      )}

      {/* Floating Fashion Background Icons */}
      {isMarketplaceOrProduct && <FloatingFashionIcons />}

      {/* Persistent Audio Manager */}
      <BackgroundAudioPlayer />

      <div className="relative z-10 flex flex-col min-h-screen">
        {!isAuth && <Navbar />}
        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        {!isAuth && <Footer />}
        {!isAuth && <MobileTabBar />}
        {!isAuth && <FloatingCartButton />}
        {!isAuth && <NotificationPopup />}
      </div>
    </div>
  );
}
