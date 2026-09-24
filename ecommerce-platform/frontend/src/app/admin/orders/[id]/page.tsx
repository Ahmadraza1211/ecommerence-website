'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Skeleton, EmptyState } from '@/components/ui/Skeleton';
import { formatPKR, timeAgo, shortId, cn } from '@/lib/utils';
import { ArrowLeft, Send, MapPin, MessageCircle, Package, Truck, Home, CheckCircle2, XCircle } from 'lucide-react';
import { OrderActivityLog } from '@/components/admin/OrderActivityLog';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  CONFIRMED: 'badge-green', SHIPPED: 'badge-amber', OUT_FOR_DELIVERY: 'badge-amber',
  DELIVERED: 'badge-green', CANCELLED: 'badge-red', RETURNED: 'badge-gray',
};

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const msgEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: () => apiClient.get<{ order: any; events: any[] }>(`/admin/orders/${id}`),
    refetchInterval: 15000,
  });

  const { data: messagesData } = useQuery({
    queryKey: ['admin', 'order', id, 'messages'],
    queryFn: () => apiClient.get<{ items: any[] }>(`/admin/orders/${id}/messages`),
    refetchInterval: 10000,
  });

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.items?.length]);

  const [editingShipping, setEditingShipping] = useState(false);
  const [shippingInput, setShippingInput] = useState<number>(0);

  const updateShippingMut = useMutation({
    mutationFn: (shippingFee: number) => apiClient.patch(`/admin/orders/${id}/shipping`, { shippingFee }),
    onSuccess: () => {
      toast.success('Shipping cost updated & notification sent to buyer!');
      setEditingShipping(false);
      qc.invalidateQueries({ queryKey: ['admin', 'order', id] });
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to update shipping fee'),
  });

  const updateStatusMut = useMutation({
    mutationFn: (status: string) => apiClient.patch(`/admin/orders/${id}/status`, { status, rejectionReason: reason }),
    onSuccess: () => {
      toast.success('Order updated');
      qc.invalidateQueries({ queryKey: ['admin', 'order', id] });
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const sendMsgMut = useMutation({
    mutationFn: () => apiClient.post(`/admin/orders/${id}/messages`, { message: msg }),
    onSuccess: () => {
      setMsg('');
      qc.invalidateQueries({ queryKey: ['admin', 'order', id, 'messages'] });
      qc.invalidateQueries({ queryKey: ['admin', 'order', id] });
    },
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  const order = data?.order;
  if (!order) return <EmptyState title="Order not found" />;

  const isDelivered = order.status === 'DELIVERED';
  const isCancelled = order.status === 'CANCELLED';
  const isFinal = isDelivered || isCancelled; // PRD_New V3: read-only after final status
  const isChatAvailable = !isFinal && ['CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.status);

  // PRD_New V3 §Particular Order.2: available actions
  const canMarkShipped = order.status === 'CONFIRMED';
  const canMarkDelivered = order.status === 'SHIPPED' || order.status === 'OUT_FOR_DELIVERY';
  const canCancel = ['CONFIRMED', 'SHIPPED'].includes(order.status);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="btn-ghost p-2"><ArrowLeft className="h-4 w-4" /></button>
        <h1 className="font-display text-2xl font-bold">Order #{shortId(order._id)}</h1>
        <span className={STATUS_BADGE[order.status]}>{order.status.replace(/_/g, ' ').toLowerCase()}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          {/* Items */}
          <div className="card p-4">
            <h2 className="font-display font-bold mb-3">Items</h2>
            <div className="space-y-2">
              {order.items.map((it: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0 border-ink-100">
                  <div>
                    <p className="text-sm font-medium">{it.title}</p>
                    {it.variantLabel && <p className="text-xs text-ink-500">{it.variantLabel}</p>}
                    <p className="text-xs text-ink-500">Qty {it.quantity} × {formatPKR(it.priceAtPurchase)}</p>
                  </div>
                  <p className="font-semibold text-sm">{formatPKR(it.priceAtPurchase * it.quantity)}</p>
                </div>
              ))}
            </div>
            {/* Standardized labeling + Shipping Editor */}
            <div className="border-t border-ink-100 pt-3 mt-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-ink-600">Subtotal</span><span>{formatPKR(order.subtotal)}</span></div>
              {order.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount: Rs {order.discountAmount}</span><span>-{formatPKR(order.discountAmount)}</span></div>}
              
              <div className="flex justify-between items-center py-1">
                <span className="text-ink-600">Shipping Fee:</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{order.shippingFee === 0 ? 'Rs 0 (Free)' : formatPKR(order.shippingFee)}</span>
                  {!isFinal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShippingInput(order.shippingFee || 0);
                        setEditingShipping(true);
                      }}
                      className="text-xs text-brand-600 hover:underline font-semibold ml-1"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {editingShipping && !isFinal && (
                <div className="p-3 my-2 rounded-xl bg-brand-50/50 border border-brand-200 space-y-2">
                  <label className="text-xs font-bold text-ink-700">Set Shipping Cost (PKR):</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min="0"
                      value={shippingInput}
                      onChange={(e) => setShippingInput(Math.max(0, Number(e.target.value)))}
                      className="input text-xs flex-1 bg-white"
                      placeholder="e.g. 200 (or 0 for Free)"
                    />
                    <button
                      type="button"
                      onClick={() => setShippingInput(0)}
                      className="btn-outline text-xs px-2 py-1.5"
                    >
                      Free (0)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateShippingMut.mutate(shippingInput)}
                      disabled={updateShippingMut.isPending}
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      {updateShippingMut.isPending ? 'Saving...' : 'Save & Notify Buyer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingShipping(false)}
                      className="btn-ghost text-xs px-2 py-1.5"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-500">Updating shipping fee will recalculate total and instantly notify the buyer.</p>
                </div>
              )}

              <div className="flex justify-between font-bold text-base mt-1 border-t border-ink-100 pt-2"><span>Total</span><span>{formatPKR(order.total)}</span></div>
            </div>
          </div>

          {/* PRD_New V3 §Particular Order.2-3: explicit action buttons or read-only */}
          {!isFinal ? (
            <div className="card p-4">
              <h2 className="font-display font-bold mb-3">Actions</h2>
              <div className="flex flex-wrap gap-2">
                {canMarkShipped && (
                  <button
                    onClick={() => updateStatusMut.mutate('SHIPPED')}
                    disabled={updateStatusMut.isPending}
                    className="btn-primary text-sm"
                  >
                    <Truck className="h-4 w-4" /> Mark Shipped
                  </button>
                )}
                {canMarkDelivered && (
                  <button
                    onClick={() => updateStatusMut.mutate('DELIVERED')}
                    disabled={updateStatusMut.isPending}
                    className="btn-primary text-sm bg-green-600 hover:bg-green-700"
                  >
                    <Home className="h-4 w-4" /> Mark Delivered
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={() => {
                      if (confirm('Cancel this order? Stock will be returned to inventory.')) {
                        updateStatusMut.mutate('CANCELLED');
                      }
                    }}
                    disabled={updateStatusMut.isPending}
                    className="btn-danger text-sm"
                  >
                    <XCircle className="h-4 w-4" /> Cancel Order
                  </button>
                )}
              </div>
              {order.status === 'CONFIRMED' && <p className="text-xs text-ink-500 mt-2">Mark this order as Shipped to enable the Delivered action.</p>}
            </div>
          ) : (
            <div className="card p-4 text-center">
              <p className="text-sm text-ink-500">
                {isDelivered ? '✓ This order has been delivered. No further actions available.' : '✗ This order was cancelled. No further actions available.'}
              </p>
            </div>
          )}

          {/* PRD_New V3: Order Activity Log */}
          <OrderActivityLog events={data?.events || []} />

          {/* Chat */}
          {isChatAvailable ? (
            <div className="card p-4">
              <h2 className="font-display font-bold mb-3">Chat with buyer</h2>
              <div className="max-h-80 overflow-y-auto space-y-2 mb-3 p-2 bg-ink-50 rounded-xl">
                {messagesData?.items?.length ? messagesData.items.map((m: any) => (
                  <div key={m._id} className={cn('flex', m.senderRole === 'SELLER' ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                      m.senderRole === 'SELLER' ? 'bg-brand-600 text-white rounded-br-md' : 'bg-white border border-ink-200 rounded-bl-md')}>
                      <p>{m.message}</p>
                      <p className={cn('text-[10px] mt-0.5', m.senderRole === 'SELLER' ? 'text-brand-100' : 'text-ink-400')}>{timeAgo(m.createdAt)}</p>
                    </div>
                  </div>
                )) : <p className="text-xs text-center text-ink-500 py-4">No messages yet.</p>}
                <div ref={msgEndRef} />
              </div>
              <div className="flex gap-2">
                <input type="text" value={msg} onChange={(e) => setMsg(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && msg.trim()) sendMsgMut.mutate(); }}
                  placeholder="Type a reply..." className="input text-sm" />
                <button onClick={() => sendMsgMut.mutate()} disabled={!msg.trim()} className="btn-primary"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          ) : (
            <div className="card p-4 text-center">
              <p className="text-sm text-ink-500">Chat is closed for this order.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* PRD_New V3 §Particular Order.6: removed buyer's email and phone */}
          <div className="card p-4">
            <h3 className="font-display font-bold mb-2 flex items-center gap-2"><MapPin className="h-4 w-4" /> Delivery address</h3>
            <p className="text-sm font-semibold">{order.userId?.name}</p>
            {order.addressId && typeof order.addressId === 'object' && (
              <div className="mt-2 text-sm">
                <p>{order.addressId.fullName}</p>
                <p className="text-ink-700">{order.addressId.addressLine}</p>
                <p className="text-ink-700">{order.addressId.city} {order.addressId.postalCode}</p>
              </div>
            )}
          </div>
          <div className="card p-4">
            <p className="text-xs text-ink-500">Payment</p>
            <p className="font-semibold text-sm">Cash on Delivery · {order.paymentStatus}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
