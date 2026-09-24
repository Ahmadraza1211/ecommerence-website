'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { formatPKR, cn, shortId } from '@/lib/utils';
import { ProductCard } from '@/components/storefront/ProductCard';
import { Skeleton, EmptyState } from '@/components/ui/Skeleton';
import { Heart, ShoppingCart, Shield, Truck, MessageCircle, Star, Check, Minus, Plus, Lock, Unlock, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const [selectedColorVal, setSelectedColorVal] = useState<string>('');
  const [selectedSizeVal, setSelectedSizeVal] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [activeDealTier, setActiveDealTier] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => apiClient.get<{ product: any }>(`/products/${slug}`),
  });

  const product = data?.product;

  const { data: similar } = useQuery({
    queryKey: ['product', slug, 'similar'],
    queryFn: () => apiClient.get<{ items: any[] }>(`/products/${slug}/similar`),
    enabled: !!product,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', product?._id],
    queryFn: () => apiClient.get<{ items: any[] }>(`/reviews/product/${product?._id}`),
    enabled: !!product?._id,
  });

  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => apiClient.get<{ items: any[] }>('/wishlist'),
    enabled: !!user && user.role === 'BUYER',
  });
  const isWishlisted = product ? (wishlistData?.items || []).some((p: any) => p._id === product._id) : false;

  const wishlistMut = useMutation({
    mutationFn: () => isWishlisted
      ? apiClient.delete(`/wishlist/${product?._id}`)
      : apiClient.post(`/wishlist/${product?._id}`),
    onSuccess: () => {
      toast.success(isWishlisted ? 'Removed from wishlist' : 'Saved to wishlist');
      qc.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  // Active banners query for bundle deals
  const { data: bannersData } = useQuery({
    queryKey: ['banners', 'active'],
    queryFn: () => apiClient.get<{ items: any[] }>('/banners/active'),
  });

  const activeBundleBanner = useMemo(() => {
    if (!bannersData?.items?.length) return null;
    const prodBanner = bannersData.items.find(
      (b: any) => (b.ctaProduct && String(b.ctaProduct) === String(product?._id)) || (b.ctaLink && b.ctaLink.includes(String(slug)))
    );
    if (prodBanner) return prodBanner;
    return bannersData.items.find((b: any) => b.bundleTiers && b.bundleTiers.length > 0) || bannersData.items[0];
  }, [bannersData, product, slug]);

  const dealTiersToDisplay = useMemo(() => {
    if (activeBundleBanner?.bundleTiers?.length > 0) {
      return activeBundleBanner.bundleTiers;
    }
    if (activeBundleBanner?.dealQuantity && activeBundleBanner?.dealDiscountPercent) {
      return [{ quantity: Number(activeBundleBanner.dealQuantity), discountPercent: Number(activeBundleBanner.dealDiscountPercent) }];
    }
    if (product?.discountActive && product?.discountAmount) {
      const pct = product.basePrice > 0 ? Math.round((product.discountAmount / product.basePrice) * 100) : 20;
      return [{ quantity: 2, discountPercent: pct }];
    }
    return [{ quantity: 2, discountPercent: 20 }];
  }, [activeBundleBanner, product]);

  // Extract clean colors (never include "Default")
  const allColors = useMemo(() => {
    if (!product?.attributeValues) return [];
    const colorAttr = product.attributes?.find((a: any) => a.name?.toLowerCase() === 'color');
    return product.attributeValues
      .filter((av: any) => av.value && av.value.toLowerCase() !== 'default' && (av.displayMeta || (colorAttr && String(av.attributeId) === String(colorAttr._id))))
      .filter((av: any, idx: number, arr: any[]) => arr.findIndex((t) => t.value.toLowerCase() === av.value.toLowerCase()) === idx);
  }, [product]);

  useEffect(() => {
    if (allColors.length > 0 && !selectedColorVal) {
      setSelectedColorVal(allColors[0].value);
    }
  }, [allColors, selectedColorVal]);

  useEffect(() => {
    if (!product?.images?.length) return;
    if (selectedColorVal) {
      const idx = product.images.findIndex((img: any) =>
        img.variantColor && img.variantColor.toLowerCase() === selectedColorVal.toLowerCase()
      );
      if (idx >= 0) {
        setActiveImage(idx);
        return;
      }
    }
    const defIdx = product.images.findIndex((img: any) => img.isPrimary || img.variantColor?.toLowerCase() === 'default');
    if (defIdx >= 0) setActiveImage(defIdx);
  }, [selectedColorVal, product?.images]);

  const colorValueObj = useMemo(() => {
    return allColors.find((c: any) => c.value.toLowerCase() === selectedColorVal.toLowerCase()) || allColors[0];
  }, [allColors, selectedColorVal]);

  const variantsForColor = useMemo(() => {
    if (!product?.variants) return [];
    if (!colorValueObj) return product.variants;
    return product.variants.filter((v: any) =>
      v.attributeValues.some((avId: any) => String(avId._id || avId) === String(colorValueObj._id))
    );
  }, [product, colorValueObj]);

  // Extract clean sizes for selected color (never include "Default")
  const sizesForColor = useMemo(() => {
    if (!product?.attributeValues) return [];
    const sizeAttr = product.attributes?.find((a: any) => a.name?.toLowerCase() === 'size');
    return product.attributeValues
      .filter((av: any) => av.value && av.value.toLowerCase() !== 'default' && (!av.displayMeta || (sizeAttr && String(av.attributeId) === String(sizeAttr._id))))
      .filter((av: any) => variantsForColor.some((v: any) => v.attributeValues.some((avId: any) => String(avId._id || avId) === String(av._id))))
      .filter((av: any, idx: number, arr: any[]) => arr.findIndex((t) => t.value.toLowerCase() === av.value.toLowerCase()) === idx);
  }, [product, variantsForColor]);

  useEffect(() => {
    if (sizesForColor.length > 0) {
      const exists = sizesForColor.some((s: any) => s.value.toLowerCase() === selectedSizeVal.toLowerCase());
      if (!exists) setSelectedSizeVal(sizesForColor[0].value);
    }
  }, [sizesForColor, selectedSizeVal]);

  useEffect(() => {
    if (product?.variants?.length) {
      if (colorValueObj && selectedSizeVal) {
        const sizeObj = sizesForColor.find((s: any) => s.value.toLowerCase() === selectedSizeVal.toLowerCase());
        const matched = product.variants.find((v: any) =>
          v.attributeValues.some((avId: any) => String(avId._id || avId) === String(colorValueObj._id)) &&
          (sizeObj ? v.attributeValues.some((avId: any) => String(avId._id || avId) === String(sizeObj._id)) : true)
        );
        if (matched) setSelectedVariantId(String(matched._id));
      } else {
        const firstInStock = product.variants.find((v: any) => v.stockQuantity > 0);
        setSelectedVariantId(String((firstInStock || product.variants[0])._id));
      }
    }
  }, [colorValueObj, selectedSizeVal, sizesForColor, product]);

  const selectedVariant = useMemo(
    () => product?.variants?.find((v: any) => String(v._id) === selectedVariantId) || null,
    [product, selectedVariantId]
  );

  const isOutOfStock = selectedVariant ? selectedVariant.stockQuantity <= 0 : (product?.outOfStock ?? true);

  // Price & quantity calculations when Bundle Deal is active
  const baseUnitPrice = selectedVariant?.priceOverride != null ? selectedVariant.priceOverride : (product?.basePrice || 0);

  const discountedUnitPrice = activeDealTier
    ? Math.round(baseUnitPrice * (1 - activeDealTier.discountPercent / 100))
    : (product?.discountActive ? Math.max(0, baseUnitPrice - product.discountAmount) : baseUnitPrice);

  const bundleTotal = activeDealTier ? discountedUnitPrice * activeDealTier.quantity : 0;
  const effectivePrice = activeDealTier ? discountedUnitPrice : (product?.discountActive ? Math.max(0, baseUnitPrice - product.discountAmount) : baseUnitPrice);

  const effectiveQty = activeDealTier ? activeDealTier.quantity : qty;

  const addToCartMut = useMutation({
    mutationFn: () => {
      if (activeDealTier && activeBundleBanner) {
        const tierIdx = activeBundleBanner.bundleTiers.findIndex((t: any) => t.quantity === activeDealTier.quantity);
        return apiClient.post('/cart/apply-bundle', { bannerId: activeBundleBanner._id, tierIndex: tierIdx >= 0 ? tierIdx : 0, variantId: selectedVariantId });
      }
      return apiClient.post('/cart/items', { variantId: selectedVariantId, quantity: effectiveQty });
    },
    onSuccess: () => {
      toast.success(activeDealTier ? 'Bundle deal added to cart!' : 'Added to cart');
      qc.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to add to cart'),
  });

  const buyNowMut = useMutation({
    mutationFn: () => {
      if (activeDealTier && activeBundleBanner) {
        const tierIdx = activeBundleBanner.bundleTiers.findIndex((t: any) => t.quantity === activeDealTier.quantity);
        return apiClient.post('/cart/apply-bundle', { bannerId: activeBundleBanner._id, tierIndex: tierIdx >= 0 ? tierIdx : 0, variantId: selectedVariantId });
      }
      return apiClient.post('/cart/items', { variantId: selectedVariantId, quantity: effectiveQty });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      router.push('/checkout');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  function handleAction(action: 'cart' | 'buy') {
    if (!user) { router.push(`/login?redirect=${encodeURIComponent(`/product/${slug}`)}`); return; }
    if (isOutOfStock || !selectedVariantId) { toast.error('This variant is out of stock'); return; }
    if (action === 'cart') addToCartMut.mutate();
    else buyNowMut.mutate();
  }

  function handleHeart() {
    if (!user) { router.push(`/login?redirect=${encodeURIComponent(`/product/${slug}`)}`); return; }
    wishlistMut.mutate();
  }

  if (isLoading) {
    return (
      <div className="container-x py-6">
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="grid lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-3"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="container-x py-12"><EmptyState title="Product not found" description="The product you're looking for is no longer available." action={<Link href="/" className="btn-primary">Browse products</Link>} /></div>;
  }

  const discountPct = product.discountActive && product.basePrice > 0 ? Math.round((product.discountAmount / product.basePrice) * 100) : 0;

  return (
    <div className="container-x py-6">
      <nav className="text-xs text-ink-500 mb-4 flex items-center justify-between">
        <div>
          <Link href="/" className="hover:text-brand-600">Home</Link><span className="mx-1">/</span>
          <Link href="/products" className="hover:text-brand-600">Products</Link>
          {product.categoryId?.slug && (<><span className="mx-1">/</span><Link href={`/products?category=${product.categoryId.slug}`} className="hover:text-brand-600 capitalize">{product.categoryId.name}</Link></>)}
        </div>
        {user?.role === 'ADMIN' && (
          <Link href={`/admin/products/${product._id}/edit`} className="btn-outline text-xs px-3 py-1.5 inline-flex items-center gap-1.5 bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 font-semibold">
            ✏️ Edit Product
          </Link>
        )}
      </nav>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Gallery */}
        <div>
          <div className="card overflow-hidden aspect-square relative">
            {product.images?.[activeImage]?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[activeImage].url} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ink-300"><ShoppingCart className="h-12 w-12" /></div>
            )}
            {isOutOfStock && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="badge-red text-base px-4 py-2">Out of Stock</span></div>}
            {product.discountActive && discountPct > 0 && <span className="absolute top-3 left-3 badge-red text-sm px-3 py-1">-{discountPct}%</span>}
            {product.isFeatured && <span className="absolute top-3 right-3 badge-amber text-sm px-3 py-1">Featured</span>}
          </div>
          {product.images?.length > 1 && (
            <div className="grid grid-cols-5 gap-2 mt-2">
              {product.images.map((img: any, i: number) => (
                <button key={i} onClick={() => setActiveImage(i)} className={cn('aspect-square rounded-lg overflow-hidden border-2', activeImage === i ? 'border-brand-500' : 'border-ink-100 hover:border-ink-300')}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {product.brand && <p className="text-xs uppercase tracking-wide text-ink-500 mb-1">{product.brand}</p>}
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900">{product.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (<Star key={n} className={`h-4 w-4 ${n <= Math.round(avgRating(reviewsData?.items)) ? 'fill-amber-400 text-amber-400' : 'text-ink-300'}`} />))}
                </div>
                <span className="text-xs text-ink-500">{reviewsData?.items?.length || 0} review{(reviewsData?.items?.length || 0) === 1 ? '' : 's'}</span>
              </div>
            </div>
            {user?.role === 'BUYER' && (
              <button onClick={handleHeart} className="btn-ghost p-3" aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}>
                <Heart className={cn('h-6 w-6', isWishlisted ? 'fill-brand-600 text-brand-600' : 'text-ink-400')} />
              </button>
            )}
          </div>

          {/* Price display */}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl font-extrabold text-brand-600">{formatPKR(effectivePrice)}</span>
            {activeDealTier ? (
              <span className="badge-green text-xs font-semibold px-2.5 py-1">
                🔒 {activeDealTier.quantity}x Deal Applied ({activeDealTier.discountPercent}% OFF)
              </span>
            ) : product.discountActive ? (
              <>
                <span className="text-base text-ink-400 line-through">{formatPKR(product.basePrice)}</span>
                <span className="badge-red">-{discountPct}%</span>
              </>
            ) : null}
          </div>
          {activeDealTier && (
            <div className="mt-2 text-sm text-ink-600">
              <span className="font-medium text-brand-700">Unit price:</span> {formatPKR(discountedUnitPrice)} each · <span className="font-medium text-brand-700">Bundle total:</span> {formatPKR(bundleTotal)}
            </div>
          )}

          <div className="mt-5 space-y-3">
            <label className="label text-xs font-extrabold uppercase tracking-wider text-ink-700">SELECT A DEAL</label>
            {dealTiersToDisplay.map((tier: any, i: number) => {
              const isSelected = activeDealTier?.quantity === tier.quantity;
              const dealUnitPrice = Math.round(baseUnitPrice * (1 - tier.discountPercent / 100));
              const dealTotal = dealUnitPrice * tier.quantity;
              return (
                <div
                  key={`${tier.quantity}-${i}`}
                  onClick={() => {
                    setActiveDealTier(tier);
                    setQty(tier.quantity);
                    toast.success(`Deal applied! (${tier.quantity} units, ${tier.discountPercent}% OFF)`);
                  }}
                  className={cn(
                    'card p-4 cursor-pointer transition-all rounded-2xl flex items-center gap-3.5 border-2',
                    isSelected ? 'border-brand-600 bg-brand-50/30 ring-2 ring-brand-100 shadow-sm' : 'border-ink-200 hover:border-ink-300 bg-white'
                  )}
                >
                  <div className={cn(
                    'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                    isSelected ? 'border-brand-600 bg-brand-600' : 'border-ink-300 bg-white'
                  )}>
                    {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-ink-900 flex items-center gap-1.5">
                      🌞 {activeBundleBanner?.title || 'SUMMER SALE DEAL'} ({tier.quantity}x Units)
                    </p>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Buy {tier.quantity} units → {tier.discountPercent}% OFF · {formatPKR(dealUnitPrice)} each / {formatPKR(dealTotal)} total
                    </p>
                  </div>
                </div>
              );
            })}

            <div
              onClick={() => {
                setActiveDealTier(null);
                setQty(1);
                toast.success('Switched to Standard Plan');
              }}
              className={cn(
                'card p-4 cursor-pointer transition-all rounded-2xl flex items-center gap-3.5 border-2',
                !activeDealTier ? 'border-brand-600 bg-brand-50/30 ring-2 ring-brand-100 shadow-sm' : 'border-ink-200 hover:border-ink-300 bg-white'
              )}
            >
              <div className={cn(
                'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                !activeDealTier ? 'border-brand-600 bg-brand-600' : 'border-ink-300 bg-white'
              )}>
                {!activeDealTier && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-ink-900">STANDARD PLAN (Regular Price)</p>
                <p className="text-xs text-ink-500 mt-0.5">Standard terms, no sale discount</p>
              </div>
            </div>
          </div>

          {/* Color Selector */}
          {allColors.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <label className="label text-xs font-bold text-ink-600 uppercase tracking-wider mb-0">
                  COLOR: <span className="text-ink-900 font-extrabold normal-case">{selectedColorVal}</span>
                </label>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                {allColors.map((colorObj: any) => {
                  const isSelected = selectedColorVal.toLowerCase() === colorObj.value.toLowerCase();
                  return (
                    <button
                      key={colorObj.value}
                      type="button"
                      onClick={() => setSelectedColorVal(colorObj.value)}
                      title={colorObj.value}
                      className={cn(
                        'h-9 w-9 rounded-full border-2 border-white shadow-md transition-all relative flex items-center justify-center',
                        isSelected ? 'ring-2 ring-brand-600 scale-110' : 'ring-1 ring-ink-300 hover:ring-ink-500'
                      )}
                      style={{ backgroundColor: colorObj.displayMeta || '#333' }}
                    >
                      {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-white shadow-sm" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {sizesForColor.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <label className="label text-xs font-bold text-ink-600 uppercase tracking-wider mb-0">
                  SIZE: <span className="text-ink-900 font-extrabold normal-case">{selectedSizeVal}</span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizesForColor.map((av: any) => {
                  const sizeName = av.value;
                  const isSelected = selectedSizeVal.toLowerCase() === sizeName.toLowerCase();
                  return (
                    <button
                      key={sizeName}
                      type="button"
                      onClick={() => setSelectedSizeVal(sizeName)}
                      className={cn(
                        'px-4 py-2 rounded-xl border text-sm font-semibold transition-all',
                        isSelected ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-200' : 'border-ink-200 hover:border-ink-300 bg-white text-ink-800'
                      )}
                    >
                      {sizeName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock Info */}
          {selectedVariant && (
            <div className="mt-4">
              {selectedVariant.stockQuantity > 0 ? (
                <p className="text-xs text-green-600 font-semibold inline-flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200">
                  <Check className="h-3.5 w-3.5" /> In stock — {selectedVariant.stockQuantity} left
                </p>
              ) : (
                <p className="text-xs text-red-600 font-semibold inline-flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                  Out of stock — try another size or color
                </p>
              )}
            </div>
          )}

          {/* Quantity */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1">
              <label className="label text-xs font-bold text-ink-600 uppercase tracking-wider">Quantity</label>
              {activeDealTier && (
                <span className="text-xs text-amber-700 font-bold flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Locked by Bundle Deal ({activeDealTier.quantity} units)
                </span>
              )}
            </div>
            <div className="inline-flex items-center border border-ink-200 rounded-xl bg-white">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-2 hover:bg-ink-50 disabled:opacity-40"
                disabled={!!activeDealTier || qty <= 1 || isOutOfStock}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="number"
                value={effectiveQty}
                onChange={(e) => setQty(Math.max(1, Math.min(selectedVariant?.stockQuantity || 1, Number(e.target.value))))}
                className="w-12 text-center text-sm font-bold outline-none"
                disabled={!!activeDealTier || isOutOfStock}
              />
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(selectedVariant?.stockQuantity || 1, q + 1))}
                className="px-3 py-2 hover:bg-ink-50 disabled:opacity-40"
                disabled={!!activeDealTier || isOutOfStock || (selectedVariant && qty >= selectedVariant.stockQuantity)}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => handleAction('cart')}
              disabled={isOutOfStock || addToCartMut.isPending}
              className={cn(
                'flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
                isOutOfStock ? 'bg-ink-100 text-ink-400 cursor-not-allowed' : 'bg-white border-2 border-brand-600 text-brand-700 hover:bg-brand-50 active:scale-[0.98]'
              )}
            >
              <ShoppingCart className="h-4 w-4" />
              {isOutOfStock ? 'Out of Stock' : activeDealTier ? `Add ${activeDealTier.quantity}x Bundle to Cart` : 'Add to Cart'}
            </button>
            <button
              onClick={() => handleAction('buy')}
              disabled={isOutOfStock || buyNowMut.isPending}
              className={cn(
                'flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
                isOutOfStock ? 'bg-ink-100 text-ink-400 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98]'
              )}
            >
              {isOutOfStock ? 'Unavailable' : activeDealTier ? `Buy Bundle Now` : 'Buy Now'}
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="card p-3"><Truck className="h-5 w-5 text-brand-600 mx-auto mb-1" /><p className="text-xs font-medium">Fast delivery</p><p className="text-[10px] text-ink-500">2-4 business days</p></div>
            <div className="card p-3"><MessageCircle className="h-5 w-5 text-brand-600 mx-auto mb-1" /><p className="text-xs font-medium">COD available</p><p className="text-[10px] text-ink-500">Confirm on WhatsApp</p></div>
            <div className="card p-3"><Shield className="h-5 w-5 text-brand-600 mx-auto mb-1" /><p className="text-xs font-medium">7-day returns</p><p className="text-[10px] text-ink-500">Easy & fast</p></div>
          </div>

          {product.description && (<div className="mt-6"><h2 className="font-display font-bold text-lg mb-2">Description</h2><p className="text-sm text-ink-700 whitespace-pre-line">{product.description}</p></div>)}

          {product.material && (
            <div className="mt-4 p-3 rounded-lg bg-ink-50">
              <p className="text-xs text-ink-500">Material</p>
              <p className="text-sm font-medium">{product.material}</p>
            </div>
          )}

          {product.customFields && product.customFields.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-ink-50 space-y-1">
              <p className="text-xs font-semibold text-ink-500 mb-1">Specifications & Details</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {product.customFields.map((cf: any, idx: number) => (
                  <div key={idx} className="flex justify-between border-b border-ink-100 pb-1">
                    <span className="text-ink-500">{cf.name}:</span>
                    <span className="font-medium text-ink-800">{cf.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-12">
        <h2 className="font-display font-bold text-xl mb-4">Customer reviews</h2>
        {reviewsData?.items?.length ? (
          <div className="grid md:grid-cols-2 gap-3">
            {reviewsData.items.map((r: any) => (
              <div key={r._id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold">{r.userId?.name?.[0]?.toUpperCase() || 'U'}</div>
                    <div><p className="text-sm font-semibold">{r.userId?.name || 'Anonymous'}</p><div className="flex">{[1, 2, 3, 4, 5].map((n) => (<Star key={n} className={`h-3 w-3 ${n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300'}`} />))}</div></div>
                  </div>
                  {r.isVerifiedPurchase && <span className="badge-green">Verified</span>}
                </div>
                {r.comment && <p className="text-sm text-ink-700">{r.comment}</p>}
                {r.sellerReply && (<div className="mt-3 ml-4 pl-3 border-l-2 border-ink-200"><p className="text-xs font-semibold text-ink-700 mb-0.5">Seller reply</p><p className="text-xs text-ink-600">{r.sellerReply}</p></div>)}
              </div>
            ))}
          </div>
        ) : (<div className="card p-6 text-center text-sm text-ink-500">No reviews yet. Reviews unlock automatically after your order is delivered.</div>)}
      </section>

      {similar?.items?.length ? (
        <section className="mt-12">
          <h2 className="font-display font-bold text-xl mb-4">You may also like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {similar.items.slice(0, 4).map((p: any) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function avgRating(reviews: any[] | undefined): number {
  if (!reviews || reviews.length === 0) return 0;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}
