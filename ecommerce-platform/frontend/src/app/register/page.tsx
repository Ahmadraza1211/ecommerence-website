'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/authStore';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { Mail, Lock, User as UserIcon, Phone, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get('redirect') || '/';
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // V7: Auto-format phone as 03XX-XXXXXXX
  function formatPhone(val: string) {
    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 11);
    if (cleaned.length > 4) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    return cleaned;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // V7: Validate phone
    const cleanedPhone = form.phone.replace(/[-\s]/g, '');
    if (!/^03\d{9}$/.test(cleanedPhone)) {
      toast.error('Phone must be 11 digits starting with 03 (format: 03XX-XXXXXXX)');
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiClient.post<{ user: any; accessToken: string }>('/auth/register', form);
      setAuth(data.user, data.accessToken);
      toast.success('Welcome to Rana Ahmad Textile!');
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <Link href="/" className="flex items-center gap-2 mb-6">
          <img src="/logo1.png" alt="Rana Ahmad Textile logo" className="h-9 w-9 rounded-xl object-cover shadow-md" />
          <span className="font-display text-xl font-extrabold">Rana Ahmad Textile</span>
        </Link>
        <h1 className="font-display text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-sm text-ink-500 mb-6">Join Rana Ahmad Textile to start shopping with COD via WhatsApp.</p>
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
            <label className="label">Phone * (03XX-XXXXXXX)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input type="tel" value={form.phone} onChange={(e) => set('phone', formatPhone(e.target.value))} className="input pl-10" placeholder="0300-1234567" required maxLength={12} />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => set('password', e.target.value)} className="input pl-10 pr-10" placeholder="At least 6 characters" required minLength={6} />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600" aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="text-sm text-ink-600 text-center mt-6">
          Already have an account?{' '}
          <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-amber-600 hover:text-amber-700 font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
