import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 bg-ink-900 text-ink-200">
      <div className="container-x py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white font-bold">S</span>
            <span className="font-display text-xl font-extrabold text-white">Shopwave</span>
          </div>
          <p className="text-sm text-ink-400 max-w-xs">
            A modern single-seller marketplace with COD via WhatsApp confirmation, real-time stock, and full seller controls.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3 text-sm">Shop</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/products" className="hover:text-white">All products</Link></li>
            <li><Link href="/products?sort=discount" className="hover:text-white">Today&apos;s deals</Link></li>
            <li><Link href="/products?sort=newest" className="hover:text-white">New arrivals</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3 text-sm">Account</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/account" className="hover:text-white">My account</Link></li>
            <li><Link href="/orders" className="hover:text-white">My orders</Link></li>
            <li><Link href="/wishlist" className="hover:text-white">Wishlist</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3 text-sm">Help</h4>
          <ul className="space-y-2 text-sm">
            <li><span className="text-ink-400">COD confirmation via WhatsApp</span></li>
            <li><span className="text-ink-400">Returns within 7 days</span></li>
            <li><span className="text-ink-400">support@shopwave.example</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-800 py-4 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} Shopwave. Demo project — not a real store.
      </div>
    </footer>
  );
}
