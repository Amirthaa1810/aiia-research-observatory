'use client';
import { useState, useEffect } from 'react';
import { roles, type Role } from '@/lib/permissions';
export function RealLoginButton({ role }: { role: Role }) {
  const [error, setError] = useState('');
  return (
    <>
      <button
        className="outline"
        onClick={async () => {
          try {
            const r = await fetch('/api/demo-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: '{"action":"exit"}',
            });
            if (!r.ok) throw Error('Could not continue. Try again.');
            window.location.assign('/workspace/' + role);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Open my approved {roles[role].label.toLowerCase()} account →
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
export default function DemoLogin({ role, signedIn }: { role: Role; signedIn: boolean }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <section className="demo-login-box">
      <span className="eyebrow">TRY THIS ROLE NOW</span>
      <h3>Explore as {roles[role].label.toLowerCase()}</h3>
      <p>
        Use a working demo account with synthetic records. Changes stay in your separate practice
        workspace.
      </p>
      {signedIn ? (
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              const r = await fetch('/api/demo-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
              });
              const d: any = await r.json();
              if (!r.ok) throw Error(d.error);
              window.location.assign(d.path);
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          {busy ? 'Opening your workspace…' : `Enter ${roles[role].label.toLowerCase()} demo →`}
        </button>
      ) : (
        <a
          className="primary"
          target="_top"
          href={'/signin-with-chatgpt?return_to=' + encodeURIComponent('/login/' + role)}
        >
          Sign in to try this role →
        </a>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
export function SessionBanner() {
  const [demo, setDemo] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((d: any) => setDemo(!!d.demo))
      .catch(() => {});
  }, []);
  return demo ? (
    <div className="preview-banner">
      <span>WORKING DEMO · Changes are saved to your practice dataset</span>
      <a href="/">Switch role</a>
      <button
        onClick={async () => {
          try {
            const r = await fetch('/api/demo-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: '{"action":"exit"}',
            });
            if (!r.ok) throw Error('Could not exit. Try again.');
            window.location.assign('/');
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Exit demo
      </button>
      {error && <span role="alert">{error}</span>}
    </div>
  ) : null;
}
