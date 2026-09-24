'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Home, Package, ShoppingBag, Heart, MoreHorizontal, ShoppingCart, User, LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { NotificationBadge } from './NotificationBadge';

/**
 * V5: Bottom navbar tabs: Marketplace, Orders, Purchase History, Wishlist, More.
 * "My Account" removed from bottom nav. "More" sheet contains:
 * Add to Cart, Purchase History, My Account, Orders, Wishlist, Sign Out.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [moreOpen, setMoreOpen] = useState(false);

  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'list'],
    queryFn: () => apiClient.get<{ items: any[] }>('/orders/me/list'),
    enabled: !!user && user.role === 'BUYER',
    refetchInterval: 15000,
  });
  const unreadOrders = (ordersData?.items || []).reduce((s: number, o: any) => s + (o.unreadCount || 0), 0);

  const items = [
    { href: '/', label: 'Marketplace', icon: Home },
    { href: '/orders', label: 'Orders', icon: Package, badge: unreadOrders },
    { href: '/purchase-history', label: 'History', icon: ShoppingBag },
    { href: '/wishlist', label: 'Wishlist', icon: Heart },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-ink-100 dark:border-slate-800 grid grid-cols-5">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-[68px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium relative',
                active ? 'text-amber-600' : 'text-ink-500 dark:text-slate-400'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              <span>{label}</span>
              {badge ? <NotificationBadge count={badge} className="absolute top-1 right-1/4" /> : null}
            </Link>
          );
        })}
        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn('flex min-h-[68px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium', moreOpen ? 'text-amber-600' : 'text-ink-500 dark:text-slate-400')}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>

      {/* V5: More sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 rounded-t-2xl p-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-ink-200 dark:bg-slate-700 rounded-full mx-auto mb-3" />
            <h3 className="font-display font-bold text-sm mb-3 text-ink-700 dark:text-slate-200">More</h3>
            <div className="grid grid-cols-3 gap-2">
              <Link href="/cart" onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-ink-50 dark:bg-slate-800 text-ink-700 dark:text-slate-200">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-[10px]">Cart</span>
              </Link>
              <Link href="/account" onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-ink-50 dark:bg-slate-800 text-ink-700 dark:text-slate-200">
                <User className="h-5 w-5" />
                <span className="text-[10px]">Account</span>
              </Link>
              <Link href="/orders" onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-ink-50 dark:bg-slate-800 text-ink-700 dark:text-slate-200">
                <Package className="h-5 w-5" />
                <span className="text-[10px]">Orders</span>
              </Link>
              <Link href="/wishlist" onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-ink-50 dark:bg-slate-800 text-ink-700 dark:text-slate-200">
                <Heart className="h-5 w-5" />
                <span className="text-[10px]">Wishlist</span>
              </Link>
              <Link href="/purchase-history" onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-ink-50 dark:bg-slate-800 text-ink-700 dark:text-slate-200">
                <ShoppingBag className="h-5 w-5" />
                <span className="text-[10px]">History</span>
              </Link>
              <button onClick={async () => { setMoreOpen(false); await logout(); window.location.href = '/login'; }} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-red-50 text-red-600">
                <LogOut className="h-5 w-5" />
                <span className="text-[10px]">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
