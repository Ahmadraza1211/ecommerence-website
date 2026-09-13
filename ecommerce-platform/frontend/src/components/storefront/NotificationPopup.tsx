'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Bell, Star, Check, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { timeAgo } from '@/lib/utils';
import { ReviewForm } from './ReviewForm';

/**
 * V7/V8: Notification popup — grouped by Order ID into cards.
 * Multiple activities on the same order are grouped into one card.
 * No raw chronological stream text.
 */
export function NotificationPopup() {
  const user = useAuthStore((s) => s.user);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [reviewOpen, setReviewOpen] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => apiClient.get<{ items: any[]; unreadCount: number }>('/notifications?unread=true'),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Group notifications by orderId
  const grouped = (data?.items || [])
    .filter((n: any) => !dismissed.includes(n._id))
    .reduce((acc: any[], n: any) => {
      const key = n.orderId ? String(n.orderId) : `no-order-${n._id}`;
      const existing = acc.find((g) => g.key === key);
      if (existing) {
        existing.notifications.push(n);
      } else {
        acc.push({ key, orderId: n.orderId, notifications: [n] });
      }
      return acc;
    }, []);

  async function dismissGroup(group: any) {
    for (const n of group.notifications) {
      try { await apiClient.patch(`/notifications/${n._id}/read`); } catch {}
      setDismissed((d) => [...d, n._id]);
    }
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }

  async function dismissOne(id: string) {
    try { await apiClient.patch(`/notifications/${id}/read`); } catch {}
    setDismissed((d) => [...d, id]);
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }

  if (!user || grouped.length === 0) return null;

  const currentGroup = grouped[0];

  // Check if any notification in this group is ORDER_DELIVERED
  const hasDelivered = currentGroup.notifications.some((n: any) => n.type === 'ORDER_DELIVERED');
  const deliveredNotif = currentGroup.notifications.find((n: any) => n.type === 'ORDER_DELIVERED');

  return (
    <>
      {reviewOpen && deliveredNotif && (
        <ReviewForm orderId={reviewOpen} onClose={() => { setReviewOpen(null); dismissGroup(currentGroup); }} />
      )}
      <div className="fixed top-20 right-4 z-50 max-w-sm w-[calc(100%-2rem)] sm:w-96 card overflow-hidden animate-slide-up">
        <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-white p-4 flex items-start gap-3">
          <Bell className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Activity Update</p>
            {currentGroup.orderId && (
              <p className="text-xs text-amber-100 mt-0.5">Order #{String(currentGroup.orderId).slice(-6).toUpperCase()}</p>
            )}
          </div>
          <button onClick={() => dismissGroup(currentGroup)} className="text-white/80 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          {/* Grouped notification entries */}
          <div className="space-y-2">
            {currentGroup.notifications.map((n: any) => (
              <div key={n._id} className="flex items-start gap-2 text-sm">
                <span className="text-amber-600 mt-0.5">•</span>
                <div className="flex-1">
                  <p className="text-ink-700 dark:text-slate-200">{n.title}</p>
                  <p className="text-xs text-ink-400">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          {hasDelivered && (
            <div className="mt-4 flex gap-2">
              <button onClick={() => setReviewOpen(currentGroup.orderId)} className="btn-primary text-xs px-3 py-2 flex-1">
                <Star className="h-3.5 w-3.5" /> Leave a review
              </button>
              <button onClick={() => dismissGroup(currentGroup)} className="btn-outline text-xs px-3 py-2">
                <Check className="h-3.5 w-3.5" /> Later
              </button>
            </div>
          )}
          {!hasDelivered && (
            <button onClick={() => dismissGroup(currentGroup)} className="btn-outline text-xs px-3 py-2 w-full mt-4">Dismiss</button>
          )}
          {grouped.length > 1 && (
            <p className="text-[10px] text-ink-500 mt-3 text-center">{grouped.length} groups</p>
          )}
        </div>
      </div>
    </>
  );
}
