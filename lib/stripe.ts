import 'server-only';
import Stripe from 'stripe';
import { isTestStripeKey } from './checkout-validation';

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!isTestStripeKey(key)) throw new Error('Stripe test payments are not configured.');
  return new Stripe(key, { maxNetworkRetries: 2, timeout: 15000 });
}

export function paymentsConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
    && isTestStripeKey(process.env.STRIPE_SECRET_KEY || '') && process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'));
}
