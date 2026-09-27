'use client';
import {
  ArrowRight,
  CalendarDays,
  FlaskConical,
  Users,
  ShieldCheck,
  HeartPulse,
  ClipboardCheck,
} from 'lucide-react';
import type { RecordData } from '@/lib/domain';
import type { Role } from '@/lib/permissions';
import { Portrait } from './participant-cards';
export default function RoleDashboard({
  role,
  records,
  go,
}: {
  role: Role;
  records: RecordData[];
  go: (view: string) => void;
}) {
  const studies = records.filter((r) => r.kind === 'study'),
    people = records.filter((r) => r.kind === 'participant'),
    visits = records.filter((r) => r.kind === 'visit'),
    tasks = records.filter((r) => r.kind === 'task' && r.status !== 'Completed'),
    ethics = records.filter((r) => r.kind === 'ethics'),
    safety = records.filter((r) => r.kind === 'safety' && r.status !== 'Closed'),
    queries = records.filter((r) => r.kind === 'query' && r.status !== 'Resolved');
  const clinical = role === 'doctor',
    head = role === 'head',
    research = role === 'researcher',
    review = role === 'ethics' || role === 'safety' || role === 'data_manager';
  const queue =
    role === 'ethics'
      ? ethics
      : role === 'safety'
        ? safety
        : role === 'data_manager'
          ? queries
          : tasks;
  const section =
    role === 'ethics'
      ? 'Ethics & regulatory'
      : role === 'safety'
        ? 'Safety & vigilance'
        : role === 'data_manager'
          ? 'Data queries'
          : 'Tasks & monitoring';
  const tiles = clinical
    ? [
        ['Assigned participants', people.length, Users],
        ['Scheduled visits', visits.filter((v) => v.status === 'Scheduled').length, CalendarDays],
        ['Safety follow-up', safety.length, HeartPulse],
        ['Data queries', queries.length, ClipboardCheck],
      ]
    : review
      ? [
          ['Assigned studies', studies.length, FlaskConical],
          [
            'Open reviews',
            queue.filter((r) => !['Approved', 'Rejected'].includes(r.status)).length,
            ShieldCheck,
          ],
          ['Review documents', records.filter((r) => r.kind === 'document').length, ClipboardCheck],
          ['Follow-up tasks', tasks.length, CalendarDays],
        ]
      : [
          ['Studies in view', studies.length, FlaskConical],
          ['Participants', people.length, Users],
          ['Completed visits', visits.filter((v) => v.status === 'Completed').length, CalendarDays],
          ['Open actions', tasks.length + queries.length, ClipboardCheck],
        ];
  const agenda = visits
    .filter((v) => v.status === 'Scheduled')
    .sort((a, b) => (a.due || '').localeCompare(b.due || ''));
  return (
    <div className={'specialist-dashboard specialist-' + role}>
      <div className="specialist-metrics">
        {tiles.map(([label, value, Icon]: any) => (
          <article key={label}>
            <span>
              <Icon size={21} />
              {label}
            </span>
            <strong>{value}</strong>
            <small>{head ? 'Institutional portfolio' : 'Your assigned studies'}</small>
          </article>
        ))}
      </div>
      {clinical ? (
        <>
          <div className="specialist-grid">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">CLINICAL WORKLIST</span>
                  <h2>Upcoming participant visits</h2>
                </div>
                <button className="quiet" onClick={() => go('Visits')}>
                  All visits <ArrowRight size={16} />
                </button>
              </div>
              <div className="agenda-list">
                {agenda.slice(0, 6).map((v) => {
                  const p = people.find((p) => p.id === v.participant);
                  return (
                    <button key={v.id} onClick={() => go('Visits')}>
                      <div className="date-tile">
                        <b>{v.due?.slice(-2)}</b>
                        <small>{v.due?.slice(0, 7)}</small>
                      </div>
                      <div>
                        <h3>{p?.displayName || p?.title || 'Participant'}</h3>
                        <p>{v.title}</p>
                        <small>{v.assessment}</small>
                      </div>
                      <span className="badge blue">{v.status}</span>
                    </button>
                  );
                })}
              </div>
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>Safety follow-up</h2>
                <HeartPulse />
              </div>
              <div className="review-items">
                {safety.map((r) => (
                  <button key={r.id} onClick={() => go('Safety & vigilance')}>
                    <span className={'badge ' + (r.serious ? 'red' : 'amber')}>
                      {r.serious ? 'Serious' : 'Non-serious'}
                    </span>
                    <h3>{r.title}</h3>
                    <p>
                      {r.product} / {r.severity}
                    </p>
                    <small>Review due {r.due || 'Not set'}</small>
                  </button>
                ))}
                {!safety.length && <p>No open safety cases.</p>}
              </div>
            </section>
          </div>
          <section className="panel spaced">
            <div className="panel-head">
              <h2>Participant profiles</h2>
              <button className="quiet" onClick={() => go('Participants')}>
                Open directory <ArrowRight size={16} />
              </button>
            </div>
            <div className="patient-strip">
              {people.slice(0, 6).map((p) => (
                <button key={p.id} onClick={() => go('Participants')}>
                  <Portrait person={p} />
                  <b>{p.displayName || p.title}</b>
                  <small>{p.title}</small>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : review ? (
        <div className="specialist-grid">
          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">PRIORITY WORKLIST</span>
                <h2>
                  {role === 'ethics'
                    ? 'Ethics submissions'
                    : role === 'safety'
                      ? 'Adverse-event reviews'
                      : 'Data-quality queries'}
                </h2>
              </div>
              <button className="quiet" onClick={() => go(section)}>
                Open worklist <ArrowRight size={16} />
              </button>
            </div>
            <div className="review-items">
              {queue.map((r) => (
                <button key={r.id} onClick={() => go(section)}>
                  <span className="badge amber">{r.status}</span>
                  <h3>{r.title}</h3>
                  <p>{r.notes || r.review || r.type || 'Awaiting team follow-up'}</p>
                  <small>
                    {r.reviewer || r.owner || 'Review team'} / Due {r.due || 'Not set'}
                  </small>
                </button>
              ))}
              {!queue.length && <p>No items awaiting review.</p>}
            </div>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>Assigned research</h2>
              <FlaskConical />
            </div>
            <div className="study-briefs">
              {studies.map((s) => (
                <button key={s.id} onClick={() => go('Studies')}>
                  <span className="eyebrow">{s.code}</span>
                  <h3>{s.title}</h3>
                  <p>{s.pi}</p>
                  <span className="badge green">{s.status}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <>
          <div className="specialist-grid">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">
                    {head
                      ? 'INSTITUTIONAL PERFORMANCE'
                      : research
                        ? 'RECRUITMENT & DELIVERY'
                        : 'STUDY OPERATIONS'}
                  </span>
                  <h2>{head ? 'Portfolio recruitment' : 'Study progress'}</h2>
                </div>
                <button className="quiet" onClick={() => go('Studies')}>
                  Explore studies <ArrowRight size={16} />
                </button>
              </div>
              <div className="recruitment-bars">
                {studies.map((s) => {
                  const enrolled = people.filter((p) => p.study === s.id).length,
                    percent = Math.min(100, Math.round((enrolled / s.target) * 100));
                  return (
                    <button key={s.id} onClick={() => go('Studies')}>
                      <div>
                        <b>{s.code}</b>
                        <span>
                          {enrolled} / {s.target} participants
                        </span>
                      </div>
                      <p>{s.title}</p>
                      <div className="progress">
                        <i style={{ width: percent + '%' }} />
                      </div>
                      <small>
                        {percent}% recruited / {s.site}
                      </small>
                    </button>
                  );
                })}
              </div>
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>{head ? 'Oversight priorities' : 'Upcoming actions'}</h2>
                <ClipboardCheck />
              </div>
              <div className="review-items">
                {(head ? [...safety, ...ethics, ...tasks] : tasks).slice(0, 6).map((r) => (
                  <button
                    key={r.id}
                    onClick={() =>
                      go(
                        r.kind === 'safety'
                          ? 'Safety & vigilance'
                          : r.kind === 'ethics'
                            ? 'Ethics & regulatory'
                            : 'Tasks & monitoring',
                      )
                    }
                  >
                    <span className="badge amber">{r.status}</span>
                    <h3>{r.title}</h3>
                    <small>
                      Due {r.due || 'Not set'} / {r.owner || r.reviewer || 'Research team'}
                    </small>
                  </button>
                ))}
              </div>
            </section>
          </div>
          <div className="role-bottom-banner">
            <img src="/images/research-laboratory.webp" alt="" />
            <div>
              <span className="eyebrow">
                {research ? 'PROTOCOL TO CLOSE-OUT' : 'RESEARCH IN FOCUS'}
              </span>
              <h2>
                {head ? 'A clear view across the institution.' : 'Keep the next milestone in view.'}
              </h2>
              <p>
                {head
                  ? 'Review recruitment, safety and ethics across your research portfolio.'
                  : 'Work through assigned visits, documents and monitoring actions.'}
              </p>
              <button
                className="outline"
                onClick={() => go(head ? 'Reports' : 'Tasks & monitoring')}
              >
                {head ? 'Open reports' : 'Open monitoring tasks'} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
