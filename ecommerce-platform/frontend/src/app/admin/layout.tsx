'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/authStore';
import { LayoutDashboard, Package, ShoppingCart, Image as ImageIcon, Tag, MessageSquare, Star, LogOut, ExternalLink, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/cod-requests', label: 'COD requests', icon: MessageSquare },
  { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  // PRD_New §Platform-Wide.3 & §View Store: "View Store" inside the seller sidebar
  { href: '/admin/view-store', label: 'View Store', icon: Store },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

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
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white text-sm font-bold">S</span>
            <span className="font-display font-bold text-white">Shopwave Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => {
            const active = pathname?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                  active ? 'bg-brand-600 text-white font-medium' : 'hover:bg-ink-800'
                )}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-ink-800">
          <Link href="/" target="_blank" className="flex items-center gap-2 px-3 py-2 text-xs text-ink-400 hover:text-white">
            <ExternalLink className="h-3 w-3" /> Open in new tab
          </Link>
          <button onClick={async () => { await logout(); router.push('/admin/login'); }} className="flex items-center gap-2 px-3 py-2 text-xs text-ink-400 hover:text-white w-full">
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 inset-x-0 bg-ink-900 text-white p-3 z-30 flex items-center justify-between">
        <span className="font-display font-bold text-sm">Shopwave Admin</span>
        <select
          onChange={(e) => router.push(e.target.value)}
          className="bg-ink-800 text-white text-xs rounded px-2 py-1"
          value={pathname}
        >
          {NAV.map((n) => <option key={n.href} value={n.href}>{n.label}</option>)}
        </select>
      </div>

      <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
