import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { StorefrontShell } from '@/components/storefront/StorefrontShell';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });

export const metadata: Metadata = {
  title: 'Rana Ahmad Textile',
  description: 'A premium textile marketplace experience with COD, WhatsApp confirmation, and full seller controls.',
  metadataBase: new URL('http://localhost:3000'),
  icons: {
    icon: '/logo1.png',
    shortcut: '/logo1.png',
    apple: '/logo1.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <head>
        <link rel="icon" href="/logo1.png" sizes="any" />
        <link rel="apple-touch-icon" href="/logo1.png" />
      </head>
      <body className="font-sans">
        <Providers>
          <StorefrontShell>{children}</StorefrontShell>
        </Providers>
      </body>
    </html>
  );
}
