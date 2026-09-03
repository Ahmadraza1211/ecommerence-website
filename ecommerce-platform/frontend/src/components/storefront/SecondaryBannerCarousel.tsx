'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * PRD_New §Marketplace.1: secondary banner section becomes an auto-scrolling carousel.
 * One banner shown at full width at a time, auto-advancing every 5 seconds,
 * looping back to the first after the last.
 */
export function SecondaryBannerCarousel({ banners }: { banners: any[] }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % banners.length);
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [banners.length]);

  // Reset to first banner if banners list shrinks
  useEffect(() => {
    if (idx >= banners.length) setIdx(0);
  }, [banners.length, idx]);

  if (!banners || banners.length === 0) return null;

  const current = banners[idx];

  return (
    <div className="relative w-full h-48 sm:h-64 lg:h-72 rounded-2xl overflow-hidden card">
      {/* Stacked banners, only the active one is visible via opacity transition */}
      {banners.map((b, i) => (
        <div
          key={b._id || i}
          className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {b.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 sm:p-8 text-white">
            <h3 className="font-display text-xl sm:text-2xl font-bold drop-shadow">{b.title}</h3>
            {b.subtitle && <p className="text-sm sm:text-base mt-1 text-white/90">{b.subtitle}</p>}
            {b.ctaLink && (
              <Link href={b.ctaLink} className="btn-primary mt-3 bg-white text-brand-600 hover:bg-ink-50 text-sm">
                {b.ctaText || 'Shop now'} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      ))}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Go to banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
