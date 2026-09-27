import { requireMember, requireRole, sameOrigin, apiFailure, AccessError } from '@/lib/access';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { db, owner, member, user } = await requireMember();
    requireRole(member.role, 'participant');
    if (Number(request.headers.get('content-length') || 0) > 12000)
      throw new AccessError('Report is too long.', 413);
    const b: any = await request.json();
    const symptoms = String(b.symptoms || '').trim(),
      onset = String(b.onset || ''),
      severity = String(b.severity || '');
    if (
      !symptoms ||
      symptoms.length > 2000 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(onset) ||
      !Number.isFinite(Date.parse(onset)) ||
      onset > new Date().toISOString().slice(0, 10) ||
      !['Mild', 'Moderate', 'Severe'].includes(severity)
    )
      throw new AccessError('Enter symptoms, a valid onset date and severity.', 400);
    const row = await db
      .prepare("SELECT data FROM records WHERE owner=? AND id=? AND kind='participant'")
      .bind(owner, member.participantId)
      .first<{ data: string }>();
    if (!row) throw new AccessError('Your participant record is not linked.', 404);
    const person = JSON.parse(row.data),
      id = crypto.randomUUID(),
      now = new Date().toISOString();
    const report = {
      id,
      kind: 'safety',
      title: symptoms.slice(0, 120),
      study: person.study,
      participant: member.participantId,
      status: 'New',
      onset,
      severity,
      product: 'Not assessed — participant report',
      serious: false,
      seriousnessAssessment: 'Pending clinical triage',
      participantReported: true,
      participantMessage: symptoms,
      notes: 'Participant submitted; clinical review required. Severity is self-reported.',
      version: 1,
      updated: now,
    };
    await db.batch([
      db
        .prepare('INSERT INTO records(owner,id,kind,data,version,updated) VALUES (?,?,?,?,1,?)')
        .bind(owner, id, 'safety', JSON.stringify(report), now),
      db
        .prepare(
          'INSERT INTO audit(id,owner,actor,action,record,after,time) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          owner,
          user.email,
          'Participant submitted symptom report',
          id,
          JSON.stringify(report),
          now,
        ),
    ]);
    return Response.json({ ok: true, id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return apiFailure(e);
  }
}
