'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { Skeleton } from '@/components/ui/Skeleton';
import { Package, MapPin, Heart, User as UserIcon, LogOut, Plus, Trash2, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { NotificationBadge } from '@/components/storefront/NotificationBadge';

export default function AccountPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const qc = useQueryClient();
  const [tab, setTab] = useState<'profile'>('profile');

  useEffect(() => {
    if (!user) router.push('/login?redirect=/account');
    if (user?.role === 'ADMIN') router.push('/admin/dashboard');
  }, [user, router]);

  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => apiClient.get<{ items: any[] }>('/wishlist'),
    enabled: !!user && user.role === 'BUYER',
  });
  const wishlistCount = wishlistData?.items?.length || 0;

  if (!user) return null;

  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl font-bold mb-6">My account</h1>
      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <aside className="card p-2 h-fit">
          <nav className="space-y-1">
            <button onClick={() => setTab('profile')}
              className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full text-left',
                tab === 'profile' ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-700 hover:bg-ink-50')}>
              <UserIcon className="h-4 w-4" /> Profile
            </button>
            <Link href="/orders" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-700 hover:bg-ink-50">
              <Package className="h-4 w-4" /> My orders
            </Link>
            {/* PRD_New V3: Purchase History link */}
            <Link href="/purchase-history" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-700 hover:bg-ink-50">
              <ShoppingBag className="h-4 w-4" /> Purchase History
            </Link>
            <Link href="/wishlist" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-700 hover:bg-ink-50">
              <Heart className="h-4 w-4" /> Wishlist
              <NotificationBadge count={wishlistCount} className="ml-auto" />
            </Link>
            <button onClick={async () => { await logout(); router.push('/'); }} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 w-full text-left">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </nav>
        </aside>
        <div>
          {tab === 'profile' && <ProfileTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', avatarUrl: user?.avatarUrl || '' });

  const saveMut = useMutation({
    mutationFn: () => apiClient.patch('/auth/me', form),
    onSuccess: () => { fetchMe(); toast.success('Profile updated'); },
  });

  const { data: addressesData, isLoading: addrLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiClient.get<{ items: any[] }>('/addresses'),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: '', fullName: '', phone: '', addressLine: '', city: '', postalCode: '' });

  const addAddrMut = useMutation({
    mutationFn: () => apiClient.post('/addresses', newAddr),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      setShowAdd(false);
      setNewAddr({ label: '', fullName: '', phone: '', addressLine: '', city: '', postalCode: '' });
      toast.success('Address added');
    },
  });

  const delAddrMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/addresses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addresses'] }); toast.success('Address deleted'); },
  });

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="font-display font-bold text-lg mb-4">Profile</h2>
        <div className="space-y-3 max-w-md">
          <div><label className="label">Full name</label><input className="input" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></div>
          <div><label className="label">Email (read-only)</label><input className="input bg-ink-50" value={user?.email || ''} disabled /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} /></div>
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">Save changes</button>
        </div>
        {/* V7: Password reveal with email verification */}
        <div className="mt-6 p-4 rounded-xl bg-ink-50 dark:bg-slate-800">
          <label className="label">Password</label>
          <PasswordReveal />
        </div>
      </div>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2"><MapPin className="h-5 w-5" /> Saved addresses</h2>
          <button onClick={() => setShowAdd((v) => !v)} className="btn-outline text-sm"><Plus className="h-4 w-4" /> Add</button>
        </div>
        {showAdd && (
          <div className="card p-4 border border-ink-100 mb-3 grid grid-cols-2 gap-2">
            <input className="input text-sm" placeholder="Label" value={newAddr.label} onChange={(e) => setNewAddr((s) => ({ ...s, label: e.target.value }))} />
            <input className="input text-sm" placeholder="Full name" value={newAddr.fullName} onChange={(e) => setNewAddr((s) => ({ ...s, fullName: e.target.value }))} />
            <input className="input text-sm" placeholder="Phone" value={newAddr.phone} onChange={(e) => setNewAddr((s) => ({ ...s, phone: e.target.value }))} />
            <input className="input text-sm" placeholder="City" value={newAddr.city} onChange={(e) => setNewAddr((s) => ({ ...s, city: e.target.value }))} />
            <input className="input text-sm col-span-2" placeholder="Address line" value={newAddr.addressLine} onChange={(e) => setNewAddr((s) => ({ ...s, addressLine: e.target.value }))} />
            <input className="input text-sm" placeholder="Postal code" value={newAddr.postalCode} onChange={(e) => setNewAddr((s) => ({ ...s, postalCode: e.target.value }))} />
            <div className="col-span-2 flex gap-2">
              <button onClick={() => addAddrMut.mutate()} className="btn-primary text-sm flex-1">Save</button>
              <button onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        )}
        {addrLoading ? <Skeleton className="h-20 w-full" /> : !addressesData?.items?.length ? (
          <p className="text-sm text-ink-500 text-center py-8">No saved addresses yet.</p>
        ) : (
          <div className="space-y-2">
            {addressesData.items.map((a: any) => (
              <div key={a._id} className="border border-ink-100 rounded-xl p-3 flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{a.fullName} <span className="text-xs text-ink-500">· {a.label}</span> {a.isDefault && <span className="badge-brand text-xs ml-1">Default</span>}</p>
                  <p className="text-sm text-ink-700">{a.addressLine}, {a.city} {a.postalCode}</p>
                  <p className="text-xs text-ink-500">{a.phone}</p>
                </div>
                <button onClick={() => delAddrMut.mutate(String(a._id))} className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg" aria-label="Delete address">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordReveal() {
  const user = useAuthStore((s) => s.user);
  const [emailInput, setEmailInput] = useState('');
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (emailInput.trim().toLowerCase() === user?.email?.toLowerCase()) {
      setRevealed(true);
      setShowPw(true);
      toast.success('Email verified! You can now view or update your account password security.');
    } else {
      toast.error('Email does not match your account');
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPw || newPw.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch('/auth/me', { password: newPw });
      toast.success('Password updated successfully!');
      setNewPw('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {!revealed ? (
        <div>
          {!showEmailPrompt ? (
            <div className="flex items-center justify-between p-3 border border-ink-100 dark:border-slate-700 rounded-xl bg-ink-50 dark:bg-slate-800">
              <div>
                <p className="text-sm font-semibold dark:text-slate-200">Account Password Security</p>
                <p className="text-xs text-ink-500 dark:text-slate-400">Verify email to reveal & manage account password</p>
              </div>
              <button onClick={() => setShowEmailPrompt(true)} className="btn-outline text-xs">Verify Email to Reveal</button>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="p-3 border border-amber-200 dark:border-slate-700 rounded-xl bg-amber-50/50 dark:bg-slate-800 space-y-2">
              <label className="text-xs font-semibold text-ink-700 dark:text-slate-300">Enter email ({user?.email}) to verify identity:</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Confirm your email address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="input text-sm flex-1"
                  required
                />
                <button type="submit" className="btn-primary text-xs">Verify</button>
                <button type="button" onClick={() => setShowEmailPrompt(false)} className="btn-ghost text-xs">Cancel</button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="p-3 border border-green-200 dark:border-slate-700 rounded-xl bg-green-50/40 dark:bg-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1">
              ✓ Email Verified — Password Unlocked
            </span>
            <button onClick={() => setShowPw((v) => !v)} className="text-xs text-brand-600 hover:underline font-medium">
              {showPw ? 'Hide Field' : 'Show Field'}
            </button>
          </div>
          <form onSubmit={handleUpdatePassword} className="space-y-2">
            <label className="text-xs text-ink-600 dark:text-slate-300 font-medium">Set New Account Password</label>
            <div className="flex gap-2">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Enter new password (min 6 chars)"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="input text-sm flex-1"
                minLength={6}
              />
              <button type="submit" disabled={saving} className="btn-primary text-xs">
                {saving ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
