'use client';
import { useState } from 'react';

/**
 * Email and password sign-in.
 *
 * The first sign-in for an address creates the account; later sign-ins reuse it.
 * Only an administrator can grant workspace access, so creating an account does
 * not by itself grant permission to see records.
 */
export default function AccountSignIn({
  nextPath,
  title = 'Sign in to your account',
}: {
  nextPath: string;
  title?: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not sign in. Try again.');
      // Full navigation rather than a client transition: the session arrives as an
      // HttpOnly cookie, so server components must re-render to see the new user.
      window.location.assign(nextPath);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="account-form" onSubmit={submit}>
      <h3>{title}</h3>
      <label className="field">
        <span>Email</span>
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@institution.org"
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={200}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 12 characters"
        />
      </label>
      <label className="field">
        <span>Name (first sign-in only)</span>
        <input
          type="text"
          name="name"
          autoComplete="name"
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Shown to administrators on your team list"
        />
      </label>
      <button className="primary" type="submit" disabled={busy}>
        {busy ? 'Checking…' : 'Sign in →'}
      </button>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      <small>
        New addresses are registered on first sign-in. An administrator still has to approve your
        access before any study data is visible.
      </small>
    </form>
  );
}

/** Ends the current session and returns to the portal. */
export function SignOutButton({ returnTo = '/' }: { returnTo?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <>
      <button
        className="signout"
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            const response = await fetch('/api/auth', { method: 'DELETE' });
            if (!response.ok) throw new Error('Could not sign out. Try again.');
            window.location.assign(returnTo);
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        {busy ? 'Signing out…' : 'Use a different account'}
      </button>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
