'use client';
import {
  Leaf,
  ArrowRight,
  Stethoscope,
  FlaskConical,
  ShieldCheck,
  Users,
  ChartNoAxesCombined,
  ClipboardCheck,
  HeartPulse,
  Database,
  Settings,
} from 'lucide-react';
import { roles, type Role, type Membership } from '@/lib/permissions';
const icons = {
  administrator: Settings,
  head: ChartNoAxesCombined,
  researcher: FlaskConical,
  doctor: Stethoscope,
  coordinator: ClipboardCheck,
  ethics: ShieldCheck,
  safety: HeartPulse,
  data_manager: Database,
  participant: Users,
};
const teasers: Record<Role, string> = {
  administrator: 'Accounts, permissions & institution setup',
  head: 'Portfolio performance & research oversight',
  researcher: 'Study protocols, recruitment & data',
  doctor: 'Participant care, visits & safety',
  coordinator: 'Daily operations & monitoring tasks',
  ethics: 'Submissions, reviews & decisions',
  safety: 'Adverse events & pharmacovigilance',
  data_manager: 'Queries, quality checks & study data',
  participant: 'My study, visits & photo ID card',
};
export default function RoleHub({ member }: { member?: Membership | null }) {
  return (
    <div className="role-hub">
      <header className="hub-header">
        <a href="/" className="hub-brand">
          <span>
            <Leaf />
          </span>
          <b>
            AIIA<small>RESEARCH OBSERVATORY</small>
          </b>
        </a>
        {member?.status === 'active' && (
          <a className="outline" href={'/workspace/' + member.role}>
            My workspace <ArrowRight size={16} />
          </a>
        )}
      </header>
      <main>
        <div className="hub-intro">
          <div>
            <span className="eyebrow">YOUR ROLE. YOUR WORKSPACE.</span>
            <h1>
              Where Ayurveda research
              <br />
              <em>comes together.</em>
            </h1>
            <p>
              Choose your dedicated portal to sign in. Open a working demo from any role login, or
              sign in to your approved personal workspace.
            </p>
            <div className="hub-trust">
              <ShieldCheck size={17} /> Individual accounts <span>•</span> Role-based access{' '}
              <span>•</span> Audited changes
            </div>
          </div>
          <div className="hub-photo">
            <img
              src="/images/research-laboratory.webp"
              alt="Illustrative botanical research laboratory"
            />
            <span>
              <Leaf size={17} /> A connected research community
            </span>
          </div>
        </div>
        <div className="hub-section-head">
          <h2>Choose your portal</h2>
          <p>Different responsibilities. Dedicated experiences.</p>
        </div>
        <div className="role-grid">
          {Object.entries(roles).map(([key, info], i) => {
            const role = key as Role,
              Icon = icons[role];
            return (
              <article
                className={'role-card role-' + role}
                style={{ animationDelay: i * 65 + 'ms' }}
                key={role}
              >
                <div className="role-card-icon">
                  <Icon size={25} />
                </div>
                <span className="role-number">0{i + 1}</span>
                <h2>{info.label}</h2>
                <p>{teasers[role]}</p>
                <a className="role-login-link" href={'/login/' + role}>
                  {info.label} login / demo <ArrowRight size={17} />
                </a>
                {member?.role === 'administrator' &&
                  member.status === 'active' &&
                  role !== 'administrator' && (
                    <a className="role-preview-link" href={'/workspace/' + role + '?preview=1'}>
                      Preview with synthetic data
                    </a>
                  )}
              </article>
            );
          })}
        </div>
        <div className="hub-note">
          <ShieldCheck />
          <div>
            <b>Personal sign-in, controlled access.</b>
            <p>
              Sign in using your own account. Your administrator approves your role and study
              assignments. Every role login includes a working demo with separate synthetic records.
            </p>
          </div>
        </div>
      </main>
      <footer>AIIA Research Observatory · Synthetic demonstration workspace</footer>
    </div>
  );
}
