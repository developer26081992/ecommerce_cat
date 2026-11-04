'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSupabaseConfig, safeNext, siteOrigin } from '@/lib/auth-config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AuthState } from '@/lib/auth-types';

function credentials(form: FormData) {
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: 'Enter a valid email address.' } as const;
  if (!password || password.length > 256) return { error: 'Enter your password.' } as const;
  return { email, password };
}

export async function signIn(_state: AuthState, form: FormData): Promise<AuthState> {
  if (!getSupabaseConfig()) return { error: 'Accounts are not configured yet.' };
  const values = credentials(form);
  if ('error' in values) return { error: values.error };
  const client = await createSupabaseServerClient();
  const { error } = await client.auth.signInWithPassword(values);
  if (error) return { error: error.code === 'email_not_confirmed' ? 'Confirm your email before signing in. Check your inbox for the confirmation link.' : error.status === 429 ? 'Too many attempts. Please wait a moment and try again.' : 'Unable to sign in. Check your email and password, then try again.' };
  revalidatePath('/', 'layout');
  redirect(safeNext(form.get('next')));
}

export async function signUp(_state: AuthState, form: FormData): Promise<AuthState> {
  if (!getSupabaseConfig()) return { error: 'Accounts are not configured yet.' };
  const values = credentials(form);
  if ('error' in values) return { error: values.error };
  const fullName = String(form.get('full_name') || '').trim();
  if (!fullName || fullName.length > 100) return { error: 'Enter your name (up to 100 characters).' };
  if (values.password.length < 8 || new TextEncoder().encode(values.password).length > 72) return { error: 'Use a password of at least 8 characters and no more than 72 bytes.' };
  if (values.password !== form.get('confirm_password')) return { error: 'Your passwords do not match.' };
  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.signUp({ ...values, options: { data: { full_name: fullName }, emailRedirectTo: `${siteOrigin()}/auth/callback` } });
  if (error) return { error: error.status === 429 ? 'Too many attempts. Please wait before trying again.' : 'Unable to create your account. Check the details or try signing in if you already have an account.' };
  if (data.session) {
    revalidatePath('/', 'layout');
    redirect('/account');
  }
  return { message: 'Check your email for a confirmation link. Once confirmed, you can sign in. If you already have an account, sign in instead.' };
}

export async function signOut(): Promise<void> {
  const client = await createSupabaseServerClient();
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) redirect('/account?error=signout');
  revalidatePath('/', 'layout');
  redirect('/sign-in?signedOut=1');
}
