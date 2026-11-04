import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { safeNext, siteOrigin } from '@/lib/auth-config';

export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  if (token_hash && (type === 'signup' || type === 'email')) {
    const client = await createSupabaseServerClient();
    const { error } = await client.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get('next')), siteOrigin()));
  }
  return NextResponse.redirect(new URL('/sign-in?error=confirmation', siteOrigin()));
}
