import { env } from 'cloudflare:workers';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_ID_HEADER = 'oai-authenticated-user-id';
const USER_EMAIL_HEADER = 'oai-authenticated-user-email';
const USER_FULL_NAME_HEADER = 'oai-authenticated-user-full-name';
const USER_FULL_NAME_ENCODING_HEADER = 'oai-authenticated-user-full-name-encoding';
const PERCENT_ENCODED_UTF8 = 'percent-encoded-utf-8';
const SIGN_IN_PATH = '/signin-with-chatgpt';
const SIGN_OUT_PATH = '/signout-with-chatgpt';
const CALLBACK_PATH = '/callback';

/** Session cookie for self-hosted deployments, where no dispatcher sets headers. */
export const SESSION_COOKIE = 'aiia_session';
const SESSION_PREFIX = 'auth:';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SESSION_TTL_SECONDS = 8 * 60 * 60;

type StoredSession = {
  userId: string;
  email: string;
  fullName: string | null;
  expires: number;
};

/**
 * Resolves the signed-in user from the session cookie.
 *
 * Sessions are opaque random tokens stored in `settings`, so signing out or
 * disabling an account takes effect immediately rather than waiting for a
 * stateless token to expire.
 */
export async function readSessionUser(): Promise<ChatGPTUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !UUID_RE.test(token)) return null;

  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) return null;

  const row = await db
    .prepare(
      `SELECT s.data AS data, a.disabled AS disabled
         FROM settings s
         LEFT JOIN auth_accounts a ON a.userId = json_extract(s.data, '$.userId')
        WHERE s.owner = ?`,
    )
    .bind(SESSION_PREFIX + token)
    .first<{ data: string; disabled: number | null }>();
  if (!row || row.disabled) return null;

  let session: StoredSession;
  try {
    session = JSON.parse(row.data);
  } catch {
    return null;
  }
  if (!session?.userId || !session?.email) return null;
  if (typeof session.expires !== 'number' || session.expires < Date.now()) return null;

  return {
    userId: session.userId,
    email: session.email,
    fullName: session.fullName ?? null,
    displayName: session.fullName || session.email,
  };
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const userId = requestHeaders.get(USER_ID_HEADER);
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!userId || !email) return readSessionUser();

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName && requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    userId,
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = '/'): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/';

  let url: URL;
  try {
    url = new URL(value, 'https://app.local');
  } catch {
    return '/';
  }
  if (url.origin !== 'https://app.local') return '/';
  if (isReservedAuthPath(url.pathname)) return '/';

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return pathname === SIGN_IN_PATH || pathname === SIGN_OUT_PATH || pathname === CALLBACK_PATH;
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
