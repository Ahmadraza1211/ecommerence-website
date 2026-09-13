'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, ImagePlus, X, Plus, Trash2 } from 'lucide-react';
import { cn, toLocalInput } from '@/lib/utils';

const PRESET_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

interface VariantRow {
  color: string;
  colorHex: string;
  sizes: { size: string; stock: number; price: number | null }[];
}

/**
 * PRD_New V4: Clean, easy Edit Product form with tab-based layout.
 * - Tab 1: Basic Info (title, category, description, base price, base stock, material)
 * - Tab 2: Images
 * - Tab 3: Variants (Color × Size matrix with per-variant stock/price)
 * - Tab 4: Pricing & Discount
 *
 * Fixes:
 * - All fields pre-populate on edit (no data loss)
 * - Variant matrix loads from existing product data
 * - "Apply to all sizes" button per color
 */
export default function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'images' | 'variants' | 'pricing'>('basic');

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => apiClient.get<{ items: any[] }>('/categories/tree'),
  });

  const { data: editData } = useQuery({
    queryKey: ['admin', 'product', productId],
    queryFn: () => apiClient.get<{ product: any }>(`/admin/products/${productId}`),
    enabled: !!productId,
  });

  const [form, setForm] = useState<any>({
    title: '', description: '', categoryId: '', brand: '', basePrice: 0, baseStock: 0,
    material: '', status: 'PUBLISHED',
    discountType: '', discountValue: 0, discountStartAt: '', discountEndAt: '',
    autoStartDiscount: true,
  });

  // PRD_New V4: Variant matrix — Color × Size
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [customFields, setCustomFields] = useState<{ name: string; value: string }[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [newColor, setNewColor] = useState({ color: '', hex: '#000000' });
  const [customSize, setCustomSize] = useState('');
  const [builderSizes, setBuilderSizes] = useState<string[]>(PRESET_SIZES);

  // PRD_New V4: Properly pre-populate ALL fields on edit
  useEffect(() => {
    if (editData?.product) {
      const p = editData.product;
      setForm({
        title: p.title || '',
        description: p.description || '',
        categoryId: p.categoryId?._id || (typeof p.categoryId === 'string' ? p.categoryId : '') || '',
        brand: p.brand || '',
        basePrice: p.basePrice || 0,
        baseStock: p.variants?.[0]?.stockQuantity || 0,
        material: p.material || '',
        status: p.status || 'PUBLISHED',
        discountType: p.discountType || '',
        discountValue: p.discountValue || 0,
        discountStartAt: p.discountStartAt ? toLocalInput(p.discountStartAt) : '',
        discountEndAt: p.discountEndAt ? toLocalInput(p.discountEndAt) : toLocalInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        autoStartDiscount: !p.discountStartAt,
      });
      setExistingImages(p.images || []);
      setCustomFields(p.customFields || []);

      // Robust variant reconstruction on edit load
      if (p.variants && p.variants.length > 0) {
        const colorAttr = p.attributes?.find((a: any) => a.name?.toLowerCase() === 'color');
        const sizeAttr = p.attributes?.find((a: any) => a.name?.toLowerCase() === 'size');

        const colorAVs = p.attributeValues?.filter((av: any) =>
          colorAttr ? String(av.attributeId) === String(colorAttr._id) : !!av.displayMeta
        ) || [];

        if (colorAVs.length > 0) {
          const rows: VariantRow[] = colorAVs.map((colorAv: any) => {
            const colorVariants = p.variants.filter((v: any) =>
              v.attributeValues?.some((avId: any) => String(avId._id || avId) === String(colorAv._id))
            );

            const sizeEntries: { size: string; stock: number; price: number | null }[] = [];

            colorVariants.forEach((v: any) => {
              const sizeAV = p.attributeValues?.find((av: any) =>
                String(av._id) !== String(colorAv._id) &&
                (sizeAttr ? String(av.attributeId) === String(sizeAttr._id) : av.value?.toLowerCase() !== 'default') &&
                v.attributeValues?.some((avId: any) => String(avId._id || avId) === String(av._id))
              );
              if (sizeAV && sizeAV.value) {
                sizeEntries.push({
                  size: sizeAV.value,
                  stock: v.stockQuantity ?? 0,
                  price: v.priceOverride ?? null,
                });
              }
            });

            if (sizeEntries.length === 0 && colorVariants.length > 0) {
              sizeEntries.push({
                size: 'Standard',
                stock: colorVariants[0].stockQuantity ?? 0,
                price: colorVariants[0].priceOverride ?? null,
              });
            }

            return {
              color: colorAv.value,
              colorHex: colorAv.displayMeta || '#000000',
              sizes: sizeEntries,
            };
          });
          setVariantRows(rows);
        } else if (p.attributeValues && p.attributeValues.length > 0) {
          const sizeAVs = p.attributeValues.filter((av: any) =>
            sizeAttr ? String(av.attributeId) === String(sizeAttr._id) : av.value?.toLowerCase() !== 'default'
          );

          if (sizeAVs.length > 0) {
            const sizeEntries: { size: string; stock: number; price: number | null }[] = [];
            sizeAVs.forEach((sizeAv: any) => {
              const matchingVar = p.variants.find((v: any) =>
                v.attributeValues?.some((avId: any) => String(avId._id || avId) === String(sizeAv._id))
              );
              if (matchingVar) {
                sizeEntries.push({
                  size: sizeAv.value,
                  stock: matchingVar.stockQuantity ?? 0,
                  price: matchingVar.priceOverride ?? null,
                });
              }
            });

            if (sizeEntries.length > 0) {
              setVariantRows([{
                color: 'Default',
                colorHex: '#000000',
                sizes: sizeEntries,
              }]);
            }
          }
        }
      }
    }
  }, [editData]);

  const saveMut = useMutation({
    mutationFn: async () => {
      // Validation
      if (!form.title) throw { response: { data: { error: 'Please enter a product title' } } };
      if (!form.categoryId) throw { response: { data: { error: 'Please select a category' } } };
      if (!form.basePrice || form.basePrice <= 0) throw { response: { data: { error: 'Please enter a valid base price' } } };

      // Discount validation
      if (!form.autoStartDiscount && form.discountStartAt && form.discountEndAt) {
        if (new Date(form.discountEndAt) <= new Date(form.discountStartAt)) {
          throw { response: { data: { error: 'Discount end time must be after start time' } } };
        }
      }

      // Build attributes & variants from the matrix
      const attributes: any[] = [];
      const attributeValues: any[] = [];
      const variants: any[] = [];

      if (variantRows.length > 0) {
        const colorAttrId = `color_${Date.now()}`;
        attributes.push({ _id: colorAttrId, name: 'Color', isGlobal: true });
        const sizeAttrId = `size_${Date.now()}`;
        attributes.push({ _id: sizeAttrId, name: 'Size', isGlobal: true });

        const sizeValueMap = new Map<string, string>();

        variantRows.forEach((row) => {
          row.sizes.forEach((sizeEntry) => {
            if (!sizeValueMap.has(sizeEntry.size)) {
              const sValId = `size_val_${sizeValueMap.size}_${Date.now()}`;
              sizeValueMap.set(sizeEntry.size, sValId);
              attributeValues.push({
                _id: sValId,
                attributeId: sizeAttrId,
                value: sizeEntry.size,
                displayMeta: null,
              });
            }
          });
        });

        variantRows.forEach((row, rowIdx) => {
          const colorValueId = `color_val_${rowIdx}_${Date.now()}`;
          attributeValues.push({
            _id: colorValueId,
            attributeId: colorAttrId,
            value: row.color,
            displayMeta: row.colorHex,
          });

          row.sizes.forEach((sizeEntry, sizeIdx) => {
            const sizeValId = sizeValueMap.get(sizeEntry.size)!;
            variants.push({
              sku: `${form.title.slice(0, 3).toUpperCase()}-${row.color.slice(0, 3).toUpperCase()}-${sizeEntry.size}-${Date.now()}_${rowIdx}_${sizeIdx}`,
              stockQuantity: Math.max(0, Number(sizeEntry.stock) || 0),
              priceOverride: sizeEntry.price != null ? Number(sizeEntry.price) : null,
              attributeValues: [colorValueId, sizeValId],
            });
          });
        });
      } else {
        // No variant matrix — create a single default variant from base stock
        variants.push({
          sku: `SKU-${Date.now()}`,
          stockQuantity: Math.max(0, Number(form.baseStock) || 0),
          priceOverride: null,
          attributeValues: [],
        });
      }

      const payload: any = {
        title: form.title,
        description: form.description,
        categoryId: form.categoryId,
        brand: form.brand,
        basePrice: Number(form.basePrice),
        material: form.material,
        status: form.status,
        discountType: form.discountType || null,
        discountValue: Number(form.discountValue) || 0,
        discountStartAt: form.autoStartDiscount ? null : (form.discountStartAt || null),
        discountEndAt: form.discountEndAt || null,
        attributes,
        attributeValues,
        variants,
        customFields: customFields.filter((cf) => cf.name.trim() !== ''),
        existingImages,
      };

      const fd = new FormData();
      fd.append('payload', JSON.stringify(payload));
      files.forEach((f) => fd.append('images', f));
      if (productId) return apiClient.upload(`/admin/products/${productId}`, fd, 'patch');
      return apiClient.upload('/admin/products', fd, 'post');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Product saved');
      router.push('/admin/products');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Could not save the product. Please try again.'),
  });

  function onFilesChange(fileList: FileList | null) {
    if (!fileList) return;
    const arr = Array.from(fileList);
    setFiles((f) => [...f, ...arr]);
    setPreviews((p) => [...p, ...arr.map((f) => URL.createObjectURL(f))]);
  }
  function removeNewImage(idx: number) { setFiles((f) => f.filter((_, i) => i !== idx)); setPreviews((p) => p.filter((_, i) => i !== idx)); }
  function removeExistingImage(idx: number) { setExistingImages((imgs) => imgs.filter((_, i) => i !== idx)); }

  // Variant matrix helpers
  function toggleBuilderSize(size: string) {
    setBuilderSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  }

  function addCustomSizeToBuilder() {
    const words = customSize.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 3) {
      toast.error('Custom size must be 2-3 words max');
      return;
    }
    const sizeName = words.join(' ').toUpperCase();
    if (!builderSizes.includes(sizeName)) {
      setBuilderSizes((prev) => [...prev, sizeName]);
    }
    setCustomSize('');
  }

  function createColorVariant() {
    if (!newColor.color.trim()) {
      toast.error('Please enter a color name');
      return;
    }
    if (builderSizes.length === 0) {
      toast.error('Please select at least one size for this color');
      return;
    }
    const newRow: VariantRow = {
      color: newColor.color.trim(),
      colorHex: newColor.hex,
      sizes: builderSizes.map((s) => ({
        size: s,
        stock: Number(form.baseStock) || 0,
        price: null,
      })),
    };
    setVariantRows((r) => [...r, newRow]);
    setNewColor({ color: '', hex: '#000000' });
  }

  function removeSizeRow(rowIdx: number, sizeIdx: number) {
    setVariantRows((r) =>
      r.map((row, i) =>
        i === rowIdx
          ? { ...row, sizes: row.sizes.filter((_, j) => j !== sizeIdx) }
          : row
      )
    );
  }

  function removeColor(idx: number) {
    setVariantRows((r) => r.filter((_, i) => i !== idx));
  }

  function updateVariantStock(rowIdx: number, sizeIdx: number, stock: number) {
    setVariantRows((r) => r.map((row, i) => i === rowIdx ? { ...row, sizes: row.sizes.map((s, j) => j === sizeIdx ? { ...s, stock } : s) } : row));
  }

  function updateVariantPrice(rowIdx: number, sizeIdx: number, price: number | null) {
    setVariantRows((r) => r.map((row, i) => i === rowIdx ? { ...row, sizes: row.sizes.map((s, j) => j === sizeIdx ? { ...s, price } : s) } : row));
  }

  function applyToAllSizes(rowIdx: number, field: 'stock' | 'price', value: number | null) {
    setVariantRows((r) => r.map((row, i) => i === rowIdx ? { ...row, sizes: row.sizes.map(s => ({ ...s, [field]: value })) } : row));
  }

  function addSize() {
    const words = customSize.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 3) { toast.error('Custom size must be 2-3 words max'); return; }
    const sizeName = words.join(' ').toUpperCase();
    setVariantRows((r) => r.map(row => ({ ...row, sizes: [...row.sizes, { size: sizeName, stock: Number(form.baseStock) || 0, price: null }] })));
    setCustomSize('');
  }

  function addPresetSize(size: string) {
    if (variantRows[0]?.sizes.some(s => s.size === size)) return;
    setVariantRows((r) => r.map(row => ({ ...row, sizes: [...row.sizes, { size, stock: Number(form.baseStock) || 0, price: null }] })));
  }

  // Flatten categories for dropdown
  const flatCategories: any[] = [];
  (categoriesData?.items || []).forEach((c: any) => {
    flatCategories.push({ ...c, displayName: c.name });
    (c.subcategories || []).forEach((sub: any) => flatCategories.push({ ...sub, displayName: `${c.name} › ${sub.name}` }));
  });

  const allSizesInUse = variantRows[0]?.sizes.map(s => s.size) || [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="btn-ghost p-2"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="font-display text-2xl font-bold">{productId ? 'Edit product' : 'New product'}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-ink-100">
        {([['basic', 'Basic Info'], ['images', 'Images'], ['variants', 'Variants'], ['pricing', 'Pricing']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-700')}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Basic Info */}
      {activeTab === 'basic' && (
        <div className="card p-5 space-y-3 max-w-2xl">
          <div><label className="label">Title *</label><input className="input" value={form.title} onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="Product title" /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Category *</label>
              <select className="input" value={form.categoryId} onChange={(e) => setForm((f: any) => ({ ...f, categoryId: e.target.value }))}>
                <option value="">Select category</option>
                {flatCategories.map((c) => <option key={c._id} value={c._id}>{c.displayName}</option>)}
              </select>
            </div>
            <div><label className="label">Brand</label><input className="input" value={form.brand} onChange={(e) => setForm((f: any) => ({ ...f, brand: e.target.value }))} placeholder="Brand name" /></div>
          </div>
          <div><label className="label">Description</label><textarea rows={4} className="input" value={form.description} onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Product description" /></div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div><label className="label">Base price (PKR) *</label><input type="number" className="input" value={form.basePrice} onChange={(e) => setForm((f: any) => ({ ...f, basePrice: Number(e.target.value) }))} /></div>
            <div><label className="label">Base stock</label><input type="number" className="input" value={form.baseStock} onChange={(e) => setForm((f: any) => ({ ...f, baseStock: Number(e.target.value) }))} placeholder="Default for variants" /></div>
            <div><label className="label">Material</label><input className="input" value={form.material} onChange={(e) => setForm((f: any) => ({ ...f, material: e.target.value }))} placeholder="e.g. Cotton" /></div>
          </div>
          <div><label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm((f: any) => ({ ...f, status: e.target.value }))}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>

          {/* Custom Specifications / Additional Details */}
          <div className="pt-3 border-t border-ink-100">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Additional Specifications & Details</label>
              <button
                type="button"
                onClick={() => setCustomFields((cf) => [...cf, { name: '', value: '' }])}
                className="btn-outline text-xs px-2.5 py-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Detail
              </button>
            </div>
            <p className="text-xs text-ink-500 mb-3">Add custom details e.g. &quot;Condition: New&quot;, &quot;Dimensions: 200x100&quot;.</p>

            {customFields.length > 0 && (
              <div className="space-y-2">
                {customFields.map((field, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      className="input text-xs flex-1"
                      placeholder="Field Name (e.g. Condition)"
                      value={field.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomFields((cf) => cf.map((item, i) => i === idx ? { ...item, name: val } : item));
                      }}
                    />
                    <input
                      className="input text-xs flex-1"
                      placeholder="Value (e.g. New)"
                      value={field.value}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomFields((cf) => cf.map((item, i) => i === idx ? { ...item, value: val } : item));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setCustomFields((cf) => cf.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Images */}
      {activeTab === 'images' && (
        <div className="card p-5 max-w-2xl">
          <h2 className="font-display font-bold mb-3">Product images</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
            {existingImages.map((img: any, i: number) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-ink-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                <button onClick={() => removeExistingImage(i)} className="absolute top-1 right-1 h-5 w-5 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-red-600"><X className="h-3 w-3" /></button>
                {img.isPrimary && <span className="absolute bottom-1 left-1 badge-brand text-[9px]">Primary</span>}
              </div>
            ))}
            {previews.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-ink-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="h-full w-full object-cover" />
                <button onClick={() => removeNewImage(i)} className="absolute top-1 right-1 h-5 w-5 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-red-600"><X className="h-3 w-3" /></button>
              </div>
            ))}
            <button onClick={() => fileRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-ink-200 hover:border-brand-300 flex flex-col items-center justify-center text-ink-400 hover:text-brand-500">
              <ImagePlus className="h-6 w-6" /><span className="text-[10px] mt-1">Add</span>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFilesChange(e.target.files)} />
          <p className="text-xs text-ink-500">First image is set as primary automatically.</p>
        </div>
      )}

      {/* Tab: Variants — Color × Size matrix */}
      {activeTab === 'variants' && (
        <div className="space-y-4 max-w-3xl">
          {/* Define Color & Selected Sizes Builder */}
          <div className="card p-5 border border-ink-200 bg-ink-50/50 rounded-2xl">
            <h3 className="font-display font-bold text-sm text-ink-800 mb-3">Define Color &amp; Selected Sizes</h3>
            <div className="grid md:grid-cols-[1fr_1.5fr] gap-4 items-start">
              {/* Left: Color & Swatch */}
              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <label className="label text-xs uppercase font-bold text-ink-600">COLOR NAME</label>
                    <input
                      className="input text-sm bg-white"
                      placeholder="e.g. Red"
                      value={newColor.color}
                      onChange={(e) => setNewColor((s) => ({ ...s, color: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label text-xs uppercase font-bold text-ink-600">SWATCH</label>
                    <input
                      type="color"
                      className="h-10 w-12 rounded-xl border border-ink-200 cursor-pointer bg-white"
                      value={newColor.hex}
                      onChange={(e) => setNewColor((s) => ({ ...s, hex: e.target.value }))}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={createColorVariant}
                  className="btn-primary text-sm bg-brand-600 hover:bg-brand-700 font-bold px-4 py-2.5 rounded-xl w-full sm:w-auto"
                >
                  + Create Color Variant
                </button>
              </div>

              {/* Right: Select sizes for this color */}
              <div className="space-y-2">
                <label className="label text-xs uppercase font-bold text-ink-600">SELECT SIZES FOR THIS COLOR</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_SIZES.map((s) => {
                    const isSelected = builderSizes.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleBuilderSize(s)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                          isSelected ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-300' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                  {builderSizes.filter((s) => !PRESET_SIZES.includes(s)).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleBuilderSize(s)}
                      className="badge-brand text-xs px-2.5 py-1 flex items-center gap-1 cursor-pointer"
                    >
                      {s} <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>

                <div className="flex gap-1.5">
                  <input
                    className="input text-xs bg-white flex-1"
                    placeholder="Custom size (2-3 words)"
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomSizeToBuilder();
                      }
                    }}
                  />
                  <button type="button" onClick={addCustomSizeToBuilder} className="btn-outline text-xs px-3 bg-white">
                    Add Size
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Color Cards & Size Rows */}
          {variantRows.length === 0 ? (
            <div className="card p-8 text-center text-ink-500 text-sm">
              No color variants created yet. Enter a color name above and click <strong>+ Create Color Variant</strong>.
            </div>
          ) : (
            <div className="space-y-4">
              {variantRows.map((row, rowIdx) => (
                <div key={rowIdx} className="card p-4 border border-ink-200 rounded-2xl bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-ink-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full border border-ink-300 shadow-sm" style={{ backgroundColor: row.colorHex }} />
                      <span className="font-bold text-base text-ink-900">{row.color}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeColor(rowIdx)}
                      title="Delete entire color variant"
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-ink-500 border-b border-ink-100 text-left">
                        <th className="py-2 font-semibold">Size</th>
                        <th className="py-2 font-semibold">Stock</th>
                        <th className="py-2 font-semibold">Price (optional)</th>
                        <th className="py-2 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.sizes.map((sizeEntry, sizeIdx) => (
                        <tr key={sizeIdx} className="border-b border-ink-100 last:border-b-0 hover:bg-ink-50/50">
                          <td className="py-2 font-bold text-ink-800 text-sm">{sizeEntry.size}</td>
                          <td className="py-2">
                            <input
                              type="number"
                              min={0}
                              className="input text-xs py-1.5 w-24 bg-white"
                              value={sizeEntry.stock}
                              onChange={(e) => updateVariantStock(rowIdx, sizeIdx, Math.max(0, Number(e.target.value)))}
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="number"
                              className="input text-xs py-1.5 w-28 bg-white"
                              placeholder="Base Price"
                              value={sizeEntry.price ?? ''}
                              onChange={(e) => updateVariantPrice(rowIdx, sizeIdx, e.target.value === '' ? null : Number(e.target.value))}
                            />
                          </td>
                          <td className="py-2 text-right">
                            <div className="inline-flex items-center gap-3">
                              {sizeIdx === 0 && (
                                <button
                                  type="button"
                                  onClick={() => applyToAllSizes(rowIdx, 'stock', sizeEntry.stock)}
                                  className="text-[11px] text-brand-600 font-semibold hover:underline"
                                >
                                  Apply stock to all
                                </button>
                              )}
                              {sizeIdx === 0 && (
                                <button
                                  type="button"
                                  onClick={() => applyToAllSizes(rowIdx, 'price', sizeEntry.price)}
                                  className="text-[11px] text-brand-600 font-semibold hover:underline"
                                >
                                  Apply price to all
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeSizeRow(rowIdx, sizeIdx)}
                                title="Delete this size row"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Pricing */}
      {activeTab === 'pricing' && (
        <div className="card p-5 space-y-3 max-w-2xl">
          <h2 className="font-display font-bold mb-2">Pricing & Discount</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Base price (PKR)</label><input type="number" className="input" value={form.basePrice} onChange={(e) => setForm((f: any) => ({ ...f, basePrice: Number(e.target.value) }))} /></div>
            <div><label className="label">Discount type</label>
              <select className="input" value={form.discountType} onChange={(e) => setForm((f: any) => ({ ...f, discountType: e.target.value || null }))}>
                <option value="">None</option>
                <option value="PERCENT">Percentage</option>
                <option value="FLAT">Flat amount</option>
              </select>
            </div>
            {form.discountType && (
              <div><label className="label">Discount value</label><input type="number" className="input" value={form.discountValue} onChange={(e) => setForm((f: any) => ({ ...f, discountValue: Number(e.target.value) }))} /></div>
            )}
          </div>
          {form.discountType && (
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.autoStartDiscount} onChange={(e) => setForm((f: any) => ({ ...f, autoStartDiscount: e.target.checked }))} className="rounded text-brand-600" />
                <span className="text-sm">Start discount immediately (auto-select start time)</span>
              </label>
              {!form.autoStartDiscount && (
                <div><label className="label">Start time</label><input type="datetime-local" className="input" value={form.discountStartAt} onChange={(e) => setForm((f: any) => ({ ...f, discountStartAt: e.target.value }))} /></div>
              )}
              <div><label className="label">End time</label><input type="datetime-local" className="input" value={form.discountEndAt} onChange={(e) => setForm((f: any) => ({ ...f, discountEndAt: e.target.value }))} /></div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-6 sticky bottom-0 bg-ink-50 py-3 -mx-4 px-4 md:-mx-6 md:px-6 border-t border-ink-100">
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">{saveMut.isPending ? 'Saving...' : 'Save product'}</button>
        <Link href="/admin/products" className="btn-ghost">Cancel</Link>
      </div>
    </div>
  );
}
