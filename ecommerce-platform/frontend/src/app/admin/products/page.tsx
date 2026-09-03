'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Skeleton, EmptyState } from '@/components/ui/Skeleton';
import { formatPKR } from '@/lib/utils';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  // PRD_New §Seller Products.1: category filter + out-of-stock filter
  const [categoryFilter, setCategoryFilter] = useState('');
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products', search, categoryFilter],
    queryFn: () => apiClient.get<{ items: any[]; total: number; outOfStock: number }>('/admin/products', { search, category: categoryFilter }),
  });

  const { data: categoryTree } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => apiClient.get<{ items: any[] }>('/categories/tree'),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'products'] }); toast.success('Product deleted'); },
  });

  let items = data?.items || [];
  // PRD-New: out-of-stock filter (client-side since stock is on variants)
  if (outOfStockOnly) {
    items = items.filter((p: any) => (p.variants || []).every((v: any) => v.stockQuantity <= 0) || (p.variants || []).length === 0);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="font-display text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="btn-primary text-sm">
          <Plus className="h-4 w-4" /> Add product
        </Link>
      </div>

      {/* PRD-New §Seller Products.1: total count */}
      <div className="flex items-center gap-3 mb-4 text-sm">
        <span className="badge-gray">Total: {data?.total ?? '—'}</span>
        <span className="badge-red">Out of stock: {data?.outOfStock ?? '—'}</span>
      </div>

      <div className="card p-3 mb-4 flex gap-2 flex-wrap items-center">
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none"
          />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input text-sm w-auto">
          <option value="">All categories</option>
          {categoryTree?.items?.map((c: any) => (
            <optgroup key={c._id} label={c.name}>
              <option value={c.slug}>{c.name}</option>
              {c.subcategories?.map((sub: any) => (
                <option key={sub._id} value={sub.slug}>{c.name} › {sub.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={outOfStockOnly} onChange={(e) => setOutOfStockOnly(e.target.checked)} className="rounded text-brand-600" />
          Out of stock only
        </label>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : !items.length ? (
        <EmptyState title="No products" action={<Link href="/admin/products/new" className="btn-primary">Add product</Link>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-600">
                <tr>
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-left p-3 font-medium">Price</th>
                  <th className="text-left p-3 font-medium">Stock</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p: any) => {
                  const totalStock = (p.variants || []).reduce((s: number, v: any) => s + (v.stockQuantity || 0), 0);
                  return (
                    <tr key={p._id} className="border-t border-ink-100">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-lg bg-ink-100 overflow-hidden shrink-0">
                            {p.images?.[0]?.url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{p.title}</p>
                            <p className="text-xs text-ink-500">{p.categoryId?.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{formatPKR(p.basePrice)}</td>
                      <td className="p-3">
                        {totalStock > 0 ? (
                          <span className={totalStock <= 5 ? 'text-amber-600 font-semibold' : ''}>{totalStock}</span>
                        ) : (
                          <span className="badge-red">Out of stock</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`badge ${p.status === 'PUBLISHED' ? 'badge-green' : 'badge-gray'}`}>{p.status}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-end">
                          <Link href={`/admin/products/${p._id}/edit`} className="btn-ghost p-1.5">
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => { if (confirm('Delete this product?')) delMut.mutate(p._id); }}
                            className="btn-ghost p-1.5 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
