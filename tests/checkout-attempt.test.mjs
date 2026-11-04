import assert from 'node:assert/strict';
import test from 'node:test';
import { reusableCheckoutAttempt } from '../lib/checkout-attempt.ts';

const fingerprint = JSON.stringify([{ id: '20000000-0000-4000-8000-000000000001', quantity: 1 }]);
const id = '30000000-0000-4000-8000-000000000001';

test('pending checkout retry retains the same request ID for an identical bag', () => {
  assert.deepEqual(reusableCheckoutAttempt({ fingerprint, id }, fingerprint), { fingerprint, id });
});

test('completed checkout cannot be reused when the same bag is purchased again', () => {
  assert.equal(reusableCheckoutAttempt({ fingerprint, id, completed: true }, fingerprint), null);
});

test('changing the bag prevents reuse of its previous pending checkout', () => {
  const differentBag = JSON.stringify([{ id: '20000000-0000-4000-8000-000000000001', quantity: 2 }]);
  assert.equal(reusableCheckoutAttempt({ fingerprint, id }, differentBag), null);
});

test('invalid device markers never become checkout request IDs', () => {
  for (const marker of [null, [], { fingerprint, id: 'invalid' }, { fingerprint: 123, id }]) {
    assert.equal(reusableCheckoutAttempt(marker, fingerprint), null);
  }
});
