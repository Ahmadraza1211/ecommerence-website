'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { Sparkles } from 'lucide-react';

interface CategoryWithProducts {
  _id: string;
  name: string;
  slug: string;
  subcategories?: any[];
}

/**
 * V8: Modernized Animated Category Showcase.
 * - Royal indigo gradients, glowing accent orbs, glassmorphic cards
 * - Auto-rotate every 6 seconds
 * - Fetches real product images for the active category
 * - "Featured Showcase" badge (no demo tags)
 */
export function AnimatedCategoryShowcase({ categories }: { categories: CategoryWithProducts[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);

  // V-3: Auto-advance every 6 seconds
  useEffect(() => {
    if (!categories || categories.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((i) => (i + 1) % categories.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [categories.length]);

  if (!categories || categories.length === 0) return null;
  const current = categories[currentIdx];

  return (
    <div className="relative h-[120px] rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-950 via-indigo-900 to-purple-950 shadow-xl">
      {/* Glowing accent orbs */}
      <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-amber-500/20 blur-2xl" />
      <div className="absolute -bottom-8 left-1/3 h-24 w-24 rounded-full bg-purple-500/20 blur-2xl" />

      {/* Category name anchored on the left */}
      <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center px-4 sm:px-8 bg-gradient-to-r from-indigo-950 via-indigo-950/95 to-transparent w-3/4 sm:w-2/3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <p className="text-[9px] text-amber-400/80 font-semibold uppercase tracking-wider">Featured Showcase</p>
          </div>
          <h3 className="font-display text-lg sm:text-2xl font-extrabold text-white drop-shadow-lg line-clamp-1">{current.name}</h3>
          <Link href={`/products?category=${current.slug}`} className="text-[10px] sm:text-xs text-amber-300 hover:text-white mt-0.5 inline-block">
            View all →
          </Link>
        </div>
      </div>

      {/* Sliding real product images */}
      <div className="absolute inset-0 z-10 flex items-center justify-end overflow-hidden">
        <SlidingProductImages key={current._id} category={current} />
      </div>

      {/* Navigation pills */}
      {categories.length > 1 && (
        <div className="absolute bottom-2 right-3 flex gap-1 z-30">
          {categories.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={cn('h-1.5 rounded-full transition-all', i === currentIdx ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/40')}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SlidingProductImages({ category }: { category: CategoryWithProducts }) {
  const [images, setImages] = useState<string[]>([]);
  const [offsets, setOffsets] = useState<number[]>([]);

  // V-2: Fetch real products of this category
  const { data } = useQuery({
    queryKey: ['showcase-products', category.slug],
    queryFn: () => apiClient.get<{ items: any[] }>('/products', { category: category.slug, limit: 6 }),
    staleTime: 60000,
  });

  useEffect(() => {
    const productImages = (data?.items || [])
      .map((p: any) => p.primaryImage || p.images?.[0]?.url)
      .filter(Boolean)
      .slice(0, 5);
    
    if (productImages.length > 0) {
      setImages(productImages);
      const numImages = productImages.length;
      const initial = Array.from({ length: numImages }, (_, i) => 100 + i * 150);
      setOffsets(initial);

      const interval = setInterval(() => {
        setOffsets((prev) => prev.map((o) => {
          const next = o - 1.5;
          return next < -120 ? 600 : next;
        }));
      }, 30);

      const timeout = setTimeout(() => clearInterval(interval), 5500);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [data]);

  if (images.length === 0) {
    // Fallback: gradient placeholders
    return (
      <div className="relative w-full h-full flex items-center justify-end pr-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute h-16 w-16 rounded-xl bg-gradient-to-br from-amber-400/30 to-purple-500/30 backdrop-blur-sm border border-white/10 shadow-lg"
            style={{ right: `${50 + i * 80}px` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {images.map((imgUrl, i) => (
        <div
          key={i}
          className="absolute top-1/2 -translate-y-1/2 h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden shadow-lg border-2 border-white/20 backdrop-blur-sm"
          style={{ right: `${offsets[i] || 100 + i * 150}px` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
}
