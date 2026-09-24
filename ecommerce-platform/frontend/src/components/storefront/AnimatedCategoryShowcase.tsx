'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowRight, Sparkles, Flame } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CategoryShowcaseProps {
  categories: any[];
  allProducts?: any[];
}

export function AnimatedCategoryShowcase({ categories, allProducts = [] }: CategoryShowcaseProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeCategory = useMemo(() => {
    if (!categories || categories.length === 0) return null;
    return categories[currentIndex % categories.length];
  }, [categories, currentIndex]);

  const { data: categoryProductsData } = useQuery({
    queryKey: ['products', 'showcase', activeCategory?.slug],
    queryFn: () => apiClient.get<{ items: any[] }>('/products', { category: activeCategory?.slug, limit: 12 }),
    enabled: !!activeCategory?.slug,
  });

  const categoryImages = useMemo(() => {
    const fetchedItems = categoryProductsData?.items || [];
    const imgs: string[] = [];

    fetchedItems.forEach((p: any) => {
      if (p.images && p.images.length > 0) {
        p.images.forEach((img: any) => {
          if (img?.url) imgs.push(img.url);
        });
      } else if (p.primaryImage) {
        imgs.push(p.primaryImage);
      }
    });

    if (imgs.length < 4 && allProducts.length > 0) {
      const catSlug = activeCategory?.slug?.toLowerCase();
      allProducts.forEach((p: any) => {
        const matchesCategory = p.categoryId?.slug?.toLowerCase() === catSlug;
        if (!matchesCategory) return;
        if (p.images?.[0]?.url) imgs.push(p.images[0].url);
        else if (p.primaryImage) imgs.push(p.primaryImage);
      });
    }

    return Array.from(new Set(imgs)).slice(0, 10);
  }, [categoryProductsData, activeCategory, allProducts]);

  useEffect(() => {
    if (!categories || categories.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % categories.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [categories]);

  if (!categories || categories.length === 0 || !activeCategory) return null;

  return (
    <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-indigo-950 via-indigo-900 to-purple-950 shadow-2xl border border-white/10">
      <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-amber-500/20 blur-3xl" />
      <div className="absolute -bottom-8 left-1/3 h-24 w-24 rounded-full bg-purple-500/20 blur-3xl" />

      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-transparent z-10 w-[58%] sm:w-[52%] lg:w-[46%]" />

      <div className="relative z-20 flex min-h-[160px] sm:min-h-[220px] items-center justify-between">
        <div className="w-[35%] sm:w-[38%] lg:w-[42%] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-7">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-gradient-to-r from-amber-500/15 to-brand-500/15 px-2.5 py-1 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-300">
              <Sparkles className="h-3 w-3 text-amber-400" />
              Featured Showcase
            </span>
          </div>

          <h3 key={activeCategory?.name} className="font-display text-lg sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight drop-shadow-md transition-all duration-500 line-clamp-2">
            {activeCategory?.name}
          </h3>

          <Link
            href={`/products?category=${activeCategory?.slug}`}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] sm:text-xs font-bold text-brand-200 transition-colors hover:bg-brand-600/60 hover:text-white"
          >
            <span>Explore Collection</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="relative z-10 flex-1 overflow-hidden py-3 sm:py-5 pr-4 sm:pr-6">
          {categoryImages.length > 0 ? (
            <div className="showcase-marquee">
              <div className="showcase-track">
                {categoryImages.concat(categoryImages).map((imgUrl, idx) => (
                  <div
                    key={`${imgUrl}-${idx}`}
                    className="showcase-card"
                  >
                    <img
                      src={imgUrl}
                      alt="Category preview"
                      className="h-full w-full object-cover opacity-95 transition-opacity"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end pr-3 text-xs italic text-white/40 sm:pr-6">
              Curating collection...
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-3 right-4 z-30 flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 backdrop-blur-md">
        {categories.slice(0, 8).map((cat: any, idx: number) => {
          const isSelected = idx === (currentIndex % categories.length);
          return (
            <button
              key={cat._id || idx}
              onClick={() => setCurrentIndex(idx)}
              title={cat.name}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                isSelected ? 'w-6 bg-gradient-to-r from-amber-400 to-brand-500 shadow-sm' : 'w-2 bg-white/30 hover:bg-white/60'
              )}
            />
          );
        })}
      </div>

      <style jsx>{`
        .showcase-marquee {
          width: 100%;
          overflow: hidden;
          position: relative;
          display: flex;
          justify-content: flex-end;
        }

        .showcase-track {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: max-content;
          animation: showcase-slide 5s linear infinite;
          will-change: transform;
        }

        .showcase-card {
          height: 5rem;
          width: 5rem;
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 0.9rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          box-shadow: 0 18px 34px rgba(0,0,0,0.25);
          transition: transform 0.3s ease;
        }

        .showcase-card:hover {
          transform: translateY(-2px) scale(1.03);
        }

        @media (min-width: 640px) {
          .showcase-card {
            height: 7rem;
            width: 7rem;
          }
        }

        @keyframes showcase-slide {
          0% {
            transform: translateX(-8%);
          }
          100% {
            transform: translateX(0%);
          }
        }
      `}</style>
    </div>
  );
}

export const CategoryShowcase = AnimatedCategoryShowcase;
