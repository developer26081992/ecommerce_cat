'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { signIn, signUp } from '@/app/auth/actions';
import type { AuthState } from '@/lib/auth-types';

export function AuthForm({ mode, next }: { mode: 'sign-in' | 'sign-up'; next: string }) {
  const signingUp = mode === 'sign-up';
  const [state, action, pending] = useActionState<AuthState, FormData>(signingUp ? signUp : signIn, {});
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const destination = next === '/cart' || next === '/orders' ? next : '/account';
  const switchHref = `${signingUp ? '/sign-in' : '/sign-up'}?next=${encodeURIComponent(destination)}`;

  if (state.message) {
    return <section className="auth-success" aria-live="polite">
      <p className="eyebrow">ONE MORE LITTLE STEP</p>
      <h2>Check your inbox.</h2>
      <p>{state.message}</p>
      <Link className="button full" href={switchHref}>Go to sign in <span aria-hidden="true">→</span></Link>
    </section>;
  }

  return <>
    <form action={action} className="auth-form" aria-busy={pending} aria-describedby={state.error ? 'auth-error' : undefined}>
      <input type="hidden" name="next" value={destination}/>
      {signingUp && <div className="auth-field">
        <label htmlFor="full_name">Your name</label>
        <input id="full_name" name="full_name" autoComplete="name" maxLength={100} required value={name} onChange={event => setName(event.target.value)} readOnly={pending}/>
      </div>}
      <div className="auth-field">
        <label htmlFor="email">Email address</label>
        <input id="email" type="email" name="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} readOnly={pending}/>
      </div>
      <div className="auth-field">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" name="password" autoComplete={signingUp ? 'new-password' : 'current-password'} minLength={signingUp ? 8 : undefined} maxLength={signingUp ? 72 : 256} required value={password} onChange={event => setPassword(event.target.value)} readOnly={pending} aria-describedby={signingUp ? 'password-help' : undefined}/>
        {signingUp && <p id="password-help" className="field-hint">Use at least 8 characters, with a maximum of 72 bytes.</p>}
      </div>
      {signingUp && <div className="auth-field">
        <label htmlFor="confirm_password">Confirm password</label>
        <input id="confirm_password" type="password" name="confirm_password" autoComplete="new-password" minLength={8} maxLength={72} required value={confirmation} onChange={event => setConfirmation(event.target.value)} readOnly={pending}/>
      </div>}
      {state.error && <p id="auth-error" className="auth-message auth-error" role="alert">{state.error}</p>}
      <button className="button full" type="submit" disabled={pending}>{pending ? signingUp ? 'Creating your account…' : 'Signing you in…' : signingUp ? 'Create account' : 'Sign in'}<span aria-hidden="true">→</span></button>
    </form>
    <p className="auth-switch">{signingUp ? 'Already part of the collection?' : 'New to Field & Form?'} <Link href={switchHref}>{signingUp ? 'Sign in' : 'Create an account'}</Link></p>
  </>;
}

export function SignOutButton() {
  const { pending } = useFormStatus();
  return <button className="button full" disabled={pending} type="submit">{pending ? 'Signing you out…' : 'Sign out'}<span aria-hidden="true">→</span></button>;
}
