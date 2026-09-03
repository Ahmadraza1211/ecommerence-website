'use client';

import Link from 'next/link';

/**
 * PRD_New §Buyer.2: navigating to an invalid URL should show only an error page,
 * not the Navbar.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
      <div className="text-center">
        <p className="font-display text-7xl font-extrabold text-brand-600">404</p>
        <h1 className="font-display text-2xl font-bold mt-4 mb-2">Page not found</h1>
        <p className="text-sm text-ink-500 max-w-md mx-auto mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" className="btn-primary">Back to Marketplace</Link>
      </div>
    </div>
  );
}
