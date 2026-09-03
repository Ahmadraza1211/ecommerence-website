'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { formatPKR, timeAgo, shortId } from '@/lib/utils';
import { Skeleton, EmptyState } from '@/components/ui/Skeleton';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_BADGE: Record<string, string> = {
  AWAITING_CONVERSATION: 'badge-amber',
  PENDING_SELLER_APPROVAL: 'badge-amber',
  ACCEPTED: 'badge-green',
  REJECTED: 'badge-red',
};

export default function CodRequestsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) router.push('/login?redirect=/cod-requests');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['cod-requests', 'me'],
    queryFn: () => apiClient.get<{ items: any[] }>('/cod-requests/me/list'),
    enabled: !!user,
    refetchInterval: 15000,
  });

  if (!user) return null;

  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl font-bold mb-6">My COD requests</h1>
      <p className="text-sm text-ink-600 mb-4">
        These are the COD order requests you&apos;ve started. They become real orders once the seller accepts them.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : !data?.items?.length ? (
        <EmptyState
          title="No COD requests"
          description="Start a COD checkout from your cart to see it here."
          action={<Link href="/products" className="btn-primary">Browse products</Link>}
        />
      ) : (
        <div className="space-y-3">
          {data.items.map((req: any) => (
            <div key={req._id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-display font-bold">Request #{shortId(req._id)}</p>
                  <p className="text-xs text-ink-500">{timeAgo(req.createdAt)} · {req.items.length} item(s)</p>
                </div>
                <span className={STATUS_BADGE[req.status]}>
                  {req.status.replace(/_/g, ' ').toLowerCase()}
                </span>
              </div>
              <div className="text-sm text-ink-700">
                <p>{req.items.map((i: any) => `${i.title} ×${i.quantity}`).join(', ')}</p>
                <p className="font-semibold mt-1">Total: {formatPKR(req.total)}</p>
              </div>
              {req.status === 'AWAITING_CONVERSATION' && (
                <div className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                  Click <Link href="/checkout" className="underline font-semibold">checkout</Link> to resume the WhatsApp confirmation flow.
                </div>
              )}
              {req.status === 'ACCEPTED' && req.orderId && (
                <Link href={`/orders/${req.orderId}`} className="btn-outline text-xs mt-3 inline-flex">
                  View order →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
