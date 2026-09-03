'use client';

import Link from 'next/link';
import { ShoppingCart, Heart } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { formatPKR, cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAddToCartAnimation } from './AddToCartAnimation';

interface ProductCardData {
  _id: string;
  title: string;
  slug: string;
  basePrice: number;
  effectivePrice: number;
  discountAmount: number;
  discountActive: boolean;
  outOfStock: boolean;
  totalStock: number;
  primaryImage: string;
  images?: { url: string; isPrimary: boolean }[];
  isFeatured?: boolean;
  categoryId?: any;
}

/**
 * PRD_New V4: Removed HoverPreviewPopup — no hover popup on marketplace cards.
 */
export function ProductCard({ product }: { product: ProductCardData }) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { triggerAnimation, AnimationElement } = useAddToCartAnimation();

  // Heart toggle
  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => apiClient.get<{ items: any[] }>('/wishlist'),
    enabled: !!user && user.role === 'BUYER',
  });
  const isWishlisted = (wishlistData?.items || []).some((p: any) => p._id === product._id);

  const wishlistMut = useMutation({
    mutationFn: () => isWishlisted
      ? apiClient.delete(`/wishlist/${product._id}`)
      : apiClient.post(`/wishlist/${product._id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
    },
  });

  // COD pending (admin view)
  const { data: codPendingData } = useQuery({
    queryKey: ['product', product._id, 'cod-pending'],
    queryFn: () => apiClient.get<{ items: any[] }>(`/admin/products/${product._id}/cod-pending`),
    enabled: !!user && user.role === 'ADMIN',
  });
  const hasCodPending = (codPendingData?.items?.length || 0) > 0;

  function handleAddToCart() {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/product/${product.slug}`));
      return;
    }
    router.push(`/product/${product.slug}`);
  }

  function handleHeart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/product/${product.slug}`));
      return;
    }
    wishlistMut.mutate();
  }

  const discountPct = product.discountActive && product.basePrice > 0
    ? Math.round((product.discountAmount / product.basePrice) * 100)
    : 0;

  return (
    <>
      {AnimationElement}
      <div className="group card overflow-hidden hover:shadow-glow transition-all duration-200 cursor-pointer">
        <Link href={`/product/${product.slug}`} className="block relative aspect-square overflow-hidden bg-ink-50">
          {product.primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.primaryImage} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-300"><ShoppingCart className="h-10 w-10" /></div>
          )}

          {product.outOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="badge-red text-sm px-3 py-1">Out of Stock</span>
            </div>
          )}
          {!product.outOfStock && discountPct > 0 && <span className="absolute top-2 left-2 badge-red">-{discountPct}%</span>}
          {product.isFeatured && <span className="absolute top-2 right-2 badge-amber">Featured</span>}

          {/* Heart toggle */}
          {user?.role === 'BUYER' && (
            <button onClick={handleHeart} className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center shadow hover:bg-white transition-all" aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}>
              <Heart className={cn('h-4 w-4', isWishlisted ? 'fill-brand-600 text-brand-600' : 'text-ink-400')} />
            </button>
          )}

          {hasCodPending && (
            <Link href="/admin/cod-requests" className="absolute bottom-2 left-2 badge-amber text-[10px] hover:bg-amber-200">COD · Pending</Link>
          )}
        </Link>

        <div className="p-3 sm:p-4">
          <Link href={`/product/${product.slug}`} className="block">
            <h3 className="font-medium text-sm text-ink-900 line-clamp-2 min-h-[2.5rem] group-hover:text-brand-700 transition-colors">{product.title}</h3>
          </Link>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-bold text-base text-ink-900">{formatPKR(product.effectivePrice)}</span>
            {product.discountActive && <span className="text-xs text-ink-400 line-through">{formatPKR(product.basePrice)}</span>}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button ref={btnRef} onClick={handleAddToCart} disabled={product.outOfStock}
              className={cn('flex-1 text-xs px-3 py-2 rounded-lg transition-all',
                product.outOfStock ? 'bg-ink-100 text-ink-400 cursor-not-allowed'
                : added ? 'bg-green-600 text-white'
                : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-95')}>
              {product.outOfStock ? 'Out of Stock' : added ? 'Added!' : 'View & Add'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
