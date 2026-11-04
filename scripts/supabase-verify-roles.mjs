import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { bucket, checked, clients, images } from './supabase-common.mjs';

// Uses a temporary confirmed account; no invitation or confirmation email is sent.
// Every probe uses a random ID/path and is cleaned up in finally, including failures.
async function main() {
  const { admin, visitor } = clients();
  const { visitor: signedIn } = clients();
  const productProbeId = randomUUID();
  const categoryProbeId = randomUUID();
  const uploadPath = `permission-checks/${randomUUID()}.png`;
  const objectPath = `permission-checks/${randomUUID()}.png`;
  const bytes = await readFile(new URL('../supabase/product-images/vase.png', import.meta.url));
  let userId;
  const failures = [];
  try {
    const email = `field-form-qa-${randomUUID()}@example.com`;
    const password = `${randomBytes(32).toString('hex')}Aa1!`;
    const created = checked(await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { purpose: 'field-form-permission-check' } }), 'Create temporary permission-test account');
    userId = created.user.id;
    checked(await signedIn.auth.signInWithPassword({ email, password }), 'Sign in temporary permission-test account');
    checked(await admin.storage.from(bucket).upload(objectPath, bytes, { contentType: 'image/png' }), 'Create isolated Storage probe');

    for (const [role, client] of [['anonymous', visitor], ['authenticated', signedIn]]) {
      const categories = checked(await client.from('categories').select('id,name,slug'), `${role} category read`);
      const products = checked(await client.from('products').select('id,name,slug,imageUrl'), `${role} product read`);
      assert.equal(images.filter(image => products.some(product => product.id === image.id)).length, 6, `${role} must read all six seeded products.`);
      assert(categories.length >= 3, `${role} must read categories.`);
      for (const table of ['products', 'categories']) {
        const id = table === 'products' ? productProbeId : categoryProbeId;
        const sample = table === 'products' ? products.find(product => product.id === images[0].id) : categories[0];
        const record = { id, name: 'Permission check', slug: `permission-check-${id}` };
        if (table === 'products') Object.assign(record, { description: 'Temporary permission probe', price: 0, stock: 0, imageUrl: '/probe.png', categoryId: categories[0].id, featured: false });
        const insertion = await client.from(table).insert(record);
        assert.equal(insertion.error?.code, '42501', `${role} ${table} INSERT must be denied with insufficient privilege.`);
        const update = await client.from(table).update({ name: sample.name }).eq('id', sample.id);
        assert.equal(update.error?.code, '42501', `${role} ${table} UPDATE must be denied with insufficient privilege.`);
        const deletion = await client.from(table).delete().eq('id', id);
        assert.equal(deletion.error?.code, '42501', `${role} ${table} DELETE must be denied with insufficient privilege.`);
      }
      console.log(`PASS: ${role} reads products/categories; INSERT, UPDATE, DELETE denied on both.`);

      const upload = await client.storage.from(bucket).upload(uploadPath, bytes, { contentType: 'image/png' });
      assert(upload.error, `${role} Storage upload was unexpectedly allowed.`);
      assert.match(upload.error.message, /row.level security|permission denied|unauthori[sz]ed|not authorized/i, 'Expected a Storage permission error.');
      const update = await client.storage.from(bucket).update(objectPath, bytes, { contentType: 'image/png' });
      assert(update.error, `${role} Storage overwrite was unexpectedly allowed.`);
      // A hidden object may return not-found instead of a permission error.
      assert.match(update.error.message, /row.level security|permission denied|unauthori[sz]ed|not authorized|not found/i, 'Expected a Storage permission/not-found error.');
      const deletion = await client.storage.from(bucket).remove([objectPath]);
      if (deletion.error) assert.match(deletion.error.message, /row.level security|permission denied|unauthori[sz]ed|not authorized|not found/i);
      const unchanged = checked(await admin.storage.from(bucket).download(objectPath), 'Confirm protected Storage object still exists');
      assert(Buffer.from(await unchanged.arrayBuffer()).equals(bytes), `${role} altered the protected object.`);
      assert.equal(deletion.data?.length || 0, 0, `${role} Storage deletion was unexpectedly allowed.`);
      console.log(`PASS: ${role} Storage upload, overwrite, and deletion denied.`);
    }
  } catch (error) {
    failures.push(error.message);
  } finally {
    // These IDs belong exclusively to this run; never delete real catalogue rows.
    for (const [table, id] of [['products', productProbeId], ['categories', categoryProbeId]]) {
      const result = await admin.from(table).delete().eq('id', id);
      if (result.error) failures.push(`Cleanup failed for test ${table} row ${id}.`);
    }
    const objects = await admin.storage.from(bucket).remove([uploadPath, objectPath]);
    if (objects.error) failures.push(`Cleanup failed for Storage probes ${uploadPath}, ${objectPath}.`);
    if (userId) {
      const result = await admin.auth.admin.deleteUser(userId);
      if (result.error) failures.push(`Cleanup failed for temporary test user ${userId}.`);
    }
  }
  if (failures.length) throw new Error(failures.join('\n'));
  console.log('PASS: temporary account and all test objects/rows cleaned up.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
