const encoder = new TextEncoder();

export const AUTH_COOKIE_NAME = 'pl-auth';

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getSecrets() {
  const password = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_SECRET || password;
  if (!password) throw new Error('AUTH_PASSWORD is not set.');
  if (!secret) throw new Error('AUTH_SECRET is not set.');
  return { password, secret } as const;
}

export function hasAuthConfig() {
  return Boolean(process.env.AUTH_PASSWORD);
}

export async function buildAuthToken() {
  const { password, secret } = getSecrets();
  const payload = `${password}:${secret}`;
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
  return toHex(digest);
}

export async function verifyAuthToken(token?: string | null) {
  if (!token) return false;
  if (!hasAuthConfig()) return false;
  try {
    const expected = await buildAuthToken();
    return token === expected;
  } catch (err) {
    console.error('Auth verification failed', err);
    return false;
  }
}

export const authCookieOptions = {
  name: AUTH_COOKIE_NAME,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};
