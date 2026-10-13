'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Home, Package, ShoppingBag, Heart, MoreHorizontal, ShoppingCart, User, LogOut, LogIn, Grid } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { NotificationBadge } from './NotificationBadge';

export function MobileTabBar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const logout = useAuthStore((s) => s.logout);
  const [moreOpen, setMoreOpen] = useState(false);

  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'list'],
    queryFn: () => apiClient.get<{ items: any[] }>('/orders/me/list'),
    enabled: !!user && user.role === 'BUYER' && isAuthenticated,
    refetchInterval: 15000,
  });
  const unreadOrders = (ordersData?.items || []).reduce((s: number, o: any) => s + (o.unreadCount || 0), 0);

  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => apiClient.get<{ items: any[] }>('/wishlist'),
    enabled: !!user && user.role === 'BUYER' && isAuthenticated,
  });
  const wishlistCount = wishlistData?.items?.length || 0;

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: () => apiClient.get<{ cart: { totalItems: number } }>('/cart'),
    enabled: !!user && user.role === 'BUYER' && isAuthenticated,
  });
  const cartCount = cartData?.cart?.totalItems || 0;

  // Adapt tabs based on login status
  const items = isAuthenticated
    ? [
        { href: '/', label: 'Marketplace', icon: Home },
        { href: '/products', label: 'Products', icon: ShoppingBag },
        { href: '/orders', label: 'Orders', icon: Package, badge: unreadOrders },
        { href: '/wishlist', label: 'Wishlist', icon: Heart, badge: wishlistCount },
      ]
    : [
        { href: '/', label: 'Marketplace', icon: Home },
        { href: '/products', label: 'Products', icon: ShoppingBag },
        { href: '/cart', label: 'Cart', icon: ShoppingCart, badge: cartCount },
        { href: '/wishlist', label: 'Wishlist', icon: Heart },
        { href: '/login', label: 'Sign In', icon: LogIn, isSpecial: true },
      ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-ink-100 dark:border-slate-800 grid grid-cols-5 shadow-lg">
        {items.map(({ href, label, icon: Icon, badge, isSpecial }: any) => {
          const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] font-medium relative transition-colors',
                isSpecial
                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                  : active
                  ? 'text-amber-600 dark:text-amber-400 font-semibold'
                  : 'text-ink-500 dark:text-slate-400 hover:text-ink-800 dark:hover:text-slate-200'
              )}
            >
              {isSpecial ? (
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 text-white flex items-center justify-center shadow-md -mt-1">
                  <Icon className="h-4 w-4" />
                </div>
              ) : (
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.5] text-amber-600 dark:text-amber-400')} />
              )}
              <span>{label}</span>
              {badge ? <NotificationBadge count={badge} className="absolute top-1 right-1/4" /> : null}
            </Link>
          );
        })}

        {/* 5th Tab: More (only if authenticated) */}
        {isAuthenticated && (
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] font-medium transition-colors',
              moreOpen ? 'text-amber-600 dark:text-amber-400' : 'text-ink-500 dark:text-slate-400'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        )}
      </nav>

      {/* V5: More sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 rounded-t-3xl p-5 animate-slide-up shadow-2xl border-t border-ink-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 bg-ink-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-base text-ink-900 dark:text-slate-100">
                  {isAuthenticated ? `Hi, ${user?.name || 'Customer'}` : 'Menu'}
                </h3>
                <p className="text-xs text-ink-500 dark:text-slate-400">Quick Navigation</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <Link href="/cart" onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-ink-50 dark:bg-slate-800 text-ink-800 dark:text-slate-100 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors">
                <ShoppingCart className="h-5 w-5 text-amber-600" />
                <span className="text-[11px] font-medium">Cart</span>
              </Link>
              <Link href="/account" onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-ink-50 dark:bg-slate-800 text-ink-800 dark:text-slate-100 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors">
                <User className="h-5 w-5 text-amber-600" />
                <span className="text-[11px] font-medium">Account</span>
              </Link>
              <Link href="/orders" onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-ink-50 dark:bg-slate-800 text-ink-800 dark:text-slate-100 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors">
                <Package className="h-5 w-5 text-amber-600" />
                <span className="text-[11px] font-medium">Orders</span>
              </Link>
              <Link href="/wishlist" onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-ink-50 dark:bg-slate-800 text-ink-800 dark:text-slate-100 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors">
                <Heart className="h-5 w-5 text-amber-600" />
                <span className="text-[11px] font-medium">Wishlist</span>
              </Link>
              <Link href="/purchase-history" onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-ink-50 dark:bg-slate-800 text-ink-800 dark:text-slate-100 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors">
                <ShoppingBag className="h-5 w-5 text-amber-600" />
                <span className="text-[11px] font-medium">History</span>
              </Link>
              {isAuthenticated ? (
                <button
                  onClick={async () => {
                    setMoreOpen(false);
                    await logout();
                    window.location.href = '/login';
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-medium"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-[11px]">Sign Out</span>
                </button>
              ) : (
                <Link href="/login" onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-bold">
                  <LogIn className="h-5 w-5" />
                  <span className="text-[11px]">Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
