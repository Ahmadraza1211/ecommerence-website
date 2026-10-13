'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ProductCard } from '@/components/storefront/ProductCard';
import { ProductCardSkeleton, EmptyState } from '@/components/ui/Skeleton';
import { PriceRangeSlider } from '@/components/storefront/PriceRangeSlider';
import { ChevronDown, SlidersHorizontal, X, RotateCcw, Check } from 'lucide-react';

const PRICE_MIN = 0;
const PRICE_MAX = 20000;

export default function ProductsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // PRD_New §Marketplace.4: category filter from URL is now properly resolved on the backend
  const category = sp.get('category') || '';
  const subcategory = sp.get('subcategory') || '';
  const search = sp.get('q') || sp.get('search') || '';
  const sort = sp.get('sort') || 'newest';
  const minPrice = sp.get('minPrice') ? Number(sp.get('minPrice')) : PRICE_MIN;
  const maxPrice = sp.get('maxPrice') ? Number(sp.get('maxPrice')) : PRICE_MAX;
  const inStock = sp.get('inStock') === 'true';

  const [priceRange, setPriceRange] = useState({ min: minPrice, max: maxPrice });

  useEffect(() => setPage(1), [category, subcategory, search, sort, inStock]);
  useEffect(() => setPriceRange({ min: minPrice, max: maxPrice }), [minPrice, maxPrice]);

  const params = useMemo(() => ({
    category, subcategory, search, sort,
    minPrice: priceRange.min, maxPrice: priceRange.max,
    inStock: inStock ? 'true' : undefined,
    page, limit: 12,
  }), [category, subcategory, search, sort, priceRange, inStock, page]);

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'list', params],
    queryFn: () => apiClient.get<{ items: any[]; pagination: any }>('/products', params),
  });

  const { data: categoryTree } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => apiClient.get<{ items: any[] }>('/categories/tree'),
  });

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`/products?${next.toString()}`);
  }

  const isCustomPrice = minPrice > PRICE_MIN || maxPrice < PRICE_MAX;
  const activeFilterCount = (category ? 1 : 0) + (subcategory ? 1 : 0) + (inStock ? 1 : 0) + (isCustomPrice ? 1 : 0);

  function resetAllFilters() {
    router.push('/products');
  }

  // PRD_New §Buyer.4: Category as plain text heading, with selection tabs below
  const activeCategoryObj = categoryTree?.items?.find((c: any) => c.slug === category);

  return (
    <div className="container-x py-6">
      <nav className="text-xs text-ink-500 mb-3 flex items-center justify-between">
        <div>
          <Link href="/" className="hover:text-brand-600">Marketplace</Link>
          <span className="mx-1">/</span>
          <span className="text-ink-700">Products</span>
        </div>
        <Link href="/" className="btn-outline text-xs px-3 py-1 flex items-center gap-1">
          ← Back to Marketplace
        </Link>
      </nav>

      {/* Heading & Search Query */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-3">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1">
            {search ? `Search results for "${search}"` : activeCategoryObj ? activeCategoryObj.name : 'All Products'}
          </h1>
          <p className="text-sm text-ink-500">{data?.pagination?.total || 0} items found</p>
        </div>

        {activeFilterCount > 0 && (
          <button
            onClick={resetAllFilters}
            className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 self-start sm:self-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Clear all filters ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Category tabs */}
      {categoryTree?.items && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => updateParam('category', '')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!category ? 'bg-amber-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 border border-ink-200 dark:border-slate-700 text-ink-700 dark:text-slate-200 hover:border-amber-300'}`}
          >
            All
          </button>
          {categoryTree.items.map((c: any) => (
            <button
              key={c._id}
              onClick={() => updateParam('category', c.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${category === c.slug ? 'bg-amber-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 border border-ink-200 dark:border-slate-700 text-ink-700 dark:text-slate-200 hover:border-amber-300'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Subcategory tabs (if a category is selected) */}
      {activeCategoryObj?.subcategories?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => updateParam('subcategory', '')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${!subcategory ? 'bg-ink-900 text-white' : 'bg-ink-100 dark:bg-slate-800 text-ink-600 dark:text-slate-300 hover:bg-ink-200'}`}
          >
            All subcategories
          </button>
          {activeCategoryObj.subcategories.map((sub: any) => (
            <button
              key={sub._id}
              onClick={() => updateParam('subcategory', sub.slug)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${subcategory === sub.slug ? 'bg-ink-900 text-white' : 'bg-ink-100 dark:bg-slate-800 text-ink-600 dark:text-slate-300 hover:bg-ink-200'}`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Mobile Filter & Sort Toolbar */}
      <div className="lg:hidden flex items-center justify-between gap-2.5 mb-5 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-ink-200 dark:border-slate-800 shadow-sm sticky top-16 z-30">
        <button
          type="button"
          onClick={() => setShowMobileFilters(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-ink-50 dark:bg-slate-800 text-ink-800 dark:text-slate-100 font-bold text-xs border border-ink-100 dark:border-slate-700 active:scale-95 transition-all shadow-sm"
        >
          <SlidersHorizontal className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="h-5 min-w-5 px-1.5 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="flex-1 relative">
          <select
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="w-full appearance-none py-2.5 pl-3 pr-8 rounded-xl bg-ink-50 dark:bg-slate-800 text-ink-800 dark:text-slate-100 font-bold text-xs border border-ink-100 dark:border-slate-700 outline-none shadow-sm cursor-pointer"
          >
            <option value="newest">Sort: Newest</option>
            <option value="discount">Sort: Biggest discount</option>
            <option value="price-low">Sort: Price (Low to High)</option>
            <option value="price-high">Sort: Price (High to Low)</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400 pointer-events-none" />
        </div>
      </div>

      {/* Mobile Filter Drawer / Bottom Sheet */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden flex flex-col justify-end" onClick={() => setShowMobileFilters(false)}>
          <div
            className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 animate-slide-up shadow-2xl border-t border-ink-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-ink-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-ink-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-amber-600" />
                <h3 className="font-display font-bold text-base text-ink-900 dark:text-slate-100">Filters & Sort</h3>
              </div>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetAllFilters}
                    className="text-xs text-red-500 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                )}
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-1 rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {/* Sort by chips */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-slate-400 mb-2.5">
                  Sort By
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'newest', label: 'Newest Arrivals' },
                    { id: 'discount', label: '⚡ Biggest Discount' },
                    { id: 'price-low', label: 'Price: Low to High' },
                    { id: 'price-high', label: 'Price: High to Low' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => updateParam('sort', s.id)}
                      className={cn(
                        'py-2.5 px-3 rounded-xl text-xs font-semibold text-center transition-all border',
                        sort === s.id
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-ink-50 dark:bg-slate-800 border-ink-100 dark:border-slate-700 text-ink-700 dark:text-slate-300'
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-slate-400 mb-2">
                  Price Range (PKR)
                </h4>
                <PriceRangeSlider
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  value={priceRange}
                  onChange={(v) => {
                    setPriceRange(v);
                    updateParam('minPrice', String(v.min));
                    updateParam('maxPrice', String(v.max));
                  }}
                />
              </div>

              {/* Availability */}
              <div className="pt-2">
                <label className="flex items-center justify-between p-3 rounded-xl bg-ink-50 dark:bg-slate-800 cursor-pointer">
                  <span className="text-sm font-semibold text-ink-800 dark:text-slate-200">In stock only</span>
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : '')}
                    className="h-5 w-5 rounded border-ink-300 text-amber-600 focus:ring-amber-200"
                  />
                </label>
              </div>

              {/* Apply Button */}
              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="btn-primary w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 font-bold text-sm shadow-lg text-white"
              >
                Apply & View Products ({data?.pagination?.total || 0})
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block">
          <div className="card p-4 space-y-4 sticky top-24">
            <div>
              <h3 className="label">Sort by</h3>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => updateParam('sort', e.target.value)}
                  className="input text-sm py-1.5 pr-8 appearance-none"
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="discount">Biggest discount</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
              </div>
            </div>

            {/* Price range slider */}
            <div>
              <h3 className="label">Price range</h3>
              <PriceRangeSlider
                min={PRICE_MIN}
                max={PRICE_MAX}
                value={priceRange}
                onChange={(v) => {
                  setPriceRange(v);
                  updateParam('minPrice', String(v.min));
                  updateParam('maxPrice', String(v.max));
                }}
              />
            </div>

            <div>
              <h3 className="label">Availability</h3>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : '')}
                  className="rounded border-ink-300 text-brand-600 focus:ring-brand-200"
                />
                In stock only
              </label>
            </div>
          </div>
        </aside>

        {/* Listing */}
        <div>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : data?.items?.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {data.items.map((p: any) => <ProductCard key={p._id} product={p} />)}
            </div>
          ) : (
            <EmptyState
              title="No products found"
              description="Try changing the filters or search keywords."
              action={<Link href="/products" className="btn-primary">View all products</Link>}
            />
          )}

          {data?.pagination && data.pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-outline text-sm px-3 py-2 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-ink-600">Page {page} of {data.pagination.pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                disabled={page === data.pagination.pages}
                className="btn-outline text-sm px-3 py-2 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
