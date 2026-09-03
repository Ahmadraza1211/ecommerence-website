'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Skeleton, EmptyState } from '@/components/ui/Skeleton';
import { timeAgo, cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminReviewsPage() {
  const qc = useQueryClient();
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reviews', sort],
    queryFn: () => apiClient.get<{ items: any[]; groups: any[] }>('/admin/dashboard/reviews', { sort: 'time' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => apiClient.patch(`/admin/dashboard/reviews/${id}`, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'reviews'] }); toast.success('Updated'); },
  });

  if (isLoading) return <Skeleton className="h-60 w-full" />;

  // PRD-New §Seller Review: group by category, sortable/filterable by time
  const groups = data?.groups || [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-4">Reviews</h1>

      {/* Sort controls */}
      <div className="card p-3 mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setSort('newest')}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium',
            sort === 'newest' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200')}
        >
          Newest first
        </button>
        <button
          onClick={() => setSort('oldest')}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium',
            sort === 'oldest' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200')}
        >
          Oldest first
        </button>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn('px-3 py-1.5 rounded-full text-xs font-medium',
            activeCategory === 'all' ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-700')}
        >
          All categories
        </button>
        {groups.map((g: any) => (
          <button
            key={g.categoryId}
            onClick={() => setActiveCategory(g.categoryId)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium',
              activeCategory === g.categoryId ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-700')}
          >
            {g.categoryName} ({g.reviews.length})
          </button>
        ))}
      </div>

      {!groups.length ? (
        <EmptyState title="No reviews yet" description="Reviews appear here once buyers submit them after delivery." />
      ) : (
        <div className="space-y-6">
          {groups
            .filter((g: any) => activeCategory === 'all' || g.categoryId === activeCategory)
            .map((group: any) => {
              const reviews = sort === 'oldest' ? [...group.reviews].reverse() : group.reviews;
              return (
                <div key={group.categoryId}>
                  <h2 className="font-display font-bold text-lg mb-2">{group.categoryName}</h2>
                  <div className="space-y-2">
                    {reviews.map((r: any) => (
                      <div key={r._id} className={cn('card p-4', r.isHidden && 'opacity-60')}>
                        <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                          <div>
                            <p className="font-semibold text-sm">
                              {r.userId?.name || 'Anonymous'} on {r.productId?.title || 'Product'}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <Star key={n} className={cn('h-3 w-3', n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                              ))}
                              <span className="text-xs text-ink-500 ml-1">{timeAgo(r.createdAt)}</span>
                              {r.isVerifiedPurchase && <span className="badge-green text-[10px] ml-2">Verified</span>}
                              {r.isHidden && <span className="badge-red text-[10px] ml-2">Hidden</span>}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => updateMut.mutate({ id: r._id, patch: { isHidden: !r.isHidden } })} className="btn-outline text-xs">
                              {r.isHidden ? 'Unhide' : 'Hide'}
                            </button>
                          </div>
                        </div>
                        {r.comment && <p className="text-sm text-ink-700">{r.comment}</p>}
                        {r.sellerReply ? (
                          <div className="mt-2 ml-3 pl-3 border-l-2 border-ink-200">
                            <p className="text-xs font-semibold text-ink-700">Your reply</p>
                            <p className="text-xs text-ink-600">{r.sellerReply}</p>
                          </div>
                        ) : (
                          <ReplyBox onSubmit={(text) => updateMut.mutate({ id: r._id, patch: { sellerReply: text } })} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function ReplyBox({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');
  const [show, setShow] = useState(false);
  if (!show) return <button onClick={() => setShow(true)} className="text-xs text-brand-600 mt-2 hover:underline">Reply</button>;
  return (
    <div className="mt-2">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="input text-xs" placeholder="Write a reply..." />
      <div className="flex gap-1 mt-1">
        <button onClick={() => { onSubmit(text); setText(''); setShow(false); }} className="btn-primary text-xs px-3 py-1.5">Post reply</button>
        <button onClick={() => setShow(false)} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
      </div>
    </div>
  );
}
