'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Skeleton, EmptyState } from '@/components/ui/Skeleton';
import { formatPKR, timeAgo, shortId, cn } from '@/lib/utils';
import { NotificationBadge } from '@/components/storefront/NotificationBadge';

const STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TIME_TABS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Past 7 days' },
  { value: '30d', label: 'Past 30 days' },
  { value: 'all', label: 'All time' },
];

const STATUS_BADGE: Record<string, string> = {
  CONFIRMED: 'badge-green', SHIPPED: 'badge-amber', OUT_FOR_DELIVERY: 'badge-amber',
  DELIVERED: 'badge-green', CANCELLED: 'badge-red', RETURNED: 'badge-gray',
};

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('ALL');
  const [timeRange, setTimeRange] = useState('all');
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', status, timeRange, page, activeCategory],
    queryFn: () => apiClient.get<any>('/admin/orders', { status, timeRange, page, limit: 5, categoryId: activeCategory || undefined }),
    refetchInterval: 15000,
  });

  const { data: categoryTree } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => apiClient.get<{ items: any[] }>('/categories/tree'),
  });
  const { data: unreadSummary } = useQuery({
    queryKey: ['admin', 'orders', 'unread-summary'],
    queryFn: () => apiClient.get<any>('/admin/orders/unread-summary/overview'),
    refetchInterval: 15000,
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-4">Orders</h1>
      <div className="grid lg:grid-cols-[200px_1fr] gap-4">
        {/* PRD_New V3 §Seller Orders.2: Category sidebar now works (sends categoryId to backend) */}
        <aside className="hidden lg:block">
          <div className="card p-3 sticky top-6">
            <h3 className="label">Categories</h3>
            <div className="space-y-1">
              <button onClick={() => setActiveCategory('')}
                className={cn('flex items-center justify-between w-full text-left px-2 py-1.5 rounded-lg text-sm',
                  !activeCategory ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-ink-50')}>
                All
              </button>
              {categoryTree?.items?.map((c: any) => {
                const unread = unreadSummary?.categoryUnread?.[String(c._id)] || 0;
                return (
                  <div key={c._id}>
                    <button onClick={() => setActiveCategory(String(c._id))}
                      className={cn('flex items-center justify-between w-full text-left px-2 py-1.5 rounded-lg text-sm',
                        activeCategory === String(c._id) ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-ink-50')}>
                      <span className="truncate">{c.name}</span>
                      <NotificationBadge count={unread} />
                    </button>
                    {c.subcategories?.map((sub: any) => {
                      const subUnread = unreadSummary?.categoryUnread?.[String(sub._id)] || 0;
                      return (
                        <button key={sub._id} onClick={() => setActiveCategory(String(sub._id))}
                          className={cn('flex items-center justify-between w-full text-left px-2 py-1.5 rounded-lg text-xs ml-3',
                            activeCategory === String(sub._id) ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-ink-50')}>
                          <span className="truncate">↳ {sub.name}</span>
                          <NotificationBadge count={subUnread} />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <div>
          <div className="card p-3 mb-3 flex gap-2 flex-wrap">
            {TIME_TABS.map((t) => (
              <button key={t.value} onClick={() => { setTimeRange(t.value); setPage(1); }}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium',
                  timeRange === t.value ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200')}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="card p-3 mb-3 flex gap-2 flex-wrap">
            {STATUS_TABS.map((s) => {
              const count = s.value === 'ALL'
                ? Object.values(data?.statusCounts || {}).reduce((a: number, b: any) => a + (b || 0), 0)
                : (data?.statusCounts?.[s.value] || 0);
              return (
                <button key={s.value} onClick={() => { setStatus(s.value); setPage(1); }}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5',
                    status === s.value ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200')}>
                  {s.label}
                  {count > 0 && <span className={cn('h-4 min-w-4 px-1 rounded-full text-[10px] flex items-center justify-center',
                    status === s.value ? 'bg-white/20' : 'bg-white')}>{count}</span>}
                </button>
              );
            })}
          </div>

          {isLoading ? <Skeleton className="h-96 w-full" /> : !data?.items?.length ? (
            <EmptyState title="No orders match your filters" />
          ) : (
            <>
              <div className="space-y-4">
                {data.groupedByBuyer.map((group: any) => (
                  <div key={group.buyer?._id || 'unknown'} className="card overflow-hidden">
                    <div className="bg-ink-50 px-4 py-2 border-b border-ink-100">
                      <p className="text-sm font-semibold">{group.buyer?.name || 'Unknown buyer'}</p>
                      <p className="text-xs text-ink-500">{group.orders.length} order(s)</p>
                    </div>
                    <div className="divide-y divide-ink-100">
                      {group.orders.map((o: any) => (
                        <Link key={o._id} href={`/admin/orders/${o._id}`} className="flex items-center gap-3 p-3 hover:bg-ink-50 relative">
                          {o.unreadCount > 0 && <div className="absolute top-3 right-3"><NotificationBadge count={o.unreadCount} /></div>}
                          <div className="h-10 w-10 rounded-lg bg-ink-100 flex items-center justify-center text-xs font-semibold shrink-0">
                            {o.productName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0 pr-8">
                            <p className="text-sm font-medium truncate">{o.productName}</p>
                            <p className="text-xs text-ink-500">#{shortId(o._id)} · {timeAgo(o.createdAt)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold">{formatPKR(o.total)}</p>
                            <span className={STATUS_BADGE[o.status] || 'badge-gray'}>{o.status.replace(/_/g, ' ').toLowerCase()}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {data.pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline text-sm px-3 py-2 disabled:opacity-40">Previous</button>
                  <span className="text-sm text-ink-600">Page {page} of {data.pagination.pages}</span>
                  <button onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))} disabled={page === data.pagination.pages} className="btn-outline text-sm px-3 py-2 disabled:opacity-40">Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
