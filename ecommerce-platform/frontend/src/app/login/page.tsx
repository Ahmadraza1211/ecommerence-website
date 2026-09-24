'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/authStore';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get('redirect') || '/';
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // PRD_New V3 §Platform-Wide.2-3: skip login page when already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        toast.error("You're logged in as a seller. Sign out first to switch accounts.");
        router.push('/admin/dashboard');
      } else {
        router.push(redirect);
      }
    }
  }, [isAuthenticated, user, router, redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await apiClient.post<{ user: any; accessToken: string }>('/auth/login', { email, password });
      setAuth(data.user, data.accessToken);
      toast.success('Welcome back!');
      router.push(redirect);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (isAuthenticated && user) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-ink-500">Redirecting…</p></div>;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        backgroundImage: "linear-gradient(rgba(15, 23, 42, 0.62), rgba(15, 23, 42, 0.68)), url('/background.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="card w-full max-w-md p-8 bg-white/90 backdrop-blur-sm border border-white/40 shadow-2xl">
        <Link href="/" className="flex items-center gap-2 mb-6">
          <img src="/logo1.png" alt="Rana Ahmad Textile logo" className="h-9 w-9 rounded-xl object-cover shadow-md" />
          <span className="font-display text-xl font-extrabold">Rana Ahmad Textile</span>
        </Link>
        <h1 className="font-display text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-sm text-ink-500 mb-6">Sign in to your buyer account to continue shopping.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="you@example.com" required />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-10 pr-10" placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-sm text-ink-600 text-center mt-6">
          Don&apos;t have an account?{' '}
          <Link href={`/register?redirect=${encodeURIComponent(redirect)}`} className="text-brand-600 hover:text-brand-700 font-semibold">Create one</Link>
        </p>

      </div>
    </div>
  );
}
