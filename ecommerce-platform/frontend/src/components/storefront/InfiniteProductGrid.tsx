'use client';

import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton, EmptyState } from '@/components/ui/Skeleton';
import Link from 'next/link';

interface InfiniteProductGridProps {
  category?: string;
  subcategory?: string;
  search?: string;
  sort?: string;
}

/**
 * PRD_New V3 §Buyer.4: Infinite scroll / lazy loading.
 * Loads 12 products initially, fetches 12 more as the user scrolls near
 * the bottom via IntersectionObserver.
 */
export function InfiniteProductGrid({ category, subcategory, search, sort = 'newest' }: InfiniteProductGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['products', 'infinite', { category, subcategory, search, sort }],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get<{ items: any[]; pagination: any }>('/products', {
        category, subcategory, search, sort, page: pageParam, limit: 12,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.page < lastPage.pagination.pages
        ? lastPage.pagination.page + 1
        : undefined;
    },
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const allProducts = data?.pages?.flatMap((p) => p.items) || [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    );
  }

  if (!allProducts.length) {
    return (
      <EmptyState
        title="No products found"
        description={search ? `No products match "${search}".` : 'Try a different category.'}
        action={<Link href="/" className="btn-primary">Browse all</Link>}
      />
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {allProducts.map((p: any) => <ProductCard key={p._id} product={p} />)}
      </div>
      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-10 flex items-center justify-center mt-6">
        {isFetchingNextPage && <ProductCardSkeleton />}
      </div>
    </div>
  );
}
