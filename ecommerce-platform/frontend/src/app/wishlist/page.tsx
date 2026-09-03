'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { ProductCard } from '@/components/storefront/ProductCard';
import { Skeleton, EmptyState } from '@/components/ui/Skeleton';
import { Heart, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) router.push('/login?redirect=/wishlist');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => apiClient.get<{ items: any[] }>('/wishlist'),
    enabled: !!user,
  });

  // PRD_New §Wishlist.1: ability to remove individual items
  const removeMut = useMutation({
    mutationFn: (productId: string) => apiClient.delete(`/wishlist/${productId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Removed from wishlist');
    },
  });

  if (!user) return null;

  const count = data?.items?.length || 0;

  if (isLoading) {
    return (
      <div className="container-x py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-6">
      <div className="flex items-center gap-2 mb-6">
        <Heart className="h-6 w-6 text-brand-600" />
        <h1 className="font-display text-2xl font-bold">Your wishlist</h1>
        {/* PRD_New §Wishlist.1: count badge */}
        <span className="badge-brand ml-2">{count} item{count === 1 ? '' : 's'}</span>
      </div>
      {!data?.items?.length ? (
        <EmptyState
          title="No saved items"
          description="Tap the heart on any product to save it for later."
          action={<Link href="/" className="btn-primary">Browse marketplace</Link>}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {data.items.map((p: any) => (
            <div key={p._id} className="relative group">
              <ProductCard product={p} />
              <button
                onClick={() => removeMut.mutate(p._id)}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white shadow-card flex items-center justify-center text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove from wishlist"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
