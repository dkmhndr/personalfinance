import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, authCookieOptions, buildAuthToken } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const passwordInput = (body.password || '').trim();
  const remember = Boolean(body.remember);

  if (!process.env.AUTH_PASSWORD) {
    return NextResponse.json({ error: 'Server missing AUTH_PASSWORD' }, { status: 500 });
  }

  if (passwordInput !== process.env.AUTH_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = await buildAuthToken();

  cookies().set({
    ...authCookieOptions,
    value: token,
    // session cookie when unchecked; persistent ~30 days when checked
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });

  return NextResponse.json({ ok: true });
}
