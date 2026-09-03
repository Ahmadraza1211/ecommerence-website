'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ProductCard } from '@/components/storefront/ProductCard';
import { ProductCardSkeleton, EmptyState } from '@/components/ui/Skeleton';
import { PriceRangeSlider } from '@/components/storefront/PriceRangeSlider';
import { ChevronDown } from 'lucide-react';

const PRICE_MIN = 0;
const PRICE_MAX = 20000;

export default function ProductsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [page, setPage] = useState(1);

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
      <h1 className="font-display text-2xl font-bold mb-1">
        {search ? `Search results for "${search}"` : activeCategoryObj ? activeCategoryObj.name : 'All Products'}
      </h1>
      <p className="text-sm text-ink-500 mb-4">{data?.pagination?.total || 0} items found</p>

      {/* Category tabs */}
      {categoryTree?.items && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => updateParam('category', '')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${!category ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-700 hover:border-brand-300'}`}
          >
            All
          </button>
          {categoryTree.items.map((c: any) => (
            <button
              key={c._id}
              onClick={() => updateParam('category', c.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${category === c.slug ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-700 hover:border-brand-300'}`}
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
            className={`px-2.5 py-1 rounded-full text-[11px] ${!subcategory ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}
          >
            All subcategories
          </button>
          {activeCategoryObj.subcategories.map((sub: any) => (
            <button
              key={sub._id}
              onClick={() => updateParam('subcategory', sub.slug)}
              className={`px-2.5 py-1 rounded-full text-[11px] ${subcategory === sub.slug ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        {/* Filters */}
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

            {/* PRD_New §Marketplace.5: price range slider */}
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
