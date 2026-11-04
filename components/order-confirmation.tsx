'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CheckoutStatus, Order } from '@/lib/checkout-types';
import { money } from '@/lib/money';
import { useCart } from './cart-provider';

export function OrderReceipt({ order }: { order: Order }) {
  return <article className="order-receipt"><header className="order-heading"><div><p className="eyebrow">ORDER {order.id.slice(0, 8).toUpperCase()}</p><p className="order-date">{new Intl.DateTimeFormat('en-ZA', { dateStyle: 'long', timeZone: 'Africa/Johannesburg' }).format(new Date(order.createdAt))}</p></div><span className="paid-label">Paid · test order</span></header><p className="order-reference">Order reference: {order.id}</p><ul className="receipt-items">{order.items.map(item => <li key={item.id}><Link className="receipt-image" href={`/products/${item.slug}`}><img src={item.imageUrl} alt={item.name} width="72" height="82"/></Link><div className="receipt-item-copy"><Link href={`/products/${item.slug}`}>{item.name}</Link><p>{item.quantity} × {money(item.unitAmount / 100)}</p></div><span className="receipt-line-total">{money(item.quantity * item.unitAmount / 100)}</span></li>)}</ul><div className="receipt-total"><span>Total <small>ZAR</small></span><strong>{money(order.totalAmount)}</strong></div></article>;
}

export function OrderConfirmation({ sessionId, initialStatus }: { sessionId: string | null; initialStatus: CheckoutStatus }) {
  const [status, setStatus] = useState<CheckoutStatus>(initialStatus);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [exhausted, setExhausted] = useState(false);
  const { ready, completePurchase } = useCart();

  useEffect(() => {
    if (!ready || status.status !== 'paid') return;
    // Only reconcile the bag that started this checkout on this device. Visiting
    // an old confirmation link must not subtract newly collected pieces.
    try {
      const attempt = JSON.parse(sessionStorage.getItem('field-form-checkout-attempt') || 'null');
      if (attempt?.id === status.order.id && attempt.completed !== true) {
        completePurchase(status.order.id, status.order.items.map(({ id, quantity }) => ({ id, quantity })));
        sessionStorage.setItem('field-form-checkout-attempt', JSON.stringify({ ...attempt, completed: true }));
      }
    } catch { /* A verified order remains visible even if device storage is blocked. */ }
  }, [ready, status, completePurchase]);

  useEffect(() => {
    if (!sessionId || (initialStatus.status !== 'pending' && retry === 0)) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    let attempts = 0;
    async function check() {
      attempts += 1;
      try {
        const response = await fetch(`/api/checkout/status?session_id=${encodeURIComponent(sessionId!)}`, { signal: controller.signal, cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'We couldn’t confirm your payment just yet.');
        if (stopped) return;
        if (!['paid', 'pending', 'expired', 'unavailable'].includes(result.status)) throw new Error('We couldn’t confirm your payment just yet.');
        setStatus(result as CheckoutStatus);
        if (result.status === 'pending') {
          if (attempts < 15) timer = setTimeout(check, 2000);
          else setExhausted(true);
        }
      } catch (cause) {
        if (!stopped) setError(cause instanceof Error ? cause.message : 'We couldn’t confirm your payment just yet.');
      }
    }
    timer = setTimeout(check, retry > 0 ? 0 : 2000);
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [sessionId, retry, initialStatus.status]);

  function tryAgain() { setError(''); setExhausted(false); setStatus({ status: 'pending' }); setRetry(value => value + 1); }
  if (status.status === 'paid') return <><div className="confirmation-intro"><p className="eyebrow">YOUR TEST ORDER IS CONFIRMED</p><h1>Thank you.</h1><p>Your test payment is confirmed, and your order is saved. No real money was charged.</p></div><OrderReceipt order={status.order}/><div className="confirmation-links"><Link className="button" href="/orders">View your orders <span aria-hidden="true">→</span></Link><Link className="text-link" href="/products">Explore the collection ↗</Link></div></>;
  const expired = status.status === 'expired';
  const unavailable = status.status === 'unavailable';
  return <section className="confirmation-waiting" aria-live="polite"><p className="eyebrow">YOUR CHECKOUT</p><h1>{expired ? 'Checkout has expired.' : unavailable ? 'Let’s check your order.' : 'One little moment.'}</h1><p>{expired ? 'This checkout session has ended. Your bag is still here if you’d like to try again.' : unavailable ? 'We couldn’t find a confirmed order for this checkout. Your bag has not been cleared.' : exhausted || error ? 'Your payment has not been confirmed here yet. Please check again or view your orders before starting another checkout.' : 'We’re checking your payment and saving your order. Your bag will update only after payment is confirmed.'}</p>{error && <p className="checkout-error" role="alert">{error}</p>}<div className="confirmation-links">{sessionId && !expired && (unavailable || exhausted || error) && <button className="button" onClick={tryAgain}>Check again <span aria-hidden="true">→</span></button>}<Link className="text-link" href="/orders">View your orders →</Link>{(expired || unavailable) && <Link className="text-link" href="/cart">Back to your bag →</Link>}</div></section>;
}
