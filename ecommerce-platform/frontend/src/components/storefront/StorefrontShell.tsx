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
import { useAuthStore } from '@/lib/authStore';

export function StorefrontShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const isAuth = pathname?.startsWith('/login') || pathname?.startsWith('/register');
  const { isDarkMode } = useThemeStore();
  const user = useAuthStore((s) => s.user);

  const isMarketplaceOrProduct =
    pathname === '/' ||
    pathname?.startsWith('/products') ||
    pathname?.startsWith('/product/');



  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className={`flex min-h-screen flex-col relative transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Background Image 3 with 2.5% Opacity on Marketplace & Product pages */}
      {isMarketplaceOrProduct && (
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
          style={{
            backgroundImage: `url('/bg-image3.jpeg')`,
            opacity: 0.035,
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
        {!isAuth && user?.role !== 'ADMIN' && <MobileTabBar />}
        {!isAuth && <FloatingCartButton />}
        {!isAuth && <NotificationPopup />}
      </div>
    </div>
  );
}
