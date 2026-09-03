'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Menu, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  // mounted guards against SSR/localStorage hydration mismatch.
  // Zustand persist reads from localStorage (client-only), so on the server
  // isAuthenticated() is always false. Without this guard, the server renders
  // no <nav> but the client renders one → hydration error.
  const [mounted, setMounted] = useState(false);

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    setMounted(true);
  }, []);

  // PRD_New §Wishlist.1: wishlist count badge
  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => apiClient.get<{ items: any[] }>('/wishlist'),
    enabled: mounted && !!user && user.role === 'BUYER',
  });
  const wishlistCount = wishlistData?.items?.length || 0;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-ink-100">
      <div className="container-x">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white font-bold">S</span>
            <span className="font-display text-xl font-extrabold tracking-tight">Shopwave</span>
          </Link>

          {/* PRD_New §Buyer.3: centered nav links — only rendered after client mount */}
          {mounted && isAuthenticated ? (
            <nav className="hidden md:flex items-center justify-center gap-8 flex-1 text-sm font-medium text-ink-700">
              <Link href="/" className="link-hover">Marketplace</Link>
              <Link href="/orders" className="link-hover">My Orders</Link>
              <Link href="/wishlist" className="link-hover inline-flex items-center gap-1">
                Wishlist
                {wishlistCount > 0 && (
                  <span className="h-5 min-w-5 px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link href="/account" className="link-hover">My Account</Link>
            </nav>
          ) : (
            <div className="hidden md:flex flex-1" />
          )}

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            {!mounted ? (
              // Invisible placeholder during SSR to prevent layout shift
              <div className="h-9 w-20" aria-hidden="true" />
            ) : !isAuthenticated ? (
              <Link href="/login" className="btn-primary text-sm">
                Sign in
              </Link>
            ) : (
              <Link href={user?.role === 'ADMIN' ? '/admin/dashboard' : '/account'} className="btn-ghost px-3">
                <User className="h-5 w-5" />
                <span className="hidden sm:inline text-sm">{user?.name?.split(' ')[0]}</span>
              </Link>
            )}
            <button onClick={() => setMobileOpen((v) => !v)} className="btn-ghost px-3 md:hidden">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu — only after mount */}
        {mobileOpen && mounted && (
          <div className="md:hidden border-t border-ink-100 py-3 space-y-1 animate-fade-in">
            <Link href="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-ink-100">Marketplace</Link>
            {isAuthenticated && (
              <>
                <Link href="/orders" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-ink-100">My Orders</Link>
                <Link href="/wishlist" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-ink-100">
                  Wishlist {wishlistCount > 0 && <span className="badge-brand ml-1">{wishlistCount}</span>}
                </Link>
                <Link href="/account" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-ink-100">My Account</Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
