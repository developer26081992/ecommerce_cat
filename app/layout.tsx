import type { Metadata } from 'next';
import Link from 'next/link';
import { CartProvider } from '@/components/cart-provider';
import { Navigation } from '@/components/navigation';
import { getCurrentUser } from '@/lib/auth';
import './globals.css';
export const metadata: Metadata = { title: { default: 'Field & Form — Objects for everyday living', template: '%s | Field & Form' }, description: 'Considered homewares, natural textures, and simple pieces for everyday living.' };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return <html lang="en" data-scroll-behavior="smooth"><body><CartProvider><a href="#main" className="skip-link">Skip to content</a><Navigation signedIn={Boolean(user)}/>{children}<footer className="footer"><div className="wrap footer-inner"><div><Link className="footer-brand" href="/">FIELD & FORM</Link><p>A considered home, one piece at a time.</p></div><div className="footer-links"><Link href="/products">Explore the collection ↗</Link><span>© {new Date().getFullYear()} Field & Form</span></div></div></footer></CartProvider></body></html>;
}
