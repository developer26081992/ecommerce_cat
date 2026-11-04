import 'server-only';
import type Stripe from 'stripe';
import { createSupabaseAdminClient } from './supabase/admin';
import { createSupabaseServerClient } from './supabase/server';
import { getStripe } from './stripe';
import { siteOrigin } from './auth-config';
import { uuidPattern } from './checkout-validation';
import type { CheckoutAttempt, CheckoutItem, CheckoutStatus, Order } from './checkout-types';

export class CheckoutError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}
function databaseError(code: string | undefined, message: string | undefined): never {
  if (message?.includes('INSUFFICIENT_STOCK') || message?.includes('PRODUCT_UNAVAILABLE')) throw new CheckoutError('Some pieces are unavailable or already reserved. Update your bag or try again later.', 409);
  if (message?.includes('TOO_MANY_CHECKOUTS')) throw new CheckoutError('You already have open checkouts. Finish or cancel one before starting another.', 409);
  if (message?.includes('CHECKOUT_RELEASED') || message?.includes('REQUEST_CONFLICT')) throw new CheckoutError('This checkout is no longer available. Please start again.', 409);
  console.error('Checkout database operation failed', { code: code || 'unknown' });
  throw new CheckoutError('Checkout is temporarily unavailable. Please try again shortly.');
}

export async function reserveCheckout(requestId: string, userId: string, items: CheckoutItem[]): Promise<CheckoutAttempt> {
  const { data, error } = await createSupabaseAdminClient().rpc('field_form_reserve_checkout', { p_id: requestId, p_user: userId, p_items: items });
  if (error) databaseError(error.code, error.message);
  return data as CheckoutAttempt;
}

export async function beginCheckout(attempt: CheckoutAttempt) {
  const stripe = getStripe();
  const admin = createSupabaseAdminClient();
  let session: Stripe.Checkout.Session;
  if (attempt.stripeSessionId) {
    session = await stripe.checkout.sessions.retrieve(attempt.stripeSessionId);
  } else {
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment', allowed_payment_method_types: ['card'], client_reference_id: attempt.id,
        metadata: { app: 'field-form', attempt_id: attempt.id, user_id: attempt.userId },
        expires_at: Math.floor(new Date(attempt.expiresAt).getTime() / 1000),
        success_url: `${siteOrigin()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteOrigin()}/cart?cancelled=${attempt.id}`,
        line_items: attempt.items.map(item => ({ quantity: item.quantity, price_data: {
          currency: 'zar', unit_amount: item.unitAmount,
          product_data: { name: item.name.slice(0, 120), ...(item.imageUrl.startsWith('https://') ? { images: [item.imageUrl] } : {}) },
        } })),
      }, { idempotencyKey: `field-form-${attempt.id}` });
    } catch (error) {
      // Definite validation/permission failures created no Session. Network errors
      // can be ambiguous: keep their reservation so the same request can be retried.
      if (error instanceof Error && 'type' in error && ['StripeInvalidRequestError', 'StripePermissionError', 'StripeAuthenticationError'].includes(String(error.type))) {
        const released = await admin.rpc('field_form_release_checkout', { p_id: attempt.id, p_session: null });
        if (released.error) console.error('Failed to release rejected checkout', { code: released.error.code });
      }
      throw error;
    }
    const { error } = await admin.rpc('field_form_bind_checkout', { p_id: attempt.id, p_session: session.id });
    if (error) databaseError(error.code, error.message);
  }
  if (session.livemode) throw new CheckoutError('Only test checkout is enabled.');
  if (session.status === 'complete') return { sessionId: session.id, url: `${siteOrigin()}/checkout/success?session_id=${encodeURIComponent(session.id)}` };
  if (session.status === 'expired') {
    await releaseSession(session);
    throw new CheckoutError('Checkout expired. Please start again.', 409);
  }
  if (!session.url || !session.url.startsWith('https://checkout.stripe.com/')) throw new CheckoutError('Checkout could not start. Please retry.');
  return { sessionId: session.id, url: session.url };
}

