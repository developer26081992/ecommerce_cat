import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { checked, clients } from './supabase-common.mjs';

async function main() {
  const { admin, visitor } = clients();
  // Detect an unapplied migration before creating test accounts.
  checked(await admin.from('profiles').select('id').limit(1), 'Read profiles (apply migration 003 first)');
  const ids = [];
  const failures = [];
  try {
    const users = [];
    for (const name of ['Profile A', 'Profile B']) {
      const email = `field-form-profile-${randomUUID()}@example.com`;
      const password = `${randomBytes(24).toString('hex')}Aa1!`;
      const result = checked(await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name }, app_metadata: { purpose: 'profile-permission-check' } }), 'Create temporary profile-test account');
      ids.push(result.user.id);
      const { visitor: client } = clients();
      checked(await client.auth.signInWithPassword({ email, password }), 'Sign in temporary profile-test account');
      users.push({ id: result.user.id, client, name });
    }
    const publicRead = await visitor.from('profiles').select('id');
    assert.equal(publicRead.error?.code, '42501', 'Anonymous profile reads must be denied.');
    for (const user of users) {
      const other = users.find(other => other.id !== user.id);
      const own = checked(await user.client.from('profiles').select('id,full_name'), 'Read own profile');
      assert.equal(own.length, 1, 'Users must see only their own profile.');
      assert.equal(own[0].id, user.id);
      assert.equal(own[0].full_name, user.name, 'Signup trigger must copy the display name.');
      const hidden = checked(await user.client.from('profiles').select('id').eq('id', other.id), 'Read another profile');
      assert.equal(hidden.length, 0);
      const updated = checked(await user.client.from('profiles').update({ full_name: 'Updated name' }).eq('id', user.id).select('id,full_name'), 'Update own name');
      assert.equal(updated.length, 1);
      assert.equal(updated[0].full_name, 'Updated name');
      const crossUpdate = checked(await user.client.from('profiles').update({ full_name: 'Forbidden' }).eq('id', other.id).select('id'), 'Attempt cross-user update');
      assert.equal(crossUpdate.length, 0);
      const idChange = await user.client.from('profiles').update({ id: other.id }).eq('id', user.id);
      assert.equal(idChange.error?.code, '42501', 'User IDs must not be writable.');
      const deletion = await user.client.from('profiles').delete().eq('id', user.id);
      assert.equal(deletion.error?.code, '42501', 'Users cannot delete profiles directly.');
    }
    console.log('PASS: profile trigger, private reads, own-name updates, cross-user isolation, protected IDs, and denied deletion.');
  } catch (error) { failures.push(error.message); }
  finally {
    for (const id of ids) {
      const result = await admin.auth.admin.deleteUser(id);
      if (result.error) failures.push(`Failed to remove temporary profile-test account ${id}.`);
    }
    if (ids.length) {
      const remaining = checked(await admin.from('profiles').select('id').in('id', ids), 'Check profile cascade cleanup');
      if (remaining.length) failures.push('Profile cascade cleanup failed.');
    }
  }
  if (failures.length) throw new Error(failures.join('\n'));
  console.log('PASS: temporary accounts and their profiles removed.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
