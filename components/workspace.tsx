'use client';

import Sahayak from './sahayak';
import { SessionBanner } from './demo-login';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import {
  Activity,
  LayoutDashboard,
  FlaskConical,
  Users,
  ShieldCheck,
  HeartPulse,
  Files,
  ClipboardCheck,
  ChartNoAxesCombined,
  Sparkles,
  History,
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  ChevronRight,
  CalendarDays,
  Building2,
  Leaf,
  Download,
  ArrowLeft,
  Check,
  Clock,
  TriangleAlert,
  RefreshCw,
  FileText,
  ExternalLink,
  Send,
  SlidersHorizontal,
  ArrowRight,
  CheckCircle2,
  Bell,
  LogOut,
  Upload,
  LockKeyhole,
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import RoleDashboard from './role-dashboard';
import { ParticipantDirectory } from './participant-cards';
import { TeamAccess } from './team-access';

import {
  roles as accessRoles,
  allowedSections,
  canWrite,
  type Membership,
} from '@/lib/permissions';

import { Button } from '@/components/ui/button';

import { type RecordData, type Kind, statusOptions, readiness, day } from '@/lib/domain';

const nav = [
  ['Overview', LayoutDashboard],
  ['Studies', FlaskConical],
  ['Participants', Users],
  ['Visits', CalendarDays],
  ['Sites & teams', Building2],
  ['Ethics & regulatory', ShieldCheck],
  ['Safety & vigilance', HeartPulse],
  ['Data queries', ClipboardCheck],
  ['Documents', Files],
  ['Tasks & monitoring', ClipboardCheck],
  ['Reports', ChartNoAxesCombined],
  ['Research Sahayak', Sparkles],
  ['Team access', Users],
  ['Audit trail', History],
  ['Settings', Settings],
] as const;

const kinds: Record<string, Kind> = {
  Studies: 'study',
  Participants: 'participant',
  Visits: 'visit',
  'Sites & teams': 'site',
  'Ethics & regulatory': 'ethics',
  'Safety & vigilance': 'safety',
  'Data queries': 'query',
  Documents: 'document',
  'Tasks & monitoring': 'task',
};

const singular: Record<Kind, string> = {
  study: 'study',
  participant: 'participant',
  visit: 'visit',
  site: 'site',
  ethics: 'ethics submission',
  safety: 'safety case',
  query: 'data query',
  document: 'document',
  task: 'task',
};

const subtitles: Record<string, string> = {
  Overview: 'A connected view of Ayurveda clinical research.',
  Studies: 'Manage your research portfolio, from protocol to close-out.',
  Participants: 'Pseudonymous records, eligibility and informed consent.',
  Visits: 'Stay on schedule. Keep every follow-up in view.',
  'Sites & teams': 'Coordinate investigators and research centres.',
  'Ethics & regulatory': 'Track submissions, decisions and study readiness.',
  'Safety & vigilance': 'Capture, review and follow up on safety reports.',
  'Data queries': 'Resolve missing and inconsistent study data.',
  Documents: 'Versioned study documents, securely stored.',
  'Tasks & monitoring': 'Accountability for monitoring, follow-up and corrective actions.',
  Reports: 'Turn study activity into traceable portfolio insights.',
  'Research Sahayak': 'Find source-linked guidance and explain study readiness.',
  'Audit trail': 'A history of changes made in your workspace.',
  'Team access': 'Approve accounts, assign studies and manage permissions.',
  Settings: 'Manage your workspace and understand deployment capabilities.',
};

function Badge({ status }: { status: string }) {
  const tone = ['Recruiting', 'Approved', 'Active', 'Completed', 'Resolved', 'Enrolled'].includes(
    status,
  )
    ? 'green'
    : ['New', 'Missed', 'Rejected', 'High', 'Serious'].includes(status)
      ? 'red'
      : [
            'In review',
            'Follow-up',
            'Under review',
            'Submitted',
            'Scheduled',
            'Changes requested',
          ].includes(status)
        ? 'amber'
        : 'blue';
  return <span className={'badge ' + tone}>{status}</span>;
}

function date(d?: string) {
  return d
    ? new Date(d + 'T12:00:00').toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';
}

function csv(items: any[]) {
  if (!items.length) return '';
  const keys = Array.from(new Set(items.flatMap((x) => Object.keys(x))));
  const cell = (v: any) => {
    let s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [
    keys.map(cell).join(','),
    ...items.map((x) => keys.map((k) => cell(x[k])).join(',')),
  ].join('\r\n');
}

function download(name: string, data: string, type = 'text/csv') {
  const u = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const target = value;
    const start = previous.current;
    previous.current = value;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(target);
      return;
    }
    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - began) / 650);
      setShown(Math.round(start + (target - start) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <>
      <span aria-hidden="true">{shown.toLocaleString('en-IN')}</span>
      <span className="sr-only">{value.toLocaleString('en-IN')}</span>
    </>
  );
}

