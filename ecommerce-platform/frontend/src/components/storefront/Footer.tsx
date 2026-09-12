import Link from 'next/link';
import { ShieldCheck, Truck, Headphones, Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-16 relative bg-slate-900 text-slate-200">
      {/* Above-Footer Card with Image 2 (25% opacity) */}
      <div className="container-x relative z-10 -translate-y-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-900/90 via-slate-800/95 to-slate-900 p-6 md:p-8 shadow-xl border border-amber-500/20 text-white">
          <div 
            className="absolute inset-0 pointer-events-none opacity-25 bg-cover bg-center"
            style={{
              backgroundImage: `url('/uploads/image2.jpg'), url('/images/image2.png'), url('/image2.png')`,
            }}
          />
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left items-center">
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-300">Fast Nationwide Shipping</h4>
                <p className="text-xs text-slate-300">Express delivery right to your doorstep</p>
              </div>
            </div>
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-300">100% Quality Guaranteed</h4>
                <p className="text-xs text-slate-300">Premium Pakistani fabric & craftsmanship</p>
              </div>
            </div>
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                <Headphones className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-300">WhatsApp COD Support</h4>
                <p className="text-xs text-slate-300">Quick order tracking & live support</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Main Section with Image 1 (25% opacity) */}
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 pointer-events-none opacity-25 bg-cover bg-center"
          style={{
            backgroundImage: `url('/uploads/image1.jpg'), url('/images/image1.png'), url('/image1.png')`,
          }}
        />
        <div className="container-x relative z-10 pb-12 pt-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="inline-flex h-9 px-2.5 items-center justify-center rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold tracking-widest text-xs shadow-md">
                LOGO
              </span>
              <span className="font-serif text-xl font-extrabold text-amber-400">
                Rana Ahmad Textile
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Exquisite fashion collection, premium luxury unstitched & stitched fabrics with seamless COD checkout.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-amber-400 mb-3 text-xs tracking-wider uppercase">Shop</h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li><Link href="/products" className="hover:text-amber-400 transition-colors">All products</Link></li>
              <li><Link href="/products?sort=discount" className="hover:text-amber-400 transition-colors">Special Offers</Link></li>
              <li><Link href="/products?sort=newest" className="hover:text-amber-400 transition-colors">New arrivals</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-amber-400 mb-3 text-xs tracking-wider uppercase">Account</h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li><Link href="/account" className="hover:text-amber-400 transition-colors">My account</Link></li>
              <li><Link href="/orders" className="hover:text-amber-400 transition-colors">My orders</Link></li>
              <li><Link href="/wishlist" className="hover:text-amber-400 transition-colors">Wishlist</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-amber-400 mb-3 text-xs tracking-wider uppercase">Customer Care</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><span>COD confirmation via WhatsApp</span></li>
              <li><span>Premium 7-day Exchange Policy</span></li>
              <li><span>support@ranaahmadtextile.com</span></li>
            </ul>
          </div>
        </div>

        <div className="relative z-10 border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Rana Ahmad Textile. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