function sessionIdentity(session: Stripe.Checkout.Session) {
  const id = session.metadata?.attempt_id;
  const userId = session.metadata?.user_id;
  if (session.livemode || session.mode !== 'payment' || session.metadata?.app !== 'field-form'
    || !id || !uuidPattern.test(id) || !userId || !uuidPattern.test(userId) || session.client_reference_id !== id) throw new CheckoutError('Checkout identity does not match.');
  return { id, userId };
}

export async function completeSession(session: Stripe.Checkout.Session): Promise<Order | null> {
  const { id, userId } = sessionIdentity(session);
  if (session.payment_status !== 'paid' || session.status !== 'complete') return null;
  if (session.currency !== 'zar' || !Number.isSafeInteger(session.amount_total) || !session.amount_total) throw new CheckoutError('Payment amount does not match.');
  const { data, error } = await createSupabaseAdminClient().rpc('field_form_complete_checkout', {
    p_id: id, p_session: session.id, p_user: userId, p_amount: session.amount_total, p_currency: session.currency,
  });
  if (error) databaseError(error.code, error.message);
  return data as Order;
}

async function releaseSession(session: Stripe.Checkout.Session) {
  const { id } = sessionIdentity(session);
  const { error } = await createSupabaseAdminClient().rpc('field_form_release_checkout', { p_id: id, p_session: session.id });
  if (error) databaseError(error.code, error.message);
}

export async function handleCheckoutEvent(event: Stripe.Event) {
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)) return;
  const source = event.data.object as Stripe.Checkout.Session;
  if (source.metadata?.app !== 'field-form') return;
  // Re-read from Stripe rather than trusting mutable browser input or stale events.
  const session = await getStripe().checkout.sessions.retrieve(source.id);
  if (session.payment_status === 'paid') await completeSession(session);
  else if (session.status === 'expired' || event.type === 'checkout.session.async_payment_failed') await releaseSession(session);
}

export async function checkoutStatus(sessionId: string, userId: string): Promise<CheckoutStatus> {
  const client = await createSupabaseServerClient();
  const orderResult = await client.from('orders').select('*').eq('userId', userId).eq('stripeSessionId', sessionId).maybeSingle();
  if (orderResult.error) throw new CheckoutError('Order confirmation is temporarily unavailable.');
  if (orderResult.data) return { status: 'paid', order: orderResult.data as Order };
  const attemptResult = await client.from('checkout_attempts').select('id,state').eq('userId', userId).eq('stripeSessionId', sessionId).maybeSingle();
  if (attemptResult.error) throw new CheckoutError('Order confirmation is temporarily unavailable.');
  if (!attemptResult.data) return { status: 'unavailable' };
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const identity = sessionIdentity(session);
  if (identity.userId !== userId || identity.id !== attemptResult.data.id) return { status: 'unavailable' };
  const order = await completeSession(session);
  if (order) return { status: 'paid', order };
  if (session.status === 'expired') { await releaseSession(session); return { status: 'expired' }; }
  return { status: 'pending' };
}

export async function cancelCheckout(id: string, userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from('checkout_attempts').select('*').eq('id', id).eq('userId', userId).maybeSingle();
  if (error) databaseError(error.code, error.message);
  if (!data) throw new CheckoutError('Checkout not found.', 404);
  const attempt = data as CheckoutAttempt;
  if (attempt.state === 'released') return;
  if (!attempt.stripeSessionId) throw new CheckoutError('Checkout is still starting. Please retry in a moment.', 409);
  const stripe = getStripe();
  let session = await stripe.checkout.sessions.retrieve(attempt.stripeSessionId);
  if (session.status === 'open') {
    try { session = await stripe.checkout.sessions.expire(session.id); }
    catch { session = await stripe.checkout.sessions.retrieve(session.id); }
  }
  if (session.payment_status === 'paid') { await completeSession(session); throw new CheckoutError('Payment is already complete. View your orders for confirmation.', 409); }
  if (session.status !== 'expired') throw new CheckoutError('Payment is still processing. View your orders shortly.', 409);
  await releaseSession(session);
}

export async function getOrders(userId: string): Promise<Order[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from('orders').select('*').eq('userId', userId).order('createdAt', { ascending: false }).limit(100);
  if (error) throw new CheckoutError('Your orders are temporarily unavailable. Please try again shortly.');
  return data as Order[];
}
