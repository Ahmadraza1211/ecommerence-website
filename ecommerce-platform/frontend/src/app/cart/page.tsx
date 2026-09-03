'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { formatPKR, shortId, cn } from '@/lib/utils';
import { Skeleton, EmptyState } from '@/components/ui/Skeleton';
import { Minus, Plus, Trash2, Clock, Package } from 'lucide-react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function CartPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) router.push('/login?redirect=/cart');
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => apiClient.get<{ cart: any; pendingCodRequests: any[] }>('/cart'),
    enabled: !!user,
    // PRD_New V4: refetch frequently so accepted/rejected COD requests auto-disappear
    refetchInterval: 10000,
  });

  const updateMut = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) => apiClient.patch(`/cart/items/${variantId}`, { quantity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const removeMut = useMutation({
    mutationFn: (variantId: string) => apiClient.delete(`/cart/items/${variantId}`),
    onSuccess: () => { toast.success('Removed'); qc.invalidateQueries({ queryKey: ['cart'] }); },
  });

  const cart = data?.cart;
  const pendingCodRequests = data?.pendingCodRequests || [];
  const outOfStockItems = (cart?.items || []).filter((i: any) => i.outOfStock);

  const checkoutMut = useMutation({
    mutationFn: async () => {
      const validation = await apiClient.get<{ valid: boolean; reason: string }>('/cart/validate-stock');
      if (!validation.valid) throw { response: { data: { error: validation.reason } } };
      router.push('/checkout');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Cannot proceed to checkout'),
  });

  if (!user) return null;

  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl font-bold mb-6">Your Cart</h1>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : !cart?.items?.length && !pendingCodRequests.length ? (
        <EmptyState title="Your cart is empty" description="Browse our marketplace and add items to your cart." action={<Link href="/" className="btn-primary">Back to marketplace</Link>} />
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-3">
            {/* PRD_New V4: Pending COD requests as SEPARATE small compact cards.
                Cart is NOT locked — buyer can proceed with new checkout. */}
            {pendingCodRequests.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Waiting for seller approval
                </p>
                {pendingCodRequests.map((req: any) => (
                  <div key={req._id} className="card p-3 flex items-center gap-3 bg-amber-50/50 border-amber-200">
                    {/* Small icon */}
                    <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">COD Request #{shortId(req._id)}</p>
                      <p className="text-xs text-ink-500">{req.itemCount} item(s) · {formatPKR(req.total)}</p>
                    </div>
                    <span className="badge-amber text-[10px]">{req.requestStatus === 'PENDING_SELLER_APPROVAL' ? 'Pending' : 'Awaiting'}</span>
                  </div>
                ))}
              </div>
            )}

            {outOfStockItems.length > 0 && (
              <div className="card p-4 bg-red-50 border-red-200">
                <p className="text-sm text-red-800">⚠ {outOfStockItems.length} item(s) are out of stock. Remove them before checkout.</p>
              </div>
            )}

            {/* Cart items — NOT locked even if COD requests exist */}
            {cart?.items?.map((item: any) => (
              <div key={item.variantId} className={cn('card p-4 flex gap-4', item.isBundleDeal && 'border-2 border-brand-200 bg-brand-50/30')}>
                <Link href={`/product/${item.slug}`} className="shrink-0">
                  <div className="h-20 w-20 rounded-xl overflow-hidden bg-ink-100">
                    {item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${item.slug}`} className="font-medium text-sm hover:text-brand-700 line-clamp-2">{item.title}</Link>
                  {item.variantLabel && <p className="text-xs text-ink-500 mt-0.5">{item.variantLabel}</p>}
                  <p className="text-sm font-semibold mt-1">{formatPKR(item.priceAtAdd)}</p>
                  {item.isBundleDeal && <span className="badge-brand text-[10px] mt-1">Bundle Deal (locked)</span>}
                  {item.outOfStock ? <span className="badge-red text-xs mt-1">Out of stock</span> : <span className="text-xs text-ink-500 mt-1 inline-block">In stock: {item.stockAvailable}</span>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {item.isBundleDeal || item.lockedQuantity ? (
                    <span className="text-sm font-medium px-3 py-1.5 rounded-lg bg-ink-100">{item.quantity}</span>
                  ) : (
                    <div className="inline-flex items-center border border-ink-200 rounded-lg">
                      <button onClick={() => updateMut.mutate({ variantId: item.variantId, quantity: Math.max(1, item.quantity - 1) })} className="px-2 py-1 hover:bg-ink-50 disabled:opacity-40" disabled={item.quantity <= 1 || item.outOfStock}><Minus className="h-3 w-3" /></button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button onClick={() => updateMut.mutate({ variantId: item.variantId, quantity: Math.min(item.stockAvailable, item.quantity + 1) })} className="px-2 py-1 hover:bg-ink-50 disabled:opacity-40" disabled={item.outOfStock || item.quantity >= item.stockAvailable}><Plus className="h-3 w-3" /></button>
                    </div>
                  )}
                  <button onClick={() => removeMut.mutate(item.variantId)} className="text-ink-400 hover:text-red-600 text-xs inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-5 h-fit sticky top-24">
            <h2 className="font-display font-bold text-lg mb-4">Order summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-600">Subtotal ({cart?.totalItems || 0} items)</span><span className="font-medium">{formatPKR(cart?.subtotal || 0)}</span></div>
              <div className="flex justify-between"><span className="text-ink-600">Shipping</span><span className="font-medium text-green-600">Rs 0 (Free)</span></div>
              <div className="border-t border-ink-100 pt-2 mt-2 flex justify-between text-base"><span className="font-semibold">Total</span><span className="font-display font-bold">{formatPKR(cart?.subtotal || 0)}</span></div>
            </div>
            {/* PRD_New V4: cart is NOT locked even when COD requests are pending */}
            {cart?.items?.length > 0 && (
              <button onClick={() => checkoutMut.mutate()} disabled={outOfStockItems.length > 0 || checkoutMut.isPending} className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
                {checkoutMut.isPending ? 'Checking...' : 'Proceed to Checkout'}
              </button>
            )}
            {!cart?.items?.length && pendingCodRequests.length > 0 && (
              <p className="text-xs text-ink-500 mt-4 text-center">Your cart items have been submitted as COD requests above.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
