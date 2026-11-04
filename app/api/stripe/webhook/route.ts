import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { handleCheckoutEvent } from '@/lib/checkout';
import type Stripe from 'stripe';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.startsWith('whsec_')) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 1048576) return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  let event: Stripe.Event;
  try { event = getStripe().webhooks.constructEvent(raw, signature, secret); }
  catch { return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 }); }
  if (event.livemode) return NextResponse.json({ error: 'Only test events are accepted.' }, { status: 400 });
  try { await handleCheckoutEvent(event); return NextResponse.json({ received: true }); }
  catch { console.error('Stripe event processing failed', { eventId: event.id, eventType: event.type }); return NextResponse.json({ error: 'Event processing failed. Retry delivery.' }, { status: 500 }); }
}
