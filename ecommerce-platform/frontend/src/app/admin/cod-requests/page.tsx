'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Skeleton, EmptyState } from '@/components/ui/Skeleton';
import { formatPKR, timeAgo, shortId, cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  AWAITING_CONVERSATION: 'badge-amber',
  PENDING_SELLER_APPROVAL: 'badge-amber',
  ACCEPTED: 'badge-green',
  REJECTED: 'badge-red',
};

export default function AdminCodRequestsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('PENDING_SELLER_APPROVAL');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'cod-requests', status],
    queryFn: () => apiClient.get<{ items: any[] }>('/admin/cod-requests', { status }),
    refetchInterval: 15000,
  });

  const acceptMut = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/admin/cod-requests/${id}/accept`),
    onSuccess: (data: any) => {
      toast.success(`Accepted${data.autoRejectedCount > 0 ? ` — ${data.autoRejectedCount} competing request(s) auto-rejected` : ''}`);
      qc.invalidateQueries({ queryKey: ['admin', 'cod-requests'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/admin/cod-requests/${id}/reject`, { reason: '' }),
    onSuccess: () => { toast.success('Rejected'); qc.invalidateQueries({ queryKey: ['admin', 'cod-requests'] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const adjustQtyMut = useMutation({
    mutationFn: ({ reqId, variantId, quantity }: { reqId: string; variantId: string; quantity: number }) =>
      apiClient.patch(`/admin/cod-requests/${reqId}/items/${variantId}`, { quantity }),
    onSuccess: () => { toast.success('Quantity updated'); qc.invalidateQueries({ queryKey: ['admin', 'cod-requests'] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-4">COD order requests</h1>
      <div className="card p-3 mb-4 flex gap-2 flex-wrap">
        {['', 'PENDING_SELLER_APPROVAL', 'AWAITING_CONVERSATION', 'ACCEPTED', 'REJECTED'].map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium',
              status === s ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200')}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? <Skeleton className="h-96 w-full" /> : !data?.items?.length ? (
        <EmptyState title="No COD requests" description="When buyers submit COD requests, they'll appear here for approval." />
      ) : (
        <div className="space-y-3">
          {data.items.map((req: any) => (
            <CodRequestCard key={req._id} req={req}
              onAccept={() => acceptMut.mutate(req._id)}
              onReject={() => { if (confirm('Reject this request?')) rejectMut.mutate(req._id); }}
              onAdjustQty={(variantId: string, quantity: number) => adjustQtyMut.mutate({ reqId: req._id, variantId, quantity })}
              acceptPending={acceptMut.isPending} rejectPending={rejectMut.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CodRequestCard({ req, onAccept, onReject, onAdjustQty, acceptPending, rejectPending }: any) {
  const [editingQty, setEditingQty] = useState<Record<string, number>>({});
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="font-display font-bold">Request #{shortId(req._id)}</p>
          <p className="text-xs text-ink-400">{timeAgo(req.createdAt)} · {req.userId?.name}</p>
          <p className="text-[10px] text-ink-400">{req.userId?.phone}</p>
        </div>
        <span className={STATUS_BADGE[req.status]}>{req.status.replace(/_/g, ' ').toLowerCase()}</span>
      </div>
      <div className="space-y-2 mb-3">
        {req.items.map((it: any, i: number) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-ink-50">
            <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center text-xs font-semibold shrink-0">
              {it.title?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{it.title}</p>
              <p className="text-xs text-ink-500">{formatPKR(it.priceAtRequest)} each</p>
            </div>
            <span className="text-sm font-semibold text-ink-700">×{it.quantity}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-sm border-t border-ink-100 pt-2 mb-3">
        <span className="text-ink-600">Total</span>
        <span className="font-display font-bold">{formatPKR(req.total)}</span>
      </div>
      {req.addressId && typeof req.addressId === 'object' && (
        <div className="text-xs text-ink-500 mb-3 p-2 rounded-lg bg-ink-50">
          <p className="font-medium text-ink-700">{req.addressId.fullName}</p>
          <p>{req.addressId.addressLine}, {req.addressId.city} {req.addressId.postalCode}</p>
        </div>
      )}
      {req.status === 'PENDING_SELLER_APPROVAL' && (
        <div className="flex gap-2">
          <button onClick={onAccept} disabled={acceptPending} className="btn-primary text-sm flex-1">
            <Check className="h-4 w-4" /> Accept
          </button>
          <button onClick={onReject} disabled={rejectPending} className="btn-danger text-sm flex-1">
            <X className="h-4 w-4" /> Reject
          </button>
        </div>
      )}
      {req.status === 'ACCEPTED' && <p className="text-xs text-green-700 mt-2">✓ Accepted — linked to order</p>}
      {req.status === 'REJECTED' && <p className="text-xs text-red-700 mt-2">✗ Rejected{req.rejectionReason ? ` — ${req.rejectionReason}` : ''}</p>}
    </div>
  );
}
