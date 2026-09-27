import { identity, sameOrigin, apiFailure, AccessError } from '@/lib/access';
import { isRole, roles, type Membership } from '@/lib/permissions';
import { demoRecords } from '@/lib/seed';
import { withDemoProfile } from '@/lib/participant-profile';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { user, db } = await identity();
    const body: any = await request.json();
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
    if (body.action === 'exit')
      return Response.json(
        { ok: true },
        {
          headers: {
            'Set-Cookie': 'aiia_demo=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' + secure,
            'Cache-Control': 'no-store',
          },
        },
      );
    if (!isRole(body.role)) throw new AccessError('Choose a valid role.', 400);
    const role = body.role as keyof typeof roles,
      owner = 'sandbox:' + user.userId,
      now = new Date().toISOString();
    const ready = await db.prepare('SELECT owner FROM settings WHERE owner=?').bind(owner).first();
    if (!ready) {
      const seed = demoRecords().map(withDemoProfile);
      const person = seed.find((r) => r.id === 's1-p2')!;
      Object.assign(person, {
        medicalHistory: 'Seasonal allergic rhinitis; no previous surgery reported.',
        medications:
          'Study product as recorded by the research team; no other medication reported.',
        allergies: 'Dust allergy reported',
        heightCm: 164,
        weightKg: 61,
      });
      seed.push({
        id: 'sandbox-missed',
        kind: 'visit',
        title: 'Week 2 follow-up',
        study: 's1',
        participant: 's1-p2',
        status: 'Missed',
        due: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
        assessment: 'Attendance not recorded; coordinator to arrange follow-up.',
        version: 1,
        updated: now,
      });
      seed.push({
        id: 'sandbox-symptom',
        kind: 'safety',
        title: 'Mild nausea after evening dose',
        study: 's1',
        participant: 's1-p2',
        status: 'Under review',
        onset: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
        severity: 'Mild',
        product: 'Study product',
        serious: false,
        participantReported: true,
        participantMessage: 'I felt nauseous for about 20 minutes.',
        version: 1,
        updated: now,
      });
      for (let i = 0; i < seed.length; i += 50)
        await db.batch(
          seed
            .slice(i, i + 50)
            .map((r) =>
              db
                .prepare(
                  'INSERT OR IGNORE INTO records(owner,id,kind,data,version,updated) VALUES (?,?,?,?,1,?)',
                )
                .bind(owner, r.id, r.kind, JSON.stringify(r), now),
            ),
        );
      await db
        .prepare('INSERT OR IGNORE INTO settings(owner,data) VALUES (?,?)')
        .bind(
          owner,
          JSON.stringify({
            institution: 'AIIA practice workspace',
            initialized: true,
            demoVersion: 2,
            alertDays: 7,
          }),
        )
        .run();
    }
    const member: Membership = {
      userId: user.userId,
      name: role === 'participant' ? 'Kavya Sharma' : 'Demo ' + roles[role].label,
      email: user.email,
      role,
      status: 'active',
      studies: ['s1', 's2', 's3', 's6'],
      participantId: role === 'participant' ? 's1-p2' : null,
      version: 1,
    };
    const token = crypto.randomUUID();
    await db
      .prepare('INSERT INTO settings(owner,data) VALUES (?,?)')
      .bind(
        'session:' + token,
        JSON.stringify({
          userId: user.userId,
          owner,
          member,
          expires: Date.now() + 8 * 60 * 60 * 1000,
        }),
      )
      .run();
    return Response.json(
      { ok: true, path: '/workspace/' + role },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Set-Cookie': `aiia_demo=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secure}`,
        },
      },
    );
  } catch (e) {
    return apiFailure(e);
  }
}
