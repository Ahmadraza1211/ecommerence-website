'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { formatPKR, shortId } from '@/lib/utils';
import { Skeleton, EmptyState } from '@/components/ui/Skeleton';
import { MessageCircle, Check, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) router.push('/login?redirect=/checkout');
  }, [user, router]);

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: () => apiClient.get<{ cart: any }>('/cart'),
    enabled: !!user,
  });
  const { data: addressesData } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiClient.get<{ items: any[] }>('/addresses'),
    enabled: !!user,
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: '', fullName: '', phone: '', addressLine: '', city: '', postalCode: '' });
  const [stage, setStage] = useState<'select' | 'cod-flow'>('select');
  const [codRequest, setCodRequest] = useState<any>(null);
  const [waLink, setWaLink] = useState<string>('');

  useEffect(() => {
    const def = addressesData?.items?.find((a: any) => a.isDefault) || addressesData?.items?.[0];
    if (def) setSelectedAddressId(String(def._id));
  }, [addressesData]);

  const addAddrMut = useMutation({
    mutationFn: () => apiClient.post('/addresses', { ...newAddr, isDefault: addressesData?.items?.length === 0 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      setShowAddAddress(false);
      setNewAddr({ label: '', fullName: '', phone: '', addressLine: '', city: '', postalCode: '' });
      toast.success('Address added');
    },
  });

  // PRD_New §Checkout.1: ability to delete a saved address
  const delAddrMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/addresses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address deleted');
    },
  });

  const codMut = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/cod-requests', { addressId: selectedAddressId });
      // V5: Clear the cart after placing COD — items should NOT remain in cart
      await apiClient.delete('/cart');
      return res;
    },
    onSuccess: (data) => {
      setCodRequest(data.codRequest);
      setWaLink(data.waLink);
      setStage('cod-flow');
      qc.invalidateQueries({ queryKey: ['cart'] });
      toast.success('COD request placed — cart cleared');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to start COD flow'),
  });

  const conversationDoneMut = useMutation({
    mutationFn: () => apiClient.patch(`/cod-requests/${codRequest?._id}/conversation-done`),
    onSuccess: () => {
      toast.success('Seller has been notified. You will be informed once your order is accepted.');
      router.push('/orders');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const cart = cartData?.cart;

  if (!user) return null;
  if (!cartData) return <div className="container-x py-6"><Skeleton className="h-40 w-full" /></div>;

  if (stage === 'cod-flow' && codRequest) {
    return (
      <div className="container-x py-8 max-w-xl mx-auto">
        <div className="card p-6 space-y-6">
          <div className="text-center">
            <span className="inline-flex p-3 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 mb-2">
              <MessageCircle className="h-8 w-8" />
            </span>
            <h1 className="font-display text-2xl font-extrabold text-ink-900 dark:text-slate-100">Complete Your Order on WhatsApp</h1>
            <p className="text-xs text-ink-500 dark:text-slate-400 mt-1">Request ID: #{String(codRequest._id).slice(-6).toUpperCase()}</p>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold">1</span>
              <div className="flex-1">
                <p className="font-bold text-sm text-green-950 dark:text-green-200">Send Pre-filled Order to Seller</p>
                <p className="text-xs text-green-800 dark:text-green-300 mt-0.5 mb-3">Click below to open WhatsApp with your full order & shipping details pre-filled.</p>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 inline-flex items-center gap-2 shadow-md"
                >
                  <MessageCircle className="h-4 w-4" /> Open WhatsApp Chat
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white text-xs font-bold">2</span>
              <div className="flex-1">
                <p className="font-bold text-sm text-amber-950 dark:text-amber-200">Confirm Conversation Done</p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 mb-3">After messaging on WhatsApp, click below to notify the seller and submit your COD request for approval.</p>
                <button
                  onClick={() => conversationDoneMut.mutate()}
                  disabled={conversationDoneMut.isPending}
                  className="btn-primary bg-amber-600 hover:bg-amber-700 text-white text-xs px-4 py-2 inline-flex items-center gap-2 shadow-md"
                >
                  <Check className="h-4 w-4" /> Conversation Done (Submit Order)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!cart?.items?.length && stage === 'select') {
    return (
      <div className="container-x py-6">
        <EmptyState title="Your cart is empty" action={<Link href="/" className="btn-primary">Browse marketplace</Link>} />
      </div>
    );
  }

  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl font-bold mb-6">Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          {/* PRD_New §Checkout.4: "Confirm on WhatsApp" moved to the TOP */}
          {stage === 'cod-flow' && codRequest && (
            <div className="card p-5 border-2 border-green-200 bg-green-50/50">
              <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" /> COD Confirmation Steps
              </h2>
              {/* V5: Step-by-step UI */}
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-sm shrink-0">1</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Open WhatsApp</p>
                    <p className="text-xs text-ink-500 mt-0.5">Click the button below to open WhatsApp with your order details pre-filled.</p>
                    <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm mt-2 inline-flex">
                      <MessageCircle className="h-4 w-4" /> Open WhatsApp
                    </a>
                  </div>
                </div>
                {/* Step 2 */}
                <div className="flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-sm shrink-0">2</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Talk to the Seller</p>
                    <p className="text-xs text-ink-500 mt-0.5">Confirm your order details (items, quantity, address) with the seller on WhatsApp.</p>
                  </div>
                </div>
                {/* Step 3 */}
                <div className="flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-sm shrink-0">3</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Come Back & Click "Conversation Done"</p>
                    <p className="text-xs text-ink-500 mt-0.5">Once you've finished the conversation, click below to notify the seller.</p>
                    <button onClick={() => conversationDoneMut.mutate()} disabled={conversationDoneMut.isPending} className="btn-primary text-sm mt-2">
                      <Check className="h-4 w-4" /> Conversation Done
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-ink-500 mt-4 pt-3 border-t border-ink-100">
                Request #{shortId(codRequest._id)} — Stock is reserved once the seller accepts. If sold out, you'll be notified.
              </p>
            </div>
          )}

          {/* Address selection (PRD_New §Checkout.1: can delete addresses) */}
          <div className="card p-5">
            <h2 className="font-display font-bold text-lg mb-3">Delivery address</h2>
            {addressesData?.items?.length ? (
              <div className="space-y-2">
                {addressesData.items.map((a: any) => (
                  <div key={a._id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${selectedAddressId === String(a._id) ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300'}`}>
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === String(a._id)}
                      onChange={() => setSelectedAddressId(String(a._id))}
                      className="mt-1 text-brand-600"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{a.fullName} <span className="text-xs text-ink-500 font-normal">· {a.label}</span></p>
                      <p className="text-sm text-ink-700">{a.addressLine}, {a.city} {a.postalCode}</p>
                      <p className="text-xs text-ink-500">{a.phone}</p>
                    </div>
                    {/* PRD_New §Checkout.1: delete saved address */}
                    <button
                      onClick={() => { if (confirm('Delete this address?')) delAddrMut.mutate(String(a._id)); }}
                      className="text-ink-400 hover:text-red-600 p-1"
                      aria-label="Delete address"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500">No saved addresses yet. Add one below.</p>
            )}

            {!showAddAddress ? (
              <button onClick={() => setShowAddAddress(true)} className="btn-outline text-sm mt-3">
                <Plus className="h-4 w-4" /> Add new address
              </button>
            ) : (
              <div className="mt-3 card p-4 border border-ink-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">New address</p>
                  <button onClick={() => setShowAddAddress(false)} className="text-ink-400 hover:text-ink-600"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input className="input text-sm" placeholder="Label (Home, Office)" value={newAddr.label} onChange={(e) => setNewAddr((s) => ({ ...s, label: e.target.value }))} />
                  <input className="input text-sm" placeholder="Full name" value={newAddr.fullName} onChange={(e) => setNewAddr((s) => ({ ...s, fullName: e.target.value }))} />
                  <input className="input text-sm" placeholder="Phone" value={newAddr.phone} onChange={(e) => setNewAddr((s) => ({ ...s, phone: e.target.value }))} />
                  <input className="input text-sm" placeholder="City" value={newAddr.city} onChange={(e) => setNewAddr((s) => ({ ...s, city: e.target.value }))} />
                  <input className="input text-sm col-span-2" placeholder="Address line" value={newAddr.addressLine} onChange={(e) => setNewAddr((s) => ({ ...s, addressLine: e.target.value }))} />
                  <input className="input text-sm" placeholder="Postal code (optional)" value={newAddr.postalCode} onChange={(e) => setNewAddr((s) => ({ ...s, postalCode: e.target.value }))} />
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => addAddrMut.mutate()} disabled={!newAddr.label || !newAddr.fullName || !newAddr.phone || !newAddr.addressLine || !newAddr.city} className="btn-primary text-sm flex-1">Save address</button>
                  <button onClick={() => setShowAddAddress(false)} className="btn-ghost text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* PRD_New §Checkout.5: COD only — removed Card/Wallet payment methods */}
          <div className="card p-5">
            <h2 className="font-display font-bold text-lg mb-3">Payment method</h2>
            <div className="flex items-start gap-3 p-3 rounded-xl border border-brand-500 bg-brand-50">
              <input type="radio" checked readOnly className="mt-1 text-brand-600" />
              <div className="flex-1">
                <p className="font-semibold text-sm flex items-center gap-2"><MessageCircle className="h-4 w-4 text-green-600" /> Cash on Delivery (COD)</p>
                <p className="text-xs text-ink-600 mt-1">Confirm your order on WhatsApp with the seller before it ships. Pay cash when delivered.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="card p-5 h-fit sticky top-24">
          <h2 className="font-display font-bold text-lg mb-3">Order summary</h2>
          <div className="space-y-2 max-h-60 overflow-auto mb-3">
            {cart?.items?.map((item: any) => (
              <div key={item.variantId} className="flex gap-2 text-xs">
                <div className="h-12 w-12 rounded-lg bg-ink-100 shrink-0 overflow-hidden">
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-ink-500">x{item.quantity} · {formatPKR(item.priceAtAdd)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-ink-100 pt-2 text-sm">
            <div className="flex justify-between mb-1"><span className="text-ink-600">Subtotal</span><span>{formatPKR(cart?.subtotal || 0)}</span></div>
            <div className="flex justify-between mb-1"><span className="text-ink-600">Shipping</span><span className="text-green-600">Free</span></div>
            <div className="flex justify-between font-bold text-base mt-2 border-t border-ink-100 pt-2">
              <span>Total</span><span>{formatPKR(cart?.subtotal || 0)}</span>
            </div>
          </div>

          {stage === 'select' && (
            <button
              onClick={() => {
                if (!selectedAddressId) return toast.error('Please select a delivery address');
                codMut.mutate();
              }}
              disabled={codMut.isPending || !selectedAddressId}
              className="btn-primary w-full mt-4"
            >
              <MessageCircle className="h-4 w-4" /> Place COD Order <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
