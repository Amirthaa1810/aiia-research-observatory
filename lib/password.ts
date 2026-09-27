/**
 * Password hashing for self-hosted accounts.
 *
 * PBKDF2-HMAC-SHA256 via WebCrypto, which Workers provides natively, so this adds
 * no dependency. Hashes are stored as base64 alongside a per-account random salt
 * and the iteration count, so the cost can be raised later without invalidating
 * existing credentials.
 */

const ALGORITHM = 'PBKDF2';
const HASH = 'SHA-256';
const KEY_BITS = 256;
const SALT_BYTES = 16;

/** Deliberately high. Raise for live deployments; existing hashes keep working. */
export const PASSWORD_ITERATIONS = 210_000;

export type PasswordRecord = {
  salt: string;
  passwordHash: string;
  iterations: number;
};

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomSalt(): Uint8Array<ArrayBuffer> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  return salt;
}

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    ALGORITHM,
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: ALGORITHM, salt, iterations, hash: HASH },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

/** Hashes a new password with a freshly generated salt. */
export async function hashPassword(
  password: string,
  iterations = PASSWORD_ITERATIONS,
): Promise<PasswordRecord> {
  const salt = randomSalt();
  const hash = await derive(password, salt, iterations);
  return {
    salt: toBase64(salt),
    passwordHash: toBase64(hash),
    iterations,
  };
}

/** Verifies a password against a stored record in constant time. */
export async function verifyPassword(
  password: string,
  record: PasswordRecord,
): Promise<boolean> {
  const salt = fromBase64(record.salt);
  const expected = fromBase64(record.passwordHash);
  const actual = await derive(password, salt, record.iterations);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export type PasswordProblem = string | null;

/** Basic strength gate. Length matters more than symbol classes. */
export function passwordProblem(password: string): PasswordProblem {
  if (password.length < 12) return 'Use at least 12 characters.';
  if (password.length > 200) return 'That password is too long.';
  if (/^\s|\s$/.test(password)) return 'Remove the leading or trailing space.';
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) =>
    re.test(password),
  ).length;
  if (classes < 2) {
    return 'Mix at least two of: lowercase, uppercase, digits, symbols.';
  }
  return null;
}
