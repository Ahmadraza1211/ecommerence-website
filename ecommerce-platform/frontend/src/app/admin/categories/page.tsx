'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Skeleton, EmptyState } from '@/components/ui/Skeleton';
import { Plus, Pencil, Trash2, ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => apiClient.get<{ items: any[] }>('/admin/categories'),
  });

  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  const delMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'categories'] }); qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Deleted'); },
  });
  // V3: Reorder mutation
  const reorderMut = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: string }) => apiClient.patch(`/admin/categories/${id}/reorder`, { direction }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'categories'] }); qc.invalidateQueries({ queryKey: ['categories'] }); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">Categories</h1>
        {!showForm && <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="h-4 w-4" /> Add category</button>}
      </div>

      {showForm && (
        <CategoryForm
          category={editing}
          categories={data?.items || []}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {isLoading ? (
        <Skeleton className="h-60 w-full" />
      ) : !data?.items?.length ? (
        <EmptyState title="No categories" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-600">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Slug</th>
                <th className="text-left p-3">Sort</th>
                <th className="text-left p-3">Active</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c: any, catIdx: number) => (
                <tr key={c._id} className="border-t border-ink-100">
                  <td className="p-3 flex items-center gap-2">
                    {/* V3: Re-ordering buttons */}
                    <div className="flex flex-col gap-0.5 mr-1">
                      <button onClick={() => reorderMut.mutate({ id: c._id, direction: 'up' })} disabled={catIdx === 0} className="text-ink-400 hover:text-amber-600 disabled:opacity-30 text-xs">▲</button>
                      <button onClick={() => reorderMut.mutate({ id: c._id, direction: 'down' })} disabled={catIdx === (data.items.length - 1)} className="text-ink-400 hover:text-amber-600 disabled:opacity-30 text-xs">▼</button>
                    </div>
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-ink-100" />
                    )}
                    <span className="font-medium">{c.name}</span>
                  </td>
                  <td className="p-3 text-ink-500">{c.slug}</td>
                  <td className="p-3">{c.sortOrder}</td>
                  <td className="p-3">{c.isActive ? <span className="badge-green">Yes</span> : <span className="badge-gray">No</span>}</td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => { setEditing(c); setShowForm(true); }} className="btn-ghost p-1.5"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => { if (confirm('Delete?')) delMut.mutate(c._id); }} className="btn-ghost p-1.5 text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CategoryForm({ category, categories, onClose }: { category: any | null; categories: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [form, setForm] = useState({
    name: category?.name || '',
    parentCategoryId: category?.parentCategoryId || '',
    sortOrder: category?.sortOrder ?? (category ? 0 : (categories.length + 1)),
    isActive: category?.isActive ?? true,
  });

  function handleParentChange(parentId: string) {
    if (!category) {
      if (parentId) {
        const parentObj = categories.find((c) => String(c._id) === String(parentId));
        const subCount = parentObj?.subcategories?.length || 0;
        setForm((s) => ({ ...s, parentCategoryId: parentId, sortOrder: subCount + 1 }));
      } else {
        setForm((s) => ({ ...s, parentCategoryId: parentId, sortOrder: categories.length + 1 }));
      }
    } else {
      setForm((s) => ({ ...s, parentCategoryId: parentId }));
    }
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('payload', JSON.stringify(form));
      if (file) fd.append('image', file);
      if (category) return apiClient.upload(`/admin/categories/${category._id}`, fd, 'patch');
      return apiClient.upload('/admin/categories', fd, 'post');
    },
    onSuccess: () => {
      toast.success('Category saved');
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  return (
    <div className="card p-5 mb-4 border-2 border-brand-200">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold">{category ? 'Edit category' : 'New category'}</h2>
        <button onClick={onClose} className="btn-ghost p-1"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Name *</label>
          <input className="input" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Parent category</label>
          <select className="input" value={form.parentCategoryId} onChange={(e) => handleParentChange(e.target.value)}>
            <option value="">— None (top-level) —</option>
            {categories.filter((c) => c._id !== category?._id).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Sort order</label>
          <input type="number" className="input" value={form.sortOrder} onChange={(e) => setForm((s) => ({ ...s, sortOrder: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="label">Active</label>
          <label className="flex items-center gap-2 mt-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))} className="rounded text-brand-600" />
            <span className="text-sm">Show on storefront</span>
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Image (optional)</label>
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-lg border border-ink-200 overflow-hidden bg-ink-50">
              {preview || category?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview || category.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-ink-300"><ImagePlus className="h-5 w-5" /></div>
              )}
            </div>
            <button onClick={() => fileRef.current?.click()} className="btn-outline text-sm">Choose image</button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); } }} />
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">{saveMut.isPending ? 'Saving...' : 'Save'}</button>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
