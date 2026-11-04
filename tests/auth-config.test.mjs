import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNext, siteOrigin } from '../lib/auth-config.ts';

test('post-login destinations reject external, encoded, and unsupported paths', () => {
  assert.equal(safeNext('/cart'), '/cart');
  for (const value of ['https://example.com', '//example.com', '/\\example.com', '/%2fexample.com', '/cart?next=evil', null, undefined, ['//example.com'], '/orders']) {
    assert.equal(safeNext(value), '/account');
  }
});

test('auth callbacks use the configured origin and reject non-HTTP schemes', () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://shop.example.com/path?ignored=true';
    assert.equal(siteOrigin(), 'https://shop.example.com');
    process.env.NEXT_PUBLIC_SITE_URL = 'javascript:alert(1)';
    assert.throws(() => siteOrigin());
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(siteOrigin(), 'http://127.0.0.1:3000');
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});
