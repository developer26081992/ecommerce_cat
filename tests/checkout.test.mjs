import { test } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { isCheckoutSessionId, isTestStripeKey, parseCheckoutBody } from '../lib/checkout-validation.ts';

const requestId = '80000000-0000-4000-8000-000000000001';
const productId = '20000000-0000-4000-8000-000000000001';
test('checkout rejects browser prices, invalid quantities, and duplicate products', () => {
  const body = { requestId, items: [{ id: productId, quantity: 2 }] };
  assert.deepEqual(parseCheckoutBody(body), body);
  for (const items of [[], [{ id: productId, quantity: 0 }], [{ id: productId, quantity: 100 }], [{ id: productId, quantity: 1.5 }], [{ id: productId, quantity: '1' }], [{ id: productId, quantity: 1, price: 1 }], [body.items[0], body.items[0]]]) {
    assert.throws(() => parseCheckoutBody({ requestId, items }));
  }
  assert.throws(() => parseCheckoutBody({ requestId: 'not-a-uuid', items: body.items }));
  assert.throws(() => parseCheckoutBody({ requestId, items: Array(21).fill(body.items[0]) }));
});
test('checkout cannot use live keys or live session IDs', () => {
  assert.equal(isTestStripeKey('sk_test_sample'), true);
  assert.equal(isTestStripeKey('rk_test_sample'), true);
  assert.equal(isTestStripeKey('sk_live_sample'), false);
  assert.equal(isTestStripeKey('rk_live_sample'), false);
  assert.equal(isCheckoutSessionId('cs_test_abcdefghijk'), true);
  assert.equal(isCheckoutSessionId('cs_live_abcdefghijk'), false);
  assert.equal(isCheckoutSessionId('//example.com'), false);
});
test('webhook signature checks bind the exact raw bytes, secret, and timestamp', () => {
  const stripe = new Stripe('sk_test_unit_only');
  const payload = JSON.stringify({ id: 'evt_unit', type: 'checkout.session.completed', data: { object: { id: 'cs_test_unit_only' } } });
  const secret = 'whsec_unit_test_only';
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  assert.equal(stripe.webhooks.constructEvent(payload, header, secret).id, 'evt_unit');
  assert.throws(() => stripe.webhooks.constructEvent(payload + ' ', header, secret));
  assert.throws(() => stripe.webhooks.constructEvent(payload, header, 'whsec_wrong_unit_secret'));
  const stale = stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp: Math.floor(Date.now() / 1000) - 600 });
  assert.throws(() => stripe.webhooks.constructEvent(payload, stale, secret));
});
