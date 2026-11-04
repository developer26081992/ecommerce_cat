import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseConfig, safeNext } from '@/lib/auth-config';

export const metadata = { title: 'Create an account' };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect('/account');
  const query = await searchParams;
  const available = Boolean(getSupabaseConfig());
  return <main id="main" className="wrap auth-page">
    <Link className="auth-back" href="/products">← Back to the collection</Link>
    <section className="auth-card" aria-labelledby="auth-heading">
      <p className="eyebrow">MAKE YOURSELF AT HOME</p>
      <h1 id="auth-heading">A place for you.</h1>
      <p className="auth-intro">Create your Field & Form account.</p>
      {available ? <AuthForm mode="sign-up" next={safeNext(query.next)}/> : <div className="auth-unavailable"><h2>Accounts are coming soon.</h2><p>Creating an account is temporarily unavailable. In the meantime, find a little everyday joy in the collection.</p><Link className="button full" href="/products">Explore the collection <span aria-hidden="true">↗</span></Link></div>}
    </section>
  </main>;
}
