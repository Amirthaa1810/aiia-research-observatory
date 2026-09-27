import { env } from 'cloudflare:workers';
import { requireMember, AccessError, requireRole } from '@/lib/access';
import { visibleRecords, canWrite, inScope, allowedSections } from '@/lib/permissions';
import { withDemoProfile } from '@/lib/participant-profile';
import { demoRecords } from '@/lib/seed';
import { validateRecord, statusOptions, type RecordData } from '@/lib/domain';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const context = requireMember;
function failure(e: unknown) {
  const msg = e instanceof Error ? e.message : 'Unable to complete request';
  return json({ error: msg }, e instanceof AccessError ? e.status : 400);
}
async function records(db: D1Database, owner: string) {
  const result = await db
    .prepare('SELECT id,kind,data,version,updated FROM records WHERE owner=? ORDER BY updated DESC')
    .bind(owner)
    .all<any>();
  return result.results.map((r) => ({
    ...JSON.parse(r.data),
    id: r.id,
    kind: r.kind,
    version: r.version,
    updated: r.updated,
  })) as RecordData[];
}
export async function GET() {
  try {
    const { user, db, owner, member } = await context();
    const [items, logs, settings] = await Promise.all([
      records(db, owner),
      member.role === 'administrator'
        ? db
            .prepare(
              'SELECT id,actor,action,record,before,after,time FROM audit WHERE owner=? ORDER BY time DESC LIMIT 300',
            )
            .bind(owner)
            .all()
        : Promise.resolve({ results: [] }),
      db.prepare('SELECT data FROM settings WHERE owner=?').bind(owner).first<any>(),
    ]);
    return json({
      records: visibleRecords(member, items.map(withDemoProfile)).map(({ photoKey, ...r }) => r),
      audit: logs.results,
      settings: settings ? JSON.parse(settings.data) : null,
      user: { name: member.name, email: user.email, role: member.role },
      membership: member,
      sections: allowedSections(member.role),
      updated: new Date().toISOString(),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { user, db, owner, member } = await context();
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin)
      return json({ error: 'Invalid origin' }, 403);
    if (Number(request.headers.get('content-length') ?? 0) > 100000)
      return json({ error: 'Request too large' }, 413);
    const body: any = await request.json();
    const now = new Date().toISOString();
    if (body.action === 'initialize') {
      requireRole(member.role, 'administrator');
      const present = await db
        .prepare('SELECT owner FROM settings WHERE owner=?')
        .bind(owner)
        .first();
      if (present) return json({ ok: true });
      const seeds = demoRecords();
      const statements = seeds.map((r) =>
        db
          .prepare(
            'INSERT OR IGNORE INTO records(owner,id,kind,data,version,updated) VALUES (?,?,?,?,1,?)',
          )
          .bind(owner, r.id, r.kind, JSON.stringify(r), now),
      );
      // Bounded batches; stable identifiers make interrupted initialization safe to retry.
      for (let i = 0; i < statements.length; i += 60) await db.batch(statements.slice(i, i + 60));
      await db.batch([
        db
          .prepare('INSERT OR IGNORE INTO settings(owner,data) VALUES (?,?)')
          .bind(
            owner,
            JSON.stringify({
              institution: 'AIIA Research Workspace',
              language: 'English',
              alertDays: 7,
              initialized: true,
              demoVersion: 2,
            }),
          ),
        db
          .prepare(
            'INSERT OR IGNORE INTO audit(id,owner,actor,action,record,time) VALUES (?,?,?,?,?,?)',
          )
          .bind(
            `init-${owner}`,
            owner,
            user.email,
            'Initialized synthetic workspace',
            'Workspace',
            now,
          ),
      ]);
      return json({ ok: true });
    }
    if (body.action === 'expandDemo') {
      requireRole(member.role, 'administrator');
      const items = demoRecords().filter((r) => r.id.startsWith('extended-'));
      for (let i = 0; i < items.length; i += 50)
        await db.batch(
          items
            .slice(i, i + 50)
            .map((r) =>
              db
                .prepare(
                  'INSERT OR IGNORE INTO records(owner,id,kind,data,version,updated) VALUES (?,?,?,?,1,?)',
                )
                .bind(owner, r.id, r.kind, JSON.stringify(r), now),
            ),
        );
      await db.batch([
        db
          .prepare("UPDATE settings SET data=json_set(data,'$.demoVersion',2) WHERE owner=?")
          .bind(owner),
        db
          .prepare(
            'INSERT OR IGNORE INTO audit(id,owner,actor,action,record,time) VALUES (?,?,?,?,?,?)',
          )
          .bind(
            'demo-expansion-v2-' + owner,
            owner,
            user.email,
            'Added extended synthetic study records',
            'Workspace',
            now,
          ),
      ]);
      return json({ ok: true });
    }
    if (body.action === 'settings') {
      requireRole(member.role, 'administrator');
      const data = {
        institution: String(body.data?.institution ?? '')
          .trim()
          .slice(0, 100),
        language: 'English',
        alertDays: Math.max(1, Math.min(60, Number(body.data?.alertDays) || 7)),
        initialized: true,
        demoVersion: 2,
      };
      if (!data.institution) throw Error('Institution name is required.');
      await db.batch([
        db.prepare('UPDATE settings SET data=? WHERE owner=?').bind(JSON.stringify(data), owner),
        db
          .prepare(
            'INSERT INTO audit(id,owner,actor,action,record,after,time) VALUES (?,?,?,?,?,?,?)',
          )
          .bind(
            crypto.randomUUID(),
            owner,
            user.email,
            'Updated settings',
            'Workspace',
            JSON.stringify(data),
            now,
          ),
      ]);
      return json({ ok: true });
    }
    if (body.action === 'export') {
      if (member.role === 'participant')
        throw new AccessError('Exports are not available in the participant portal.', 403);
      if (body.section === 'Audit trail') requireRole(member.role, 'administrator');
      if (!['csv', 'fhir', 'mapping'].includes(body.format))
        throw Error('Unsupported export format');
      await db
        .prepare('INSERT INTO audit(id,owner,actor,action,record,time) VALUES (?,?,?,?,?,?)')
        .bind(
          crypto.randomUUID(),
          owner,
          user.email,
          'Exported ' + body.format,
          String(body.section ?? 'Workspace').slice(0, 100),
          now,
        )
        .run();
      return json({ ok: true });
    }
    if (body.action !== 'save') throw Error('Unknown action');
    const r = body.record as RecordData;
    if (!r || !statusOptions[r.kind]) throw Error('Unknown record type');
    if (!canWrite(member.role, r.kind))
      throw new AccessError('Your role cannot edit this type of record.', 403);
    if (JSON.stringify(r).length > 30000) throw Error('Record is too large.');
    const all = await records(db, owner);
    const old = all.find((x) => x.id === r.id);
    if (!inScope(member, r) || (old && !inScope(member, old)))
      throw new AccessError('This record is outside your assigned studies.', 403);
    if (old && old.study !== r.study)
      throw new AccessError('A record cannot be moved to another study.', 400);
    if (
      r.kind === 'study' &&
      member.role !== 'administrator' &&
      ['ethics', 'ctri', 'ctriId', 'siteReady'].some((k) => r[k] !== old?.[k])
    )
      throw new AccessError(
        'An administrator must verify study activation and registration fields.',
        403,
      );
    if (old && old.kind !== r.kind) throw Error('Record type cannot be changed.');
    if (old && old.version !== r.version)
      return json(
        { error: 'This record changed in another session. Refresh before editing.' },
        409,
      );
    if (old && !String(body.reason ?? '').trim()) throw Error('Provide a reason for this change.');
    const id = old?.id ?? crypto.randomUUID();
    const data: RecordData = { ...r, id, version: (old?.version ?? 0) + 1, updated: now };
    if (r.kind === 'participant') {
      data.photoKey = old?.photoKey;
      data.photoVersion = old?.photoVersion;
      delete data.portrait;
      delete data.syntheticProfile;
    }
    if (r.kind === 'document') {
      data.fileKey = old?.fileKey;
      data.fileName = old?.fileName;
      data.size = old?.size;
    }
    validateRecord(data, all, old);
    const auditId = crypto.randomUUID();
    const reason = String(body.reason ?? 'Created record').slice(0, 1000);
    // Audit and update use the same optimistic version guard and execute atomically.
    const audit = old
      ? db
          .prepare(
            'INSERT INTO audit(id,owner,actor,action,record,before,after,time) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM records WHERE owner=? AND id=? AND version=?)',
          )
          .bind(
            auditId,
            owner,
            user.email,
            reason,
            id,
            JSON.stringify(old),
            JSON.stringify(data),
            now,
            owner,
            id,
            old.version,
          )
      : db
          .prepare(
            'INSERT INTO audit(id,owner,actor,action,record,after,time) VALUES (?,?,?,?,?,?,?)',
          )
          .bind(auditId, owner, user.email, 'Created ' + r.kind, id, JSON.stringify(data), now);
    const change = old
      ? db
          .prepare(
            'UPDATE records SET data=?,version=version+1,updated=? WHERE owner=? AND id=? AND version=?',
          )
          .bind(JSON.stringify(data), now, owner, id, old.version)
      : db
          .prepare('INSERT INTO records(owner,id,kind,data,version,updated) VALUES (?,?,?,?,1,?)')
          .bind(owner, id, r.kind, JSON.stringify(data), now);
    const result = await db.batch([audit, change]);
    if (!result[1].meta.changes)
      return json({ error: 'Record changed. Refresh and try again.' }, 409);
    return json({ ok: true, id });
  } catch (e) {
    return failure(e);
  }
}
