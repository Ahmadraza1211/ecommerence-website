'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Zap, TrendingUp, ChevronRight, Package, ChevronLeft } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ProductCard } from '@/components/storefront/ProductCard';
import { InfiniteProductGrid } from '@/components/storefront/InfiniteProductGrid';
import { AnimatedCategoryShowcase } from '@/components/storefront/AnimatedCategoryShowcase';
import { cn } from '@/lib/utils';

export default function MarketplacePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('');
  const [bannerIdx, setBannerIdx] = useState(0);

  const { data: banners } = useQuery({
    queryKey: ['banners', 'active'],
    queryFn: () => apiClient.get<{ items: any[] }>('/banners/active'),
  });

  const { data: categoryTree } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => apiClient.get<{ items: any[] }>('/categories/tree'),
  });

  const { data: featured } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => apiClient.get<{ items: any[] }>('/products/featured'),
  });

  const { data: deals } = useQuery({
    queryKey: ['products', 'deals'],
    queryFn: () => apiClient.get<{ items: any[] }>('/products', { sort: 'discount', limit: 4 }),
  });

  const productsQuery = useMemo(() => ({
    category: activeCategory || undefined,
    subcategory: activeSubcategory || undefined,
    sort: 'newest' as const,
  }), [activeCategory, activeSubcategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/products?q=${encodeURIComponent(search.trim())}`);
    }
  };

  // V-2: Hero Banner Carousel — 6-second auto-slide
  const activeBanners = banners?.items || [];
  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIdx((i) => (i + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  function prevBanner() { setBannerIdx((i) => (i - 1 + activeBanners.length) % activeBanners.length); }
  function nextBanner() { setBannerIdx((i) => (i + 1) % activeBanners.length); }

  return (
    <div className="container-x py-6 relative z-10">
      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="mb-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 rounded-full border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
          <Search className="h-5 w-5 text-ink-400 dark:text-slate-500" />
          <input type="text" placeholder="Search for products, brands, or categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm outline-none placeholder-ink-400 dark:placeholder-slate-500 dark:text-slate-200" />
          {search && <button type="button" onClick={() => setSearch('')} className="text-ink-400 hover:text-ink-600 text-xs">Clear</button>}
          <button type="submit" className="btn-primary text-xs px-3 py-1 rounded-full">Search</button>
        </div>
      </form>

      {/* V-2: Hero Banner Carousel — Left to Right sliding track with small gap */}
      {activeBanners.length > 0 && (
        <div className="mb-6 relative rounded-2xl overflow-hidden h-52 sm:h-64 lg:h-80 group shadow-lg">
          <div
            className="flex h-full transition-transform duration-700 ease-out gap-2"
            style={{ transform: `translateX(-${bannerIdx * 100}%)` }}
          >
            {activeBanners.map((banner: any, i: number) => (
              <div key={banner._id || i} className="relative w-full h-full shrink-0 rounded-2xl overflow-hidden bg-ink-900">
                {banner.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
                <div className="absolute inset-y-0 left-0 flex items-center p-3 sm:p-6 lg:p-8 w-[38%] sm:w-[44%] lg:w-[45%]">
                  <div className="max-w-[14rem] sm:max-w-[18rem] lg:max-w-[22rem] text-white">
                    <span className="inline-block px-2 py-1 rounded-full bg-amber-500/30 text-amber-300 text-[9px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 backdrop-blur-sm border border-amber-400/30">
                      Featured Offer
                    </span>
                    <h2 className="font-display text-base sm:text-2xl lg:text-4xl font-extrabold drop-shadow line-clamp-3 leading-tight">{banner.title}</h2>
                    {banner.subtitle && <p className="text-[10px] sm:text-sm lg:text-base mt-1 text-white/90 line-clamp-2">{banner.subtitle}</p>}
                    {banner.bundleTiers?.length > 0 && (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {banner.bundleTiers.map((t: any, idx: number) => (
                          <span key={idx} className="badge bg-amber-500 text-ink-950 font-bold text-[9px] sm:text-[10px] lg:text-xs shadow">⚡ Buy {t.quantity} → {t.discountPercent}% OFF</span>
                        ))}
                      </div>
                    )}
                    {banner.ctaLink && (
                      <Link href={banner.ctaLink} className="btn-primary mt-3 sm:mt-4 bg-amber-500 hover:bg-amber-600 text-ink-950 font-bold text-[10px] sm:text-xs lg:text-sm px-3 py-2 inline-flex items-center gap-1.5 shadow-md">
                        {banner.ctaText || 'Shop now'} <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Arrows */}
          {activeBanners.length > 1 && (
            <>
              <button onClick={prevBanner} className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={nextBanner} className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm">
                <ChevronRight className="h-5 w-5" />
              </button>
              {/* Dots */}
              <div className="absolute bottom-3 right-4 flex gap-1.5 z-20">
                {activeBanners.map((_: any, i: number) => (
                  <button key={i} onClick={() => setBannerIdx(i)} className={cn('h-1.5 rounded-full transition-all', i === bannerIdx ? 'w-6 bg-amber-400' : 'w-1.5 bg-white/50')} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* V-3: Animated Category Showcase */}
      {categoryTree?.items && categoryTree.items.length > 0 && (
        <div className="mb-6">
          <AnimatedCategoryShowcase categories={categoryTree.items} />
        </div>
      )}

      {/* Flash Deals */}
      {deals?.items && deals.items.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Zap className="h-5 w-5 text-amber-600" /><h2 className="font-display text-xl font-bold dark:text-slate-100">Flash Deals</h2></div>
            <Link href="/products?sort=discount" className="text-sm text-amber-600 hover:text-amber-700 link-hover">See More →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {deals.items.map((p: any) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}

      {/* Seller's Picks */}
      {featured?.items && featured.items.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-amber-600" /><h2 className="font-display text-xl font-bold dark:text-slate-100">Seller's Picks</h2></div>
            <Link href="/products?sort=newest" className="text-sm text-amber-600 hover:text-amber-700 link-hover">See More →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {featured.items.map((p: any) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="mb-8">
        <h2 className="font-display text-xl font-bold mb-3 dark:text-slate-100">Categories</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setActiveCategory(''); setActiveSubcategory(''); }} className={cn('px-4 py-2 rounded-full text-sm font-medium transition-all', !activeCategory ? 'bg-amber-600 text-white' : 'bg-white dark:bg-slate-800 border border-ink-200 dark:border-slate-700 text-ink-700 dark:text-slate-200 hover:border-amber-300')}>All</button>
          {categoryTree?.items?.map((cat: any) => {
            const active = activeCategory === cat.slug;
            return (
              <div key={cat._id} className="relative group">
                <button onClick={() => { setActiveCategory(cat.slug); setActiveSubcategory(''); }} className={cn('px-4 py-2 rounded-full text-sm font-medium transition-all', active ? 'bg-amber-600 text-white' : 'bg-white dark:bg-slate-800 border border-ink-200 dark:border-slate-700 text-ink-700 dark:text-slate-200 hover:border-amber-300')}>{cat.name}</button>
                {cat.subcategories && cat.subcategories.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 hidden group-hover:block z-30 bg-white dark:bg-slate-800 border border-ink-100 dark:border-slate-700 rounded-xl shadow-card min-w-48 py-1">
                    {cat.subcategories.map((sub: any) => (
                      <button key={sub._id} onClick={() => { setActiveCategory(cat.slug); setActiveSubcategory(sub.slug); }} className="block w-full text-left px-3 py-2 text-sm text-ink-700 dark:text-slate-200 hover:bg-ink-50 dark:hover:bg-slate-700">{sub.name}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {activeSubcategory && <button onClick={() => setActiveSubcategory('')} className="text-xs text-amber-600 mt-2 hover:underline">← Clear subcategory filter</button>}
      </section>

      {/* All Products with infinite scroll */}
      <section>
        <div className="flex items-center gap-2 mb-3"><Package className="h-5 w-5 text-amber-600" /><h2 className="font-display text-xl font-bold dark:text-slate-100">All Products</h2></div>
        <InfiniteProductGrid {...productsQuery} />
      </section>

      {/* COD flow strip */}
      <section className="mt-12 bg-slate-900 text-white rounded-2xl">
        <div className="py-8 px-6 grid sm:grid-cols-3 gap-6 text-center">
          <div><div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 mb-3">1</div><h3 className="font-semibold">Add to cart</h3><p className="text-xs text-slate-400 mt-1">Pick your products and proceed to checkout.</p></div>
          <div><div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 mb-3">2</div><h3 className="font-semibold">Confirm on WhatsApp</h3><p className="text-xs text-slate-400 mt-1">A pre-filled WhatsApp message opens with your order details.</p></div>
          <div><div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 mb-3">3</div><h3 className="font-semibold">Seller accepts & ships</h3><p className="text-xs text-slate-400 mt-1">Pay cash on delivery once your order arrives.</p></div>
        </div>
      </section>
    </div>
  );
}
