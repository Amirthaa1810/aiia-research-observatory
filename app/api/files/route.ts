import { env } from 'cloudflare:workers';
import { requireMember, apiFailure, AccessError } from '@/lib/access';
import { canWrite, inScope, roles } from '@/lib/permissions';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    const { user, owner, member } = await requireMember();
    if (!canWrite(member.role, 'document'))
      throw new AccessError('Your role cannot upload documents.', 403);
    if (!env.DB || !env.BUCKET)
      return Response.json({ error: 'Document storage unavailable' }, { status: 503 });
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin)
      return new Response('Invalid origin', { status: 403 });
    const form = await req.formData();
    const file = form.get('file');
    const id = String(form.get('id') ?? '');
    if (!(file instanceof File) || file.size > 10 * 1024 * 1024 || file.size === 0)
      throw Error('Choose a non-empty file up to 10 MB.');
    if (!/\.(pdf|txt|csv|docx)$/i.test(file.name))
      throw Error('Supported formats: PDF, TXT, CSV and DOCX.');
    const row = await env.DB.prepare(
      'SELECT data,version FROM records WHERE owner=? AND id=? AND kind=?',
    )
      .bind(owner, id, 'document')
      .first<any>();
    if (!row) throw Error('Document not found.');
    const old = JSON.parse(row.data);
    if (!inScope(member, { ...old, id, kind: 'document' }))
      throw new AccessError('Document is outside your assigned studies.', 403);
    const key = `${owner}/${id}/${crypto.randomUUID()}`;
    await env.BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: 'application/octet-stream' },
    });
    const now = new Date().toISOString();
    const next = { ...old, fileKey: key, fileName: file.name, size: file.size };
    const result = await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO audit(id,owner,actor,action,record,before,after,time) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE owner=? AND id=? AND version=?)',
      ).bind(
        crypto.randomUUID(),
        owner,
        user.email,
        'Uploaded document version',
        id,
        JSON.stringify(old),
        JSON.stringify(next),
        now,
        owner,
        id,
        row.version,
      ),
      env.DB.prepare(
        'UPDATE records SET data=?,version=version+1,updated=? WHERE owner=? AND id=? AND version=?',
      ).bind(JSON.stringify(next), now, owner, id, row.version),
    ]);
    if (!result[1].meta.changes) {
      await env.BUCKET.delete(key);
      throw Error('Document changed during upload. Please retry.');
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Upload failed' },
      { status: e instanceof AccessError ? e.status : 400 },
    );
  }
}
export async function GET(req: Request) {
  try {
    const { user, owner, member } = await requireMember();
    if (!(roles[member.role].read as readonly string[]).includes('document'))
      throw new AccessError('Your role cannot download documents.', 403);
    if (!env.DB || !env.BUCKET) return new Response('Storage unavailable', { status: 503 });
    const id = new URL(req.url).searchParams.get('id');
    const row = await env.DB.prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?')
      .bind(owner, id, 'document')
      .first<any>();
    if (!row) return new Response('Not found', { status: 404 });
    const data = JSON.parse(row.data);
    if (!inScope(member, { ...data, id, kind: 'document' }))
      throw new AccessError('Document is outside your assigned studies.', 403);
    if (!data.fileKey) return new Response('No attachment', { status: 404 });
    const object = await env.BUCKET.get(data.fileKey);
    if (!object) return new Response('File not found', { status: 404 });
    await env.DB.prepare(
      'INSERT INTO audit(id,owner,actor,action,record,time) VALUES (?,?,?,?,?,?)',
    )
      .bind(
        crypto.randomUUID(),
        owner,
        user.email,
        'Downloaded document',
        id,
        new Date().toISOString(),
      )
      .run();
    return new Response(object.body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(data.fileName)}`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return apiFailure(e);
  }
}
