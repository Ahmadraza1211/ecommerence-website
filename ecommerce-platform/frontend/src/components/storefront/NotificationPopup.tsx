'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Bell, Star, Check } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { timeAgo } from '@/lib/utils';
import { ReviewForm } from './ReviewForm';

/**
 * PRD_New V3 §Chronological Ordering.1: newest notification first.
 */
export function NotificationPopup() {
  const user = useAuthStore((s) => s.user);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [reviewOpen, setReviewOpen] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => apiClient.get<{ items: any[]; unreadCount: number }>('/notifications?unread=true'),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // PRD_New V3: sort newest first
  const sortedItems = (data?.items || [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter((n) => !dismissed.includes(n._id));
  const current = sortedItems[currentIdx];

  async function dismiss(id: string) {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setDismissed((d) => [...d, id]);
      setCurrentIdx(0);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    } catch {}
  }

  if (!user || !current) return null;

  const isDelivered = current.type === 'ORDER_DELIVERED';

  return (
    <>
      {reviewOpen && (
        <ReviewForm orderId={reviewOpen} onClose={() => { setReviewOpen(null); dismiss(current._id); }} />
      )}
      <div className="fixed top-20 right-4 z-50 max-w-sm w-[calc(100%-2rem)] sm:w-96 card overflow-hidden animate-slide-up">
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 text-white p-4 flex items-start gap-3">
          <Bell className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">{current.title}</p>
            <p className="text-xs text-brand-100 mt-0.5">{timeAgo(current.createdAt)}</p>
          </div>
          <button onClick={() => dismiss(current._id)} className="text-white/80 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-ink-700">{current.body}</p>
          {isDelivered && (
            <div className="mt-4 flex gap-2">
              <button onClick={() => setReviewOpen(current.orderId)} className="btn-primary text-xs px-3 py-2 flex-1">
                <Star className="h-3.5 w-3.5" /> Leave a review
              </button>
              <button onClick={() => dismiss(current._id)} className="btn-outline text-xs px-3 py-2">
                <Check className="h-3.5 w-3.5" /> Later
              </button>
            </div>
          )}
          {!isDelivered && (
            <button onClick={() => dismiss(current._id)} className="btn-outline text-xs px-3 py-2 w-full mt-4">Dismiss</button>
          )}
          {sortedItems.length > 1 && (
            <p className="text-[10px] text-ink-500 mt-3 text-center">{currentIdx + 1} of {sortedItems.length} unread</p>
          )}
        </div>
      </div>
    </>
  );
}
