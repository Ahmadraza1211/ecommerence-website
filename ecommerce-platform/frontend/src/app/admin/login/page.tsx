'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import toast from 'react-hot-toast';
import { Lock, Mail, ShieldAlert, Eye, EyeOff } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'BUYER') {
        toast.error("You're logged in as a buyer. Sign out first to access the admin panel.");
        router.push('/');
      } else {
        router.push('/admin/dashboard');
      }
    }
  }, [isAuthenticated, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await apiClient.post<{ user: any; accessToken: string }>('/auth/admin/login', { email, password });
      if (data.user.role !== 'ADMIN') {
        toast.error('Not an admin account');
        return;
      }
      setAuth(data.user, data.accessToken);
      toast.success('Welcome, admin');
      router.push('/admin/dashboard');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (isAuthenticated && user) {
    return <div className="min-h-screen flex items-center justify-center bg-ink-900"><p className="text-sm text-ink-400">Redirecting…</p></div>;
  }

  return (
    <div
      className="min-h-screen text-white flex items-center justify-center px-4"
      style={{
        backgroundImage: "linear-gradient(rgba(2, 6, 23, 0.6), rgba(2, 6, 23, 0.72)), url('/background.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-6 text-white">
          <img src="/Logo1.jpeg" alt="Rana Ahmad Textile logo" className="h-10 w-10 rounded-xl object-cover shadow-md" />
          <span className="font-display text-2xl font-extrabold">Rana Ahmad Textile Admin</span>
        </Link>
        <div className="bg-slate-900/80 rounded-2xl p-6 shadow-2xl border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <h1 className="font-display text-xl font-bold">Restricted area</h1>
          </div>
          <p className="text-xs text-ink-300 mb-6">Seller/admin login. This path is not advertised in the storefront UI.</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label text-ink-200">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10 bg-slate-800/80 border-slate-600 text-white" placeholder="you@gmail.com" autoComplete="email" required />
              </div>
            </div>
            <div>
              <label className="label text-ink-200">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-10 pr-10 bg-slate-800/80 border-slate-600 text-white" placeholder="••••••••" autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-white" aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full bg-brand-600 hover:bg-brand-700">
              {submitting ? 'Signing in...' : 'Sign in to admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
