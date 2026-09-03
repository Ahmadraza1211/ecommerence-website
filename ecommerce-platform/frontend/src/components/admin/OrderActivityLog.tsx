'use client';

import { timeAgo, cn } from '@/lib/utils';
import { CheckCircle2, Package, Truck, Home, XCircle, MessageSquare, Clock } from 'lucide-react';

const EVENT_ICONS: Record<string, any> = {
  COD_REQUEST_CREATED: Clock,
  COD_REQUEST_ACCEPTED: CheckCircle2,
  COD_REQUEST_REJECTED: XCircle,
  ORDER_CONFIRMED: CheckCircle2,
  ORDER_SHIPPED: Package,
  ORDER_OUT_FOR_DELIVERY: Truck,
  ORDER_DELIVERED: Home,
  ORDER_CANCELLED: XCircle,
  MESSAGE_SENT: MessageSquare,
  QUANTITY_ADJUSTED: Package,
};

/**
 * PRD_New V3 §Chronological Ordering: Order Activity Log.
 * Shows every status-changing event for an order as a timeline,
 * with the newest event at the top (newest → oldest).
 */
export function OrderActivityLog({ events }: { events: any[] }) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-ink-500 text-center py-4">No activity yet.</p>;
  }

  // PRD_New V3 §Chronological Ordering: newest event at top
  const sortedEvents = events
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="card p-4">
      <h3 className="font-display font-bold mb-3">Order activity</h3>
      <ol className="space-y-3">
        {sortedEvents.map((event: any, i: number) => {
          const Icon = EVENT_ICONS[event.type] || Clock;
          const isLatest = i === 0;
          return (
            <li key={event._id} className="flex items-start gap-3">
              <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                isLatest ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500')}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm', isLatest ? 'font-semibold text-ink-900' : 'text-ink-700')}>
                  {event.message}
                </p>
                <p className="text-xs text-ink-400">
                  {timeAgo(event.createdAt)} · {event.actorRole.toLowerCase()}
                </p>
              </div>
              {isLatest && <span className="badge-brand text-[10px]">latest</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
