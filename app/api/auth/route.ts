import { env } from 'cloudflare:workers';
import { AccessError, apiFailure, sameOrigin } from '@/lib/access';
import { hashPassword, passwordProblem, verifyPassword } from '@/lib/password';
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/app/chatgpt-auth';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ATTEMPT_PREFIX = 'login-attempts:';
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const MAX_BODY_BYTES = 4096;

type AccountRow = {
  userId: string;
  email: string;
  name: string;
  salt: string;
  passwordHash: string;
  iterations: number;
  disabled: number;
};

function db() {
  const binding = (env as unknown as { DB?: D1Database }).DB;
  if (!binding) throw new AccessError('Workspace storage is unavailable.', 503);
  return binding;
}

function cookieHeader(token: string, secure: boolean) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
    SESSION_TTL_SECONDS
  }${secure ? '; Secure' : ''}`;
}

function clearedCookie(secure: boolean) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
    secure ? '; Secure' : ''
  }`;
}

/**
 * Counts failed attempts per account so a stolen password cannot be ground down
 * quickly. Successful sign-in clears the counter.
 */
async function throttleKey(email: string): Promise<string> {
  return `${ATTEMPT_PREFIX}${email}:${Math.floor(Date.now() / ATTEMPT_WINDOW_MS)}`;
}

async function attemptsFor(key: string): Promise<number> {
  const row = await db()
    .prepare('SELECT data FROM settings WHERE owner=?')
    .bind(key)
    .first<{ data: string }>();
  try {
    const parsed = JSON.parse(row?.data ?? '{}');
    return Number(parsed.count) || 0;
  } catch {
    return 0;
  }
}

async function recordFailure(key: string) {
  const database = db();
  await database
    .prepare(
      "INSERT INTO settings(owner,data) VALUES (?, '{\"count\":1}') ON CONFLICT(owner) DO UPDATE SET data=json_set(settings.data,'$.count',json_extract(settings.data,'$.count')+1)",
    )
    .bind(key)
    .run();
}

async function clearFailures(key: string) {
  await db()
    .prepare('DELETE FROM settings WHERE owner=?')
    .bind(key)
    .run();
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
      throw new AccessError('Request is too large.', 413);
    }

    const body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
      name?: unknown;
    };
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(body.password ?? '');
    const name = String(body.name ?? '').trim();

    if (!EMAIL_RE.test(email) || email.length > 254) {
      throw new AccessError('Enter a valid email address.', 400);
    }
    if (!password) throw new AccessError('Enter your password.', 400);

    const throttle = await throttleKey(email);
    if ((await attemptsFor(throttle)) >= MAX_ATTEMPTS) {
      throw new AccessError('Too many attempts. Try again in ten minutes.', 429);
    }

    const database = db();
    const existing = await database
      .prepare('SELECT * FROM auth_accounts WHERE email=?')
      .bind(email)
      .first<AccountRow>();

    let account: AccountRow;

    if (existing) {
      const ok = await verifyPassword(password, {
        salt: existing.salt,
        passwordHash: existing.passwordHash,
        iterations: existing.iterations,
      });
      // One generic message for both branches so the response cannot be used to
      // discover which addresses have accounts.
      if (!ok) {
        await recordFailure(throttle);
        throw new AccessError('Email or password is incorrect.', 401);
      }
      if (existing.disabled) {
        throw new AccessError('This account has been disabled.', 403);
      }
      account = existing;
    } else {
      const problem = passwordProblem(password);
      if (problem) throw new AccessError(problem, 400);
      const record = await hashPassword(password);
      account = {
        userId: crypto.randomUUID(),
        email,
        name: name.slice(0, 120) || email.split('@')[0],
        salt: record.salt,
        passwordHash: record.passwordHash,
        iterations: record.iterations,
        disabled: 0,
      };
      await database
        .prepare(
          `INSERT INTO auth_accounts(userId,email,name,salt,passwordHash,iterations,createdAt,disabled)
           VALUES (?,?,?,?,?,?,?,0)`,
        )
        .bind(
          account.userId,
          account.email,
          account.name,
          account.salt,
          account.passwordHash,
          account.iterations,
          new Date().toISOString(),
        )
        .run();
    }

    const token = crypto.randomUUID();
    const secure = new URL(request.url).protocol === 'https:';
    await database
      .prepare('INSERT OR REPLACE INTO settings(owner,data) VALUES (?,?)')
      .bind(
        `auth:${token}`,
        JSON.stringify({
          userId: account.userId,
          email: account.email,
          fullName: account.name,
          expires: Date.now() + SESSION_TTL_SECONDS * 1000,
        }),
      )
      .run();
    await clearFailures(throttle);

    return Response.json(
      { ok: true, email: account.email, name: account.name, created: !existing },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Set-Cookie': cookieHeader(token, secure),
        },
      },
    );
  } catch (e) {
    return apiFailure(e);
  }
}

export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const raw = request.headers.get('cookie') ?? '';
    const match = raw.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
    const token = match?.[1];
    if (token && /^[0-9a-f-]{36}$/i.test(token)) {
      await db()
        .prepare('DELETE FROM settings WHERE owner=?')
        .bind(`auth:${token}`)
        .run();
    }
    const secure = new URL(request.url).protocol === 'https:';
    return Response.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store', 'Set-Cookie': clearedCookie(secure) } },
    );
  } catch (e) {
    return apiFailure(e);
  }
}
