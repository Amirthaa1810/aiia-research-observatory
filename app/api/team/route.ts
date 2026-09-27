import {
  accessContext,
  requireMember,
  requireRole,
  sameOrigin,
  apiFailure,
  AccessError,
  memberFromRow,
} from '@/lib/access';
import { isRole } from '@/lib/permissions';
export const dynamic = 'force-dynamic';
const json = (data: unknown) => Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
  try {
    const ctx = await accessContext();
    const { user, member, db, owner } = ctx;
    const members =
      !ctx.demo && member?.status === 'active' && member.role === 'administrator'
        ? (await db.prepare('SELECT * FROM team_members ORDER BY status,name').all()).results.map(
            memberFromRow,
          )
        : [];
    return json({
      user: { name: user.fullName || user.email, email: user.email },
      member,
      members,
      demo: ctx.demo,
      ownerId: member?.role === 'administrator' ? owner : undefined,
    });
  } catch (e) {
    return apiFailure(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body: any = await request.json();
    const ctx = await accessContext();
    const { user, db, owner, member } = ctx;
    if (ctx.demo)
      throw new AccessError(
        'Account administration is unavailable in practice sessions. Exit the demo first.',
        403,
      );
    if (body.action === 'request') {
      if (member) return json({ ok: true });
      if (!owner)
        throw new AccessError('The workspace owner needs to sign in and finish setup first.', 409);
      if (!isRole(body.role) || body.role === 'administrator')
        throw new AccessError('Choose your team role.', 400);
      const name = String(body.name ?? user.fullName ?? '')
        .trim()
        .slice(0, 100);
      if (!name) throw new AccessError('Enter your name.', 400);
      await db.batch([
        db
          .prepare(
            "INSERT OR IGNORE INTO team_members(userId,email,name,role,status,studies,version) VALUES (?,?,?,?,'pending','[]',1)",
          )
          .bind(user.userId, user.email, name, body.role),
        db
          .prepare('INSERT INTO audit(id,owner,actor,action,record,time) VALUES (?,?,?,?,?,?)')
          .bind(
            crypto.randomUUID(),
            owner,
            user.email,
            'Requested workspace access',
            user.userId,
            new Date().toISOString(),
          ),
      ]);
      return json({ ok: true });
    }
    const active = await requireMember();
    requireRole(active.member.role, 'administrator');
    if (body.action !== 'update') throw new AccessError('Unknown team action.', 400);
    if (body.userId === owner || body.userId === user.userId)
      throw new AccessError('You cannot change the workspace owner or your own account.', 403);
    if (!isRole(body.role) || !['active', 'disabled'].includes(body.status))
      throw new AccessError('Choose a valid role and account status.', 400);
    const old = await db
      .prepare('SELECT * FROM team_members WHERE userId=?')
      .bind(String(body.userId))
      .first<any>();
    if (!old) throw new AccessError('Account not found.', 404);
    if (old.version !== body.version)
      throw new AccessError('This account changed. Refresh and try again.', 409);
    const reason = String(body.reason ?? '')
      .trim()
      .slice(0, 1000);
    if (!reason) throw new AccessError('Enter a reason for the access change.', 400);
    const studies = [
      ...new Set(
        Array.isArray(body.studies)
          ? body.studies.filter((s: unknown) => typeof s === 'string')
          : [],
      ),
    ];
    const all = (
      await db.prepare('SELECT id,kind,data FROM records WHERE owner=?').bind(owner).all<any>()
    ).results;
    if (studies.some((id) => !all.some((r) => r.kind === 'study' && r.id === id)))
      throw new AccessError('Choose valid study assignments.', 400);
    let participantId: string | null = null;
    if (body.role === 'participant' && body.status === 'active') {
      const p = all.find((r) => r.id === body.participantId && r.kind === 'participant');
      if (!p)
        throw new AccessError('Link this account to its participant record before approval.', 400);
      participantId = p.id;
      if (
        await db
          .prepare('SELECT userId FROM team_members WHERE participantId=? AND userId<>?')
          .bind(participantId, body.userId)
          .first()
      )
        throw new AccessError('This participant record is already linked to another account.', 409);
    }
    if (
      body.status === 'active' &&
      !['administrator', 'head', 'participant'].includes(body.role) &&
      studies.length === 0
    )
      throw new AccessError('Assign at least one study before approving staff access.', 400);
    const next = {
      role: body.role,
      status: body.status,
      studies: ['administrator', 'head', 'participant'].includes(body.role) ? [] : studies,
      participantId,
    };
    const now = new Date().toISOString();
    const result = await db.batch([
      db
        .prepare(
          'INSERT INTO audit(id,owner,actor,action,record,before,after,time) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM team_members WHERE userId=? AND version=?)',
        )
        .bind(
          crypto.randomUUID(),
          owner,
          user.email,
          'Team access: ' + reason,
          body.userId,
          JSON.stringify(memberFromRow(old)),
          JSON.stringify(next),
          now,
          body.userId,
          old.version,
        ),
      db
        .prepare(
          'UPDATE team_members SET role=?,status=?,studies=?,participantId=?,version=version+1 WHERE userId=? AND version=?',
        )
        .bind(
          next.role,
          next.status,
          JSON.stringify(next.studies),
          participantId,
          body.userId,
          old.version,
        ),
    ]);
    if (!result[1].meta.changes)
      throw new AccessError('Account changed. Refresh and try again.', 409);
    return json({ ok: true });
  } catch (e) {
    return apiFailure(e);
  }
}
