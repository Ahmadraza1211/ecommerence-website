'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { formatPKR, timeAgo, shortId, cn } from '@/lib/utils';
import { Skeleton, EmptyState } from '@/components/ui/Skeleton';
import { NotificationBadge } from '@/components/storefront/NotificationBadge';
import { useRouter } from 'next/navigation';

const STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_BADGE: Record<string, string> = {
  CONFIRMED: 'badge-green',
  SHIPPED: 'badge-amber',
  OUT_FOR_DELIVERY: 'badge-amber',
  DELIVERED: 'badge-green',
  CANCELLED: 'badge-red',
  RETURNED: 'badge-gray',
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'COD Confirmed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};

export default function OrdersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('ALL');

  useEffect(() => {
    if (!user) router.push('/login?redirect=/orders');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'list'],
    queryFn: () => apiClient.get<{ items: any[] }>('/orders/me/list'),
    enabled: !!user,
    refetchInterval: 15000,
  });

  if (!user) return null;

  // PRD_New V3 §My Orders.1: filter tabs
  let orders = data?.items || [];
  if (activeTab === 'ACTIVE') {
    orders = orders.filter((o: any) => ['CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status));
  } else if (activeTab === 'DELIVERED') {
    orders = orders.filter((o: any) => o.status === 'DELIVERED');
  } else if (activeTab === 'CANCELLED') {
    orders = orders.filter((o: any) => o.status === 'CANCELLED');
  }

  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl font-bold mb-4">My Orders</h1>

      {/* PRD_New V3 §My Orders.1: filter tabs */}
      <div className="flex gap-2 mb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium',
              activeTab === tab.value ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : !orders.length ? (
        <EmptyState
          title="No orders found"
          description="When you place an order, it will appear here."
          action={<Link href="/" className="btn-primary">Browse marketplace</Link>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* PRD_New V3 §My Orders.3: product-centric cards with status */}
          {orders.map((order: any) => {
            const firstItem = order.items[0];
            const isDelivered = order.status === 'DELIVERED';
            const isCancelled = order.status === 'CANCELLED';
            const isChatAvailable = !isDelivered && !isCancelled && ['CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.status);
            const itemCount = order.items.reduce((s: number, i: any) => s + i.quantity, 0);
            const productName = firstItem ? (order.items.length > 1 ? `${firstItem.title} +${order.items.length - 1}` : firstItem.title) : '—';

            return (
              <Link
                key={order._id}
                href={`/orders/${order._id}`}
                className="card p-4 hover:shadow-glow transition-all relative"
              >
                {/* PRD_New V3: unread badge */}
                {order.unreadCount > 0 && isChatAvailable && (
                  <div className="absolute top-3 right-3">
                    <NotificationBadge count={order.unreadCount} />
                  </div>
                )}
                {/* Product image */}
                <div className="flex gap-3 mb-3">
                  <div className="h-16 w-16 rounded-xl bg-ink-100 flex items-center justify-center text-xl font-bold text-ink-400 shrink-0">
                    {firstItem?.title?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <p className="font-medium text-sm line-clamp-2">{productName}</p>
                    <span className={cn('badge text-[10px] mt-1', STATUS_BADGE[order.status] || 'badge-gray')}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>
                </div>
                {/* PRD_New V3 §My Orders.1: subtotal + item count on the right */}
                <div className="flex items-center justify-between text-xs text-ink-500 border-t border-ink-100 pt-2">
                  <span>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
                  <span className="font-bold text-sm text-ink-900">{formatPKR(order.total)}</span>
                </div>
                {isChatAvailable && order.unreadCount > 0 && (
                  <p className="text-[10px] text-brand-600 mt-2 font-medium">
                    {order.unreadCount} new message{order.unreadCount === 1 ? '' : 's'}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
