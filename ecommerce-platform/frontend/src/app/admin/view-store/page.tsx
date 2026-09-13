'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * V8: "View Store" opens / directly in the same tab — no iframe, no confirmation.
 */
export default function AdminViewStorePage() {
  const router = useRouter();
  useEffect(() => {
    router.push('/');
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-sm text-ink-500">Redirecting to marketplace…</p>
    </div>
  );
}
