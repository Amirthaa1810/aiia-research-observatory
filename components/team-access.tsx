'use client';
import { SessionBanner } from './demo-login';
import ParticipantWorkspace from './participant-workspace';

import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Users,
  Clock,
  LogOut,
  Leaf,
  ArrowRight,
  RefreshCw,
  CalendarDays,
  FileText,
  UserRound,
} from 'lucide-react';
import { roles, type Role, type Membership } from '@/lib/permissions';
import type { RecordData } from '@/lib/domain';
import RoleHub from './role-hub';
import { ParticipantIdCard, Portrait } from './participant-cards';
import Observatory from './workspace';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
export default function AccessGate({
  requestedRole,
  preview = false,
}: {
  requestedRole?: Role;
  preview?: boolean;
}) {
  const [demo, setDemo] = useState<any>(null);
  const [state, setState] = useState<any>(null),
    [error, setError] = useState(''),
    [name, setName] = useState(''),
    [role, setRole] = useState<Role>(requestedRole || 'researcher'),
    [saving, setSaving] = useState(false);
  async function refresh() {
    try {
      const r = await fetch('/api/team', { cache: 'no-store' });
      if (r.status === 401) {
        setState({ anonymous: true });
        return;
      }
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setState(d);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 15000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (preview && state?.member?.role === 'administrator' && requestedRole)
      fetch('/api/demo?role=' + requestedRole, { cache: 'no-store' })
        .then(async (r) => {
          const d: any = await r.json();
          if (!r.ok) throw Error(d.error);
          setDemo(d);
        })
        .catch((e) => setError(e.message));
  }, [preview, state?.member?.role, requestedRole]);
  if (!requestedRole) return <RoleHub member={state?.member} />;
  if (preview && state?.member?.role === 'administrator')
    return demo ? (
      requestedRole === 'participant' ? (
        <ParticipantWorkspace member={demo.membership} previewData={demo} />
      ) : (
        <Observatory membership={demo.membership} previewData={demo} />
      )
    ) : (
      <div className="access-card">
        <h1>Opening role preview</h1>
        <p>{error || 'Loading synthetic research records...'}</p>
        <a href="/">All portals</a>
      </div>
    );
  if (state?.member?.status === 'active') {
    if (state.member.role !== requestedRole)
      return (
        <div className="access-card">
          <ShieldCheck />
          <h1>Choose how to enter this role</h1>
          <p>
            You are signed in as {state.user.email}, with the{' '}
            {roles[state.member.role as Role].label} role.
          </p>
          <a className="primary" href={'/login/' + requestedRole}>
            Open this role’s login and demo
          </a>
          <a className="outline" href={'/workspace/' + state.member.role}>
            Open my workspace
          </a>
          <a href="/">Choose another portal</a>
          <a
            href={
              '/signout-with-chatgpt?return_to=' + encodeURIComponent('/login/' + requestedRole)
            }
            target="_top"
          >
            Sign in with another account
          </a>
        </div>
      );
    return state.member.role === 'participant' ? (
      <ParticipantWorkspace key={state.member.version} member={state.member} />
    ) : (
      <Observatory key={state.member.role + ':' + state.member.version} membership={state.member} />
    );
  }
  return (
    <div className="access-page">
      <aside className="access-story">
        <img src="/images/botanical-research.webp" alt="" />
        <a className="brand" href="/">
          <Leaf /> AIIA <small>RESEARCH OBSERVATORY</small>
        </a>
        <div>
          <span className="eyebrow">ONE INSTITUTION. YOUR OWN WORKSPACE.</span>
          <h1>
            Research connects us.
            <br />
            Your role guides you.
          </h1>
          <p>
            Dedicated spaces for the people conducting, overseeing and participating in Ayurveda
            research.
          </p>
        </div>
        <span className="access-foot">Synthetic demonstration · not for clinical use</span>
      </aside>
      <main className="access-card">
        <ShieldCheck size={34} />
        <h1>
          {state?.anonymous
            ? 'Sign in to your workspace'
            : state?.member?.status === 'pending'
              ? 'Your request is awaiting approval'
              : state?.member?.status === 'disabled'
                ? 'Your access is disabled'
                : 'Join the research team'}
        </h1>
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={refresh}>Retry</button>
          </div>
        )}
        {!state ? (
          <p>Checking your sign-in…</p>
        ) : state.anonymous ? (
          <>
            <p>
              Use your own ChatGPT account. Your approved role determines the pages and records you
              can access.
            </p>
            <a
              className="primary"
              href={
                '/signin-with-chatgpt?return_to=' +
                encodeURIComponent('/workspace/' + requestedRole)
              }
              target="_top"
            >
              Sign in with ChatGPT <ArrowRight size={17} />
            </a>
            <small>
              Staff and participants use separate personal accounts. An administrator grants
              workspace access.
            </small>
          </>
        ) : state.member ? (
          <>
            <p>
              Signed in as <b>{state.user.email}</b>.
            </p>
            <div className="access-status">
              <Clock />
              <div>
                <b>{roles[state.member.role as Role].label}</b>
                <p>
                  {state.member.status === 'pending'
                    ? 'Your administrator will confirm your role and study assignments. This page updates when access is approved.'
                    : 'Contact your workspace administrator to restore access.'}
                </p>
              </div>
            </div>
            <button className="outline" onClick={refresh}>
              <RefreshCw size={16} /> Check access
            </button>
            <a className="signout" href="/signout-with-chatgpt?return_to=/" target="_top">
              <LogOut size={16} /> Sign out / use another account
            </a>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                const r = await fetch('/api/team', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'request', name: name || state.user.name, role }),
                });
                const d: any = await r.json();
                if (!r.ok) throw Error(d.error);
                await refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <p>
              Signed in as <b>{state.user.email}</b>. Tell the administrator which role you need.
            </p>
            <label className="field">
              <span>Your name</span>
              <input
                required
                maxLength={100}
                value={name || state.user.name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Requested role</span>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {Object.entries(roles)
                  .filter(([r]) => r !== 'administrator')
                  .map(([r, v]) => (
                    <option key={r} value={r}>
                      {v.label}
                    </option>
                  ))}
              </select>
            </label>
            <p>{roles[role].description}</p>
            <button className="primary" disabled={saving}>
              {saving ? 'Sending request…' : 'Request access'} <ArrowRight size={16} />
            </button>
            <small>Selecting a role does not grant access. Approval is required.</small>
            <a className="signout" href="/signout-with-chatgpt?return_to=/" target="_top">
              Use another account
            </a>
          </form>
        )}
      </main>
    </div>
  );
}
export function TeamAccess({ records }: { records: RecordData[] }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [edit, setEdit] = useState<Membership | null>(null),
    [reason, setReason] = useState(''),
    [saving, setSaving] = useState(false),
    [notice, setNotice] = useState('');
  async function load() {
    try {
      const r = await fetch('/api/team', { cache: 'no-store' });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <section className="role-focus">
        <div>
          <h2>Every account has a defined role</h2>
          <p>
            Approve requests, assign studies and link participant accounts. Disabled accounts lose
            access on their next request.
          </p>
        </div>
        <button className="outline" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </section>
      <div className="notice-banner">
        <ShieldCheck size={20} />
        <span>
          This site currently has private hosting access. Add each person's email to the site's
          visitor list before they can sign in and request a role. Role approval here is a separate
          step.
        </span>
      </div>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice-banner">
          {notice}
        </p>
      )}
      <section className="panel">
        <div className="panel-head">
          <h2>People and access</h2>
          <span>{data?.members?.length ?? 0} accounts</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>PERSON</th>
                <th>ROLE</th>
                <th>ACCESS</th>
                <th>ASSIGNMENT</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.members?.map((m: Membership) => (
                <tr key={m.userId}>
                  <td>
                    <b>{m.name}</b>
                    <small>{m.email}</small>
                  </td>
                  <td>{roles[m.role].label}</td>
                  <td>
                    <span
                      className={
                        'badge ' +
                        (m.status === 'active' ? 'green' : m.status === 'pending' ? 'amber' : 'red')
                      }
                    >
                      {m.status}
                    </span>
                  </td>
                  <td>
                    {['administrator', 'head'].includes(m.role)
                      ? 'Institution-wide'
                      : m.role === 'participant'
                        ? (records.find((r) => r.id === m.participantId)?.title ?? 'Not linked')
                        : `${m.studies.length} assigned studies`}
                  </td>
                  <td>
                    {m.userId === data.ownerId ? (
                      <span className="muted">Workspace owner</span>
                    ) : m.userId === data.member.userId ? (
                      <span className="muted">Your account</span>
                    ) : (
                      <button
                        className="outline"
                        onClick={() => {
                          setEdit({ ...m, studies: [...m.studies] });
                          setReason('');
                          setError('');
                        }}
                      >
                        {m.status === 'pending' ? 'Review request' : 'Manage'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel spaced">
        <div className="panel-head">
          <h2>Role permissions</h2>
        </div>
        <div className="role-catalog">
          {Object.entries(roles).map(([key, r]) => (
            <div key={key}>
              <ShieldCheck size={19} />
              <h3>{r.label}</h3>
              <p>{r.description}</p>
            </div>
          ))}
        </div>
      </section>
      <Dialog
        open={!!edit}
        onOpenChange={(open) => {
          if (!open && !saving) setEdit(null);
        }}
      >
        <DialogContent className="record-dialog">
          <DialogTitle>Manage account access</DialogTitle>
          <DialogDescription>
            {edit?.name} · {edit?.email}
          </DialogDescription>
          {edit && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                setError('');
                try {
                  const r = await fetch('/api/team', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ...edit,
                      action: 'update',
                      status: edit.status === 'pending' ? 'active' : edit.status,
                      reason,
                    }),
                  });
                  const d: any = await r.json();
                  if (!r.ok) throw Error(d.error);
                  setEdit(null);
                  setNotice('Account permissions updated.');
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setSaving(false);
                }
              }}
            >
              <div className="form-grid">
                <label className="field">
                  <span>Assigned role</span>
                  <select
                    value={edit.role}
                    onChange={(e) =>
                      setEdit({ ...edit, role: e.target.value as Role, participantId: null })
                    }
                  >
                    {Object.entries(roles).map(([r, v]) => (
                      <option value={r} key={r}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Account status</span>
                  <select
                    value={edit.status === 'pending' ? 'active' : edit.status}
                    onChange={(e) =>
                      setEdit({ ...edit, status: e.target.value as 'active' | 'disabled' })
                    }
                  >
                    <option value="active">Approved / active</option>
                    <option value="disabled">Disabled / denied</option>
                  </select>
                </label>
                <p className="wide">{roles[edit.role].description}</p>
                {edit.role === 'participant' ? (
                  <label className="field wide">
                    <span>Link participant record</span>
                    <select
                      value={edit.participantId ?? ''}
                      onChange={(e) => setEdit({ ...edit, participantId: e.target.value })}
                    >
                      <option value="">Choose the verified participant…</option>
                      {records
                        .filter((r) => r.kind === 'participant')
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} · {records.find((s) => s.id === p.study)?.code ?? p.study}
                          </option>
                        ))}
                    </select>
                    <small>
                      Verify this person's identity before linking. They will see only this record
                      and its visits.
                    </small>
                  </label>
                ) : !['administrator', 'head'].includes(edit.role) ? (
                  <fieldset className="study-assignment wide">
                    <legend>Assigned studies</legend>
                    {records
                      .filter((r) => r.kind === 'study')
                      .map((s) => (
                        <label className="check-field" key={s.id}>
                          <input
                            type="checkbox"
                            checked={edit.studies.includes(s.id)}
                            onChange={(e) =>
                              setEdit({
                                ...edit,
                                studies: e.target.checked
                                  ? [...edit.studies, s.id]
                                  : edit.studies.filter((id) => id !== s.id),
                              })
                            }
                          />
                          <span>
                            {s.code} · {s.title}
                          </span>
                        </label>
                      ))}
                  </fieldset>
                ) : (
                  <p className="form-note wide">
                    This role can view every study in the institution.
                  </p>
                )}
                <label className="field wide">
                  <span>Reason for this access change</span>
                  <textarea
                    required
                    maxLength={1000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Verified team role and study assignment"
                  />
                </label>
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="form-actions">
                <button
                  className="outline"
                  type="button"
                  disabled={saving}
                  onClick={() => setEdit(null)}
                >
                  Cancel
                </button>
                <button className="primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save access'}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
