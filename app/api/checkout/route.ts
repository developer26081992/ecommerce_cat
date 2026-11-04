import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { siteOrigin } from '@/lib/auth-config';
import { parseCheckoutBody } from '@/lib/checkout-validation';
import { beginCheckout, CheckoutError, reserveCheckout } from '@/lib/checkout';
import { paymentsConfigured } from '@/lib/stripe';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (request.headers.get('origin') !== siteOrigin()) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in before checking out.' }, { status: 401 });
  if (!paymentsConfigured()) return NextResponse.json({ error: 'Payments are temporarily unavailable.' }, { status: 503 });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: 'Expected a JSON checkout request.' }, { status: 415 });
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 32000) return NextResponse.json({ error: 'Checkout request is too large.' }, { status: 413 });
    body = parseCheckoutBody(JSON.parse(raw));
  } catch { return NextResponse.json({ error: 'Invalid bag. Refresh the page and try again.' }, { status: 400 }); }
  try {
    const attempt = await reserveCheckout(body.requestId, user.id, body.items);
    const result = await beginCheckout(attempt);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof CheckoutError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Stripe checkout failed', { type: error instanceof Error && 'type' in error ? error.type : 'unknown' });
    return NextResponse.json({ error: 'Checkout could not start. Please try again shortly.' }, { status: 503 });
  }
}
