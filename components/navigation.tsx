'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from './cart-provider';
export function Navigation({ signedIn }: { signedIn: boolean }) {
  const { count, ready } = useCart();
  const path = usePathname();
  return <><div className="announcement">Thoughtful objects. A little more everyday joy.</div><header className="header wrap"><Link className="wordmark" href="/" aria-label="Field and Form home">FIELD <span>&</span> FORM<span className="brand-sub">OBJECTS FOR EVERYDAY LIVING</span></Link><nav aria-label="Main navigation"><Link href="/products" aria-current={path.startsWith('/products') ? 'page' : undefined}>Shop all</Link><Link className="story-nav" href="/#our-approach">Our approach</Link><Link href={signedIn ? '/account' : '/sign-in'} aria-current={path === '/account' || path === '/sign-in' || path === '/sign-up' ? 'page' : undefined}>{signedIn ? 'Account' : 'Sign in'}</Link><Link className="bag-link" href="/cart" aria-current={path === '/cart' ? 'page' : undefined}><svg width="20" height="22" viewBox="0 0 20 22" fill="none" aria-hidden="true"><path d="M3 7h14l1 13H2L3 7Z M6 7V5a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.4"/></svg>Bag <span className="bag-count">{ready ? count : 0}</span></Link></nav></header></>;
}
