import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isCheckoutSessionId } from '@/lib/checkout-validation';
import { checkoutStatus } from '@/lib/checkout';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to view your order.' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('session_id');
  if (!isCheckoutSessionId(id)) return NextResponse.json({ error: 'Invalid checkout reference.' }, { status: 400 });
  try { return NextResponse.json(await checkoutStatus(id, user.id), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ error: 'Order confirmation is temporarily unavailable. Please try again.' }, { status: 503 }); }
}
