import { env } from 'cloudflare:workers';
import { requireMember, AccessError, apiFailure, sameOrigin } from '@/lib/access';
import { visibleRecords, canWrite, inScope } from '@/lib/permissions';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    const { db, owner, member } = await requireMember();
    if (!env.BUCKET) throw new AccessError('Photo storage unavailable.', 503);
    const id = new URL(req.url).searchParams.get('id');
    const row = await db
      .prepare("SELECT id,kind,data FROM records WHERE owner=? AND id=? AND kind='participant'")
      .bind(owner, id)
      .first<any>();
    if (!row) throw new AccessError('Photo not found.', 404);
    const data = { ...JSON.parse(row.data), id: row.id, kind: row.kind };
    if (!visibleRecords(member, [data]).length) throw new AccessError('Photo not found.', 404);
    if (!data.photoKey) throw new AccessError('Photo not found.', 404);
    const object = await env.BUCKET.get(data.photoKey);
    if (!object) throw new AccessError('Photo not found.', 404);
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
      },
    });
  } catch (e) {
    return apiFailure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const { db, owner, user, member } = await requireMember();
    if (!canWrite(member.role, 'participant'))
      throw new AccessError('Your role cannot change participant photos.', 403);
    if (!env.BUCKET) throw new AccessError('Photo storage unavailable.', 503);
    const form = await req.formData();
    const id = String(form.get('id') || '');
    const file = form.get('photo');
    if (!(file instanceof File) || file.size === 0 || file.size > 3 * 1024 * 1024)
      throw new AccessError('Choose a JPG, PNG or WebP image up to 3 MB.', 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type =
      bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        ? 'image/jpeg'
        : bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
          ? 'image/png'
          : new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
              new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
            ? 'image/webp'
            : null;
    if (!type) throw new AccessError('The file is not a supported image.', 400);
    const row = await db
      .prepare("SELECT data,version FROM records WHERE owner=? AND id=? AND kind='participant'")
      .bind(owner, id)
      .first<any>();
    if (!row) throw new AccessError('Participant not found.', 404);
    const old = { ...JSON.parse(row.data), id, kind: 'participant' };
    if (!inScope(member, old))
      throw new AccessError('Participant is outside your assigned studies.', 403);
    const key = `${owner}/photos/${id}/${crypto.randomUUID()}`;
    await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: type } });
    const now = new Date().toISOString();
    const next = { ...old, photoKey: key, photoVersion: crypto.randomUUID() };
    const results = await db.batch([
      db
        .prepare(
          'INSERT INTO audit(id,owner,actor,action,record,time) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE owner=? AND id=? AND version=?)',
        )
        .bind(
          crypto.randomUUID(),
          owner,
          user.email,
          'Updated participant photo',
          id,
          now,
          owner,
          id,
          row.version,
        ),
      db
        .prepare(
          'UPDATE records SET data=?,version=version+1,updated=? WHERE owner=? AND id=? AND version=?',
        )
        .bind(JSON.stringify(next), now, owner, id, row.version),
    ]);
    if (!results[1].meta.changes) {
      await env.BUCKET.delete(key);
      throw new AccessError('The participant changed. Refresh and try again.', 409);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return apiFailure(e);
  }
}
