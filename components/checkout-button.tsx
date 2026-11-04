'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CheckoutItem } from '@/lib/checkout-types';
import { reusableCheckoutAttempt, type CheckoutAttemptMarker } from '@/lib/checkout-attempt';

const nonceKey = 'field-form-checkout-attempt';
function forgetAttempt() { try { sessionStorage.removeItem(nonceKey); } catch { /* In-memory controls still work. */ } }

export function CheckoutButton({ items, signedIn, enabled }: { items: CheckoutItem[]; signedIn: boolean; enabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const busy = useRef(false);
  const attempt = useRef<CheckoutAttemptMarker | null>(null);
  const router = useRouter();

  async function startCheckout() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    const sorted = [...items].map(({ id, quantity }) => ({ id, quantity })).sort((a, b) => a.id.localeCompare(b.id));
    const fingerprint = JSON.stringify(sorted);
    try {
      let saved: unknown;
      let storageAvailable = true;
      try { saved = JSON.parse(sessionStorage.getItem(nonceKey) || 'null'); } catch (cause) { saved = null; storageAvailable = cause instanceof SyntaxError; }
      // Consult storage on every click: a restored cart component may still hold
      // an in-memory pending marker after its order was completed elsewhere.
      attempt.current = reusableCheckoutAttempt(storageAvailable ? saved : attempt.current, fingerprint) || { fingerprint, id: crypto.randomUUID() };
      try { sessionStorage.setItem(nonceKey, JSON.stringify(attempt.current)); } catch { /* Retain request ID in memory when storage is blocked. */ }
      const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: attempt.current.id, items: sorted }) });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) setNeedsSignIn(true);
        if (response.status === 409) { forgetAttempt(); attempt.current = null; }
        if (response.status === 400 || response.status === 409) router.refresh();
        throw new Error(typeof result.error === 'string' ? result.error : 'We couldn’t start checkout. Please try again.');
      }
      if (typeof result.url !== 'string') throw new Error('Checkout could not open. Please try again.');
      const destination = new URL(result.url, window.location.origin);
      const stripeDestination = destination.protocol === 'https:' && destination.hostname === 'checkout.stripe.com';
      const confirmationDestination = destination.origin === window.location.origin && destination.pathname === '/checkout/success';
      if (!stripeDestination && !confirmationDestination) throw new Error('Checkout could not open. Please try again.');
      window.location.assign(destination.href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Checkout is taking a moment. Please try again.');
      setPending(false);
      busy.current = false;
    }
  }

  if (!signedIn || needsSignIn) return <div className="checkout-control"><Link className="button full" href="/sign-in?next=/cart">Sign in to checkout <span aria-hidden="true">→</span></Link><p className="checkout-note">Your bag stays on this device while you sign in.</p></div>;
  if (!enabled) return <div className="checkout-control"><button className="button full" disabled>Payments temporarily unavailable</button><p className="checkout-note">Your bag is saved on this device. Please try again later.</p></div>;
  return <div className="checkout-control"><button className="button full" onClick={startCheckout} disabled={pending} aria-describedby="checkout-mode">{pending ? 'Opening secure checkout…' : 'Continue to test checkout'}<span aria-hidden="true">→</span></button><p id="checkout-mode" className="checkout-note">Test checkout · no real money is charged.</p>{error && <p role="alert" className="checkout-error">{error}</p>}</div>;
}

export function CheckoutCancellation({ id, signedIn }: { id: string; signedIn: boolean }) {
  const [state, setState] = useState<'pending' | 'error' | 'done'>('pending');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const request = useRef<Promise<void> | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!signedIn) return;
    if (!request.current) request.current = (async () => {
      setState('pending');
      try {
        const response = await fetch('/api/checkout/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        const result = await response.json();
        if (!response.ok || !result.cancelled) throw new Error(typeof result.error === 'string' ? result.error : 'We couldn’t close checkout. Please try again.');
        forgetAttempt();
        setState('done');
        router.replace('/cart', { scroll: false });
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'We couldn’t close checkout. Please try again.');
        setState('error');
      }
    })();
  }, [id, signedIn, retry, router]);

  if (!signedIn) return <aside className="checkout-cancellation"><p>Sign in to close your previous checkout and manage your bag.</p><Link className="text-link" href="/sign-in?next=/cart">Sign in →</Link></aside>;
  return <aside className="checkout-cancellation" aria-live="polite"><p>{state === 'pending' ? 'Closing your checkout safely. Your bag will stay here.' : state === 'done' ? 'Checkout cancelled. Your bag is ready whenever you are.' : error}</p>{state === 'error' && <div className="cancellation-links"><button className="text-link" onClick={() => { request.current = null; setRetry(value => value + 1); }}>Try again</button><Link className="text-link" href="/orders">View your orders →</Link></div>}</aside>;
}
