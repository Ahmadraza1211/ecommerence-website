'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';

/**
 * PRD_New §Buyer.5: floating cart icon at lower-right of the screen
 * (moved out of the Navbar).
 */
export function FloatingCartButton() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: () => apiClient.get<{ cart: { totalItems: number } }>('/cart'),
    enabled: !!user && user.role === 'BUYER' && isAuthenticated,
  });

  if (!isAuthenticated || user?.role !== 'BUYER') return null;

  const count = cartData?.cart?.totalItems || 0;

  return (
    <Link
      href="/cart"
      aria-label="View cart"
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 h-14 w-14 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center"
    >
      <ShoppingCart className="h-6 w-6" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 h-6 min-w-6 px-1 rounded-full bg-ink-900 text-white text-xs font-bold flex items-center justify-center border-2 border-white">
          {count}
        </span>
      )}
    </Link>
  );
}
