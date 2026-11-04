import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseConfig, safeNext } from '@/lib/auth-config';

export const metadata = { title: 'Sign in' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; signedOut?: string }> }) {
  if (await getCurrentUser()) redirect('/account');
  const query = await searchParams;
  const next = safeNext(query.next);
  const available = Boolean(getSupabaseConfig());
  return <main id="main" className="wrap auth-page">
    <Link className="auth-back" href="/products">← Back to the collection</Link>
    <section className="auth-card" aria-labelledby="auth-heading">
      <p className="eyebrow">YOUR EVERYDAY, ALL TOGETHER</p>
      <h1 id="auth-heading">Welcome back.</h1>
      <p className="auth-intro">A little space for you at Field & Form.</p>
      {query.signedOut === '1' && <p className="auth-message" role="status">You’ve been signed out. See you again soon.</p>}
      {query.error === 'confirmation' && <p className="auth-message auth-error" role="alert">That confirmation link has expired or is invalid. Try signing in if you’ve already confirmed your email, or return to create an account to request a new link.</p>}
      {available ? <AuthForm mode="sign-in" next={next}/> : <div className="auth-unavailable"><h2>Accounts are coming soon.</h2><p>Sign in is temporarily unavailable. You can still explore the collection and keep your favourites in your bag.</p><Link className="button full" href="/products">Explore the collection <span aria-hidden="true">↗</span></Link></div>}
    </section>
  </main>;
}
