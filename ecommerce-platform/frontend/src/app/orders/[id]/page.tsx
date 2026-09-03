'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { formatPKR, timeAgo, shortId, cn } from '@/lib/utils';
import { Skeleton, EmptyState } from '@/components/ui/Skeleton';
import { Send, MapPin, MessageCircle, CheckCircle2, Package, Truck, Home } from 'lucide-react';
import { OrderActivityLog } from '@/components/admin/OrderActivityLog';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  CONFIRMED: 'badge-green', SHIPPED: 'badge-amber', OUT_FOR_DELIVERY: 'badge-amber',
  DELIVERED: 'badge-green', CANCELLED: 'badge-red', RETURNED: 'badge-gray',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const msgEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) router.push('/login?redirect=/orders');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => apiClient.get<{ order: any; events: any[] }>(`/orders/${id}`),
    enabled: !!user && !!id,
    refetchInterval: 15000,
  });

  const { data: messagesData } = useQuery({
    queryKey: ['order', id, 'messages'],
    queryFn: () => apiClient.get<{ items: any[] }>(`/orders/${id}/messages`),
    enabled: !!user && !!id,
    refetchInterval: 10000,
  });

  const sendMsgMut = useMutation({
    mutationFn: () => apiClient.post(`/orders/${id}/messages`, { message: msg }),
    onSuccess: () => {
      setMsg('');
      qc.invalidateQueries({ queryKey: ['order', id, 'messages'] });
      qc.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.items?.length]);

  if (!user) return null;
  if (isLoading) return <div className="container-x py-6"><Skeleton className="h-60 w-full" /></div>;
  const order = data?.order;
  if (!order) return <div className="container-x py-6"><EmptyState title="Order not found" /></div>;

  const isDelivered = order.status === 'DELIVERED';
  const isCancelled = order.status === 'CANCELLED';
  const isChatAvailable = !isDelivered && !isCancelled && ['CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.status);

  return (
    <div className="container-x py-6">
      <nav className="text-xs text-ink-500 mb-4">
        <Link href="/orders" className="hover:text-brand-600">My orders</Link> <span className="mx-1">/</span>
        <span className="text-ink-700">Order #{shortId(order._id)}</span>
      </nav>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="font-display text-2xl font-bold">Order #{shortId(order._id)}</h1>
        <span className={STATUS_BADGE[order.status] || 'badge-gray'}>
          {order.status.replace(/_/g, ' ').toLowerCase()}
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          {/* Items */}
          <div className="card p-4">
            <h2 className="font-display font-bold mb-3">Items</h2>
            <div className="space-y-2">
              {order.items.map((it: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b last:border-b-0 border-ink-100">
                  <div className="h-12 w-12 rounded-lg bg-ink-100 flex items-center justify-center text-xs font-semibold">
                    {it.title?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{it.title}</p>
                    {it.variantLabel && <p className="text-xs text-ink-500">{it.variantLabel}</p>}
                    <p className="text-xs text-ink-500">Qty: {it.quantity} × {formatPKR(it.priceAtPurchase)}</p>
                  </div>
                  <p className="font-semibold text-sm">{formatPKR(it.priceAtPurchase * it.quantity)}</p>
                </div>
              ))}
            </div>
            {/* PRD_New V3 §Particular Order.7: standardized Discount/Shipping labeling */}
            <div className="border-t border-ink-100 pt-3 mt-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-ink-600">Subtotal</span><span>{formatPKR(order.subtotal)}</span></div>
              {order.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount: Rs {order.discountAmount}</span><span>-{formatPKR(order.discountAmount)}</span></div>}
              <div className="flex justify-between"><span className="text-ink-600">Shipping</span><span>{order.shippingFee === 0 ? 'Rs 0 (Free)' : formatPKR(order.shippingFee)}</span></div>
              <div className="flex justify-between font-bold text-base mt-1 border-t border-ink-100 pt-2"><span>Total</span><span>{formatPKR(order.total)}</span></div>
            </div>
          </div>

          {/* PRD_New V3: Order Activity Log (newest first) */}
          <OrderActivityLog events={data?.events || []} />

          {/* Chat — hidden when Delivered/Cancelled */}
          {isChatAvailable ? (
            <div className="card p-4">
              <h2 className="font-display font-bold mb-3 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" /> Chat with seller
              </h2>
              <div className="max-h-80 overflow-y-auto space-y-2 mb-3 p-2 bg-ink-50 rounded-xl">
                {messagesData?.items?.length ? (
                  messagesData.items.map((m: any) => (
                    <div key={m._id} className={cn('flex', m.senderRole === 'BUYER' ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm', m.senderRole === 'BUYER' ? 'bg-brand-600 text-white rounded-br-md' : 'bg-white border border-ink-200 rounded-bl-md')}>
                        <p>{m.message}</p>
                        <p className={cn('text-[10px] mt-0.5', m.senderRole === 'BUYER' ? 'text-brand-100' : 'text-ink-400')}>{timeAgo(m.createdAt)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-center text-ink-500 py-4">No messages yet.</p>
                )}
                <div ref={msgEndRef} />
              </div>
              <div className="flex gap-2">
                <input type="text" value={msg} onChange={(e) => setMsg(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && msg.trim()) sendMsgMut.mutate(); }}
                  placeholder="Type a message..." className="input text-sm" />
                <button onClick={() => sendMsgMut.mutate()} disabled={!msg.trim() || sendMsgMut.isPending} className="btn-primary">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-4 text-center">
              <p className="text-sm text-ink-500">
                {isDelivered ? 'Chat is closed for this delivered order.' : 'Chat is unavailable for this order.'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-display font-bold mb-2 flex items-center gap-2"><MapPin className="h-4 w-4" /> Delivery address</h3>
            {order.addressId && typeof order.addressId === 'object' ? (
              <div className="text-sm">
                <p className="font-semibold">{order.addressId.fullName}</p>
                <p className="text-ink-700">{order.addressId.addressLine}</p>
                <p className="text-ink-700">{order.addressId.city} {order.addressId.postalCode}</p>
              </div>
            ) : <p className="text-xs text-ink-500">Address unavailable</p>}
          </div>

          <div className="card p-4">
            <p className="text-xs text-ink-500">Payment method</p>
            <p className="text-sm font-semibold">Cash on Delivery</p>
            <p className="text-xs text-ink-500 mt-2">Payment status</p>
            <p className="text-sm font-semibold">{order.paymentStatus}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
