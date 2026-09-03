'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, ShoppingCart, User, Heart } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';

export function MobileTabBar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: () => apiClient.get<{ cart: { totalItems: number } }>('/cart'),
    enabled: !!user && user.role === 'BUYER',
  });

  const items = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/products', label: 'Shop', icon: Search },
    { href: '/cart', label: 'Cart', icon: ShoppingCart, badge: cartData?.cart?.totalItems },
    { href: '/wishlist', label: 'Wishlist', icon: Heart },
    { href: user ? '/account' : '/login', label: 'Account', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-ink-100 grid grid-cols-5">
      {items.map(({ href, label, icon: Icon, badge }) => {
        const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium relative',
              active ? 'text-brand-600' : 'text-ink-500'
            )}
          >
            <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
            <span>{label}</span>
            {badge ? (
              <span className="absolute top-1 right-1/4 h-4 min-w-4 px-1 rounded-full bg-brand-600 text-white text-[9px] font-bold flex items-center justify-center">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
