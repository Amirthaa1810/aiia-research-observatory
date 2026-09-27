import DemoLogin, { RealLoginButton } from '@/components/demo-login';
import { roles, isRole } from '@/lib/permissions';
import { notFound } from 'next/navigation';
import { getChatGPTUser, chatGPTSignInPath } from '../../chatgpt-auth';
export const dynamic = 'force-dynamic';
export default async function RoleLogin({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!isRole(role)) notFound();
  const user = await getChatGPTUser();
  const path = '/workspace/' + role;
  return (
    <div className={'role-login role-' + role}>
      <div className="role-login-image">
        <img
          src={
            role === 'participant'
              ? '/images/portraits/woman-32.webp'
              : '/images/research-laboratory.webp'
          }
          alt={
            role === 'participant'
              ? 'Illustrative synthetic participant portrait'
              : 'Illustrative research laboratory'
          }
        />
        <a href="/">AIIA / RESEARCH OBSERVATORY</a>
        <div>
          <span>YOUR DEDICATED WORKSPACE</span>
          <h1>{roles[role].label}</h1>
          <p>{roles[role].description}</p>
        </div>
      </div>
      <main>
        <a className="back" href="/">
          ← All role logins
        </a>
        <span className="eyebrow">PERSONAL ACCOUNT · APPROVED ACCESS</span>
        <h2>{roles[role].label} login</h2>
        <p>{roles[role].description}</p>
        <div className="login-features">
          {(role === 'participant'
            ? [
                'Your photo ID card',
                'Your study and consent details',
                'Your own visits and follow-ups',
              ]
            : role === 'doctor'
              ? ['Assigned participant profiles', 'Clinical visit worklist', 'Safety follow-up']
              : role === 'head'
                ? [
                    'Portfolio performance',
                    'Recruitment across sites',
                    'Ethics and safety oversight',
                  ]
                : [
                    'Your assigned studies',
                    'Role-specific worklists',
                    'Traceable records and documents',
                  ]
          ).map((x) => (
            <div key={x}>✓ {x}</div>
          ))}
        </div>
        <DemoLogin role={role} signedIn={!!user} />
        {user ? (
          <>
            <p className="signed-in-note">Signed in as {user.email}</p>
            <RealLoginButton role={role} />
            <a
              className="signout"
              href={'/signout-with-chatgpt?return_to=' + encodeURIComponent('/login/' + role)}
              target="_top"
            >
              Use a different account
            </a>
          </>
        ) : (
          <a className="primary" href={chatGPTSignInPath(path)} target="_top">
            Sign in with your ChatGPT account →
          </a>
        )}
        <small>
          Each person uses their own account. Your administrator must approve your role. Choosing
          this page does not change your permissions.
        </small>
      </main>
    </div>
  );
}
