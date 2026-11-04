import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from '@/lib/auth-config';

export async function createSupabaseServerClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error('Accounts are unavailable until Supabase is configured.');
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Components cannot set cookies; proxy refreshes them before rendering. */ }
      },
    },
  });
}
