import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { checked, clients } from './supabase-common.mjs';

async function main() {
  const { admin, visitor } = clients();
  checked(await admin.from('orders').select('id').limit(1), 'Read orders (apply migration 004 first)');
  const users = [], attempts = [], productId = randomUUID();
  const failures = [];
  try {
    for (const label of ['A', 'B']) {
      const email = `field-form-checkout-${randomUUID()}@example.com`;
      const password = `${randomBytes(24).toString('hex')}Aa1!`;
      const user = checked(await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { purpose: 'checkout-database-check' } }), `Create test user ${label}`).user;
      const { visitor: client } = clients();
      users.push({ id: user.id, client });
      checked(await client.auth.signInWithPassword({ email, password }), `Sign in test user ${label}`);
    }
    checked(await admin.from('products').insert({ id: productId, slug: `checkout-check-${productId}`, name: 'Temporary checkout verification', description: 'Temporary isolated test fixture', price: 100, stock: 2, imageUrl: '/products/vase.svg', categoryId: '10000000-0000-4000-8000-000000000001', featured: false }), 'Create inventory test fixture');
    const items = [{ id: productId, quantity: 2 }];
    const requests = users.map(user => { const id = randomUUID(); attempts.push(id); return { id, user }; });
    const outcomes = await Promise.all(requests.map(request => admin.rpc('field_form_reserve_checkout', { p_id: request.id, p_user: request.user.id, p_items: items })));
    assert.equal(outcomes.filter(result => !result.error).length, 1, 'Only one concurrent checkout can reserve the last stock.');
    assert(outcomes.find(result => result.error)?.error.message.includes('INSUFFICIENT_STOCK'));
    const index = outcomes.findIndex(result => !result.error), winner = requests[index], other = requests[1-index];
    const attempt = outcomes[index].data;
    assert.equal(attempt.amountTotal, 20000, 'Prices must be calculated from database rows.');
    const retried = checked(await admin.rpc('field_form_reserve_checkout', { p_id: winner.id, p_user: winner.user.id, p_items: items }), 'Idempotent reservation retry');
    assert.equal(retried.id, attempt.id);
    const wrongUser = await admin.rpc('field_form_reserve_checkout', { p_id: winner.id, p_user: other.user.id, p_items: items });
    assert(wrongUser.error?.message.includes('REQUEST_CONFLICT'));
    const stockBefore = checked(await admin.from('products').select('stock').eq('id', productId).single(), 'Read reserved inventory');
    assert.equal(stockBefore.stock, 2, 'Reservation must not decrement stock before payment.');
    const session = `cs_test_database_${randomUUID().replaceAll('-', '')}`;
    const params = { p_id: winner.id, p_session: session, p_user: winner.user.id, p_amount: 20000, p_currency: 'zar' };
    const mismatch = await admin.rpc('field_form_complete_checkout', { ...params, p_amount: 1 });
    assert(mismatch.error?.message.includes('PAYMENT_MISMATCH'));
    const results = await Promise.all([admin.rpc('field_form_complete_checkout', params), admin.rpc('field_form_complete_checkout', params)]);
    results.forEach(result => assert.equal(checked(result, 'Duplicate paid finalization').id, winner.id));
    const stockAfter = checked(await admin.from('products').select('stock').eq('id', productId).single(), 'Read paid inventory');
    assert.equal(stockAfter.stock, 0, 'Paid stock must decrement exactly once.');
    const orders = checked(await admin.from('orders').select('id').eq('id', winner.id), 'Read created order');
    assert.equal(orders.length, 1);
    assert.equal(checked(await winner.user.client.from('orders').select('id').eq('id', winner.id), 'Read own order').length, 1);
    assert.equal(checked(await other.user.client.from('orders').select('id').eq('id', winner.id), 'Try reading another user order').length, 0);
    assert.equal((await visitor.from('orders').select('id')).error?.code, '42501');
    assert.equal((await winner.user.client.from('orders').insert({ id: randomUUID(), userId: winner.user.id, totalAmount: 1, stripeSessionId: 'probe', items: [] })).error?.code, '42501');
    assert.equal((await winner.user.client.rpc('field_form_complete_checkout', params)).error?.code, '42501');
    assert.equal(checked(await admin.rpc('field_form_release_checkout', { p_id: winner.id, p_session: session }), 'Try releasing paid checkout'), false);
    console.log('PASS: concurrent reservation limits, trusted prices, request ownership, amount checks, idempotent orders/stock, private order reads, and denied client mutations.');

    checked(await admin.from('products').update({ stock: 2 }).eq('id', productId), 'Reset isolated fixture stock');
    const cancelledId = randomUUID(); attempts.push(cancelledId);
    checked(await admin.rpc('field_form_reserve_checkout', { p_id: cancelledId, p_user: users[0].id, p_items: items }), 'Reserve cancellation fixture');
    checked(await admin.rpc('field_form_release_checkout', { p_id: cancelledId, p_session: null }), 'Release cancellation fixture');
    const replacementId = randomUUID(); attempts.push(replacementId);
    checked(await admin.rpc('field_form_reserve_checkout', { p_id: replacementId, p_user: users[1].id, p_items: items }), 'Reserve released stock again');
    console.log('PASS: released reservations make stock available again without changing stock counts.');
  } catch (error) { failures.push(error.message); }
  finally {
    for (const table of ['orders', 'checkout_attempts']) {
      if (attempts.length) { const result = await admin.from(table).delete().in('id', attempts); if (result.error) failures.push(`Cleanup failed for temporary ${table} rows.`); }
    }
    const product = await admin.from('products').delete().eq('id', productId);
    if (product.error) failures.push(`Cleanup failed for fixture product ${productId}.`);
    for (const user of users) { const result = await admin.auth.admin.deleteUser(user.id); if (result.error) failures.push(`Cleanup failed for temporary user ${user.id}.`); }
  }
  if (failures.length) throw new Error(failures.join('\n'));
  console.log('PASS: all database-test accounts, products, reservations, and orders removed.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
