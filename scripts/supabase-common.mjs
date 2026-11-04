import { createClient } from '@supabase/supabase-js';

export const images = [
  ['terra-vase', 'vase'], ['everyday-mug', 'mug'], ['linen-throw', 'throw'],
  ['oak-serving-board', 'board'], ['gather-bowl', 'bowl'], ['woven-cushion', 'cushion'],
].map(([slug, file], i) => ({ slug, file, id: `20000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}` }));
export const bucket = 'product-images';

export function clients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !publicKey || !secret) throw new Error('Set the Supabase URL, publishable key, and server-only service-role/secret key in .env.local.');
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  return { url, admin: createClient(url, secret, options), visitor: createClient(url, publicKey, options) };
}

export function checked(result, operation) {
  if (result.error) throw new Error(`${operation} failed (${result.error.code || result.error.statusCode || result.status || 'unknown'}). Check the target project and its configuration.`);
  return result.data;
}
