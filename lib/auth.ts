import 'server-only';
import { cache } from 'react';
import { getSupabaseConfig } from './auth-config';
import { createSupabaseServerClient } from './supabase/server';

export const getCurrentUser = cache(async () => {
  if (!getSupabaseConfig()) return null;
  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user;
});

export async function getAccountProfile(userId: string): Promise<{ fullName: string | null; available: boolean }> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from('profiles').select('full_name').eq('id', userId).maybeSingle();
  if (error || !data) return { fullName: null, available: false };
  return { fullName: data.full_name, available: true };
}
