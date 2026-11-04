import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { safeNext, siteOrigin } from '@/lib/auth-config';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const client = await createSupabaseServerClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get('next')), siteOrigin()));
  }
  return NextResponse.redirect(new URL('/sign-in?error=confirmation', siteOrigin()));
}
