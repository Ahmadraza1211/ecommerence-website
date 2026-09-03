'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CategoryWithProducts {
  _id: string;
  name: string;
  slug: string;
  subcategories?: any[];
}

/**
 * PRD_New V3 §Marketplace.1: Animated category showcase.
 * Category name anchored on the left, thumbnail images sliding in from the right
 * and passing behind the category name text. After ~15 seconds, transitions
 * to the next category. Compact height (120px).
 */
export function AnimatedCategoryShowcase({ categories }: { categories: CategoryWithProducts[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [slidingImages, setSlidingImages] = useState<any[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance to next category every 15 seconds
  useEffect(() => {
    if (!categories || categories.length <= 1) return;
    const catTimer = setInterval(() => {
      setCurrentIdx((i) => (i + 1) % categories.length);
    }, 15000);
    return () => clearInterval(catTimer);
  }, [categories.length]);

  if (!categories || categories.length === 0) return null;
  const current = categories[currentIdx];

  return (
    <div className="relative h-[120px] card overflow-hidden bg-gradient-to-r from-ink-900 to-ink-800">
      {/* Category name anchored on the left */}
      <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center px-6 sm:px-8 bg-gradient-to-r from-ink-900 via-ink-900/95 to-transparent">
        <div>
          <p className="text-[10px] text-brand-400 font-semibold uppercase tracking-wider mb-1">Browse</p>
          <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white drop-shadow-lg">{current.name}</h3>
          <Link href={`/products?category=${current.slug}`} className="text-xs text-brand-300 hover:text-white mt-1 inline-block">
            View all →
          </Link>
        </div>
      </div>

      {/* Sliding thumbnail images */}
      <div className="absolute inset-0 z-10 flex items-center justify-end overflow-hidden">
        <SlidingImages key={current._id} category={current} />
      </div>

      {/* Category dots */}
      {categories.length > 1 && (
        <div className="absolute bottom-2 right-3 flex gap-1 z-30">
          {categories.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={cn('h-1 rounded-full transition-all', i === currentIdx ? 'w-4 bg-white' : 'w-1 bg-white/40')}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SlidingImages({ category }: { category: CategoryWithProducts }) {
  const [offsets, setOffsets] = useState<number[]>([]);

  useEffect(() => {
    // Generate placeholder thumbnails sliding from right to left
    const numImages = 4;
    const initial = Array.from({ length: numImages }, (_, i) => 100 + i * 180);
    setOffsets(initial);

    const interval = setInterval(() => {
      setOffsets((prev) => prev.map((o) => {
        const next = o - 2;
        return next < -200 ? 800 : next;
      }));
    }, 30);

    // Clear after 15 seconds (when the parent switches categories)
    const timeout = setTimeout(() => clearInterval(interval), 14500);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [category._id]);

  // Use gradient placeholders representing product images
  const gradients = [
    'from-brand-400 to-brand-600',
    'from-amber-400 to-amber-600',
    'from-green-400 to-green-600',
    'from-blue-400 to-blue-600',
  ];

  return (
    <div className="relative w-full h-full">
      {offsets.map((offset, i) => (
        <div
          key={i}
          className={cn('absolute top-1/2 -translate-y-1/2 h-20 w-20 rounded-xl bg-gradient-to-br shadow-lg', gradients[i % gradients.length])}
          style={{ right: `${offset}px` }}
        />
      ))}
    </div>
  );
}
