'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { LayoutDashboard, Package, ShoppingCart, Image as ImageIcon, Tag, MessageSquare, Star, LogOut, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, badgeKey: 'orders' },
  { href: '/admin/cod-requests', label: 'COD requests', icon: MessageSquare, badgeKey: 'cod' },
  { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/view-store', label: 'View Store', icon: Store },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { data: codPendingData } = useQuery({
    queryKey: ['admin', 'cod-requests', 'PENDING_SELLER_APPROVAL'],
    queryFn: () => apiClient.get<{ items: any[] }>('/admin/cod-requests', { status: 'PENDING_SELLER_APPROVAL' }),
    enabled: !!user && user.role === 'ADMIN',
    refetchInterval: 15000,
  });
  const pendingCodCount = codPendingData?.items?.length || 0;

  const { data: ordersPendingData } = useQuery({
    queryKey: ['admin', 'orders', 'PENDING'],
    queryFn: () => apiClient.get<{ items: any[] }>('/admin/orders', { status: 'PENDING' }),
    enabled: !!user && user.role === 'ADMIN',
    refetchInterval: 15000,
  });
  const pendingOrdersCount = ordersPendingData?.items?.length || 0;

  useEffect(() => {
    if (pathname === '/admin/login') return;
    if (user === null) {
      const t = setTimeout(() => {
        if (!useAuthStore.getState().user) router.push('/admin/login');
      }, 500);
      return () => clearTimeout(t);
    }
    if (user && user.role !== 'ADMIN') router.push('/');
  }, [user, pathname, router]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-ink-500">Loading admin…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 flex">
      <aside className="hidden md:flex w-60 bg-ink-900 text-ink-200 flex-col">
        <div className="px-5 py-4 border-b border-ink-800">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <img src="/brand-rat-logo.svg" alt="Rana Ahmad Textile logo" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-display font-bold text-white">Rana Ahmad Textile Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => {
            const active = pathname?.startsWith(n.href);
            const count = n.badgeKey === 'orders' ? pendingOrdersCount : n.badgeKey === 'cod' ? pendingCodCount : 0;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg text-sm',
                  active ? 'bg-brand-600 text-white font-medium' : 'hover:bg-ink-800'
                )}
              >
                <div className="flex items-center gap-2">
                  <n.icon className="h-4 w-4" /> {n.label}
                </div>
                {count > 0 && (
                  <span className="h-4 min-w-4 px-1.5 rounded-full bg-amber-500 text-ink-950 text-[10px] font-extrabold flex items-center justify-center">
                    +{count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-ink-800">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 px-3 py-2 text-xs text-ink-400 hover:text-white w-full text-left">
            <Store className="h-3 w-3" /> View Marketplace
          </button>
          <button onClick={async () => { await logout(); router.push('/admin/login'); }} className="flex items-center gap-2 px-3 py-2 text-xs text-ink-400 hover:text-white w-full">
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </div>
      </aside>

      {/* V5: Admin mobile header — better color, removed menu, added View Marketplace */}
      <div className="md:hidden fixed top-0 inset-x-0 bg-gradient-to-r from-indigo-950 to-purple-950 text-white p-3 z-30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/brand-rat-logo.svg" alt="Rana Ahmad Textile logo" className="h-7 w-7 rounded-md object-cover" />
          <span className="font-display font-bold text-sm truncate">Rana Ahmad Textile</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => router.push('/')} className="text-xs bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg font-semibold">View Store</button>
          <button onClick={async () => { await logout(); router.push('/admin/login'); }} className="text-xs bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg font-semibold">Sign out</button>
        </div>
      </div>

      {/* V5: Admin mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-ink-100 grid grid-cols-5">
        <Link href="/admin/dashboard" className={cn('flex flex-col items-center justify-center py-2 text-[10px] font-medium', pathname === '/admin/dashboard' ? 'text-amber-600' : 'text-ink-500')}><LayoutDashboard className='h-5 w-5' /><span>Dashboard</span></Link>
        <Link href="/admin/orders" className={cn('flex flex-col items-center justify-center py-2 text-[10px] font-medium relative', pathname.startsWith('/admin/orders') ? 'text-amber-600' : 'text-ink-500')}>
          <ShoppingCart className='h-5 w-5' />
          <span>Orders</span>
          {pendingOrdersCount > 0 && <span className="absolute top-1 right-3 h-3.5 min-w-3.5 px-1 rounded-full bg-amber-500 text-ink-950 text-[9px] font-extrabold flex items-center justify-center">+{pendingOrdersCount}</span>}
        </Link>
        <Link href="/admin/cod-requests" className={cn('flex flex-col items-center justify-center py-2 text-[10px] font-medium relative', pathname.startsWith('/admin/cod-requests') ? 'text-amber-600' : 'text-ink-500')}>
          <MessageSquare className='h-5 w-5' />
          <span>COD</span>
          {pendingCodCount > 0 && <span className="absolute top-1 right-3 h-3.5 min-w-3.5 px-1 rounded-full bg-amber-500 text-ink-950 text-[9px] font-extrabold flex items-center justify-center">+{pendingCodCount}</span>}
        </Link>
        <Link href="/admin/categories" className={cn('flex flex-col items-center justify-center py-2 text-[10px] font-medium', pathname.startsWith('/admin/categories') ? 'text-amber-600' : 'text-ink-500')}><Tag className='h-5 w-5' /><span>Categories</span></Link>
        <select
          onChange={(e) => router.push(e.target.value)}
          className="text-[10px] font-medium text-ink-500 bg-transparent text-center outline-none"
        >
          <option value="">More</option>
          {NAV.filter(n => !['/admin/dashboard', '/admin/orders', '/admin/cod-requests', '/admin/categories'].includes(n.href)).map((n) => <option key={n.href} value={n.href}>{n.label}</option>)}
        </select>
      </nav>

      <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6 pb-20 md:pb-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
