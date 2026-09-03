'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/authStore';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { Mail, Lock, User as UserIcon, Phone } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get('redirect') || '/';
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await apiClient.post<{ user: any; accessToken: string }>('/auth/register', form);
      setAuth(data.user, data.accessToken);
      toast.success('Welcome to Shopwave!');
      router.push(redirect);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  function set<K extends keyof typeof form>(key: K, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-amber-50 flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <Link href="/" className="flex items-center gap-2 mb-6">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white font-bold">S</span>
          <span className="font-display text-xl font-extrabold">Shopwave</span>
        </Link>
        <h1 className="font-display text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-sm text-ink-500 mb-6">Join Shopwave to start shopping with COD via WhatsApp.</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className="input pl-10" placeholder="Your name" required />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="input pl-10" placeholder="you@example.com" required />
            </div>
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input pl-10" placeholder="+92 300 1234567" />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className="input pl-10" placeholder="At least 6 characters" required minLength={6} />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-ink-600 text-center mt-6">
          Already have an account?{' '}
          <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-brand-600 hover:text-brand-700 font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
