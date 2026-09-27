import { env } from 'cloudflare:workers';
import { SESSION_COOKIE } from '@/app/chatgpt-auth';

export const dynamic = 'force-dynamic';

/**
 * Sign-out endpoint.
 *
 * Replaces the platform-provided sign-out route so the existing "Use a different
 * account" links work on a self-hosted Worker. The token is deleted server-side
 * and cleared from the browser, so the old cookie is useless if replayed.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get('return_to') || '/';
  // Only same-site relative paths, so this cannot be used as an open redirect.
  const returnTo = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';

  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  const token = match?.[1];
  if (token && /^[0-9a-f-]{36}$/i.test(token)) {
    const database = (env as unknown as { DB?: D1Database }).DB;
    if (database) {
      await database
        .prepare('DELETE FROM settings WHERE owner=?')
        .bind(`auth:${token}`)
        .run();
    }
  }

  const secure = url.protocol === 'https:';
  return new Response(null, {
    status: 303,
    headers: {
      Location: returnTo,
      'Cache-Control': 'no-store',
      'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
        secure ? '; Secure' : ''
      }`,
    },
  });
}
