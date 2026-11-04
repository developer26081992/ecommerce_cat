import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { bucket, checked, clients, images } from './supabase-common.mjs';

async function main() {
  const { admin, visitor } = clients();
  const categories = checked(await visitor.from('categories').select('id,name,slug'), 'Anonymous category read');
  const products = checked(await visitor.from('products').select('id,slug,name,description,price,stock,imageUrl,categoryId,featured'), 'Anonymous product read');
  assert(categories.length >= 3, 'Expected at least three categories.');
  for (const image of images) {
    const product = products.find(product => product.id === image.id && product.slug === image.slug);
    assert(product, `Seeded product missing: ${image.slug}`);
    assert(categories.some(category => category.id === product.categoryId), `Missing category for ${image.slug}`);
    const expectedRoot = admin.storage.from(bucket).getPublicUrl('').data.publicUrl;
    assert(product.imageUrl.startsWith(expectedRoot), `${image.slug} still needs its Supabase Storage URL.`);
    const response = await fetch(product.imageUrl, { signal: AbortSignal.timeout(30000) });
    assert(response.ok && response.headers.get('content-type')?.startsWith('image/png'), `Public PNG not accessible for ${image.slug}`);
    const actual = Buffer.from(await response.arrayBuffer());
    const expected = await readFile(new URL(`../supabase/product-images/${image.file}.png`, import.meta.url));
    assert(actual.equals(expected), `Image bytes differ for ${image.slug}`);
  }
  console.log('PASS: anonymous catalogue reads and all six public PNG downloads.');

  // Random probe records are removed using the admin client if a policy is misconfigured.
  const id = randomUUID();
  const insertion = await visitor.from('products').insert({ id, slug: `permission-check-${id}`, name: 'Permission check', description: 'Temporary access-policy probe', price: 0, stock: 0, imageUrl: '/probe.png', categoryId: categories[0].id, featured: false });
  if (!insertion.error) {
    checked(await admin.from('products').delete().eq('id', id), 'Remove unexpected test product');
    throw new Error('FAIL: anonymous product INSERT was allowed; probe removed.');
  }
  assert.equal(insertion.error.code, '42501', 'INSERT must fail with insufficient privilege, not an unrelated error.');
  const product = products.find(product => product.id === images[0].id);
  const update = await visitor.from('products').update({ name: product.name }).eq('id', product.id);
  assert.equal(update.error?.code, '42501', 'Anonymous UPDATE should be denied.');
  const deletion = await visitor.from('products').delete().eq('id', id);
  assert.equal(deletion.error?.code, '42501', 'Anonymous DELETE should be denied.');
  console.log('PASS: anonymous product INSERT, UPDATE, and DELETE are denied.');

  const path = `permission-checks/${randomUUID()}.png`;
  const bytes = await readFile(new URL('../supabase/product-images/vase.png', import.meta.url));
  const upload = await visitor.storage.from(bucket).upload(path, bytes, { contentType: 'image/png', upsert: false });
  if (!upload.error) {
    checked(await admin.storage.from(bucket).remove([path]), 'Remove unexpected test upload');
    throw new Error('FAIL: anonymous Storage upload was allowed; probe removed.');
  }
  assert.match(upload.error.message, /row.level security|permission denied|unauthori[sz]ed|not authorized/i, 'Upload must fail because of permissions.');
  console.log('PASS: anonymous Storage upload is denied.');
  console.log('Run supabase/verify-permissions.sql as well to verify authenticated-role grants, reads, and RLS.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