export default function Observatory({
  membership,
  previewData,
}: {
  membership: Membership;
  previewData?: any;
}) {
  const homeTitles: Record<string, string> = {
    administrator: 'Portfolio overview',
    head: 'Institutional overview',
    researcher: 'Research workspace',
    doctor: 'Clinical workspace',
    coordinator: 'Research operations',
    ethics: 'Ethics review desk',
    safety: 'Safety monitoring',
    data_manager: 'Data quality workspace',
  };
  const sections = allowedSections(membership.role);
  const canEdit = (kind: Kind) => !previewData && canWrite(membership.role, kind);
  const canCreate = (kind: Kind) =>
    canEdit(kind) && (kind !== 'study' || membership.role === 'administrator');

  const [view, setView] = useState('Overview'),
    [records, setRecords] = useState<RecordData[]>([]),
    [logs, setLogs] = useState<any[]>([]),
    [settings, setSettings] = useState<any>(null),
    [user, setUser] = useState<any>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(''),
    [unauthorized, setUnauthorized] = useState(false),
    [updated, setUpdated] = useState('');

  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('All statuses'),
    [studyFilter, setStudyFilter] = useState('All studies'),
    [role, setRole] = useState(
      membership.role === 'ethics'
        ? 'Ethics committee'
        : membership.role === 'safety'
          ? 'Pharmacovigilance'
          : ['administrator', 'head'].includes(membership.role)
            ? 'Leadership'
            : 'Investigator',
    ),
    [selected, setSelected] = useState<string | null>(null),
    [editing, setEditing] = useState<RecordData | null>(null),
    [reason, setReason] = useState(''),
    [saving, setSaving] = useState(false),
    [formError, setFormError] = useState(''),
    [notice, setNotice] = useState(''),
    [file, setFile] = useState<File | null>(null),
    [question, setQuestion] = useState(''),
    [answer, setAnswer] = useState<any>(null),
    [period, setPeriod] = useState('6 months');

  const load = useCallback(async (initial = false) => {
    if (previewData) {
      setRecords(previewData.records);
      setLogs([]);
      setSettings(previewData.settings);
      setUser(previewData.user);
      setUpdated(previewData.updated);
      setBusy(false);
      return;
    }
    try {
      if (initial) setBusy(true);
      const response = await fetch('/api/workspace', { cache: 'no-store' });
      const d: any = await response.json();
      if (response.status === 401) {
        setUnauthorized(true);
        return;
      }
      if (!response.ok) {
        if (response.status === 403) {
          setRecords([]);
          setLogs([]);
          setSettings(null);
        }
        throw Error(d.error);
      }
      if (!d.settings) {
        const init = await fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'initialize' }),
        });
        if (!init.ok) throw Error(((await init.json()) as any).error);
        return await load(false);
      }
      if (membership.role === 'administrator' && d.settings.demoVersion !== 2) {
        const expanded = await fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'expandDemo' }),
        });
        if (!expanded.ok) throw Error('Could not load extended demo records.');
        return await load(false);
      }
      setUnauthorized(false);
      setRecords(d.records);
      setLogs(d.audit);
      setSettings(d.settings);
      setUser(d.user);
      setUpdated(d.updated);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load workspace');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 30000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  function go(next: string) {
    if (!sections.includes(next)) return;
    setView(next);
    setSelected(null);
    setSearch('');
    setStatus('All statuses');
    setStudyFilter('All studies');
    if (typeof window !== 'undefined')
      window.history.replaceState(null, '', '#' + encodeURIComponent(next));
  }

  useEffect(() => {
    const initial = decodeURIComponent(window.location.hash.slice(1));
    if (sections.includes(initial)) setView(initial);
  }, []);

  useEffect(() => {
    const ctx = (document as any).modelContext;
    if (!ctx?.registerTool) return;
    const controller = new AbortController();
    Promise.resolve(
      ctx.registerTool(
        {
          name: 'navigate_research_workspace',
          description: 'Navigate to a workspace section. Does not modify research records.',
          inputSchema: {
            type: 'object',
            properties: { section: { type: 'string', enum: sections } },
            required: ['section'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
          execute: (input: any) => {
            if (!input || !sections.includes(input.section))
              throw Error('Unknown workspace section');
            go(input.section);
            return { section: input.section };
          },
        },
        { signal: controller.signal },
      ),
    ).catch(() => {});
    return () => controller.abort();
  }, []);

  const studies = records.filter((r) => r.kind === 'study');
  const participants = records.filter((r) => r.kind === 'participant');
  const visits = records.filter((r) => r.kind === 'visit');
  const safety = records.filter((r) => r.kind === 'safety');
  const active = studies.filter((r) => r.status === 'Recruiting' || r.status === 'Follow-up');
  const enrolled = participants.filter(
    (r) => r.enrolledDate && ['Enrolled', 'Completed', 'Withdrawn'].includes(r.status),
  );
  const target = studies.reduce((s, r) => s + Number(r.target || 0), 0);
  const openSafety = safety.filter((r) => r.status !== 'Closed');
  const reviews = records.filter(
    (r) => r.kind === 'ethics' && !['Approved', 'Rejected'].includes(r.status),
  );
  const queries = records.filter((r) => r.kind === 'query' && r.status !== 'Resolved');
  const studyName = (id?: string) =>
    studies.find((s) => s.id === id)?.code ?? studies.find((s) => s.id === id)?.title ?? '—';

  const current = records.find((r) => r.id === selected);
  const alerts = [
    ...openSafety.filter((r) => r.serious),
    ...visits.filter((r) => r.status === 'Scheduled' && r.due < day()),
    ...queries.filter((r) => r.due <= day()),
    ...reviews.filter((r) => !r.due || r.due <= day(settings?.alertDays ?? 7)),
    ...records.filter((r) => r.kind === 'task' && r.status !== 'Completed'),
  ];

  const shown = records.filter(
    (r) =>
      r.kind === kinds[view] &&
      (status === 'All statuses' || r.status === status) &&
      (studyFilter === 'All studies' || r.study === studyFilter) &&
      JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
  );

  const trend = useMemo(() => {
    const count = period === '3 months' ? 3 : 6;
    return Array.from({ length: count }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (count - 1 - i), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
      return {
        label: d.toLocaleDateString('en', { month: 'short' }),
        value: enrolled.filter((p) => p.enrolledDate <= end).length,
      };
    });
  }, [records, period]);

  const openEditor = (r?: RecordData, kind?: Kind) => {
    const k = r?.kind ?? kind ?? kinds[view] ?? 'study';
    if (!r && !canCreate(k)) return;
    setEditing(
      r
        ? { ...r }
        : {
            id: '',
            kind: k,
            title: '',
            status: statusOptions[k][0],
            version: 0,
            updated: '',
            study: selected && current?.kind === 'study' ? selected : studies[0]?.id,
            code: '',
            target: 60,
            type: 'Interventional',
            ethics: 'Pending',
            ctri: 'Pending',
            ctriId: '',
            protocol: '',
            siteReady: false,
            due: day(7),
            onset: day(),
            severity: 'Mild',
            serious: false,
            consent: false,
            eligible: false,
            enrolledDate: day(),
            consentDate: day(),
            consentVersion: '',
            notes: '',
          },
    );
    setReason('');
    setFormError('');
    setFile(null);
  };

  const set = (key: string, value: any) => setEditing((r) => (r ? { ...r, [key]: value } : r));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !canEdit(editing.kind)) return;
    setSaving(true);
    setFormError('');
    try {
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', record: editing, reason }),
      });
      const data: any = await response.json();
      if (!response.ok) throw Error(data.error);
      if (file) {
        const f = new FormData();
        f.append('id', data.id);
        f.append('file', file);
        const upload = await fetch('/api/files', { method: 'POST', body: f });
        if (!upload.ok) {
          setEditing({ ...editing, id: data.id, version: editing.version + 1 });
          throw Error(
            'Record saved, but attachment failed: ' + ((await upload.json()) as any).error,
          );
        }
      }
      setEditing(null);
      setNotice('Saved to your workspace');
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Unable to save');
    } finally {
      setSaving(false);
    }
  }

  async function exportData(mode = 'csv') {
    if (previewData) {
      setNotice('Exports are disabled in the read-only preview.');
      return;
    }
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export', format: mode, section: view }),
      });
      if (!res.ok) throw Error(((await res.json()) as any).error);
      if (mode === 'fhir') {
        const entries: any[] = studies.map((s) => ({
          resource: {
            resourceType: 'ResearchStudy',
            id: s.id,
            title: s.title,
            status:
              (
                {
                  Recruiting: 'active',
                  'Follow-up': 'active',
                  Completed: 'completed',
                  Paused: 'temporarily-closed-to-accrual',
                  Draft: 'in-review',
                } as any
              )[s.status] || 'in-review',
          },
        }));
        enrolled.forEach((p) => {
          entries.push({
            resource: {
              resourceType: 'Patient',
              id: p.id,
              identifier: [{ system: 'urn:aiia:demo:participant', value: p.title }],
            },
          });
          entries.push({
            resource: {
              resourceType: 'ResearchSubject',
              id: 'rs-' + p.id,
              status: p.status === 'Completed' ? 'off-study' : 'on-study',
              study: { reference: 'ResearchStudy/' + p.study },
              individual: { reference: 'Patient/' + p.id },
            },
          });
        });
        download(
          'aiia-fhir-r4-example.json',
          JSON.stringify({ resourceType: 'Bundle', type: 'collection', entry: entries }, null, 2),
          'application/fhir+json',
        );
      } else if (mode === 'mapping') {
        download(
          'aiia-cdisc-mapping-draft.csv',
          csv([
            {
              field: 'Participant ID',
              candidate: 'USUBJID',
              note: 'Requires study-wide uniqueness convention and validation',
            },
            { field: 'Study code', candidate: 'STUDYID', note: 'Review with data manager' },
            {
              field: 'Event description',
              candidate: 'AETERM',
              note: 'Verbatim event term; separate coding required',
            },
            {
              field: 'Onset',
              candidate: 'AESTDTC',
              note: 'Validate ISO 8601 and partial-date rules',
            },
            { field: 'Serious', candidate: 'AESER', note: 'Map to controlled terminology' },
          ]),
        );
      } else {
        const data = view === 'Audit trail' ? logs : kinds[view] ? shown : records;
        download(
          'aiia-' + view.toLowerCase().replaceAll(' ', '-') + '.csv',
          csv(data.map(({ fileKey, ...r }) => r)),
        );
      }
      setNotice('Export downloaded');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  }

  function field(key: string, label: string, type = 'text', options?: string[]) {
    return (
      <label className={type === 'textarea' ? 'field wide' : 'field'} key={key}>
        <span>{label}</span>
        {type === 'textarea' ? (
          <textarea
            value={editing?.[key] ?? ''}
            onChange={(e) => set(key, e.target.value)}
            rows={3}
          />
        ) : options ? (
          <select value={editing?.[key] ?? ''} onChange={(e) => set(key, e.target.value)}>
            <option value="">Select…</option>
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={editing?.[key] ?? ''}
            onChange={(e) => set(key, type === 'number' ? e.target.valueAsNumber : e.target.value)}
            maxLength={type === 'text' ? 240 : undefined}
          />
        )}
      </label>
    );
  }

  function check(key: string, label: string) {
    return (
      <label className="check-field">
        <input
          type="checkbox"
          checked={!!editing?.[key]}
          onChange={(e) => set(key, e.target.checked)}
        />
        <span>{label}</span>
      </label>
    );
  }

  function rowAction(r: RecordData) {
    if (r.kind === 'study') setSelected(r.id);
    else openEditor(r);
  }

  function StudyTable({ items = studies.slice(0, 5) }: { items?: RecordData[] }) {
    return (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>STUDY</th>
              <th>STATUS</th>
              <th>ENROLMENT</th>
              <th>INVESTIGATOR</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((s) => {
              const n = enrolled.filter((p) => p.study === s.id).length;
              return (
                <tr key={s.id} onClick={() => setSelected(s.id)}>
                  <td>
                    <button className="study-link" onClick={() => setSelected(s.id)}>
                      <span className="study-icon">
                        <FlaskConical size={18} />
                      </span>
                      <span>
                        {s.title}
                        <small>
                          {s.code || s.id.slice(0, 8)} · {s.condition || s.type}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <Badge status={s.status} />
                  </td>
                  <td>
                    <div className="enrol-number">
                      {n} <span>/ {s.target}</span>
                      <small>{Math.round((n / s.target) * 100)}%</small>
                    </div>
                    <div className="progress">
                      <i style={{ width: Math.min(100, (n / s.target) * 100) + '%' }} />
                    </div>
                  </td>
                  <td>
                    <span className="investigator">{s.pi || 'Not assigned'}</span>
                    <small>{s.site || 'Site not assigned'}</small>
                  </td>
                  <td>
                    <ChevronRight size={15} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!items.length && (
          <div className="empty">
            <FlaskConical />
            <h3>No matching studies</h3>
            <p>Change your filters or create a new study.</p>
          </div>
        )}
      </div>
    );
  }

  function Metrics() {
    const standard = [
      {
        label: 'Active studies',
        value: active.length,
        detail: `${studies.length} studies in your portfolio`,
        icon: FlaskConical,
      },
      {
        label: 'Participants enrolled',
        value: enrolled.length,
        detail: `${target ? Math.round((enrolled.length / target) * 100) : 0}% of ${target} target participants`,
        icon: Users,
      },
      {
        label: 'Pending ethics reviews',
        value: reviews.length,
        detail: 'Submissions awaiting a decision',
        icon: ShieldCheck,
      },
      {
        label: 'Open safety cases',
        value: openSafety.length,
        detail: `${openSafety.filter((s) => s.serious).length} serious case requiring attention`,
        icon: HeartPulse,
      },
    ];
    const metrics =
      membership.role === 'ethics'
        ? [
            {
              label: 'Assigned studies',
              value: studies.length,
              detail: 'Studies assigned to your account',
              icon: FlaskConical,
            },
            {
              label: 'Awaiting review',
              value: reviews.length,
              detail: 'Ethics submissions pending a decision',
              icon: ShieldCheck,
            },
            {
              label: 'Approved submissions',
              value: records.filter((r) => r.kind === 'ethics' && r.status === 'Approved').length,
              detail: 'Decisions recorded in assigned studies',
              icon: CheckCircle2,
            },
            {
              label: 'Supporting documents',
              value: records.filter((r) => r.kind === 'document').length,
              detail: 'Documents in assigned studies',
              icon: Files,
            },
          ]
        : ['doctor', 'coordinator', 'data_manager', 'researcher'].includes(membership.role)
          ? [
              standard[0],
              standard[1],
              {
                label: 'Scheduled visits',
                value: visits.filter((v) => v.status === 'Scheduled').length,
                detail: 'Visits in assigned studies',
                icon: CalendarDays,
              },
              {
                label: membership.role === 'doctor' ? 'Open safety cases' : 'Open data queries',
                value: membership.role === 'doctor' ? openSafety.length : queries.length,
                detail: 'Items visible to your role',
                icon: ClipboardCheck,
              },
            ]
          : membership.role === 'safety'
            ? [
                standard[0],
                standard[3],
                {
                  label: 'Serious cases',
                  value: openSafety.filter((r) => r.serious).length,
                  detail: 'Open cases requiring clinical review',
                  icon: HeartPulse,
                },
                {
                  label: 'Follow-up tasks',
                  value: records.filter((r) => r.kind === 'task' && r.status !== 'Completed')
                    .length,
                  detail: 'Tasks in your assigned studies',
                  icon: ClipboardCheck,
                },
              ]
            : standard;
    return (
      <div className="metrics">
        {metrics.map((m) => (
          <section className="metric" key={m.label}>
            <div className="metric-label">
              {m.label}
              <m.icon size={17} />
            </div>
            <strong>
              <AnimatedNumber value={m.value} />
            </strong>
            <p>{m.detail}</p>
          </section>
        ))}
      </div>
    );
  }

  const filteredStudies = studies.filter(
    (s) =>
      (status === 'All statuses' || s.status === status) &&
      JSON.stringify(s).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brandmark">
            <Leaf size={25} />
          </span>
          <span>
            AIIA<span className="brand-sub">RESEARCH OBSERVATORY</span>
          </span>
        </a>
        <div className="workspace-label">INSTITUTIONAL WORKSPACE</div>
        <nav>
          {nav
            .filter(([name]) => sections.includes(name))
            .map(([name, Icon], i) => (
              <button
                className={`nav ${name === view ? 'active' : ''} ${i === 5 || i === 10 ? 'nav-separator' : ''}`}
                key={name}
                onClick={() => go(name)}
              >
                <Icon size={18} />
                <span>{name}</span>
                {name === 'Safety & vigilance' && openSafety.length > 0 && (
                  <em>{openSafety.length}</em>
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck size={21} />
          <div>
            <a href="/">All role portals</a>
            <small>Private demonstration workspace</small>
          </div>
        </div>
      </aside>
      <div className="main">
        <header>
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} /> <b>{view}</b>
          </div>
          <div className="header-right">
            <span className="demo-label">SYNTHETIC DATA</span>
            <button
              className="icon-btn"
              aria-label="View tasks and alerts"
              onClick={() => go('Tasks & monitoring')}
            >
              <Bell size={18} />
              {alerts.length > 0 && <i />}
            </button>
            <span className="header-divider" />
            <span className="avatar">
              {membership.name
                .split(/\s+/)
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div className="identity">
              <b>{membership.name}</b>
              <small>{accessRoles[membership.role].label}</small>
            </div>
            <a
              className="icon-btn"
              aria-label="Sign out"
              href="/signout-with-chatgpt?return_to=/"
              target="_top"
            >
              <LogOut size={17} />
            </a>
          </div>
        </header>
        <main key={view + ':' + (selected ?? '')} className="workspace-content">
          <SessionBanner />
          {previewData && (
            <div className="preview-banner">
              READ-ONLY DEMO PREVIEW · {accessRoles[membership.role].label} ·{' '}
              <a href="/">Back to role selection</a>
            </div>
          )}

          {unauthorized ? (
            <section className="welcome panel">
              <img
                className="welcome-art"
                src="/images/botanical-research.webp"
                alt=""
                width="1536"
                height="1024"
              />
              <span className="welcome-icon">
                <Leaf size={38} />
              </span>
              <div className="eyebrow">AIIA RESEARCH OBSERVATORY</div>
              <h1>Your research. One connected workspace.</h1>
              <p>
                Manage studies, ethics reviews and safety monitoring in a private demonstration
                workspace.
              </p>
              <a className="primary" href="/signin-with-chatgpt?return_to=/" target="_top">
                Sign in to open workspace <ArrowRight size={17} />
              </a>
              <small>Uses synthetic data. Not for live clinical operations.</small>
            </section>
          ) : (
            <>
              <div
                className={`page-heading ${['Overview', 'Studies', 'Reports', 'Research Sahayak'].includes(view) && !current ? 'heading-visual' : ''} ${view === 'Reports' ? 'heading-laboratory' : ''}`}
              >
                {['Overview', 'Studies', 'Reports', 'Research Sahayak'].includes(view) &&
                  !current && (
                    <img
                      className="heading-art"
                      src={
                        view === 'Reports'
                          ? '/images/research-laboratory.webp'
                          : '/images/botanical-research.webp'
                      }
                      alt=""
                      aria-hidden="true"
                      width="1536"
                      height="1024"
                      fetchPriority="high"
                    />
                  )}
                <div className="heading-copy">
                  <div className="eyebrow">
                    {view === 'Overview'
                      ? accessRoles[membership.role].label.toUpperCase()
                      : 'AIIA RESEARCH WORKSPACE'}
                  </div>
                  <h1>
                    {current && current.kind === 'study'
                      ? current.code || 'Study workspace'
                      : view === 'Overview'
                        ? homeTitles[membership.role]
                        : view}
                  </h1>
                  <p>
                    {current && current.kind === 'study'
                      ? current.title
                      : view === 'Overview'
                        ? accessRoles[membership.role].description
                        : subtitles[view]}
                  </p>
                </div>
                <div className="heading-actions">
                  {view === 'Overview' && membership.role === 'administrator' ? (
                    <select
                      className="select"
                      aria-label="Administrator dashboard focus"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      {['Leadership', 'Investigator', 'Ethics committee', 'Pharmacovigilance'].map(
                        (r) => (
                          <option key={r}>{r}</option>
                        ),
                      )}
                    </select>
                  ) : (
                    !['Team access', 'Settings'].includes(view) && (
                      <button className="outline" onClick={() => exportData()}>
                        <Download size={16} /> Export
                      </button>
                    )
                  )}
                  {(kinds[view] || view === 'Overview') &&
                    canCreate(
                      current?.kind === 'study' ? 'participant' : (kinds[view] ?? 'study'),
                    ) && (
                      <button
                        className="primary"
                        disabled={!settings}
                        onClick={() =>
                          openEditor(
                            undefined,
                            current?.kind === 'study' ? 'participant' : (kinds[view] ?? 'study'),
                          )
                        }
                      >
                        <Plus size={17} />{' '}
                        {current?.kind === 'study'
                          ? 'Add participant'
                          : `New ${singular[kinds[view] ?? 'study']}`}
                      </button>
                    )}
                </div>
              </div>

              {error && (
                <div className="error-banner" role="alert">
                  <TriangleAlert size={18} />
                  <span>{error}</span>
                  <button onClick={() => load(true)}>Retry</button>
                </div>
              )}

              {busy && !settings ? (
                <div className="loading">
                  <RefreshCw className="spin" />
                  <h2>Opening your research workspace</h2>
                  <p>Loading studies and activity…</p>
                </div>
              ) : (
                settings && (
                  <>
                    {current && current.kind === 'study' ? (
                      <>
                        <button className="back" onClick={() => setSelected(null)}>
                          <ArrowLeft size={15} /> Back to {view.toLowerCase()}
                        </button>
                        <div className="study-detail">
                          <section className="panel">
                            <div className="panel-head">
                              <h2>Study information</h2>
                              {canEdit('study') && (
                                <button className="outline" onClick={() => openEditor(current)}>
                                  Edit study
                                </button>
                              )}
                            </div>
                            <div className="detail-body">
                              <Badge status={current.status} />
                              <h2>{current.title}</h2>
                              <div className="facts">
                                {[
                                  ['Principal investigator', current.pi],
                                  ['Research site', current.site],
                                  ['Study type', current.type],
                                  ['Protocol', current.protocol],
                                  ['Registry reference', current.ctriId],
                                  ['Target enrolment', current.target],
                                  ['Start date', date(current.start)],
                                  ['Planned completion', date(current.end)],
                                ].map(([k, v]) => (
                                  <div key={k}>
                                    <small>{k}</small>
                                    <b>{v || 'Not provided'}</b>
                                  </div>
                                ))}
                              </div>
                              <p>{current.notes}</p>
                            </div>
                          </section>
                          <section className="panel">
                            <div className="panel-head">
                              <h2>Readiness checks</h2>
                              <ShieldCheck size={19} />
                            </div>
                            <div className="readiness">
                              {readiness(current).map((c) => (
                                <div key={c.label}>
                                  {c.ok ? (
                                    <CheckCircle2 size={19} className="text-green" />
                                  ) : (
                                    <Clock size={19} className="text-amber" />
                                  )}
                                  <span>{c.label}</span>
                                  <Badge status={c.ok ? 'Approved' : 'Pending'} />
                                </div>
                              ))}
                              <p>
                                These are demonstration workflow checks. Regulatory applicability
                                and evidence need institutional verification.
                              </p>
                            </div>
                          </section>
                        </div>
                        <section className="panel spaced">
                          <div className="panel-head">
                            <h2>Study activity</h2>
                            <div className="button-group">
                              {canCreate('visit') && (
                                <button
                                  className="quiet"
                                  onClick={() => openEditor(undefined, 'visit')}
                                >
                                  <Plus size={15} /> Visit
                                </button>
                              )}
                              {canCreate('safety') && (
                                <button
                                  className="quiet"
                                  onClick={() => openEditor(undefined, 'safety')}
                                >
                                  <Plus size={15} /> Safety case
                                </button>
                              )}
                              {canCreate('ethics') && (
                                <button
                                  className="quiet"
                                  onClick={() => openEditor(undefined, 'ethics')}
                                >
                                  <Plus size={15} /> Ethics review
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="activity-list">
                            {records
                              .filter((r) => r.study === current.id)
                              .slice(0, 15)
                              .map((r) => (
                                <button key={r.id} onClick={() => openEditor(r)}>
                                  <span>
                                    <b>{r.title}</b>
                                    <small>
                                      {singular[r.kind]} ·{' '}
                                      {r.due ? date(r.due) : date(r.enrolledDate)}
                                    </small>
                                  </span>
                                  <Badge status={r.status} />
                                  <ChevronRight size={16} />
                                </button>
                              ))}
                            {!records.some((r) => r.study === current.id) && (
                              <div className="empty">
                                No study activity yet. Add a participant or submission to begin.
                              </div>
                            )}
                          </div>
                        </section>
                      </>
                    ) : view === 'Overview' && membership.role !== 'administrator' ? (
                      <RoleDashboard role={membership.role} records={records} go={go} />
                    ) : view === 'Overview' ? (
                      <>
                        <div className="context-line">
                          <span>
                            <span className="live-dot" /> Updated{' '}
                            {updated
                              ? new Date(updated).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}{' '}
                            · refreshes every 30s
                          </span>
                          <span>
                            {accessRoles[membership.role].label}{' '}
                            <span className="muted">
                              {' '}
                              /{' '}
                              {['administrator', 'head'].includes(membership.role)
                                ? 'institution-wide'
                                : 'assigned studies only'}
                            </span>
                          </span>
                        </div>
                        <Metrics />
                        {role !== 'Leadership' && (
                          <section className="role-focus">
                            <div>
                              <h2>
                                {role === 'Investigator'
                                  ? 'Your study worklist'
                                  : role === 'Ethics committee'
                                    ? 'Submissions requiring review'
                                    : 'Safety review worklist'}
                              </h2>
                              <p>
                                {role === 'Investigator'
                                  ? `${visits.filter((v) => v.status === 'Scheduled').length} scheduled visits and ${queries.length} unresolved data queries`
                                  : role === 'Ethics committee'
                                    ? `${reviews.length} submissions awaiting a decision`
                                    : `${openSafety.length} cases awaiting follow-up or clinical review`}
                              </p>
                            </div>
                            <button
                              className="primary"
                              onClick={() =>
                                go(
                                  membership.role === 'data_manager'
                                    ? 'Data queries'
                                    : role === 'Investigator'
                                      ? 'Visits'
                                      : role === 'Ethics committee'
                                        ? 'Ethics & regulatory'
                                        : 'Safety & vigilance',
                                )
                              }
                            >
                              Open worklist <ArrowRight size={16} />
                            </button>
                          </section>
                        )}
                        <div className="overview-grid">
                          {membership.role === 'ethics' ? (
                            <section className="panel">
                              <div className="panel-head">
                                <h2>Assigned studies</h2>
                                <ShieldCheck size={19} />
                              </div>
                              <div className="readiness">
                                {studies.map((s) => (
                                  <div key={s.id}>
                                    <span>
                                      {s.code} · {s.title}
                                    </span>
                                    <Badge
                                      status={s.ethics === 'Approved' ? 'Approved' : 'Pending'}
                                    />
                                  </div>
                                ))}
                              </div>
                            </section>
                          ) : (
                            <section className="panel chart-panel">
                              <div className="panel-head">
                                <div>
                                  <h2>Enrolment progress</h2>
                                  <p>Cumulative participants / visible studies</p>
                                </div>
                                <select
                                  className="small-select"
                                  value={period}
                                  onChange={(e) => setPeriod(e.target.value)}
                                  aria-label="Chart period"
                                >
                                  <option>6 months</option>
                                  <option>3 months</option>
                                </select>
                              </div>
                              <div className="chart-summary">
                                <strong>{enrolled.length}</strong>
                                <span>participants enrolled</span>
                                <span className="chart-key">
                                  <i /> Actual enrolment
                                </span>
                              </div>
                              <div className="chart">
                                <svg
                                  key={period}
                                  viewBox="0 0 660 210"
                                  role="img"
                                  aria-label={`Cumulative enrolment over ${period}. ${trend.map((t) => t.label + ': ' + t.value).join(', ')}`}
                                >
                                  <defs>
                                    <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                                      <stop offset="0%" stopColor="#1e927d" stopOpacity=".15" />
                                      <stop offset="100%" stopColor="#1e927d" stopOpacity="0" />
                                    </linearGradient>
                                  </defs>
                                  {[0, 1, 2, 3].map((i) => (
                                    <g key={i}>
                                      <line
                                        x1="44"
                                        x2="640"
                                        y1={25 + i * 48}
                                        y2={25 + i * 48}
                                        stroke="#edf1f2"
                                        strokeDasharray="4 5"
                                      />
                                      <text x="0" y={29 + i * 48} fill="#98a5ab" fontSize="11">
                                        {Math.round((Math.max(100, enrolled.length) * (3 - i)) / 3)}
                                      </text>
                                    </g>
                                  ))}
                                  <path
                                    className="enrolment-area"
                                    d={`M44,169 ${trend.map((t, i) => `L${44 + i * (596 / (trend.length - 1))},${169 - (t.value / Math.max(100, enrolled.length)) * 144}`).join(' ')} L640,169 Z`}
                                    fill="url(#area)"
                                  />
                                  <polyline
                                    pathLength={1}
                                    className="enrolment-line"
                                    points={trend
                                      .map(
                                        (t, i) =>
                                          `${44 + i * (596 / (trend.length - 1))},${169 - (t.value / Math.max(100, enrolled.length)) * 144}`,
                                      )
                                      .join(' ')}
                                    fill="none"
                                    stroke="#16826e"
                                    strokeWidth="2.5"
                                  />
                                  {trend.map((t, i) => (
                                    <g key={t.label}>
                                      <circle
                                        cx={44 + i * (596 / (trend.length - 1))}
                                        cy={169 - (t.value / Math.max(100, enrolled.length)) * 144}
                                        r="4"
                                        fill="white"
                                        stroke="#16826e"
                                        strokeWidth="2"
                                      />
                                      <text
                                        x={44 + i * (596 / (trend.length - 1))}
                                        y="202"
                                        textAnchor="middle"
                                        fill="#92a1a7"
                                        fontSize="11"
                                      >
                                        {t.label}
                                      </text>
                                    </g>
                                  ))}
                                </svg>
                              </div>
                              <div className="chart-footer">
                                Source: recorded enrolment dates{' '}
                                <span>Monthly cumulative total · participants</span>
                              </div>
                            </section>
                          )}
                          <section className="panel attention">
                            <div className="panel-head">
                              <h2>
                                Needs attention <span className="count">{alerts.length}</span>
                              </h2>
                              <button className="quiet" onClick={() => go('Tasks & monitoring')}>
                                View tasks <ArrowUpRight size={14} />
                              </button>
                            </div>
                            {alerts.slice(0, 4).map((a, i) => (
                              <button
                                className="alert-item"
                                key={a.id}
                                onClick={() => openEditor(a)}
                              >
                                <span className={'alert-icon ' + (a.serious ? 'red' : 'amber')}>
                                  {a.serious ? <HeartPulse size={18} /> : <Clock size={18} />}
                                </span>
                                <span>
                                  <b>{a.title}</b>
                                  <small>
                                    {studyName(a.study)} · {a.due ? date(a.due) : 'Review required'}
                                  </small>
                                </span>
                                <ChevronRight size={14} />
                              </button>
                            ))}
                            {!alerts.length && (
                              <div className="empty">
                                <CheckCircle2 />
                                <p>No outstanding alerts.</p>
                              </div>
                            )}
                            <div className="attention-footer">
                              <ShieldCheck size={14} /> Reporting dates are configured by your team
                            </div>
                          </section>
                        </div>
                        <section className="panel spaced">
                          <div className="panel-head">
                            <div>
                              <h2>
                                Study portfolio{' '}
                                <span className="count neutral">{studies.length}</span>
                              </h2>
                              <p>Your studies at a glance</p>
                            </div>
                            <button className="quiet" onClick={() => go('Studies')}>
                              View all studies <ArrowRight size={16} />
                            </button>
                          </div>
                          <StudyTable />
                        </section>
                        <div className="lower-grid">
                          {sections.includes('Sites & teams') ? (
                            <section className="panel">
                              <div className="panel-head">
                                <h2>Research sites</h2>
                                <button className="quiet" onClick={() => go('Sites & teams')}>
                                  Manage sites <ArrowUpRight size={14} />
                                </button>
                              </div>
                              <div className="site-mini-grid">
                                {records
                                  .filter((r) => r.kind === 'site')
                                  .slice(0, 3)
                                  .map((s) => (
                                    <button
                                      className="site-mini"
                                      key={s.id}
                                      onClick={() => openEditor(s)}
                                    >
                                      <Building2 size={22} />
                                      <b>{s.title}</b>
                                      <small>{s.city}</small>
                                      <span>
                                        {enrolled.filter((p) => p.site === s.city).length}{' '}
                                        participants <ChevronRight size={13} />
                                      </span>
                                    </button>
                                  ))}
                              </div>
                            </section>
                          ) : (
                            <section className="panel">
                              <div className="panel-head">
                                <h2>Your assigned workspace</h2>
                                <ShieldCheck size={20} />
                              </div>
                              <div className="detail-body">
                                <p>{accessRoles[membership.role].description}</p>
                                <p>{studies.length} studies are available to your account.</p>
                                <button className="outline" onClick={() => go('Studies')}>
                                  View assigned studies
                                </button>
                              </div>
                            </section>
                          )}
                          <section className="sahayak-callout">
                            <img
                              className="sahayak-art"
                              src="/images/research-laboratory.webp"
                              alt=""
                              aria-hidden="true"
                              width="1536"
                              height="1024"
                              loading="lazy"
                            />
                            <Sparkles size={25} />
                            <h2>A little guidance. A clearer next step.</h2>
                            <p>
                              Find source-linked answers about research registration, ethics and
                              data standards.
                            </p>
                            <button onClick={() => go('Research Sahayak')}>
                              Open Research Sahayak <ArrowRight size={16} />
                            </button>
                          </section>
                        </div>
                      </>
                    ) : kinds[view] ? (
                      <>
                        {view === 'Safety & vigilance' && (
                          <div className="notice-banner">
                            <ShieldCheck size={18} />
                            <span>
                              Suspected events require clinical review. Severity and seriousness are
                              recorded separately. No automatic regulatory submissions.
                            </span>
                          </div>
                        )}

                        {view === 'Ethics & regulatory' && (
                          <div className="readiness-strip">
                            {studies.map((s) => (
                              <button key={s.id} onClick={() => setSelected(s.id)}>
                                <span>{s.code || s.title}</span>
                                <b>{readiness(s).filter((c) => c.ok).length}/4 checks</b>
                                <i
                                  className={readiness(s).every((c) => c.ok) ? 'ready' : 'pending'}
                                />
                              </button>
                            ))}
                          </div>
                        )}

                        <section className="panel">
                          <div className="toolbar">
                            <label className="search-box">
                              <Search size={17} />
                              <input
                                placeholder={`Search ${view.toLowerCase()}…`}
                                aria-label={`Search ${view}`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                              />
                            </label>
                            <div className="filter-group">
                              {!['Studies', 'Sites & teams'].includes(view) && (
                                <select
                                  className="select"
                                  aria-label="Filter by study"
                                  value={studyFilter}
                                  onChange={(e) => setStudyFilter(e.target.value)}
                                >
                                  <option>All studies</option>
                                  {studies.map((s) => (
                                    <option value={s.id} key={s.id}>
                                      {s.code || s.title}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <select
                                className="select"
                                aria-label="Filter by status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                              >
                                <option>All statuses</option>
                                {statusOptions[kinds[view]].map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {view === 'Participants' ? (
                            <ParticipantDirectory
                              key={search + status + studyFilter}
                              people={shown}
                              records={records}
                              onEdit={(p) => openEditor(p)}
                              onRefresh={() => load()}
                              canEdit={canEdit('participant')}
                              preview={!!previewData}
                            />
                          ) : view === 'Studies' ? (
                            <StudyTable items={filteredStudies} />
                          ) : (
                            <div className="table-scroll">
                              <table>
                                <thead>
                                  <tr>
                                    <th>
                                      {view === 'Participants'
                                        ? 'PARTICIPANT ID'
                                        : view === 'Safety & vigilance'
                                          ? 'SAFETY EVENT'
                                          : 'RECORD'}
                                    </th>
                                    <th>{view === 'Sites & teams' ? 'LOCATION' : 'STUDY'}</th>
                                    <th>STATUS</th>
                                    <th>
                                      {view === 'Participants'
                                        ? 'CONSENT'
                                        : view === 'Safety & vigilance'
                                          ? 'SEVERITY / SERIOUSNESS'
                                          : view === 'Documents'
                                            ? 'ATTACHMENT'
                                            : 'DATE / OWNER'}
                                    </th>
                                    <th />
                                  </tr>
                                </thead>
                                <tbody>
                                  {shown.slice(0, 150).map((r) => (
                                    <tr key={r.id} onClick={() => rowAction(r)}>
                                      <td>
                                        <button
                                          className="record-link"
                                          onClick={() => rowAction(r)}
                                        >
                                          {r.title}
                                          <small>
                                            {r.kind === 'safety'
                                              ? r.product
                                              : r.kind === 'participant'
                                                ? `${r.age || '—'} years · ${r.sex || 'Not recorded'}`
                                                : r.type || r.owner || r.lead || singular[r.kind]}
                                          </small>
                                        </button>
                                      </td>
                                      <td>{r.kind === 'site' ? r.city : studyName(r.study)}</td>
                                      <td>
                                        <Badge status={r.status} />
                                      </td>
                                      <td>
                                        {r.kind === 'participant' ? (
                                          <span className={r.consent ? 'text-green' : 'text-amber'}>
                                            {r.consent
                                              ? `${r.consentVersion} · Verified`
                                              : 'Not recorded'}
                                          </span>
                                        ) : r.kind === 'safety' ? (
                                          <>
                                            <span>{r.severity}</span>{' '}
                                            {r.serious && <Badge status="Serious" />}
                                          </>
                                        ) : r.kind === 'document' ? (
                                          r.fileName ? (
                                            <a
                                              className="download-link"
                                              href={'/api/files?id=' + r.id}
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <Download size={14} />
                                              {r.fileName}
                                            </a>
                                          ) : (
                                            <span className="muted">Metadata only</span>
                                          )
                                        ) : (
                                          <>
                                            <span
                                              className={
                                                r.due &&
                                                r.due < day() &&
                                                !['Completed', 'Resolved', 'Approved'].includes(
                                                  r.status,
                                                )
                                                  ? 'text-red'
                                                  : ''
                                              }
                                            >
                                              {date(r.due || r.decisionDate)}
                                            </span>
                                            <small>{r.reviewer || r.owner || r.lead || ''}</small>
                                          </>
                                        )}
                                      </td>
                                      <td>
                                        <ChevronRight size={15} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {shown.length > 150 && (
                                <div className="table-note">
                                  Showing the first 150 matches of {shown.length}. Narrow your
                                  search or export all matches.
                                </div>
                              )}
                              {!shown.length && (
                                <div className="empty">
                                  <Files size={30} />
                                  <h3>No matching records</h3>
                                  <p>Create a record or adjust your filters.</p>
                                  {canCreate(kinds[view]) && (
                                    <button className="outline" onClick={() => openEditor()}>
                                      Add {singular[kinds[view]]}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </section>
                      </>
                    ) : view === 'Reports' ? (
                      <>
                        <Metrics />
                        <div className="reports-grid">
                          <section className="panel">
                            <div className="panel-head">
                              <h2>Portfolio reporting</h2>
                              <ChartNoAxesCombined size={20} />
                            </div>
                            <div className="report-body">
                              <p>
                                Export the underlying records with their identifiers, status and
                                change timestamps.
                              </p>
                              <button className="primary" onClick={() => exportData()}>
                                Download portfolio CSV <Download size={16} />
                              </button>
                              <div className="report-stat">
                                <span>Completed visits</span>
                                <b>
                                  {visits.filter((v) => v.status === 'Completed').length} /{' '}
                                  {visits.length}
                                </b>
                              </div>
                              <div className="report-stat">
                                <span>Unresolved data queries</span>
                                <b>{queries.length}</b>
                              </div>
                              <div className="report-stat">
                                <span>Sites in this workspace</span>
                                <b>{records.filter((r) => r.kind === 'site').length}</b>
                              </div>
                              <small>
                                Counts include synthetic records. No clinical efficacy analysis is
                                performed.
                              </small>
                            </div>
                          </section>
                          <section className="panel">
                            <div className="panel-head">
                              <h2>Interoperability lab</h2>
                              <Activity size={20} />
                            </div>
                            <div className="report-body">
                              <p>
                                Inspect example mappings before connecting an institutional system.
                              </p>
                              <button className="outline" onClick={() => exportData('fhir')}>
                                FHIR R4 example bundle <Download size={16} />
                              </button>
                              <button className="outline" onClick={() => exportData('mapping')}>
                                CDISC mapping worksheet <Download size={16} />
                              </button>
                              <div className="notice-banner">
                                Limited examples, not certified submission packages. Validate
                                against the receiving implementation profile.
                              </div>
                            </div>
                          </section>
                        </div>
                        <section className="panel spaced">
                          <div className="panel-head">
                            <h2>Study enrolment</h2>
                            <span className="muted">Recorded participants / protocol target</span>
                          </div>
                          <StudyTable items={studies} />
                        </section>
                      </>
                    ) : view === 'Research Sahayak' ? (
                      <Sahayak />
                    ) : view === 'Audit trail' ? (
                      <section className="panel">
                        <div className="toolbar">
                          <label className="search-box">
                            <Search size={17} />
                            <input
                              aria-label="Search audit history"
                              placeholder="Search actions, actors or record IDs…"
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                            />
                          </label>
                          <span className="muted">
                            Latest 300 events · append-only application history
                          </span>
                        </div>
                        <div className="audit-list">
                          {logs
                            .filter((l) =>
                              JSON.stringify(l).toLowerCase().includes(search.toLowerCase()),
                            )
                            .map((l) => (
                              <details key={l.id}>
                                <summary>
                                  <span className="audit-icon">
                                    <History size={16} />
                                  </span>
                                  <span>
                                    <b>{l.action}</b>
                                    <small>
                                      {l.actor} · {l.record}
                                    </small>
                                  </span>
                                  <time>{new Date(l.time).toLocaleString('en-IN')}</time>
                                  <ChevronRight size={14} />
                                </summary>
                                <div className="audit-details">
                                  <div>
                                    <h3>Before</h3>
                                    <pre>
                                      {l.before
                                        ? JSON.stringify(JSON.parse(l.before), null, 2)
                                        : 'No prior record'}
                                    </pre>
                                  </div>
                                  <div>
                                    <h3>After</h3>
                                    <pre>
                                      {l.after
                                        ? JSON.stringify(JSON.parse(l.after), null, 2)
                                        : 'Event recorded'}
                                    </pre>
                                  </div>
                                </div>
                              </details>
                            ))}
                        </div>
                        <div className="table-note">
                          Application records cannot edit or delete audit entries. Independent
                          immutable retention is not configured in this demonstration.
                        </div>
                      </section>
                    ) : view === 'Team access' ? (
                      <TeamAccess records={records} />
                    ) : view === 'Settings' ? (
                      <div className="settings-grid">
                        <section className="panel">
                          <div className="panel-head">
                            <h2>Workspace preferences</h2>
                          </div>
                          <form
                            className="settings-form"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              setSaving(true);
                              try {
                                const r = await fetch('/api/workspace', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'settings', data: settings }),
                                });
                                if (!r.ok) throw Error(((await r.json()) as any).error);
                                setNotice('Preferences saved');
                                await load();
                              } catch (e) {
                                setError(e instanceof Error ? e.message : 'Save failed');
                              } finally {
                                setSaving(false);
                              }
                            }}
                          >
                            <label className="field">
                              <span>Institution / workspace name</span>
                              <input
                                required
                                value={settings.institution}
                                onChange={(e) =>
                                  setSettings({ ...settings, institution: e.target.value })
                                }
                              />
                            </label>
                            <label className="field">
                              <span>Upcoming deadline window (days)</span>
                              <input
                                type="number"
                                min="1"
                                max="60"
                                value={settings.alertDays}
                                onChange={(e) =>
                                  setSettings({ ...settings, alertDays: Number(e.target.value) })
                                }
                              />
                            </label>
                            <p>
                              Signed in as {user?.email}. Approved team members share this workspace
                              with role and study permissions.
                            </p>
                            <button className="primary" disabled={saving}>
                              Save preferences
                            </button>
                            <a
                              className="signout"
                              href="/signout-with-chatgpt?return_to=/"
                              target="_top"
                            >
                              <LogOut size={15} /> Sign out
                            </a>
                          </form>
                        </section>
                        <section className="panel">
                          <div className="panel-head">
                            <h2>Deployment capabilities</h2>
                            <ShieldCheck size={20} />
                          </div>
                          <div className="capabilities">
                            {[
                              ['Persistent records and documents', 'Available'],
                              ['Server-side role and study restrictions', 'Available'],
                              ['Application change history', 'Available'],
                              ['Role and study access controls', 'Available'],
                              ['India-only data residency', 'Not verified'],
                              ['GCP validation / compliance certification', 'Not performed'],
                              ['Live CTRI / hospital / NPvCC integration', 'Not connected'],
                              ['Generative multilingual RAG', 'Not connected'],
                              ['Independent immutable audit retention', 'Not configured'],
                            ].map(([a, b]) => (
                              <div key={a}>
                                <span>{a}</span>
                                <Badge status={b} />
                              </div>
                            ))}
                            <p>
                              Use synthetic data only. Institutional identity, data residency,
                              retention, validation and operational controls must be established
                              before clinical use.
                            </p>
                          </div>
                        </section>
                      </div>
                    ) : null}

                    <div className="workspace-footer">
                      <span>
                        <ShieldCheck size={13} /> Synthetic demonstration · illustrative imagery ·
                        not for clinical use
                      </span>
                      <span>
                        {settings.institution} ·{' '}
                        {membership.role === 'administrator' ? (
                          <button onClick={() => go('Settings')}>Deployment details</button>
                        ) : (
                          <span>{accessRoles[membership.role].label}</span>
                        )}
                      </span>
                    </div>
                  </>
                )
              )}
            </>
          )}
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open && !saving) setEditing(null);
        }}
      >
        <DialogContent className="record-dialog">
          <DialogTitle>
            {editing && !canEdit(editing.kind) ? 'View' : editing?.id ? 'Edit' : 'New'}{' '}
            {editing ? singular[editing.kind] : ''}
          </DialogTitle>
          <DialogDescription>
            Save a traceable update to your private demonstration workspace.
          </DialogDescription>
          {editing && (
            <form onSubmit={save}>
              <fieldset className="form-grid" disabled={!!editing && !canEdit(editing.kind)}>
                {field(
                  'title',
                  editing.kind === 'participant' ? 'Pseudonymous participant ID' : 'Title / name',
                )}
                {field('status', 'Status', 'text', statusOptions[editing.kind])}
                {!['study', 'site'].includes(editing.kind) && (
                  <label className="field">
                    <span>Study</span>
                    <select
                      required
                      value={editing.study ?? ''}
                      disabled={!!editing.id}
                      onChange={(e) => set('study', e.target.value)}
                    >
                      <option value="">Select study…</option>
                      {studies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code || s.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {editing.kind === 'study' && (
                  <>
                    {field('code', 'Study code')}
                    {field('pi', 'Principal investigator')}
                    {field('site', 'Research site')}
                    {field('condition', 'Research area')}
                    {field('target', 'Target participants', 'number')}
                    {field('type', 'Study type', 'text', ['Interventional', 'Observational'])}
                    {field('start', 'Start date', 'date')}
                    {field('end', 'Planned completion', 'date')}
                    {membership.role === 'administrator' &&
                      field('ethics', 'Ethics verification', 'text', ['Pending', 'Approved'])}
                    {membership.role === 'administrator' &&
                      field('ctri', 'CTRI status', 'text', ['Pending', 'Submitted', 'Registered'])}
                    {membership.role === 'administrator' &&
                      field('ctriId', 'Registry reference (demo IDs only)')}
                    {field('protocol', 'Approved protocol version')}
                    {field('formulation', 'Formulation')}
                    {field('category', 'Regulatory classification / review note')}
                    {membership.role === 'administrator' &&
                      check('siteReady', 'Site activation verified')}
                    <div className="form-note wide">
                      Recruiting status requires all four readiness checks. Verify evidence before
                      marking any approval complete.
                    </div>
                  </>
                )}

                {editing.kind === 'participant' && (
                  <>
                    {field('displayName', 'Display name (synthetic data only)')}
                    {field('language', 'Preferred language')}
                    {field('heightCm', 'Height (cm)', 'number')}
                    {field('weightKg', 'Weight (kg)', 'number')}
                    {field('prakriti', 'Prakriti assessment')}
                    {field('allergies', 'Allergies / review note')}
                    {field('age', 'Age', 'number')}
                    {field('sex', 'Sex', 'text', ['Female', 'Male', 'Other', 'Not recorded'])}
                    {field('site', 'Site')}
                    {field('consentVersion', 'Consent version')}
                    {field('consentDate', 'Consent date', 'date')}
                    {field('enrolledDate', 'Enrolment date', 'date')}
                    {check('consent', 'Informed consent documented')}
                    {check('eligible', 'Eligibility confirmed by investigator')}
                    <div className="form-note wide">
                      Use a synthetic participant ID, never a real name or Aadhaar number. Enrolment
                      is checked against study readiness.
                    </div>
                  </>
                )}

                {editing.kind === 'visit' && (
                  <>
                    <label className="field">
                      <span>Participant</span>
                      <select
                        value={editing.participant ?? ''}
                        onChange={(e) => set('participant', e.target.value)}
                      >
                        <option value="">Select participant…</option>
                        {participants
                          .filter((p) => p.study === editing.study)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}
                            </option>
                          ))}
                      </select>
                    </label>
                    {field('due', 'Visit date', 'date')}
                    {field('assessment', 'Assessment / visit type')}
                    {field('systolic', 'Systolic BP (mmHg)', 'number')}
                    {field('diastolic', 'Diastolic BP (mmHg)', 'number')}
                    {field('pulse', 'Pulse (beats/min)', 'number')}
                    {field('outcome', 'Outcome / assessment notes', 'textarea')}
                  </>
                )}

                {editing.kind === 'site' && (
                  <>
                    {field('city', 'City')}
                    {field('lead', 'Site lead')}
                    {check('training', 'Team training documented')}
                    {check('agreement', 'Site agreement documented')}
                  </>
                )}

                {editing.kind === 'ethics' && (
                  <>
                    {field('type', 'Submission type', 'text', [
                      'Initial application',
                      'Amendment',
                      'Continuing review',
                      'Safety notification',
                      'Close-out',
                    ])}
                    {field('reviewer', 'Assigned reviewer')}
                    {field('due', 'Review due', 'date')}
                    {field('reference', 'Decision / approval reference')}
                    {field('decisionDate', 'Decision date', 'date')}
                    {field('conditions', 'Review comments / conditions', 'textarea')}
                    <div className="form-note wide">
                      A saved decision does not automatically activate recruitment. Verify the
                      study’s readiness separately.
                    </div>
                  </>
                )}

                {editing.kind === 'safety' && (
                  <>
                    {field('onset', 'Event onset', 'date')}
                    {field('severity', 'Severity', 'text', ['Mild', 'Moderate', 'Severe'])}
                    {field('product', 'Suspected product')}
                    {field('batch', 'Batch number')}
                    {field('participant', 'Participant record ID (optional)')}
                    {field('due', 'Team-configured review deadline', 'date')}
                    {check('serious', 'Serious event')}
                    {field('criteria', 'Seriousness criteria')}
                    {field('outcome', 'Outcome', 'text', [
                      'Ongoing',
                      'Recovering',
                      'Recovered',
                      'Recovered with sequelae',
                      'Fatal',
                      'Unknown',
                    ])}
                    {field('review', 'Clinical review / causality assessment', 'textarea')}
                    <div className="form-note wide">
                      Reporting deadlines require expert confirmation. Saving a case does not submit
                      it to any authority.
                    </div>
                  </>
                )}

                {editing.kind === 'query' && (
                  <>
                    {field('owner', 'Assigned to')}
                    {field('due', 'Response due', 'date')}
                    {field('response', 'Response / resolution', 'textarea')}
                  </>
                )}

                {editing.kind === 'task' && (
                  <>
                    {field('owner', 'Assigned to')}
                    {field('priority', 'Priority', 'text', ['Normal', 'High'])}
                    {field('due', 'Due date', 'date')}
                    {field('rootCause', 'Root cause / finding', 'textarea')}
                    {field('action', 'Corrective / preventive action', 'textarea')}
                  </>
                )}

                {editing.kind === 'document' && (
                  <>
                    {field('type', 'Document category', 'text', [
                      'Protocol',
                      'Consent form',
                      'Ethics approval',
                      'Monitoring report',
                      'Safety report',
                      'Other',
                    ])}
                    {field('documentVersion', 'Document version')}
                    {field('due', 'Review / expiry date', 'date')}
                    <label className="field wide">
                      <span>Attachment · PDF, TXT, CSV or DOCX · up to 10 MB</span>
                      <input
                        type="file"
                        accept=".pdf,.txt,.csv,.docx"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                      {editing.fileName && <small>Current attachment: {editing.fileName}</small>}
                    </label>
                  </>
                )}

                {field('notes', 'Notes', 'textarea')}
                {editing.id && canEdit(editing.kind) && (
                  <label className="field wide">
                    <span>Reason for change *</span>
                    <input
                      required
                      maxLength={1000}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain what changed and why"
                    />
                  </label>
                )}
              </fieldset>
              {editing && !canEdit(editing.kind) && (
                <p className="form-note">Your role has read-only access to this record.</p>
              )}
              {formError && (
                <div className="form-error" role="alert">
                  {formError}
                </div>
              )}
              <div className="form-actions">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                {canEdit(editing.kind) && (
                  <Button className="primary" type="submit" disabled={saving}>
                    {saving ? <RefreshCw size={16} className="spin" /> : <Check size={16} />}{' '}
                    {saving ? 'Saving…' : 'Save record'}
                  </Button>
                )}
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
