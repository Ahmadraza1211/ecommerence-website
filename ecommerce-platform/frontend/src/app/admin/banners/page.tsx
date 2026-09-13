'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Skeleton, EmptyState } from '@/components/ui/Skeleton';
import { toLocalInput, cn } from '@/lib/utils';
import { ImagePlus, X, Plus, Pencil, Trash2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminBannersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: () => apiClient.get<{ items: any[] }>('/admin/banners'),
  });

  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  const delMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/banners/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'banners'] }); qc.invalidateQueries({ queryKey: ['banners', 'active'] }); toast.success('Deleted'); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Banners</h1>
          <p className="text-sm text-ink-500 mt-1">Create banners for your marketplace homepage.</p>
        </div>
        {!showForm && <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary text-sm"><Plus className="h-4 w-4" /> New Banner</button>}
      </div>

      {showForm && <BannerForm banner={editing} onClose={() => { setShowForm(false); setEditing(null); }} />}

      {isLoading ? <Skeleton className="h-60 w-full" /> : !data?.items?.length ? (
        <EmptyState title="No banners yet" description="Create your first banner to promote products on the marketplace." action={<button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary">Create banner</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((b: any) => {
            const now = new Date();
            const isActive = b.isActive && new Date(b.startAt) <= now && new Date(b.endAt) >= now;
            const isUpcoming = new Date(b.startAt) > now;
            return (
              <div key={b._id} className="card overflow-hidden">
                <div className="relative aspect-video bg-ink-100">
                  {b.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                  )}
                  <span className={cn('absolute top-2 right-2', isActive ? 'badge-green' : isUpcoming ? 'badge-amber' : 'badge-gray')}>
                    {isActive ? 'Active' : isUpcoming ? 'Upcoming' : 'Expired'}
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-sm">{b.title}</p>
                  {b.subtitle && <p className="text-xs text-ink-500 line-clamp-1 mt-0.5">{b.subtitle}</p>}
                  <p className="text-[10px] text-ink-500 mt-2">{new Date(b.startAt).toLocaleDateString()} → {new Date(b.endAt).toLocaleDateString()}</p>
                  {b.bundleTiers?.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {b.bundleTiers.map((t: any, i: number) => (<span key={i} className="badge-red text-[10px]">Buy {t.quantity} → {t.discountPercent}% off</span>))}
                    </div>
                  )}
                  <div className="flex gap-1 mt-3">
                    <button onClick={() => { setEditing(b); setShowForm(true); }} className="btn-outline text-xs flex-1"><Pencil className="h-3 w-3" /> Edit</button>
                    <button onClick={() => { if (confirm('Delete this banner?')) delMut.mutate(b._id); }} className="btn-ghost text-xs text-red-600 px-2"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BannerForm({ banner, onClose }: { banner: any | null; onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [editingImage, setEditingImage] = useState<string>(banner?.imageUrl || '');
  const [removedImage, setRemovedImage] = useState(false);

  // PRD_New V4: Clean, simple form with sensible defaults
  const [form, setForm] = useState({
    title: banner?.title || '',
    subtitle: banner?.subtitle || '',
    endAt: banner?.endAt ? toLocalInput(banner.endAt) : toLocalInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    isActive: banner?.isActive ?? true,
    autoStart: true,
    startAt: banner?.startAt ? toLocalInput(banner.startAt) : '',
    ctaCategory: banner?.ctaCategory || '',
    ctaProduct: banner?.ctaProduct || '',
    bundleTiers: banner?.bundleTiers || [],
  });
  const [newTier, setNewTier] = useState({ quantity: 2, discountPercent: 20 });

  const { data: categoryTree } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => apiClient.get<{ items: any[] }>('/categories/tree'),
  });

  const { data: productsInCategory } = useQuery({
    queryKey: ['products', 'for-banner', form.ctaCategory],
    queryFn: () => apiClient.get<{ items: any[] }>('/products', { category: form.ctaCategory, limit: 50 }),
    enabled: !!form.ctaCategory,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (form.startAt && form.endAt && new Date(form.endAt) <= new Date(form.startAt)) {
        throw { response: { data: { error: 'End time must be after the start time' } } };
      }
      const fd = new FormData();
      fd.append('payload', JSON.stringify({ ...form, bundleTiers: form.bundleTiers, removeImage: removedImage }));
      if (file) fd.append('image', file);
      if (banner) return apiClient.upload(`/admin/banners/${banner._id}`, fd, 'patch');
      return apiClient.upload('/admin/banners', fd, 'post');
    },
    onSuccess: () => {
      toast.success('Banner saved');
      qc.invalidateQueries({ queryKey: ['admin', 'banners'] });
      qc.invalidateQueries({ queryKey: ['banners', 'active'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to save'),
  });

  function onFile(f: File | null) {
    if (!f) return;
    setFile(f);
    setEditingImage(URL.createObjectURL(f));
    setRemovedImage(false);
  }

  function addTier() {
    setForm((s) => ({ ...s, bundleTiers: [...s.bundleTiers, { quantity: Number(newTier.quantity), discountPercent: Number(newTier.discountPercent) }] }));
  }

  function removeTier(idx: number) {
    setForm((s) => ({ ...s, bundleTiers: s.bundleTiers.filter((_: any, i: number) => i !== idx) }));
  }

  return (
    <div className="card p-6 mb-4 border-2 border-brand-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg">{banner ? 'Edit banner' : 'New banner'}</h2>
        <button onClick={onClose} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Image + Schedule */}
        <div className="space-y-4">
          {/* Image */}
          <div>
            <label className="label">Banner image {!banner && '*'}</label>
            <div className="flex items-center gap-3">
              <div className="h-28 w-full rounded-xl border-2 border-dashed border-ink-200 overflow-hidden bg-ink-50 flex items-center justify-center">
                {!removedImage && editingImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editingImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-col items-center text-ink-400 hover:text-brand-500">
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-xs mt-1">Click to upload image</span>
                  </button>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
            {!removedImage && editingImage && (
              <button type="button" onClick={() => { setFile(null); setEditingImage(''); setRemovedImage(true); }} className="text-xs text-red-600 mt-1 hover:underline">
                Remove image
              </button>
            )}
          </div>

          {/* Schedule */}
          <div>
            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={form.autoStart} onChange={(e) => setForm((s) => ({ ...s, autoStart: e.target.checked }))} className="rounded text-brand-600" />
              <span className="text-sm font-medium">Start immediately (auto-select start time)</span>
            </label>
            {!form.autoStart && (
              <div className="mb-2">
                <label className="label">Start time</label>
                <input type="datetime-local" className="input" value={form.startAt} onChange={(e) => setForm((s) => ({ ...s, startAt: e.target.value }))} />
              </div>
            )}
            <label className="label">End time *</label>
            <input type="datetime-local" className="input" value={form.endAt} onChange={(e) => setForm((s) => ({ ...s, endAt: e.target.value }))} />
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))} className="rounded text-brand-600" />
            <span className="text-sm">Show on marketplace</span>
          </label>
        </div>

        {/* Right: Text + CTA + Bundle */}
        <div className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="e.g. Summer Sale" />
          </div>
          <div>
            <label className="label">Subtitle (optional)</label>
            <input className="input" value={form.subtitle} onChange={(e) => setForm((s) => ({ ...s, subtitle: e.target.value }))} placeholder="e.g. Up to 50% off" />
          </div>

          {/* Guided CTA */}
          <div>
            <label className="label">Link to (optional)</label>
            <select className="input mb-2" value={form.ctaCategory} onChange={(e) => setForm((s) => ({ ...s, ctaCategory: e.target.value, ctaProduct: '' }))}>
              <option value="">— No category link —</option>
              {categoryTree?.items?.map((c: any) => (
                <optgroup key={c._id} label={c.name}>
                  <option value={c._id}>{c.name}</option>
                  {c.subcategories?.map((sub: any) => (<option key={sub._id} value={sub._id}>{c.name} › {sub.name}</option>))}
                </optgroup>
              ))}
            </select>
            {form.ctaCategory && (
              <select className="input" value={form.ctaProduct} onChange={(e) => setForm((s) => ({ ...s, ctaProduct: e.target.value }))}>
                <option value="">— Link to category only —</option>
                {productsInCategory?.items?.map((p: any) => (<option key={p._id} value={p._id}>{p.title}</option>))}
              </select>
            )}
          </div>

          {/* Bundle Deal Tiers */}
          <div>
            <label className="label">Bundle deal tiers (optional)</label>
            <p className="text-xs text-ink-500 mb-2">Add quantity-based discounts (e.g. "Buy 2, Get 20% off").</p>
            {form.bundleTiers.length > 0 && (
              <div className="space-y-1 mb-2">
                {form.bundleTiers.map((tier: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-ink-50">
                    <span className="text-xs flex-1">Buy {tier.quantity} → {tier.discountPercent}% off</span>
                    <button onClick={() => removeTier(i)} className="text-red-600 hover:bg-red-50 p-1 rounded"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <div className="flex-1"><label className="label">Qty</label><input type="number" min={1} className="input" value={newTier.quantity} onChange={(e) => setNewTier((s) => ({ ...s, quantity: Number(e.target.value) }))} /></div>
              <div className="flex-1"><label className="label">Discount %</label><input type="number" min={1} max={100} className="input" value={newTier.discountPercent} onChange={(e) => setNewTier((s) => ({ ...s, discountPercent: Number(e.target.value) }))} /></div>
              <button onClick={addTier} className="btn-outline text-sm"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-6 pt-4 border-t border-ink-100">
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">{saveMut.isPending ? 'Saving...' : 'Save banner'}</button>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
