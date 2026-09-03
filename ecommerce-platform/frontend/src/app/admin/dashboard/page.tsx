'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatPKR, timeAgo, shortId } from '@/lib/utils';
import { Package, ShoppingCart, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard', 'summary'],
    queryFn: () => apiClient.get<any>('/admin/dashboard/summary'),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-60 w-full mt-4" />
      </div>
    );
  }

  const d = data;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={DollarSign} label="Revenue" value={formatPKR(d?.revenue || 0)} tone="green" />
        <StatCard icon={ShoppingCart} label="Orders" value={d?.counts?.orders || 0} sub={`${d?.counts?.pending || 0} pending`} />
        <StatCard icon={Package} label="Products" value={d?.counts?.products || 0} sub={`${d?.counts?.lowStock || 0} low stock`} tone={d?.counts?.lowStock > 0 ? 'amber' : 'default'} />
        <StatCard icon={AlertTriangle} label="Pending COD" value={d?.counts?.pendingCodRequests || 0} tone={d?.counts?.pendingCodRequests > 0 ? 'amber' : 'default'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-display font-bold mb-3">Order stats</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <StatRow label="Pending" value={d?.counts?.pending || 0} />
            <StatRow label="Shipped / Out" value={d?.counts?.shipped || 0} />
            <StatRow label="Delivered" value={d?.counts?.delivered || 0} />
            <StatRow label="Cancelled" value={d?.counts?.cancelled || 0} />
          </div>
          {(d?.counts?.pendingCodRequests || 0) > 0 && (
            <Link href="/admin/cod-requests" className="mt-3 block card p-3 bg-amber-50 border-amber-200">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> {d.counts.pendingCodRequests} COD request(s) awaiting approval
              </p>
            </Link>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-display font-bold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Top selling</h2>
          {d?.topProducts?.length ? (
            <div className="space-y-2">
              {d.topProducts.map((tp: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="h-6 w-6 rounded-full bg-brand-100 text-brand-700 text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                    {tp.product?.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tp.product.image} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                    )}
                    <span className="truncate">{tp.product?.title || '—'}</span>
                  </span>
                  <span className="text-ink-600 font-medium shrink-0">{tp.totalSold} sold</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-500 text-center py-6">No sales yet</p>
          )}
        </div>

        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {d?.recentOrders?.length ? d.recentOrders.map((o: any) => (
              <Link key={o._id} href={`/admin/orders/${o._id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-ink-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{o.productName || '—'}</p>
                  <p className="text-xs text-ink-500">#{shortId(o._id)} · {o.userId?.name || 'Buyer'} · {timeAgo(o.createdAt)}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-semibold">{formatPKR(o.total)}</p>
                  <p className="text-xs text-ink-500 capitalize">{o.status.toLowerCase()}</p>
                </div>
              </Link>
            )) : (
              <p className="text-sm text-ink-500 text-center py-6">No orders yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone = 'default' }: any) {
  const toneClass: Record<string, string> = {
    default: 'text-brand-600 bg-brand-50',
    green: 'text-green-600 bg-green-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${toneClass[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-xs text-ink-500 mt-2">{label}</p>
      <p className="font-display font-bold text-lg">{value}</p>
      {sub && <p className="text-[10px] text-ink-400">{sub}</p>}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-ink-50">
      <span className="text-ink-600">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
