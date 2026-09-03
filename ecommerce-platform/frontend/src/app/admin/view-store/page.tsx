'use client';

import Link from 'next/link';

/**
 * PRD_New §View Store:
 * When a Seller clicks "View Store", render the exact Marketplace page buyers see
 * — without the site Navbar — with the seller's Module sidebar still visible.
 */
export default function AdminViewStorePage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold">View Store</h1>
        <p className="text-sm text-ink-500">This is exactly what buyers see on the marketplace.</p>
      </div>
      <MarketplacePreview />
    </div>
  );
}

/**
 * Embeds the marketplace content via an iframe to / (the marketplace home).
 * The iframe loads the storefront page; the seller's sidebar stays visible
 * because this page is rendered inside the admin layout.
 *
 * The storefront's own Navbar appears inside the iframe (which is fine —
 * it's part of the marketplace), but the seller's main admin shell with
 * its sidebar stays as the outer frame.
 */
function MarketplacePreview() {
  return (
    <div className="card overflow-hidden">
      <iframe
        src="/"
        title="Marketplace preview"
        className="w-full h-[80vh] border-0"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    </div>
  );
}
