export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

// Restrict post-login destinations to implemented, internal pages.
export function safeNext(value: unknown): string {
  return value === '/cart' || value === '/orders' ? value : '/account';
}

export function siteOrigin() {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000');
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid site URL configuration.');
  return url.origin;
}
