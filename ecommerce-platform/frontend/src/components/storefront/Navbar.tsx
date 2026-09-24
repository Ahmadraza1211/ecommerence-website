'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Sun, Moon, Volume2, VolumeX, MoreHorizontal } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { useThemeStore } from '@/lib/themeStore';
import { useAudioStore } from '@/lib/audioStore';
import { NotificationBadge } from './NotificationBadge';

export function Navbar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { isMuted, toggleMute } = useAudioStore();

  useEffect(() => { setMounted(true); }, []);

  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => apiClient.get<{ items: any[] }>('/wishlist'),
    enabled: mounted && !!user && user.role === 'BUYER',
  });
  const wishlistCount = wishlistData?.items?.length || 0;

  // V1: Unread orders count for badge
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'list'],
    queryFn: () => apiClient.get<{ items: any[] }>('/orders/me/list'),
    enabled: mounted && !!user && user.role === 'BUYER',
    refetchInterval: 15000,
  });
  const unreadOrders = (ordersData?.items || []).reduce((s: number, o: any) => s + (o.unreadCount || 0), 0);

  return (
    <>
      <header className="relative md:sticky md:top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-ink-100 dark:border-slate-800 transition-colors">
        <div className="container-x">
          <div className="flex items-center gap-4 h-16">
            {/* Logo & Brand */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <img src="/Logo12.png" alt="Logo" className="h-9 w-9 rounded-xl shadow-md group-hover:scale-105 transition-transform object-cover" />
              <div className="flex flex-col">
                <span className="font-serif text-lg md:text-xl font-extrabold tracking-tight bg-gradient-to-r from-amber-600 via-amber-500 to-amber-800 dark:from-amber-400 dark:via-yellow-300 dark:to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
                  Rana Ahmad Textile
                </span>
                <span className="text-[9px] tracking-widest text-amber-700/80 dark:text-amber-400/80 uppercase font-sans -mt-1 font-semibold">
                  Marketplace & Fabrics
                </span>
              </div>
            </Link>

            {/* Centered Nav Links */}
            {mounted && isAuthenticated ? (
              <nav className="hidden md:flex items-center justify-center gap-8 flex-1 text-sm font-medium text-ink-700 dark:text-slate-200">
                <Link href="/" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Marketplace</Link>
                <Link href="/orders" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors inline-flex items-center gap-1">
                  My Orders
                  <NotificationBadge count={unreadOrders} />
                </Link>
                <Link href="/wishlist" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors inline-flex items-center gap-1">
                  Wishlist
                  {wishlistCount > 0 && (
                    <span className="h-5 min-w-5 px-1 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
                <Link href="/account" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">My Account</Link>
              </nav>
            ) : (
              <div className="hidden md:flex flex-1" />
            )}

            {/* Right Actions */}
            <div className="ml-auto flex items-center gap-1.5">
              {mounted && (
                <>
                  <button onClick={toggleMute} title={isMuted ? 'Unmute Audio' : 'Mute Audio'} className="p-2 rounded-xl text-ink-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    {isMuted ? <VolumeX className="h-5 w-5 text-red-500" /> : <Volume2 className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-pulse" />}
                  </button>

                </>
              )}

              {!mounted ? (
                <div className="h-9 w-20" aria-hidden="true" />
              ) : !isAuthenticated ? (
                <Link href="/login" className="btn-primary bg-amber-600 hover:bg-amber-700 border-none text-white text-sm px-4 py-2 rounded-xl shadow-md">
                  Sign in
                </Link>
              ) : (
                <Link href={user?.role === 'ADMIN' ? '/admin/dashboard' : '/account'} className="p-2 rounded-xl text-ink-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors">
                  <User className="h-5 w-5" />
                  <span className="hidden sm:inline text-sm font-medium">{user?.name?.split(' ')[0]}</span>
                </Link>
              )}

              {/* V5: Removed hamburger — replaced with More button for mobile */}
              {mounted && isAuthenticated && (
                <button onClick={() => setMoreOpen(true)} className="p-2 rounded-xl text-ink-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* V5: More sheet for mobile */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 p-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-sm mb-3 text-ink-700 dark:text-slate-200">Menu</h3>
            <nav className="space-y-1">
              <Link href="/" onClick={() => setMoreOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-ink-700 dark:text-slate-200 hover:bg-ink-100 dark:hover:bg-slate-800">Marketplace</Link>
              <Link href="/orders" onClick={() => setMoreOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-ink-700 dark:text-slate-200 hover:bg-ink-100 dark:hover:bg-slate-800">My Orders</Link>
              <Link href="/purchase-history" onClick={() => setMoreOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-ink-700 dark:text-slate-200 hover:bg-ink-100 dark:hover:bg-slate-800">Purchase History</Link>
              <Link href="/wishlist" onClick={() => setMoreOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-ink-700 dark:text-slate-200 hover:bg-ink-100 dark:hover:bg-slate-800">Wishlist</Link>
              <Link href="/cart" onClick={() => setMoreOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-ink-700 dark:text-slate-200 hover:bg-ink-100 dark:hover:bg-slate-800">Add to Cart</Link>
              <Link href="/account" onClick={() => setMoreOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-ink-700 dark:text-slate-200 hover:bg-ink-100 dark:hover:bg-slate-800">My Account</Link>
              <button onClick={async () => { setMoreOpen(false); await useAuthStore.getState().logout(); window.location.href = '/login'; }} className="block w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">Sign Out</button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
