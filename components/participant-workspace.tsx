'use client';
import { useEffect, useState } from 'react';
import {
  Leaf,
  LayoutDashboard,
  CalendarDays,
  HeartPulse,
  UserRound,
  ShieldCheck,
  Sparkles,
  FileText,
} from 'lucide-react';
import type { Membership } from '@/lib/permissions';
import type { RecordData } from '@/lib/domain';
import { ParticipantIdCard, Portrait } from './participant-cards';
import { SessionBanner } from './demo-login';
import Sahayak from './sahayak';
const tabs = [
  ['My dashboard', LayoutDashboard],
  ['My visits', CalendarDays],
  ['Symptoms & side effects', HeartPulse],
  ['My health record', UserRound],
  ['My study', FileText],
  ['My ID card', ShieldCheck],
  ['Research Sahayak', Sparkles],
] as const;
export default function ParticipantWorkspace({
  member,
  previewData,
}: {
  member: Membership;
  previewData?: any;
}) {
  const [view, setView] = useState('My dashboard'),
    [data, setData] = useState<any>(previewData || null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [symptoms, setSymptoms] = useState(''),
    [onset, setOnset] = useState(new Date().toISOString().slice(0, 10)),
    [severity, setSeverity] = useState('Mild');
  async function load() {
    if (previewData) return;
    try {
      const r = await fetch('/api/workspace', { cache: 'no-store' });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
      setError('');
    } catch (e) {
      setData(null);
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 15000);
    return () => clearInterval(id);
  }, []);
  const records: RecordData[] = data?.records || [],
    person = records.find((r) => r.kind === 'participant'),
    study = records.find((r) => r.kind === 'study'),
    visits = records
      .filter((r) => r.kind === 'visit')
      .sort((a, b) => String(a.due).localeCompare(String(b.due))),
    reports = records
      .filter((r) => r.kind === 'safety')
      .sort((a, b) => String(b.onset).localeCompare(String(a.onset)));
  const attended = visits.filter((v) => v.status === 'Completed').length,
    missed = visits.filter((v) => v.status === 'Missed').length,
    scheduled = visits.filter((v) => v.status === 'Scheduled').length,
    rate = attended + missed ? Math.round((attended / (attended + missed)) * 100) : null;
  return (
    <div className="shell participant-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brandmark">
            <Leaf />
          </span>
          <span>
            AIIA<small>PARTICIPANT PORTAL</small>
          </span>
        </a>
        <div className="workspace-label">YOUR PERSONAL SPACE</div>
        <nav>
          {tabs.map(([name, Icon]) => (
            <button
              key={name}
              className={'nav ' + (view === name ? 'active' : '')}
              onClick={() => {
                setView(name);
                setNotice('');
              }}
            >
              <Icon size={18} />
              {name}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck />
          <span>Only your linked records</span>
        </div>
      </aside>
      <div className="main">
        <header>
          <b>Participant workspace</b>
          <a href="/">Switch portal</a>
          <a target="_top" href="/signout?return_to=/">
            Sign out
          </a>
        </header>
        <main className="workspace-content" key={view}>
          <SessionBanner />
          {previewData && <div className="preview-banner">Read-only synthetic preview</div>}
          <div className="page-heading heading-visual">
            <img className="heading-art" src="/images/botanical-research.webp" alt="" />
            <div className="heading-copy">
              <span className="eyebrow">WELCOME, {person?.displayName || member.name}</span>
              <h1>{view}</h1>
              <p>Your participation, your progress, your health.</p>
            </div>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button onClick={load}>Retry</button>
            </div>
          )}
          {!data && !error ? (
            <p>Loading your personal workspace…</p>
          ) : !person ? (
            <p>No participant record is linked. Contact your study coordinator.</p>
          ) : view === 'Research Sahayak' ? (
            <Sahayak />
          ) : (
            <>
              {view === 'My dashboard' && (
                <>
                  <div className="participant-welcome panel">
                    <Portrait person={person} />
                    <div>
                      <span className="eyebrow">{person.title}</span>
                      <h2>{person.displayName || member.name}</h2>
                      <p>{study?.title}</p>
                      <span className="badge green">{person.status}</span>
                    </div>
                    <button className="outline" onClick={() => setView('My ID card')}>
                      View my ID card
                    </button>
                  </div>
                  <div className="health-metrics">
                    {[
                      ['Studies joined', study ? 1 : 0],
                      ['Visits attended', attended],
                      ['Visits missed', missed],
                      ['Visits scheduled', scheduled],
                    ].map(([label, value]) => (
                      <section className="panel" key={label}>
                        <small>{label}</small>
                        <strong>{value}</strong>
                      </section>
                    ))}
                  </div>
                  <div className="health-grid">
                    <section className="panel detail-body">
                      <h2>Attendance progress</h2>
                      <div className="attendance-track">
                        <span style={{ width: (rate ?? 0) + '%' }} />
                      </div>
                      <p>
                        {rate === null
                          ? 'No completed or missed visits yet.'
                          : `${rate}% of completed-or-missed visits attended.`}
                      </p>
                      <small>
                        Scheduled and cancelled visits are excluded from this percentage.
                      </small>
                      <button className="outline" onClick={() => setView('My visits')}>
                        See visit history
                      </button>
                    </section>
                    <section className="panel detail-body">
                      <HeartPulse className="health-pulse" />
                      <h2>How are you feeling?</h2>
                      <p>
                        {reports.length} symptom / safety reports ·{' '}
                        {reports.filter((r) => r.status !== 'Closed').length} awaiting follow-up.
                      </p>
                      <button
                        className="primary"
                        onClick={() => setView('Symptoms & side effects')}
                      >
                        Report a symptom
                      </button>
                    </section>
                  </div>
                </>
              )}
              {['My dashboard', 'My visits'].includes(view) && (
                <section className="panel spaced">
                  <div className="panel-head">
                    <h2>
                      {view === 'My dashboard' ? 'Visit timeline' : 'My attendance & visit history'}
                    </h2>
                    <CalendarDays />
                  </div>
                  <div className="participant-visits">
                    {visits.map((v) => (
                      <article key={v.id}>
                        <div>
                          <b>{v.title}</b>
                          <p>{v.assessment || 'Assessment to be confirmed by the team'}</p>
                        </div>
                        <time>{v.due || 'Date pending'}</time>
                        <span
                          className={
                            'badge ' +
                            (v.status === 'Missed'
                              ? 'red'
                              : v.status === 'Completed'
                                ? 'green'
                                : 'blue')
                          }
                        >
                          {v.status}
                        </span>
                      </article>
                    ))}
                    {!visits.length && <p>No visits scheduled yet.</p>}
                  </div>
                </section>
              )}
              {view === 'Symptoms & side effects' && (
                <div className="health-grid">
                  <section className="panel detail-body">
                    <h2>Tell your research team</h2>
                    <p>
                      Reports enter the doctor and safety officer’s review queue. This form is not
                      an emergency service; seek urgent medical help for severe or rapidly worsening
                      symptoms.
                    </p>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setBusy(true);
                        setNotice('');
                        setError('');
                        try {
                          const r = await fetch('/api/participant-report', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ symptoms, onset, severity }),
                          });
                          const d: any = await r.json();
                          if (!r.ok) throw Error(d.error);
                          setSymptoms('');
                          await load();
                          setNotice('Report saved and available to your doctor and safety team.');
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <label className="field">
                        <span>Symptoms / side effects</span>
                        <textarea
                          required
                          maxLength={2000}
                          value={symptoms}
                          onChange={(e) => setSymptoms(e.target.value)}
                          placeholder="What happened, when, and how long did it last?"
                        />
                      </label>
                      <label className="field">
                        <span>When did it start?</span>
                        <input
                          type="date"
                          required
                          max={new Date().toISOString().slice(0, 10)}
                          value={onset}
                          onChange={(e) => setOnset(e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>How severe did it feel?</span>
                        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                          {['Mild', 'Moderate', 'Severe'].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <button className="primary" disabled={busy || !!previewData}>
                        {busy ? 'Sending…' : 'Submit symptom report'}
                      </button>
                      {notice && <p role="status">{notice}</p>}
                    </form>
                  </section>
                  <section className="panel detail-body">
                    <h2>My reports</h2>
                    {reports.map((r) => (
                      <article className="symptom-entry" key={r.id}>
                        <span className="badge amber">{r.status}</span>
                        <h3>{r.title}</h3>
                        <p>{r.participantMessage}</p>
                        <small>
                          {r.onset} · {r.severity} ·{' '}
                          {r.participantReported ? 'Self-reported' : 'Recorded by care team'}
                        </small>
                      </article>
                    ))}
                    {!reports.length && (
                      <p>No reports recorded. This does not mean an absence of symptoms.</p>
                    )}
                  </section>
                </div>
              )}
              {view === 'My health record' && (
                <>
                  <section className="panel detail-body">
                    <h2>Medical profile</h2>
                    <div className="facts">
                      {[
                        ['Age', person.age],
                        ['Sex', person.sex],
                        ['Height', person.heightCm ? person.heightCm + ' cm' : null],
                        ['Weight', person.weightKg ? person.weightKg + ' kg' : null],
                        ['Prakriti', person.prakriti],
                        ['Allergies', person.allergies],
                        ['Medical history', person.medicalHistory],
                        ['Medications', person.medications],
                        ['Consent version', person.consentVersion],
                        ['Consent date', person.consentDate],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <small>{label}</small>
                          <b>{value || 'Not recorded'}</b>
                        </div>
                      ))}
                    </div>
                    <p>Ask your research team to correct or update your medical record.</p>
                  </section>
                  <section className="panel spaced">
                    <div className="panel-head">
                      <h2>Recorded visit measurements</h2>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Visit</th>
                            <th>Date</th>
                            <th>Blood pressure</th>
                            <th>Pulse</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visits
                            .filter((v) => v.systolic || v.pulse)
                            .map((v) => (
                              <tr key={v.id}>
                                <td>{v.title}</td>
                                <td>{v.due}</td>
                                <td>
                                  {v.systolic && v.diastolic
                                    ? `${v.systolic}/${v.diastolic} mmHg`
                                    : 'Not recorded'}
                                </td>
                                <td>{v.pulse ? `${v.pulse} bpm` : 'Not recorded'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      {!visits.some((v) => v.systolic || v.pulse) && (
                        <p className="detail-body">No measurements recorded yet.</p>
                      )}
                    </div>
                  </section>
                </>
              )}
              {view === 'My study' && (
                <section className="panel detail-body">
                  <span className="eyebrow">{study?.code}</span>
                  <h2>{study?.title}</h2>
                  <p>Study status: {study?.status}</p>
                  <p>Participation status: {person.status}</p>
                  <p>Enrolled: {person.enrolledDate || 'Not recorded'}</p>
                  <p>Site: {person.site || 'Not recorded'}</p>
                  <p>
                    Contact your study team using the details in your consent information sheet for
                    visit changes or participation questions.
                  </p>
                </section>
              )}
              {view === 'My ID card' && (
                <>
                  <ParticipantIdCard person={person} study={study} />
                  <button className="outline" onClick={() => window.print()}>
                    Print my demo ID card
                  </button>
                </>
              )}
            </>
          )}
          <footer className="workspace-footer">
            Synthetic demonstration · illustrative portraits · not for clinical care
          </footer>
        </main>
      </div>
    </div>
  );
}
