'use client';
import { useState } from 'react';
import {
  UserRound,
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  Printer,
  Upload,
  Leaf,
} from 'lucide-react';
import { photoSource } from '@/lib/participant-profile';
import type { RecordData } from '@/lib/domain';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
export function Portrait({ person }: { person: RecordData }) {
  const src = photoSource(person);
  return src ? (
    <img
      className="participant-photo"
      src={src}
      alt={
        person.syntheticProfile
          ? 'Synthetic demo portrait for ' + person.title
          : 'Participant profile photo'
      }
      loading="lazy"
      width="160"
      height="160"
    />
  ) : (
    <span className="participant-photo photo-placeholder">
      <UserRound size={35} />
    </span>
  );
}
export function ParticipantIdCard({ person, study }: { person: RecordData; study?: RecordData }) {
  return (
    <article className="participant-id-card">
      <div className="id-card-top">
        <Leaf size={27} />
        <div>
          AIIA RESEARCH<small>DEMONSTRATION PARTICIPANT CARD</small>
        </div>
        <span>DEMO</span>
      </div>
      <div className="id-card-main">
        <Portrait person={person} />
        <div>
          <small>PARTICIPANT</small>
          <h2>{person.displayName || person.title}</h2>
          <strong>{person.title}</strong>
          <p>{study?.code || person.study}</p>
          <span className="badge green">{person.status}</span>
        </div>
      </div>
      <div className="id-card-details">
        <div>
          <small>RESEARCH SITE</small>
          <b>{person.site || 'Not recorded'}</b>
        </div>
        <div>
          <small>CONSENT VERSION</small>
          <b>{person.consentVersion || 'Not recorded'}</b>
        </div>
      </div>
      <footer>Synthetic demonstration • Not valid as proof of identity</footer>
    </article>
  );
}
export function ParticipantDirectory({
  people,
  records,
  onEdit,
  onRefresh,
  canEdit,
  preview = false,
}: {
  people: RecordData[];
  records: RecordData[];
  onEdit: (p: RecordData) => void;
  onRefresh: () => void;
  canEdit: boolean;
  preview?: boolean;
}) {
  const [page, setPage] = useState(0),
    [selected, setSelected] = useState<string | null>(null),
    [error, setError] = useState(''),
    [uploading, setUploading] = useState(false);
  const person = records.find((r) => r.id === selected);
  const offset = Math.min(page, Math.max(0, Math.ceil(people.length / 12) - 1)) * 12;
  return (
    <>
      <div className="directory-heading">
        <span>{people.length} participant records</span>
        <small>Demo portraits are illustrative and reused across synthetic profiles.</small>
      </div>
      <div className="participant-grid">
        {people.slice(offset, offset + 12).map((p) => {
          const study = records.find((r) => r.id === p.study);
          const next = records
            .filter((r) => r.kind === 'visit' && r.participant === p.id && r.status === 'Scheduled')
            .sort((a, b) => (a.due || '').localeCompare(b.due || ''))[0];
          return (
            <button
              className="person-card"
              key={p.id}
              onClick={() => {
                setSelected(p.id);
                setError('');
              }}
            >
              <div className="person-card-top">
                <Portrait person={p} />
                <span className={'badge ' + (p.status === 'Enrolled' ? 'green' : 'blue')}>
                  {p.status}
                </span>
              </div>
              <h3>{p.displayName || p.title}</h3>
              <span className="person-id">{p.title}</span>
              <div className="person-card-meta">
                <span>
                  {p.age || '—'} years / {p.sex || 'Not recorded'}
                </span>
                <span>{p.site || 'Site not recorded'}</span>
              </div>
              <div className="person-study">
                <Leaf size={15} />
                {study?.code || 'Study not recorded'}
              </div>
              <div className="person-visit">
                <CalendarDays size={15} />
                {next ? 'Next visit: ' + next.due : 'No scheduled visit'}
              </div>
              <footer>
                View profile & ID card <ArrowRight size={16} />
              </footer>
            </button>
          );
        })}
      </div>
      {!people.length && <div className="empty">No matching participants.</div>}
      <div className="directory-pagination">
        <button
          className="outline"
          disabled={offset === 0}
          onClick={() => setPage(Math.max(0, page - 1))}
        >
          Previous
        </button>
        <span>
          {people.length ? offset + 1 : 0}–{Math.min(offset + 12, people.length)} of {people.length}
        </span>
        <button
          className="outline"
          disabled={offset + 12 >= people.length}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
      <Dialog
        open={!!person}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="record-dialog participant-profile-dialog">
          <DialogTitle>Participant profile</DialogTitle>
          <DialogDescription>
            {person?.syntheticProfile
              ? 'Synthetic profile and illustrative portrait'
              : 'Research participant record'}
          </DialogDescription>
          {person && (
            <>
              <ParticipantIdCard
                person={person}
                study={records.find((r) => r.id === person.study)}
              />
              <div className="profile-actions">
                <button className="outline" onClick={() => window.print()}>
                  <Printer size={16} /> Print demo ID card
                </button>
                {canEdit && !preview && (
                  <>
                    <button
                      className="primary"
                      onClick={() => {
                        onEdit(person);
                        setSelected(null);
                      }}
                    >
                      Edit participant
                    </button>
                    <label className="outline photo-upload">
                      <Upload size={16} />
                      {uploading ? 'Uploading…' : 'Upload photo'}
                      <input
                        aria-label="Upload participant photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploading(true);
                          setError('');
                          try {
                            const form = new FormData();
                            form.append('id', person.id);
                            form.append('photo', file);
                            const r = await fetch('/api/photos', { method: 'POST', body: form });
                            const d: any = await r.json();
                            if (!r.ok) throw Error(d.error);
                            onRefresh();
                          } catch (e) {
                            setError((e as Error).message);
                          } finally {
                            setUploading(false);
                          }
                        }}
                      />
                    </label>
                  </>
                )}
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="profile-facts">
                {[
                  ['Age', person.age ? person.age + ' years' : 'Not recorded'],
                  ['Sex', person.sex],
                  ['Language', person.language],
                  ['Height', person.heightCm ? person.heightCm + ' cm' : 'Not recorded'],
                  ['Weight', person.weightKg ? person.weightKg + ' kg' : 'Not recorded'],
                  ['Prakriti assessment', person.prakriti],
                  ['Allergies', person.allergies],
                  ['Consent date', person.consentDate],
                  ['Enrolment date', person.enrolledDate],
                ].map(([k, v]) => (
                  <div key={k}>
                    <small>{k}</small>
                    <b>{v || 'Not recorded'}</b>
                  </div>
                ))}
              </div>
              <h3 className="profile-section-title">Visit timeline</h3>
              <div className="profile-timeline">
                {records
                  .filter((r) => r.kind === 'visit' && r.participant === person.id)
                  .sort((a, b) => (a.due || '').localeCompare(b.due || ''))
                  .map((v) => (
                    <article key={v.id}>
                      <span className="timeline-dot" />
                      <div>
                        <b>{v.title}</b>
                        <p>
                          {v.due} / {v.assessment}
                        </p>
                        {v.systolic && (
                          <small>
                            BP {v.systolic}/{v.diastolic} mmHg · Pulse {v.pulse} bpm
                          </small>
                        )}
                      </div>
                      <span className="badge blue">{v.status}</span>
                    </article>
                  ))}
              </div>
              <p className="table-note">
                <ShieldCheck size={14} /> Uploaded photos are restricted to authorized accounts.
                This deployment is for synthetic demonstration data.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
