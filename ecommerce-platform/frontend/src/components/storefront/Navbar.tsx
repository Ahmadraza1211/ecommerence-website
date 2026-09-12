'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Menu, X, Sun, Moon, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { useThemeStore } from '@/lib/themeStore';
import { useAudioStore } from '@/lib/audioStore';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { isMuted, toggleMute } = useAudioStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => apiClient.get<{ items: any[] }>('/wishlist'),
    enabled: mounted && !!user && user.role === 'BUYER',
  });
  const wishlistCount = wishlistData?.items?.length || 0;

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-ink-100 dark:border-slate-800 transition-colors">
      <div className="container-x">
        <div className="flex items-center gap-4 h-16">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="inline-flex h-9 px-2.5 items-center justify-center rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-white font-bold tracking-widest text-xs shadow-md group-hover:scale-105 transition-transform">
              LOGO
            </span>
            <div className="flex flex-col">
              <span className="font-serif text-lg md:text-xl font-extrabold tracking-tight bg-gradient-to-r from-amber-600 via-amber-500 to-amber-800 dark:from-amber-400 dark:via-yellow-300 dark:to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
                Rana Ahmad Textile
              </span>
              <span className="text-[9px] tracking-widest text-amber-700/80 dark:text-amber-400/80 uppercase font-sans -mt-1 font-semibold">
                Haute Couture & Fabrics
              </span>
            </div>
          </Link>

          {/* Centered Nav Links */}
          {mounted && isAuthenticated ? (
            <nav className="hidden md:flex items-center justify-center gap-8 flex-1 text-sm font-medium text-ink-700 dark:text-slate-200">
              <Link href="/" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Marketplace</Link>
              <Link href="/orders" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">My Orders</Link>
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

          {/* Right Actions: Dark Mode, Mute Toggle, Account */}
          <div className="ml-auto flex items-center gap-1.5">
            {mounted && (
              <>
                {/* Audio Mute/Unmute Button */}
                <button
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                  className="p-2 rounded-xl text-ink-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5 text-red-500" />
                  ) : (
                    <Volume2 className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-pulse" />
                  )}
                </button>

                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleDarkMode}
                  title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                  className="p-2 rounded-xl text-ink-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {isDarkMode ? (
                    <Sun className="h-5 w-5 text-yellow-400" />
                  ) : (
                    <Moon className="h-5 w-5 text-slate-700" />
                  )}
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
            <button onClick={() => setMobileOpen((v) => !v)} className="p-2 rounded-xl text-ink-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && mounted && (
          <div className="md:hidden border-t border-ink-100 dark:border-slate-800 py-3 space-y-1 animate-fade-in text-ink-800 dark:text-slate-100">
            <Link href="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-ink-100 dark:hover:bg-slate-800">Marketplace</Link>
            {isAuthenticated && (
              <>
                <Link href="/orders" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-ink-100 dark:hover:bg-slate-800">My Orders</Link>
                <Link href="/wishlist" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-ink-100 dark:hover:bg-slate-800">
                  Wishlist {wishlistCount > 0 && <span className="ml-1 px-2 py-0.5 text-xs bg-amber-600 text-white rounded-full">{wishlistCount}</span>}
                </Link>
                <Link href="/account" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-ink-100 dark:hover:bg-slate-800">My Account</Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
