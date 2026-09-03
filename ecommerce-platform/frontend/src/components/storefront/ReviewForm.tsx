'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';

export function ReviewForm({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: orderData } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => apiClient.get<{ order: any }>(`/orders/${orderId}`),
  });

  const order = orderData?.order;

  async function submit(productId: string) {
    setSubmitting(true);
    try {
      await apiClient.post('/reviews', { productId, orderId, rating, comment });
      toast.success('Review submitted. Thank you!');
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg">Rate your purchase</h3>
          <button onClick={onClose} className="btn-ghost p-1"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-sm text-ink-600 mb-4">Order #{order._id.slice(-6).toUpperCase()} — Delivered</p>

        <div className="space-y-3 mb-4">
          {order.items.map((it: any) => (
            <div key={String(it.variantId)} className="flex items-center gap-3 p-3 rounded-xl border border-ink-100">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{it.title}</p>
                {it.variantLabel && <p className="text-xs text-ink-500">{it.variantLabel}</p>}
              </div>
              <button
                onClick={() => submit(it.productId)}
                disabled={submitting}
                className="btn-primary text-xs px-3 py-2"
              >
                Review
              </button>
            </div>
          ))}
        </div>

        <div className="mb-3">
          <label className="label">Your rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className="p-1"
                aria-label={`Rate ${n} stars`}
              >
                <Star className={`h-6 w-6 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300'}`} />
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="label">Comment (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Share your experience..."
            className="input"
          />
        </div>
      </div>
    </div>
  );
}
