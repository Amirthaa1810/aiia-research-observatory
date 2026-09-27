import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { type Membership, type Role } from './permissions';
export class AccessError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function apiFailure(e: unknown) {
  return Response.json(
    {
      error:
        e instanceof AccessError ? e.message : 'Unable to complete this request. Please try again.',
    },
    { status: e instanceof AccessError ? e.status : 500, headers: { 'Cache-Control': 'no-store' } },
  );
}
export async function identity() {
  const user = await getChatGPTUser();
  if (!user) throw new AccessError('Sign in to continue.', 401);
  if (!env.DB) throw new AccessError('Workspace storage is unavailable.', 503);
  return { user, db: env.DB };
}
export function memberFromRow(row: any): Membership {
  return { ...row, studies: JSON.parse(row.studies || '[]') };
}
export async function accessContext(ignoreDemo = false) {
  const { user, db } = await identity();
  // Bootstrap is restricted to the verified hosting owner's identity; never to the first visitor.
  let workspace = await db
    .prepare('SELECT owner FROM team_workspace WHERE id=1')
    .first<{ owner: string }>();
  if (!workspace && user.email.toLowerCase() === 'naagarajan28@gmail.com') {
    await db.batch([
      db.prepare('INSERT OR IGNORE INTO team_workspace(id,owner) VALUES (1,?)').bind(user.userId),
      db
        .prepare(
          "INSERT OR IGNORE INTO team_members(userId,email,name,role,status,studies,version) SELECT ?,?,?, 'administrator','active','[]',1 WHERE EXISTS (SELECT 1 FROM team_workspace WHERE id=1 AND owner=?)",
        )
        .bind(user.userId, user.email, user.fullName || user.email, user.userId),
    ]);
    workspace = await db
      .prepare('SELECT owner FROM team_workspace WHERE id=1')
      .first<{ owner: string }>();
  }
  const row = await db
    .prepare('SELECT * FROM team_members WHERE userId=?')
    .bind(user.userId)
    .first<any>();
  if (!ignoreDemo) {
    const token = (await cookies()).get('aiia_demo')?.value;
    if (token && /^[a-f0-9-]{36}$/.test(token)) {
      const session = await db
        .prepare('SELECT data FROM settings WHERE owner=?')
        .bind('session:' + token)
        .first<{ data: string }>();
      if (session) {
        const d = JSON.parse(session.data);
        if (d.userId === user.userId && d.expires > Date.now())
          return { user, db, owner: d.owner as string, member: d.member as Membership, demo: true };
      }
    }
    if (token)
      throw new AccessError(
        'Demo session expired. Open a role login to start again or exit demo.',
        401,
      );
  }
  return {
    user,
    db,
    owner: workspace?.owner ?? null,
    member: row ? memberFromRow(row) : null,
    demo: false,
  };
}
export async function requireMember() {
  const ctx = await accessContext();
  if (!ctx.owner || ctx.member?.status !== 'active')
    throw new AccessError('An administrator must approve your workspace access.', 403);
  return { ...ctx, owner: ctx.owner, member: ctx.member };
}
export function requireRole(actual: Role, ...allowed: Role[]) {
  if (!allowed.includes(actual))
    throw new AccessError('Your role does not permit this action.', 403);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    throw new AccessError('Invalid request origin.', 403);
}
