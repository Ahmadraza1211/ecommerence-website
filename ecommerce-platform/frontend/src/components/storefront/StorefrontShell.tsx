'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MobileTabBar } from './MobileTabBar';
import { FloatingCartButton } from './FloatingCartButton';
import { NotificationPopup } from '@/components/storefront/NotificationPopup';

export function StorefrontShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const isAuth = pathname?.startsWith('/login') || pathname?.startsWith('/register');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {!isAuth && <Navbar />}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      {!isAuth && <Footer />}
      {!isAuth && <MobileTabBar />}
      {!isAuth && <FloatingCartButton />}
      {!isAuth && <NotificationPopup />}
    </div>
  );
}
