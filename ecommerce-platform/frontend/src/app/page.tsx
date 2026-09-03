'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Zap, TrendingUp, ChevronRight, Package } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ProductCard } from '@/components/storefront/ProductCard';
import { InfiniteProductGrid } from '@/components/storefront/InfiniteProductGrid';

export default function MarketplacePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('');

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

  // PRD_New V4: ONE Banner Section only (the first/primary banner)
  const primaryBanner = banners?.items?.[0];

  return (
    <div className="container-x py-6">
      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="mb-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-white px-4 py-3 focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
          <Search className="h-5 w-5 text-ink-400" />
          <input type="text" placeholder="Search for products, brands, or categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm outline-none placeholder-ink-400" />
          {search && <button type="button" onClick={() => setSearch('')} className="text-ink-400 hover:text-ink-600 text-xs">Clear</button>}
          <button type="submit" className="btn-primary text-xs px-3 py-1 rounded-full">Search</button>
        </div>
      </form>

      {/* PRD_New V4: ONE Banner Section only */}
      {primaryBanner && (
        <div className="mb-6 card overflow-hidden relative h-48 sm:h-64 lg:h-80">
          {primaryBanner.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primaryBanner.imageUrl} alt={primaryBanner.title} className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 sm:p-8 lg:p-12 text-white">
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold drop-shadow">{primaryBanner.title}</h2>
            {primaryBanner.subtitle && <p className="text-sm sm:text-base mt-1 text-white/90">{primaryBanner.subtitle}</p>}
            {primaryBanner.hasBundleDeal && primaryBanner.bundleTiers?.length > 0 && (
              <div className="mt-2 flex gap-2">
                {primaryBanner.bundleTiers.map((tier: any, i: number) => (
                  <span key={i} className="badge bg-white/20 text-white text-xs">Buy {tier.quantity} → {tier.discountPercent}% off</span>
                ))}
              </div>
            )}
            {primaryBanner.ctaLink && (
              <Link href={primaryBanner.ctaLink} className="btn-primary mt-4 bg-white text-brand-600 hover:bg-ink-50">
                {primaryBanner.ctaText || 'Shop now'} <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Flash Deals (BEFORE Categories) */}
      {deals?.items && deals.items.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Zap className="h-5 w-5 text-brand-600" /><h2 className="font-display text-xl font-bold">Flash Deals</h2></div>
            <Link href="/products?sort=discount" className="text-sm text-brand-600 hover:text-brand-700 link-hover">See More →</Link>
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
            <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-brand-600" /><h2 className="font-display text-xl font-bold">Seller&apos;s Picks</h2></div>
            <Link href="/products?sort=newest" className="text-sm text-brand-600 hover:text-brand-700 link-hover">See More →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {featured.items.map((p: any) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}

      {/* Categories (plain text heading + tabs) */}
      <section className="mb-8">
        <h2 className="font-display text-xl font-bold mb-3">Categories</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setActiveCategory(''); setActiveSubcategory(''); }} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!activeCategory ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-700 hover:border-brand-300'}`}>All</button>
          {categoryTree?.items?.map((cat: any) => {
            const active = activeCategory === cat.slug;
            return (
              <div key={cat._id} className="relative group">
                <button onClick={() => { setActiveCategory(cat.slug); setActiveSubcategory(''); }} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${active ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-700 hover:border-brand-300'}`}>{cat.name}</button>
                {cat.subcategories && cat.subcategories.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 hidden group-hover:block z-30 bg-white border border-ink-100 rounded-xl shadow-card min-w-48 py-1">
                    {cat.subcategories.map((sub: any) => (
                      <button key={sub._id} onClick={() => { setActiveCategory(cat.slug); setActiveSubcategory(sub.slug); }} className="block w-full text-left px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">{sub.name}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {activeSubcategory && <button onClick={() => setActiveSubcategory('')} className="text-xs text-brand-600 mt-2 hover:underline">← Clear subcategory filter</button>}
      </section>

      {/* All Products with infinite scroll */}
      <section>
        <div className="flex items-center gap-2 mb-3"><Package className="h-5 w-5 text-brand-600" /><h2 className="font-display text-xl font-bold">All Products</h2></div>
        <InfiniteProductGrid {...productsQuery} />
      </section>

      {/* COD flow strip */}
      <section className="mt-12 bg-ink-900 text-white rounded-2xl">
        <div className="py-8 px-6 grid sm:grid-cols-3 gap-6 text-center">
          <div><div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 mb-3">1</div><h3 className="font-semibold">Add to cart</h3><p className="text-xs text-ink-400 mt-1">Pick your products and proceed to checkout.</p></div>
          <div><div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 mb-3">2</div><h3 className="font-semibold">Confirm on WhatsApp</h3><p className="text-xs text-ink-400 mt-1">A pre-filled WhatsApp message opens with your order details.</p></div>
          <div><div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 mb-3">3</div><h3 className="font-semibold">Seller accepts & ships</h3><p className="text-xs text-ink-400 mt-1">Pay cash on delivery once your order arrives.</p></div>
        </div>
      </section>
    </div>
  );
}
