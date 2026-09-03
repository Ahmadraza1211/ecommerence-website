'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { formatPKR, timeAgo, shortId, cn } from '@/lib/utils';
import { Skeleton, EmptyState } from '@/components/ui/Skeleton';
import { Package, TrendingUp, Star } from 'lucide-react';

export default function PurchaseHistoryPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) router.push('/login?redirect=/purchase-history');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-history', page],
    queryFn: () => apiClient.get<any>('/purchase-history', { page }),
    enabled: !!user,
  });

  if (!user) return null;

  return (
    <div className="container-x py-6">
      <div className="flex items-center gap-2 mb-6">
        <Package className="h-6 w-6 text-brand-600" />
        <h1 className="font-display text-2xl font-bold">Purchase History</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !data?.items?.length ? (
        <EmptyState
          title="No purchases yet"
          description="Your completed and paid orders will appear here."
          action={<Link href="/" className="btn-primary">Browse marketplace</Link>}
        />
      ) : (
        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          {/* Main list */}
          <div className="space-y-3">
            <div className="card p-4 bg-brand-50 border-brand-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-ink-500">Lifetime total spent</p>
                  <p className="font-display text-2xl font-bold text-brand-700">{formatPKR(data.summary.lifetimeTotal)}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-ink-500">Orders</p>
                  <p className="font-bold text-lg">{data.summary.totalOrders}</p>
                </div>
              </div>
            </div>

            {data.items.map((item: any, i: number) => (
              <div key={i} className="card p-4 flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-ink-100 overflow-hidden shrink-0">
                  {item.productImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.productImage} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.productTitle}</p>
                  <p className="text-xs text-ink-500">
                    {new Date(item.datePaid).toLocaleDateString()} · {new Date(item.datePaid).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-ink-500">Qty: {item.quantity} · {item.paymentStatus}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">{formatPKR(item.amountPaid)}</p>
                  {/* PRD_New V3: Review status */}
                  {item.hasReview ? (
                    <span className="badge-green text-[10px] mt-1 inline-flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 fill-current" /> Reviewed
                    </span>
                  ) : (
                    <Link href={`/orders/${item.orderId}`} className="text-[10px] text-brand-600 hover:underline mt-1 inline-block">
                      Leave a review
                    </Link>
                  )}
                </div>
              
              </div>
            ))}

            {/* Pagination */}
            {data.pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline text-sm disabled:opacity-40">Previous</button>
                <span className="text-sm text-ink-600">Page {page} of {data.pagination.pages}</span>
                <button onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))} disabled={page === data.pagination.pages} className="btn-outline text-sm disabled:opacity-40">Next</button>
              </div>
            )}
          </div>

          {/* Per-category spend breakdown */}
          <aside>
            <div className="card p-4 sticky top-24">
              <h3 className="font-display font-bold text-sm mb-3">Spend by category</h3>
              {data.summary.categoryBreakdown.length > 0 ? (
                <div className="space-y-2">
                  {data.summary.categoryBreakdown.map((cat: any, i: number) => {
                    const maxTotal = data.summary.categoryBreakdown[0].total;
                    const pct = maxTotal > 0 ? (cat.total / maxTotal) * 100 : 0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium">{cat.categoryName}</span>
                          <span className="text-ink-500">{formatPKR(cat.total)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-ink-500">No category data</p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
