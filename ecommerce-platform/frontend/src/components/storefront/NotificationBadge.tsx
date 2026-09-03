'use client';

import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count?: number;
  /** If true, show a dot instead of a count (for "something new" without a number) */
  dot?: boolean;
  className?: string;
}

/**
 * PRD_New §Notification Badges: reusable dot/count badge.
 * - dot = true → small red dot (no count)
 * - count > 0 → red circle with the number
 * - count = 0 → renders nothing
 */
export function NotificationBadge({ count, dot, className }: NotificationBadgeProps) {
  if (dot) {
    return <span className={cn('inline-block h-2 w-2 rounded-full bg-brand-600 animate-pulse', className)} />;
  }
  if (!count || count <= 0) return null;
  return (
    <span className={cn(
      'inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold',
      className
    )}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
