import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { siteOrigin } from '@/lib/auth-config';
import { uuidPattern } from '@/lib/checkout-validation';
import { cancelCheckout, CheckoutError } from '@/lib/checkout';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (request.headers.get('origin') !== siteOrigin()) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to manage your checkout.' }, { status: 401 });
  let id: string;
  try { const body = await request.json(); if (typeof body.id !== 'string' || !uuidPattern.test(body.id)) throw new Error(); id = body.id; }
  catch { return NextResponse.json({ error: 'Invalid checkout.' }, { status: 400 }); }
  try { await cancelCheckout(id, user.id); return NextResponse.json({ cancelled: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof CheckoutError ? error.message : 'Checkout could not be cancelled. Please try again.' }, { status: error instanceof CheckoutError ? error.status : 503 }); }
}
