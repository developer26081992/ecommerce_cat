import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAccountProfile, getCurrentUser } from '@/lib/auth';
import { signOut } from '@/app/auth/actions';
import { SignOutButton } from '@/components/auth-form';

export const metadata = { title: 'Your account' };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=/account');
  const [profile, query] = await Promise.all([getAccountProfile(user.id), searchParams]);
  const metadataName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
  const fullName = profile.fullName || metadataName;
  return <main id="main" className="wrap auth-page account-page">
    <Link className="auth-back" href="/products">← Back to the collection</Link>
    <section className="auth-card" aria-labelledby="account-heading">
      <p className="eyebrow">YOUR OWN LITTLE CORNER</p>
      <h1 id="account-heading">Your account.</h1>
      <p className="auth-intro">{fullName ? `Lovely to have you here, ${fullName}.` : 'Lovely to have you here.'}</p>
      <dl className="account-details">{fullName && <div><dt>Name</dt><dd>{fullName}</dd></div>}<div><dt>Email address</dt><dd>{user.email || 'No email address available'}</dd></div></dl>
      {!profile.available && <p className="account-note">Profile details are temporarily unavailable.</p>}
      {query.error === 'signout' && <p className="auth-message auth-error" role="alert">We couldn’t sign you out. Please try again.</p>}
      <div className="account-links"><Link className="text-link" href="/orders">Your orders →</Link><Link className="text-link" href="/cart">View your bag →</Link></div>
      <form action={signOut}><SignOutButton/></form>
    </section>
  </main>;
}
